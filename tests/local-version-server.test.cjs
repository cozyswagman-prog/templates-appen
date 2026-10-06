const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), http = require('node:http');
const { startLocalServer } = require('../tools/local-version-server.cjs');
const root = () => fs.mkdtempSync(path.join(os.tmpdir(), 'templates-local-service-'));
const project = { name: 'Lokalt tjänsteprov', templateId: 'cafe', values: { 'index.html': { 3: 'Sparad kopia' } } };
async function setup(t) {
  const service = await startLocalServer({ port: 0, previewPort: 0, root: root() });
  t.after(() => service.close());
  const session = await (await fetch(service.origin + '/__local/session')).json();
  const headers = { Origin: service.origin, 'Content-Type': 'application/json', 'X-Templates-Local': session.token };
  const post = (data = project, custom = {}) => fetch(service.origin + '/__local/versions', { method: 'POST', headers: { ...headers, ...custom }, body: JSON.stringify(data) });
  return { service, session, headers, post };
}
test('Local service creates real packages, separates preview origin and serves only verified files', async t => {
  const { service, post } = await setup(t);
  const response = await post(); assert.equal(response.status, 201);
  const result = await response.json(); assert.equal(result.published, false);
  assert.notEqual(new URL(result.previewUrl).origin, service.origin);
  assert.equal((await fetch(result.previewUrl)).status, 200);
  const pageUrl = result.previewUrl.replace('preview.html', 'site/index.html');
  const page = await fetch(pageUrl); assert.match(await page.text(), /Sparad kopia/);
  assert.match(page.headers.get('Content-Security-Policy'), /connect-src 'none'/);
  assert.equal((await fetch(result.previewUrl.replace('preview.html', 'manifest.json'))).status, 404);
  assert.equal((await fetch(service.previewOrigin + '/__local/session')).status, 404);
  assert.equal((await fetch(service.origin + '/tools/local-version-server.cjs')).status, 404);
  assert.equal((await fetch(service.origin + '/package.json')).status, 404);
  const id = new URL(result.previewUrl).pathname.split('/')[1];
  fs.appendFileSync(path.join(service.root, id, 'site/index.html'), 'tamper');
  assert.equal((await fetch(pageUrl)).status, 409);
});
test('API rejects foreign origins, forged hosts, missing tokens, wrong types and oversized bodies', async t => {
  const { service, post } = await setup(t);
  assert.equal((await post(project, { Origin: 'https://example.test' })).status, 403);
  assert.equal((await post(project, { 'X-Templates-Local': '' })).status, 403);
  assert.equal((await post(project, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await fetch(service.origin + '/__local/session', { headers: { Origin: service.previewOrigin } })).status, 403);
  assert.equal((await fetch(service.origin + '/__local/session', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await fetch(service.origin + '/__local/versions', { method: 'OPTIONS', headers: { Origin: 'https://example.test' } })).status, 403);
  const hostStatus = await new Promise(resolve => {
    const request = http.get(service.origin + '/__local/session', { headers: { Host: 'attacker.test' } }, res => { res.resume(); resolve(res.statusCode); });
    request.on('error', () => resolve(0));
  });
  assert.equal(hostStatus, 403);
  assert.equal((await post({ ...project, name: 'a'.repeat(20 * 1024 * 1024) })).status, 413);
  assert.deepEqual(fs.readdirSync(service.root), []);
});
test('Bad input creates no package and a subsequent request succeeds', async t => {
  const { service, post } = await setup(t);
  assert.equal((await post({ templateId: 'unknown', values: {} })).status, 422);
  assert.equal((await post({ ...project, values: { 'index.html': { 2: 'https://example.test/image.png' } } })).status, 422);
  assert.deepEqual(fs.readdirSync(service.root), []);
  assert.equal((await post()).status, 201);
});
test('A partial in-flight request blocks parallel creation and disconnect frees the worker', async t => {
  const { service, headers, post } = await setup(t);
  const slow = http.request(service.origin + '/__local/versions', { method: 'POST', headers: { ...headers, 'Content-Length': 1000 } });
  slow.on('error', () => {}); slow.write('{');
  // A same-socket ordering barrier is unavailable; wait for the server's busy response.
  await new Promise(resolve => setTimeout(resolve, 50));
  const busy = await post(); assert.equal(busy.status, 409);
  slow.destroy(); await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal((await post()).status, 201);
});
test('Incomplete directories count toward the quota and are never served', async t => {
  const { service, post } = await setup(t);
  for (let n = 0; n < 20; n++) fs.mkdirSync(path.join(service.root, String(n).padStart(36, '0')));
  assert.equal((await post()).status, 409);
  assert.equal((await fetch(service.previewOrigin + '/' + '0'.repeat(36) + '/preview.html')).status, 404);
});
test('Restart restores complete local versions without enabling offline caching', async () => {
  const directory = root();
  const first = await startLocalServer({ port: 0, previewPort: 0, root: directory });
  let result;
  try {
    const { token } = await (await fetch(first.origin + '/__local/session')).json();
    result = await (await fetch(first.origin + '/__local/versions', { method: 'POST', headers: { Origin: first.origin, 'X-Templates-Local': token, 'Content-Type': 'application/json' }, body: JSON.stringify(project) })).json();
  } finally { await first.close(); }
  const second = await startLocalServer({ port: 0, previewPort: 0, root: directory });
  try {
    const preview = await fetch(second.previewOrigin + new URL(result.previewUrl).pathname);
    assert.equal(preview.status, 200); assert.equal(preview.headers.get('Cache-Control'), 'no-store');
    const app = await (await fetch(second.origin)).text();
    assert.match(app, /window\.__templatesLocal = true/);
    const session = await (await fetch(second.origin + '/__local/session')).json();
    const restored = await (await fetch(second.origin + '/__local/versions', { headers: { 'X-Templates-Local': session.token } })).json();
    assert.equal(restored.versions.length, 1);
    assert.equal(restored.versions[0].previewUrl, second.previewOrigin + new URL(result.previewUrl).pathname);
  } finally { await second.close(); }
});

test('Version list requires its local key, rejects foreign origins and reports an empty state', async t => {
  const { service, headers } = await setup(t), url = service.origin + '/__local/versions';
  assert.equal((await fetch(url)).status, 403);
  assert.equal((await fetch(url, { headers: { ...headers, Origin: service.previewOrigin } })).status, 403);
  const response = await fetch(url, { headers });
  assert.equal(response.status, 200); assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), { versions: [], used: 0, limit: 20, unavailable: 0 });
});

