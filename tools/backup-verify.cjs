// Kontrollerar en backup (templates-backup-v1/v2) genom att återställa den i en tom lokal Postgres
// (PGlite) med projektets migreringar och en lokal bildlagring. Ansluter aldrig till någon tjänst
// och ändrar aldrig backupmappen. Auth och Storage är samma fixturer som i projektets RLS-tester.
const fs = require('node:fs'), path = require('node:path'), { createHash } = require('node:crypto');
const { renderProject } = require('./render-project.cjs');
const { loadBackup } = require('./account-data.cjs');
const { V1, V2, closurePlan } = require('./backup-closures.cjs');
const SOURCE = path.resolve(__dirname, '..');
const PREFIX = 'templates-image:v1:', BUCKET = 'project-images';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Backupen innehåller en länk: ' + full);
    return entry.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

async function verifyBackup(dir, { closureBackupDirectory = null, requireClosureProtection = false } = {}) {
  const root = path.resolve(dir), results = [];
  const check = (area, name, ok, detail = null) => results.push({ area, check: name, status: ok ? 'PASS' : 'FAIL', detail });
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  check('backup', 'Känt backupformat v1/v2', [V1, V2].includes(manifest.format), manifest.format);
  const safeBackup = manifest.format === V2 || closureBackupDirectory ? loadBackup(root) : null;
  const newer = closureBackupDirectory ? loadBackup(closureBackupDirectory) : null;

  // 1. Filerna: exakt de som manifestet listar, med rätt storlek och SHA-256.
  const listed = new Map(manifest.files.map(f => [f.path, f])), present = walk(root).filter(f => f !== 'manifest.json');
  const extra = present.filter(f => !listed.has(f)), missing = [...listed.keys()].filter(f => !present.includes(f));
  check('backup', 'Inga saknade eller extra filer jämfört med manifestet', !extra.length && !missing.length, { missing, extra });
  const bad = manifest.files.filter(f => present.includes(f.path)).filter(f => { const b = fs.readFileSync(path.join(root, f.path)); return b.length !== f.bytes || hash(b) !== f.sha256; }).map(f => f.path);
  check('backup', 'Alla filer har manifestets storlek och SHA-256 (' + manifest.files.length + ')', !bad.length, bad);
  let images = manifest.files.filter(f => f.path.startsWith('storage/' + BUCKET + '/'));
  const wrongKey = images.filter(f => present.includes(f.path)).filter(f => hash(fs.readFileSync(path.join(root, f.path))) !== path.basename(f.path).slice(0, 64)).map(f => f.path);
  check('backup', 'Varje bildfil stämmer med sin innehållsnyckel (' + images.length + ')', !wrongKey.length, wrongKey);
  const migrations = fs.readdirSync(path.join(SOURCE, 'supabase/migrations')).sort();
  const migrationDiff = (manifest.migrations || []).filter(m => !migrations.includes(m.name) || hash(fs.readFileSync(path.join(SOURCE, 'supabase/migrations', m.name), 'utf8').replace(/\r\n/g, '\n')) !== m.sha256).map(m => m.name);
  // Nya migreringar efter backupen får tillkomma (de körs vid återställningen); ändrade eller borttagna underkänns.
  const added = migrations.filter(name => !(manifest.migrations || []).some(m => m.name === name));
  check('backup', 'Backupens migreringar finns oförändrade' + (added.length ? ' (tillkomna sedan backupen: ' + added.join(', ') + ')' : ''), Array.isArray(manifest.migrations) && manifest.migrations.length > 0 && !migrationDiff.length, migrationDiff);

  const read = name => JSON.parse(fs.readFileSync(path.join(root, 'db', name + '.json'), 'utf8'));
  const original = safeBackup?.db || { projects: read('projects'), project_images: read('project_images'), project_image_refs: read('project_image_refs'), users: read('users') };
  const plan = closurePlan({ manifest, db: original }, newer);
  if (requireClosureProtection && plan.status === 'UNKNOWN_LEGACY_WITHOUT_CLOSURES') throw new Error('Äldre backup saknar stängningsregister. Ange en aktuell v2-backup från samma källa.');
  const withClosures = plan.status === 'CAPTURED_AS_OF_BACKUP';
  const closureSql = withClosures ? fs.readFileSync(path.join(SOURCE, 'supabase/proposals/account-closure.sql'), 'utf8') : null;
  for (const item of [safeBackup, newer].filter(x => x?.manifest.format === V2)) {
    if (item.manifest.closureSchemaSha256 !== hash(closureSql.replace(/\r\n/g, '\n'))) throw new Error('Stängningsschemat skiljer sig från backupen. Granska versionerna före återställning.');
  }
  const db = plan.db;
  const originalImageCount = images.length;
  images = images.filter(f => !plan.denied.has(f.path.split('/')[2]));
  const closureProtection = { status: plan.status, asOf: plan.asOf, markers: plan.closures.length,
    skipped: { ...plan.skipped, storageObjects: originalImageCount - images.length },
    liveRestoreApproved: false };

  // 2. Tom miljö: fixturer + migreringar.
  const { PGlite } = require('@electric-sql/pglite');
  const pg = new PGlite();
  try {
    await pg.exec(`set timezone='UTC';
      create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to anon, authenticated, service_role; grant execute on function auth.uid() to anon, authenticated;
      create schema storage; grant usage on schema storage to anon, authenticated, service_role;
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(bucket_id text references storage.buckets(id), name text, primary key(bucket_id, name));
      alter table storage.objects enable row level security;
      grant select, insert, update, delete on storage.objects to authenticated, anon;`);
    for (const name of migrations) await pg.exec(fs.readFileSync(path.join(SOURCE, 'supabase/migrations', name), 'utf8'));
    if (withClosures) {
      await pg.exec(closureSql);
      // Guards precede any account, project, reservation or Storage object.
      for (const row of plan.closures) await pg.query('insert into public.account_closures(owner_id,started_at) values($1,$2)', [row.owner_id,row.started_at]);
    }

    // 3. Återställ i beroendeordning; bildreferenser återskapas av databasens egen trigger.
    for (const u of db.users) await pg.query('insert into auth.users(id) values ($1)', [u.id]);
    for (const f of images.filter(f => present.includes(f.path))) await pg.query('insert into storage.objects(bucket_id, name) values ($1, $2)', [BUCKET, f.path.slice(('storage/' + BUCKET + '/').length)]);
    for (const i of db.project_images) await pg.query(`insert into public.project_images(owner_id,name,created_at,content_key,state,unused_since,lease_until,delete_token,retry_after,deleted_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [i.owner_id, i.name, i.created_at, i.content_key, i.state, i.unused_since, i.lease_until, i.delete_token, i.retry_after, i.deleted_at]);
    let restoreError = null;
    try { for (const p of db.projects) await pg.query('insert into public.projects(owner_id,id,content,revision,updated_at) values ($1,$2,$3,$4,$5)', [p.owner_id, p.id, p.content, p.revision, p.updated_at]); }
    catch (e) { restoreError = e.message; }
    check('återställ', 'Alla projekt kunde läggas in med databasens egna kontroller (' + db.projects.length + ')', !restoreError, restoreError);
    // Ordningsoberoende jämförelse: båda sidor sorteras i Postgres med samma nycklar och C-sortering.
    const same = async (table, keys, expected) => {
      const order = keys.map(k => `x->>'${k}' collate "C"`).join(', ');
      const sorted = `select coalesce(jsonb_agg(x order by ${order}), '[]') j from jsonb_array_elements($1::jsonb) x`;
      const actual = (await pg.query(`select coalesce(jsonb_agg(to_jsonb(t)), '[]') j from public.${table} t`)).rows[0].j;
      const h = async v => (await pg.query(`select encode(sha256(convert_to(s.j::text, 'UTF8')), 'hex') h from (${sorted}) s`, [JSON.stringify(v)])).rows[0].h;
      return await h(actual) === await h(expected);
    };
    check('återställ', 'Projekt lika med backupen', await same('projects', ['owner_id', 'id'], db.projects));
    check('återställ', 'Bildreservationer lika med backupen', await same('project_images', ['owner_id', 'name'], db.project_images));
    check('återställ', 'Bildreferenser återskapade av triggern = backupen', await same('project_image_refs', ['owner_id', 'project_id', 'image_name'], db.project_image_refs));

    // 4. Öppna och exportera varje projekt som dess ägare.
    const as = async (id, sql, args = [], role = 'authenticated') => {
      await pg.exec('set role ' + role);
      await pg.query("select set_config('request.jwt.claim.sub', $1, false)", [id || '']);
      try { return (await pg.query(sql, args)).rows; } finally { await pg.exec('reset role'); }
    };
    if (withClosures) {
      const stored = (await pg.query(`select count(*) total, count(*) filter(where exists(
        select 1 from jsonb_to_recordset($1::jsonb) e(owner_id uuid,started_at timestamptz)
        where e.owner_id=c.owner_id and e.started_at=c.started_at)) matching
        from public.account_closures c`,[JSON.stringify(plan.closures)])).rows[0];
      check('kontostängning', 'Alla stängningsmarkeringar finns kvar', Number(stored.total) === plan.closures.length && Number(stored.matching) === plan.closures.length);
      let deniedOk = true;
      for (const c of plan.closures) {
        if ((await as(c.owner_id, 'select * from public.projects')).length || (await as(c.owner_id, 'select * from storage.objects')).length) deniedOk = false;
        if ((await pg.query('select id from auth.users where id=$1',[c.owner_id])).rows.length) deniedOk = false;
        // Simulate an old Auth identity restored later, then roll it back.
        await pg.exec('begin');
        try {
          await pg.query('insert into auth.users(id) values($1)',[c.owner_id]);
          await pg.exec('set local role authenticated');
          await pg.query("select set_config('request.jwt.claim.sub',$1,true)",[c.owner_id]);
          let code = null;
          try { await pg.query('select * from public.save_project($1,$2,0,$3)', ['closure-test',{name:'Restore guard',templateId:'cafe',values:{}},c.owner_id]); }
          catch (error) { code = error.code; }
          if (code !== 'PT423') deniedOk = false;
        } finally { await pg.exec('rollback; reset role'); }
      }
      check('kontostängning', 'Stängda konton hoppas över och gammal identitet kan inte spara', deniedOk);
    }
    const failures = [];
    for (const p of db.projects) {
      try {
        const row = (await as(p.owner_id, 'select content, revision from public.projects where id = $1', [p.id]))[0];
        if (!row || row.revision !== p.revision) throw new Error('ägaren ser inte projektet');
        const visible = new Set((await as(p.owner_id, 'select name from storage.objects where bucket_id = $1', [BUCKET])).map(r => r.name));
        const used = [];
        const unpack = v => {
          if (typeof v === 'string' && v.startsWith(PREFIX)) {
            const name = v.slice(PREFIX.length), object = p.owner_id + '/' + name, file = path.join(root, 'storage', BUCKET, p.owner_id, name);
            if (!visible.has(object) || !fs.existsSync(file)) throw new Error('bild saknas: ' + object);
            const bytes = safeBackup?.files.get('storage/' + BUCKET + '/' + object) || fs.readFileSync(file); used.push(bytes);
            return 'data:image/' + name.split('.').pop() + ';base64,' + bytes.toString('base64');
          }
          return Array.isArray(v) ? v.map(unpack) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, unpack(x)])) : v;
        };
        const files = renderProject(unpack(row.content));
        const exported = [...files.keys()].filter(k => k.startsWith('images/')).map(k => files.get(k));
        if (!used.every(b => exported.some(e => Buffer.compare(Buffer.from(e), b) === 0))) throw new Error('exporten saknar en bild');
      } catch (e) { failures.push(p.owner_id.slice(0, 8) + '…/' + p.id + ': ' + e.message); }
    }
    check('öppna och exportera', 'Alla projekt öppnas av sin ägare och exporteras med sina bilder (' + db.projects.length + ')', !failures.length, failures);

    // 5. Isolering efter återställning: varje ägare mot nästa, samt anonym.
    const owners = [...new Set(db.projects.map(p => p.owner_id))], leaks = [];
    for (let i = 0; i < owners.length && owners.length > 1; i++) {
      const me = owners[i], other = owners[(i + 1) % owners.length], target = db.projects.find(p => p.owner_id === other);
      if ((await as(me, 'select owner_id from public.projects')).some(r => r.owner_id !== me)) leaks.push(me.slice(0, 8) + ' ser andras projekt');
      if ((await as(me, 'select name from storage.objects where name like $1', [other + '/%'])).length) leaks.push(me.slice(0, 8) + ' ser andras bilder');
      for (const [sql, args, code] of [['select * from public.save_project($1,$2,$3,$4)', [target.id, { name: 'X', templateId: 'cafe', values: {} }, target.revision, other], '42501'],
        ['select public.delete_project($1,$2,$3)', [target.id, target.revision, other], '42501'], ['delete from public.projects', [], '42501']]) {
        let got = 'lyckades'; try { await as(me, sql, args); } catch (e) { got = e.code; }
        if (got !== code) leaks.push(me.slice(0, 8) + ': ' + sql.slice(0, 40) + ' gav ' + got);
      }
    }
    let anon = 'lyckades'; try { await as(null, 'select * from public.projects', [], 'anon'); } catch (e) { anon = e.code; }
    if (anon !== '42501') leaks.push('anonym läsning gav ' + anon);
    check('isolering', 'Ägare hålls isär och anonym läsning nekas (' + owners.length + ' ägare)', !leaks.length, leaks);
    check('isolering', 'Inga projekt ändrades av isoleringsproven', await same('projects', ['owner_id', 'id'], db.projects));
  } finally { await pg.close(); }
  return { pass: results.filter(r => r.status === 'PASS').length, fail: results.filter(r => r.status === 'FAIL').length, closureProtection, results };
}

if (require.main === module) {
  (async () => {
    const [dir, ...args] = process.argv.slice(2);
    let report = null, closureBackupDirectory = null, requireClosureProtection = false;
    for (let i=0;i<args.length;i++) {
      if (args[i] === '--closures-from' && !closureBackupDirectory && args[i+1] && !args[i+1].startsWith('--')) closureBackupDirectory=args[++i];
      else if (args[i] === '--require-closures' && !requireClosureProtection) requireClosureProtection=true;
      else if (!report && !args[i].startsWith('--')) report=args[i];
      else throw new Error('Ogiltiga kontrollargument.');
    }
    if (!dir || dir.startsWith('--')) throw new Error('Använd: npm run backup:verify -- BACKUPMAPP [RAPPORT.json] [--closures-from NYARE_V2_BACKUP] [--require-closures]');
    const outcome = await verifyBackup(dir, { closureBackupDirectory, requireClosureProtection });
    for (const r of outcome.results) console.log(r.status + ' | ' + r.area + ' | ' + r.check + (r.status === 'FAIL' ? ' | ' + JSON.stringify(r.detail) : ''));
    console.log(outcome.fail ? 'Backupen är INTE godkänd: ' + outcome.fail + ' fel.' : 'Backupen är godkänd lokalt (' + outcome.pass + ' kontroller). Det ersätter inte en återställning i Supabase.');
    console.log('Kontostängningsskydd: ' + outcome.closureProtection.status + '. Ingen molnåterställning är godkänd av detta prov.');
    if (report) fs.writeFileSync(report, JSON.stringify({ checked: new Date().toISOString(), ...outcome }, null, 2), { flag: 'wx' });
    if (outcome.fail) process.exitCode = 1;
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { verifyBackup };
