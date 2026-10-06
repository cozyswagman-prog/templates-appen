// Local workerd proof, never a cloud deployment or a Cloudflare CPU measurement.
// node tests/pinned-assets.worker.mjs <existing directory containing miniflare and esbuild>
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv[2]) throw new Error('Provide the existing worker-tools directory. Nothing is installed automatically.');
const requireTools = createRequire(path.resolve(process.argv[2], 'package.json'));
const { Miniflare } = requireTools('miniflare');
const built = await requireTools('esbuild').build({ entryPoints: [path.join(root, 'server/worker.mjs')], bundle: true,
  format: 'esm', platform: 'neutral', target: 'es2022', mainFields: ['module', 'main'], conditions: ['worker', 'import'],
  loader: { '.woff2': 'binary', '.txt': 'text' }, write: false, logLevel: 'silent' });
const schema = fs.readFileSync(path.join(root, 'server/schema.sql'), 'utf8').replace(/--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean);
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const project = { name: 'Synthetic pinned assets', templateId: 'cafe', values: { 'index.html': { 2: png, 3: 'Local QA' } } };
const results = [];
for (const storage of ['d1', 'r2']) {
  const mf = new Miniflare({ modules: true, script: built.outputFiles[0].text, compatibilityDate: '2026-08-01',
    d1Databases: ['DB'], r2Buckets: storage === 'r2' ? ['SITES'] : [],
    bindings: { CONTROL_HOST: 'control.test', CONTROL_TOKEN: 'synthetic-local-only', SITES_PATH_HOST: 'sites.test' } });
  const control = (route, data) => mf.dispatchFetch('https://control.test' + route, { method: 'POST',
    headers: { Authorization: 'Bearer synthetic-local-only', 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const get = (resource, options = {}) => mf.dispatchFetch('https://sites.test/pinned-cafe/' + resource, options);
  try {
    const db = await mf.getD1Database('DB');
    const applySchema = async () => { for (const statement of schema) await db.prepare(statement).run(); };
    await applySchema();
    assert.equal((await control('/sites', { id: 'pinned-cafe', host: 'sites.test/pinned-cafe' })).status, 201);
    const runs = [];
    let first, firstAsset, firstBytes;
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      const response = await control('/sites/pinned-cafe/publish', { project, expectedRevision: i });
      const data = await response.json();
      assert.equal(response.status, 200, JSON.stringify(data));
      assert.equal(data.revision, i + 1);
      runs.push({ run: i + 1, status: response.status, wallMilliseconds: Math.round((performance.now() - start) * 100) / 100 });
      const html = await (await get('')).text();
      assert.ok(html.includes('_v/' + data.versionId + '/fonts/'));
      const asset = html.match(/src="(_v\/[^"\s]+\/images\/[^"\s]+)"/)?.[1];
      assert.ok(asset, 'published HTML pins the image');
      const image = await get(asset);
      assert.equal(image.status, 200); assert.equal(image.headers.get('X-Templates-Version'), data.versionId);
      if (!first) { first = data; firstAsset = asset; firstBytes = Buffer.from(await image.arrayBuffer()); }
      const original = await get(firstAsset);
      assert.equal(original.status, 200); assert.deepEqual(Buffer.from(await original.arrayBuffer()), firstBytes);
      assert.equal(original.headers.get('X-Templates-Version'), first.versionId);
      assert.match(original.headers.get('Cache-Control'), /immutable/);
      assert.equal((await get(firstAsset, { method: 'HEAD' })).status, 200);
    }
    const races = await Promise.all([control('/sites/pinned-cafe/publish', { project, expectedRevision: 10 }), control('/sites/pinned-cafe/publish', { project, expectedRevision: 10 })]);
    assert.deepEqual(races.map(r => r.status).sort(), [200, 409]);
    assert.equal((await db.prepare('select count(*) n from published_versions').first()).n, 11, 'only winning versions become public');
    const rollback = await control('/sites/pinned-cafe/rollback', { versionId: first.versionId, expectedRevision: 11 });
    assert.equal(rollback.status, 200);
    assert.ok((await (await get('')).text()).includes('_v/' + first.versionId + '/'));
    for (const suffix of ['index.html', 'manifest.json', 'images/%2e%2e/index.html'])
      assert.equal((await get('_v/' + first.versionId + '/' + suffix)).status, 404);

    // Simulate a missing migration only in this ephemeral local database. The
    // failed publication must not commit its pointer before its visibility record.
    await db.prepare('drop table published_versions').run();
    const failed = await control('/sites/pinned-cafe/publish', { project, expectedRevision: 12 });
    assert.equal(failed.status, 500);
    const unchanged = await db.prepare('select active_version, revision from sites where id = ?').bind('pinned-cafe').first();
    assert.equal(unchanged.active_version, first.versionId); assert.equal(unchanged.revision, 12);
    await applySchema(); await applySchema();
    assert.equal((await db.prepare('select count(*) n from published_versions').first()).n, 1, 'upgrade registers only current live versions, idempotently');
    assert.equal((await get(firstAsset)).status, 200);
    results.push({ storage, status: 'PASS', runs, checks: ['pinned images/fonts', 'old asset after ten switches', 'HEAD', 'concurrent CAS', 'rollback', 'private HTML/manifests', 'transaction rollback on missing schema', 'idempotent legacy upgrade'] });
  } finally { await mf.dispose(); }
}
console.log(JSON.stringify({ runtime: 'LOCAL workerd/Miniflare; wall time only, not cloud CPU', results }, null, 2));