test('List returns only review metadata, keeps duplicate names and sorts newest first', async t => {
  const { service, headers, post } = await setup(t);
  const first = await (await post()).json(), second = await (await post()).json();
  const result = await (await fetch(service.origin + '/__local/versions', { headers })).json();
  assert.equal(result.used, 2); assert.equal(result.unavailable, 0);
  assert.equal(result.versions[0].versionId, second.versionId);
  assert.equal(result.versions[1].versionId, first.versionId);
  for (const item of result.versions) {
    assert.deepEqual(Object.keys(item).sort(), ['createdAt', 'name', 'previewUrl', 'published', 'templateId', 'versionId']);
    assert.equal(item.name, project.name); assert.equal(item.published, false);
    assert.equal((await fetch(item.previewUrl)).status, 200);
  }
});

test('Damaged and incomplete versions use capacity but never expose stale opening links', async t => {
  const { service, headers, post } = await setup(t);
  const first = await (await post()).json();
  await post();
  const id = new URL(first.previewUrl).pathname.split('/')[1];
  fs.appendFileSync(path.join(service.root, id, 'site/index.html'), 'broken');
  fs.mkdirSync(path.join(service.root, 'a'.repeat(36)));
  const result = await (await fetch(service.origin + '/__local/versions', { headers })).json();
  assert.equal(result.used, 3); assert.equal(result.unavailable, 2); assert.equal(result.versions.length, 1);
  assert.ok(!result.versions.some(item => item.previewUrl === first.previewUrl));
  assert.equal(fs.existsSync(path.join(service.root, id)), true);
});

async function deletionFixture(t) {
  const setupResult = await setup(t), { service, post, headers } = setupResult;
  const created = await (await post()).json(), id = new URL(created.previewUrl).pathname.split('/')[1];
  const url = service.origin + '/__local/versions/' + id;
  const remove = (body = { versionId: created.versionId, confirm: true }, extraHeaders = {}) => fetch(url, { method: 'DELETE', headers: { ...headers, ...extraHeaders }, body: JSON.stringify(body) });
  return { ...setupResult, created, id, url, remove };
}

