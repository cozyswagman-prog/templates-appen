// Backup och lokal återställningskontroll mot en simulerad Supabase-klient.
// Bevisar verktygens logik, inte att den riktiga tjänsten svarar likadant.
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), { createHash } = require('node:crypto');
const { createBackup, main } = require('../tools/backup-create.cjs');
const { verifyBackup } = require('../tools/backup-verify.cjs');

const A = 'a1111111-1111-4111-8111-111111111111', B = 'b2222222-2222-4222-8222-222222222222';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const png2 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const sha = b => createHash('sha256').update(b).digest('hex');
const imageName = (bytes, gen) => sha(bytes) + '-' + gen.repeat(32) + '.png';
const T = '2026-10-06T10:00:00.123456+00:00';

function state() {
  const imgA = imageName(png, 'a'), imgB = imageName(png2, 'b'), reserved = imageName(Buffer.from('aldrig uppladdad'), 'c');
  const content = (owner, img) => ({ name: 'Backupprov ' + owner.slice(0, 1), templateId: 'cafe', values: { 'index.html': { 1: 'Café ' + owner.slice(0, 1) + ' ÅÄÖ' }, 'kontakt.html': { 4: 'templates-image:v1:' + img } } });
  const image = (owner, name, unused = null) => ({ owner_id: owner, name, created_at: T, content_key: name.slice(0, 64) + '.png', state: 'active', unused_since: unused, lease_until: T, delete_token: null, retry_after: null, deleted_at: null });
  return {
    projects: [{ owner_id: A, id: 'pa1', content: content(A, imgA), revision: 3, updated_at: T }, { owner_id: A, id: 'pa2', content: content(A, imgA), revision: 1, updated_at: T }, { owner_id: B, id: 'pb1', content: content(B, imgB), revision: 2, updated_at: T }],
    project_images: [image(A, imgA), image(A, reserved, T), image(B, imgB)],
    project_image_refs: [{ owner_id: A, project_id: 'pa1', image_name: imgA }, { owner_id: A, project_id: 'pa2', image_name: imgA }, { owner_id: B, project_id: 'pb1', image_name: imgB }],
    users: [{ id: A, email: 'a@example.test', email_confirmed_at: T, created_at: T }, { id: B, email: 'b@example.test', email_confirmed_at: T, created_at: T }],
    objects: { [A + '/' + imgA]: png, [B + '/' + imgB]: png2 }
  };
}
function fakeClient(s, calls = []) {
  return {
    from(table) { const q = { select: () => q, order: () => q, range: (a, b) => { calls.push(table); return Promise.resolve({ data: s[table].slice(a, b + 1), error: null }); } }; return q; },
    auth: { admin: { listUsers: ({ page, perPage }) => Promise.resolve({ data: { users: s.users.slice((page - 1) * perPage, page * perPage) }, error: null }) } },
    storage: { from: () => ({
      list(prefix, { limit, offset }) {
        const keys = Object.keys(s.objects).sort();
        const entries = prefix === '' ? [...new Set(keys.map(k => k.split('/')[0]))].map(name => ({ name, id: null })) : keys.filter(k => k.startsWith(prefix + '/')).map(k => ({ name: k.split('/')[1] }));
        return Promise.resolve({ data: entries.slice(offset, offset + limit), error: null });
      },
      download: p => Promise.resolve(s.objects[p] ? { data: new Blob([s.objects[p]]), error: null } : { data: null, error: { statusCode: 404 } })
    }) }
  };
}
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'templates-backup-')), 'backup');

test('Backup includes every table page, all users and every image file; local restore passes', async () => {
  const s = state(), calls = [], dest = tmp();
  const manifest = await createBackup({ client: fakeClient(s, calls), destination: dest, pageSize: 1, sourceHost: 'prov.supabase.co' });
  assert.ok(calls.filter(t => t === 'projects').length >= 4, 'paged through all projects');
  assert.deepEqual(manifest.counts, { projects: 3, project_images: 3, project_image_refs: 3, users: 2, files: 2 });
  assert.equal(manifest.warnings.length, 1); assert.match(manifest.warnings[0], /Reserverad bild utan uppladdad fil/);
  assert.equal(manifest.migrations.length, fs.readdirSync(path.join(__dirname, '../supabase/migrations')).length); assert.ok(!fs.existsSync(dest + '.partial'));
  assert.deepEqual(fs.readFileSync(path.join(dest, 'storage/project-images', A, s.project_images[0].name)), png);
  const result = await verifyBackup(dest);
  assert.equal(result.fail, 0, JSON.stringify(result.results.filter(r => r.status === 'FAIL')));
  assert.ok(result.pass >= 10);
});

