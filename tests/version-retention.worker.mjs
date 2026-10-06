// Synthetic, ephemeral workerd/D1/R2 only. No deployment or external account.
// node tests/version-retention.worker.mjs <existing worker-tools directory>
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv[2]) throw new Error('Provide the existing worker-tools directory');
const tools = createRequire(path.resolve(process.argv[2], 'package.json'));
const { Miniflare } = tools('miniflare');
// The test-only wrapper exposes storage races without adding a production API.
const built = await tools('esbuild').build({ stdin: { resolveDir: root, contents: `
  import worker, { d1Sites } from './server/worker.mjs';
  import { d1Retention } from './server/version-retention.mjs';
  export default { ...worker, async fetch(req, env) {
    if (new URL(req.url).hostname !== 'test-only.test') return worker.fetch(req, env);
    const { action, versionId, revision, enabled } = await req.json();
    if (action === 'schedule') {
      const jobs = [];
      await worker.scheduled({}, { ...env, VERSION_RETENTION_ENABLED: enabled ? '1' : '0' }, { waitUntil: job => jobs.push(job) });
      await Promise.all(jobs); return Response.json({ jobs: jobs.length });
    }
    const sites = d1Sites(env.DB), retention = d1Retention(env.DB);
    const claim = () => retention.claim('qa-cafe', versionId);
    const swap = () => sites.swap('qa-cafe', revision, versionId);
    const result = action === 'race' ? await Promise.all([claim(), swap()]) : action === 'claim' ? await claim() : await swap();
    return Response.json(result);
  }};` }, bundle: true, format: 'esm', platform: 'neutral', target: 'es2022',
  mainFields: ['module', 'main'], conditions: ['worker', 'import'], loader: { '.woff2': 'binary', '.txt': 'text' }, write: false, logLevel: 'silent' });
const schema = fs.readFileSync(path.join(root, 'server/schema.sql'), 'utf8').replace(/--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean);
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const prefix = n => 'sites/qa-cafe/v/' + id(n) + '/';
const results = [];
for (const storage of ['d1', 'r2']) {
  const mf = new Miniflare({ modules: true, script: built.outputFiles[0].text, compatibilityDate: '2026-08-01',
    d1Databases: ['DB'], r2Buckets: storage === 'r2' ? ['SITES'] : [],
    bindings: { CONTROL_HOST: 'control.test', CONTROL_TOKEN: 'synthetic-local-only', SITES_PATH_HOST: 'sites.test' } });
  try {
    const db = await mf.getD1Database('DB'), r2 = storage === 'r2' ? await mf.getR2Bucket('SITES') : null;
    for (const sql of schema) await db.prepare(sql).run();
    const put = async key => r2 ? r2.put(key, 'synthetic') : db.prepare('insert into site_files values (?, ?, ?, ?, ?)').bind(key, new TextEncoder().encode('synthetic'), 9, 'synthetic', 'text/plain').run();
    const exists = async key => r2 ? !!await r2.head(key) : !!await db.prepare('select 1 from site_files where key=?').bind(key).first();
    await db.prepare('insert into sites (id,host,active_version,revision) values (?,?,?,?)').bind('qa-cafe','sites.test/qa-cafe',id(8),8).run();
    for (let n = 1; n <= 8; n++) {
      await db.prepare('insert into published_versions values (?,?,?)').bind('qa-cafe',id(n),n).run();
      for (let f = 0; f < (n === 2 ? 45 : 2); f++) await put(prefix(n) + f + '.html');
      await put(prefix(n) + 'images/bild-1.png');
    }
    const unrelated = 'sites/other-cafe/v/' + id(2) + '/index.html', unfinished = prefix(99) + 'index.html';
    await put(unrelated); await put(unfinished);
    const post = (url, body, auth = true) => mf.dispatchFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? {Authorization:'Bearer synthetic-local-only'} : {}) }, body: JSON.stringify(body) });
    const maintenance = body => post('https://control.test/maintenance/versions', body);
    const action = async (action, n, revision) => (await post('https://test-only.test/', { action, versionId:id(n), revision })).json();
    const plan = await (await maintenance({})).json();
    assert.equal(plan.dryRun,true); assert.deepEqual(plan.candidates.map(x => x.versionId),[id(1),id(2)]);
    assert.equal((await db.prepare('select count(*) n from version_retirements').first()).n,0);
    assert.equal(await exists(prefix(1)+'0.html'),true);
    assert.deepEqual(await (await post('https://test-only.test/',{action:'schedule',enabled:false})).json(),{jobs:0});
    assert.equal(await exists(prefix(1)+'0.html'),true, 'disabled schedule does nothing');
    assert.equal((await post('https://control.test/maintenance/versions',{execute:true},false)).status,401);
    assert.equal((await post('https://sites.test/maintenance/versions',{execute:true})).status,405);
    // Rolling back after preview must protect that now-active old version.
    assert.equal(await action('swap',1,8),true);
    assert.equal(await action('claim',1),false);
    assert.equal(await action('claim',8),false, 'recent inactive version retained');
    assert.equal(await action('claim',99),false, 'unregistered upload never reclaimed');
    assert.equal(await action('claim',2),true);
    assert.equal(await action('swap',2,9),false, 'claimed version cannot become active');
    // Competing claim/rollback must have exactly one winner in actual D1.
    const race = await action('race',3,9);
    assert.equal(race.filter(Boolean).length,1);
    assert.deepEqual(await (await post('https://test-only.test/',{action:'schedule',enabled:true})).json(),{jobs:1});
    const overlapping = await Promise.all([maintenance({execute:true}), maintenance({execute:true})]);
    assert.ok(overlapping.every(response => response.status === 200));
    for (let n=0;n<8;n++) {
      const response = await maintenance({execute:true}); assert.equal(response.status,200);
      const data = await response.json();
      assert.ok(data.results.length<=2 && data.results.every(r=>r.deletedFiles<=20));
    }
    assert.equal(await exists(prefix(2)+'0.html'),false);
    assert.equal(await exists(prefix(2)+'44.html'),false, 'deletion continued beyond first page');
    const site = await db.prepare('select active_version from sites where id=?').bind('qa-cafe').first();
    assert.equal(await exists('sites/qa-cafe/v/'+site.active_version+'/0.html'),true);
    const kept=(await db.prepare('select version_id from published_versions where site_id=?').bind('qa-cafe').all()).results;
    assert.equal(kept.length,6); assert.ok(kept.some(r=>r.version_id===site.active_version));
    for (const row of kept) assert.equal(await exists('sites/qa-cafe/v/'+row.version_id+'/images/bild-1.png'),true);
    assert.equal(await exists(unrelated),true); assert.equal(await exists(unfinished),true);
    assert.equal((await mf.dispatchFetch('https://sites.test/qa-cafe/_v/'+id(2)+'/images/bild-1.png')).status,404);
    assert.equal((await db.prepare('select count(*) n from version_retirements where completed=0').first()).n,0);
    // Reapplying the schema must not resurrect deleted versions.
    for (const sql of schema) await db.prepare(sql).run();
    assert.equal((await (await maintenance({})).json()).candidates.length,0);
    results.push({storage,status:'PASS',checks:['read-only preview','authorization','active plus five retained','stale preview','rollback/cleanup race','bounded multipage deletion','other site and ongoing upload untouched','retired asset 404','idempotent migration','schedule disabled/enabled','overlapping cleanup jobs']});
  } finally { await mf.dispose(); }
}
console.log(JSON.stringify({runtime:'LOCAL workerd/Miniflare only',results},null,2));