test('Delete requires explicit matching confirmation, JSON, local origin and key', async t => {
  const { service, created, remove, headers } = await deletionFixture(t);
  assert.equal((await remove({ versionId: created.versionId })).status, 400);
  assert.equal((await remove({ versionId: created.versionId, confirm: false })).status, 400);
  assert.equal((await remove({ versionId: 'wrong', confirm: true })).status, 409);
  assert.equal((await remove(undefined, { Origin: 'https://example.test' })).status, 403);
  assert.equal((await remove(undefined, { 'X-Templates-Local': '' })).status, 403);
  assert.equal((await remove(undefined, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await remove({ versionId: 'x'.repeat(1100), confirm: true })).status, 413);
  assert.equal((await fetch(service.origin + '/__local/versions/..%2foutside', { method: 'DELETE', headers, body: '{}' })).status, 404);
  assert.equal((await fetch(created.previewUrl)).status, 200);
});

test('Confirmed delete frees quota, invalidates only its link and preserves a sibling version', async t => {
  const { service, post, headers, created, id, remove } = await deletionFixture(t);
  const sibling = await (await post()).json();
  const siblingPage = sibling.previewUrl.replace('preview.html', 'site/index.html');
  const before = await (await fetch(siblingPage)).text();
  for (let i = 0; i < 18; i++) fs.mkdirSync(path.join(service.root, String(i).padStart(36, '0')));
  assert.equal((await post()).status, 409);
  const result = await remove(); assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { deleted: true, versionId: created.versionId });
  assert.equal(fs.existsSync(path.join(service.root, id)), false);
  assert.equal((await fetch(created.previewUrl)).status, 404);
  assert.equal(await (await fetch(siblingPage)).text(), before);
  const listing = await (await fetch(service.origin + '/__local/versions', { headers })).json();
  assert.equal(listing.used, 19); assert.equal((await post()).status, 201);
  assert.equal((await remove()).status, 404);
});

test('Changed files stop deletion before any remaining file is unlinked', async t => {
  const { service, id, remove, headers } = await deletionFixture(t);
  const directory = path.join(service.root, id), preview = fs.readFileSync(path.join(directory, 'preview.html'));
  fs.appendFileSync(path.join(directory, 'site/index.html'), 'changed');
  assert.equal((await remove()).status, 409);
  assert.deepEqual(fs.readFileSync(path.join(directory, 'preview.html')), preview);
  const list = await (await fetch(service.origin + '/__local/versions', { headers })).json();
  assert.equal(list.used, 1); assert.equal(list.unavailable, 1);
});

test('Directory junctions and unexpected files block deletion without touching external files', async t => {
  const { service, id, remove } = await deletionFixture(t);
  const external = root(), keep = path.join(external, 'keep.txt'); fs.writeFileSync(keep, 'preserve');
  fs.symlinkSync(external, path.join(service.root, id, 'site/external'), 'junction');
  assert.equal((await remove()).status, 409);
  assert.equal(fs.readFileSync(keep, 'utf8'), 'preserve');
  assert.ok(fs.existsSync(path.join(service.root, id, 'preview.html')));
});

test('Pending delete blocks other mutations; disconnect before confirmation retains the version', async t => {
  const { created, url, headers, post, remove } = await deletionFixture(t);
  const slow = http.request(url, { method: 'DELETE', headers: { ...headers, 'Content-Length': 100 } });
  slow.on('error', () => {}); slow.write('{'); await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal((await post()).status, 409); assert.equal((await remove()).status, 409);
  slow.destroy(); await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal((await fetch(created.previewUrl)).status, 200);
  assert.equal((await remove()).status, 200);
});

test('A disk failure reports incomplete deletion, keeps the slot occupied and serves no partial copy', async t => {
  const { service, id, created, remove, headers } = await deletionFixture(t);
  const directory = path.join(service.root, id), unlink = fs.unlinkSync;
  let removed = 0;
  fs.unlinkSync = filename => {
    if (filename.startsWith(directory + path.sep) && removed++ === 1) throw Object.assign(new Error('Synthetic locked file'), { code: 'EACCES' });
    return unlink(filename);
  };
  try { assert.equal((await remove()).status, 409); } finally { fs.unlinkSync = unlink; }
  assert.equal(fs.existsSync(directory), true);
  assert.equal((await fetch(created.previewUrl)).status, 409);
  const listing = await (await fetch(service.origin + '/__local/versions', { headers })).json();
  assert.equal(listing.used, 1); assert.equal(listing.unavailable, 1); assert.equal(listing.versions.length, 0);
});