test('A damaged, missing or tampered backup is never reported as good', async () => {
  const dest = tmp(); await createBackup({ client: fakeClient(state()), destination: dest });
  const s = state(), img = path.join(dest, 'storage/project-images', A, s.project_images[0].name);
  const bytes = fs.readFileSync(img); bytes[20] ^= 1; fs.writeFileSync(img, bytes);
  const damaged = await verifyBackup(dest);
  assert.ok(damaged.results.some(r => r.status === 'FAIL' && /SHA-256/.test(r.check)));
  assert.ok(damaged.results.some(r => r.status === 'FAIL' && /innehållsnyckel/.test(r.check)));
  fs.rmSync(img); const missing = await verifyBackup(dest);
  assert.ok(missing.results.some(r => r.status === 'FAIL' && /öppnas/.test(r.check)));
  const dest2 = tmp(); await createBackup({ client: fakeClient(state()), destination: dest2 });
  const file = path.join(dest2, 'db/projects.json'), rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  rows[0].content.values['index.html'][1] = 'Ändrad i efterhand'; fs.writeFileSync(file, JSON.stringify(rows));
  assert.ok((await verifyBackup(dest2)).fail > 0);
});

test('Source problems stop the backup without leaving a finished-looking folder', async () => {
  const corrupt = state(); corrupt.objects[A + '/' + corrupt.project_images[0].name] = Buffer.from('fel innehåll');
  const dest = tmp();
  await assert.rejects(createBackup({ client: fakeClient(corrupt), destination: dest }), /innehållsnyckel/);
  assert.ok(!fs.existsSync(dest)); assert.ok(fs.existsSync(dest + '.partial'));
  const lost = state(); delete lost.objects[B + '/' + lost.project_images[2].name];
  const dest2 = tmp();
  await assert.rejects(createBackup({ client: fakeClient(lost), destination: dest2 }), /bild som saknas/);
  assert.ok(!fs.existsSync(dest2) && !fs.existsSync(dest2 + '.partial'));
});

test('Never writes inside the source tree or over an existing folder', async () => {
  await assert.rejects(createBackup({ client: fakeClient(state()), destination: path.join(__dirname, '..', 'backup-test') }), /källkoden/);
  const dest = tmp(); fs.mkdirSync(dest);
  await assert.rejects(createBackup({ client: fakeClient(state()), destination: dest }), /finns redan/);
});

test('Backup migration gives service_role read access only; customers and anonymous gain nothing', async () => {
  const { PGlite } = require('@electric-sql/pglite'), db = new PGlite(), dir = path.join(__dirname, '../supabase/migrations');
  try {
    await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
      create schema storage; create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(bucket_id text, name text, primary key(bucket_id, name)); alter table storage.objects enable row level security;`);
    const privileges = async () => (await db.query(`select r.rolname || ':' || t || ':' || p as k, has_table_privilege(r.rolname, 'public.' || t, p) as v
      from pg_roles r, unnest(array['projects','project_images','project_image_refs']) t, unnest(array['select','insert','update','delete']) p
      where r.rolname in ('anon','authenticated','service_role') order by 1`)).rows;
    for (const f of fs.readdirSync(dir).sort().filter(f => f !== '202610060001_backup_read.sql')) await db.exec(fs.readFileSync(path.join(dir, f), 'utf8'));
    const before = await privileges();
    await db.exec(fs.readFileSync(path.join(dir, '202610060001_backup_read.sql'), 'utf8'));
    const after = await privileges();
    const changed = after.filter((row, i) => row.v !== before[i].v).map(r => r.k);
    assert.deepEqual(changed, ['service_role:project_image_refs:select', 'service_role:project_images:select', 'service_role:projects:select']);
  } finally { await db.close(); }
});

test('Command line requires https URL and the secret key, refuses the public key and never prints or stores it', async () => {
  const secret = 'sb_secret_TEST' + 'x'.repeat(30), dest = tmp(), env = { TEMPLATES_BACKUP_URL: 'https://prov.supabase.co', TEMPLATES_BACKUP_SECRET_KEY: secret };
  const factory = () => (url, key, options) => { assert.equal(key, secret); assert.equal(options.auth.persistSession, false); return fakeClient(state()); };
  await assert.rejects(main([dest], { ...env, TEMPLATES_BACKUP_URL: 'http://prov.supabase.co' }, factory), /https/);
  await assert.rejects(main([dest], { TEMPLATES_BACKUP_URL: env.TEMPLATES_BACKUP_URL }, factory), /TEMPLATES_BACKUP_SECRET_KEY/);
  await assert.rejects(main([dest], { ...env, TEMPLATES_BACKUP_SECRET_KEY: 'sb_publishable_abc' }, factory), error => /publika nyckeln/.test(error.message) && !/sb_publishable_abc/.test(error.message));
  const printed = [], log = console.log; console.log = (...a) => printed.push(a.join(' '));
  try { await main([dest], env, factory); } finally { console.log = log; }
  assert.ok(!printed.join('\n').includes(secret));
  const stored = (function all(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? all(path.join(d, e.name)) : [fs.readFileSync(path.join(d, e.name), 'latin1')]); })(dest).join('\n');
  assert.ok(!stored.includes(secret)); assert.match(JSON.parse(fs.readFileSync(path.join(dest, 'manifest.json'))).source, /^prov\.supabase\.co$/);
});
