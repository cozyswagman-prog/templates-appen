// Inloggat publicerings-API mot en simulerad Supabase som efterliknar RLS (egna rader och egna bilder).
// Bevisar API:ts regler lokalt; riktiga Supabase och Cloudflare provas separat.
const { test } = require('node:test'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { renderProject } = require('../tools/render-project.cjs');
const { createPublisher, memoryStores } = require('../server/publisher.mjs');
const { createAccountSource } = require('../server/account-source.mjs');
const { handlePublishRequest } = require('../server/publish-api.mjs');

const A = 'a1111111-1111-4111-8111-111111111111', B = 'b2222222-2222-4222-8222-222222222222', C = 'c3333333-3333-4333-8333-333333333333';
const APP = 'https://app.templates.test', KEY = 'sb_publishable_prov';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const png2 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const name = (bytes, g) => createHash('sha256').update(bytes).digest('hex') + '-' + g.repeat(32) + '.png';
const imgA = name(png, 'a'), imgA2 = name(png2, 'c'), imgB = name(png2, 'b');
const content = (title, img, named) => ({ name: title, templateId: 'cafe', values: { 'index.html': { 3: title }, 'kontakt.html': { 4: 'templates-image:v1:' + img } },
  ...(named ? { site: { pages: { 'index.html': { images: { 'weekly.photo': { src: 'templates-image:v1:' + named } } } } } } : {}) });

function world() {
  const state = { tokens: { 'token-a': A, 'token-b': B, 'token-c': C }, objects: { [A + '/' + imgA]: png, [A + '/' + imgA2]: png2, [B + '/' + imgB]: png2 }, calls: [],
    projects: [{ owner_id: A, id: 'pa', content: content('A:s café', imgA, imgA2), revision: 4 }, { owner_id: B, id: 'pb', content: content('B:s café', imgB), revision: 1 }] };
  const fetch = async (url, init = {}) => {
    const u = new URL(url), token = (init.headers?.Authorization || '').replace('Bearer ', ''), uid = state.tokens[token];
    state.calls.push(u.pathname); assert.equal(init.headers?.apikey, KEY, 'only the publishable key is sent');
    if (u.pathname === '/auth/v1/user') return uid ? Response.json({ id: uid }) : new Response('{}', { status: 401 });
    if (u.pathname === '/rest/v1/projects') { const id = u.searchParams.get('id').replace(/^eq\./, ''); return Response.json(state.projects.filter(p => p.owner_id === uid && p.id === id)); }
    const m = /^\/storage\/v1\/object\/authenticated\/project-images\/([^/]+)\/(.+)$/.exec(u.pathname);
    if (m) { const bytes = m[1] === uid && state.objects[m[1] + '/' + m[2]]; return bytes ? new Response(bytes) : new Response('', { status: 400 }); }
    return new Response('', { status: 404 });
  };
  const { bucket, sites } = memoryStores();
  sites.create('cafe-a', 'cafe-a.sites.test', A); sites.create('cafe-b', 'cafe-b.sites.test', B);
  const publisher = createPublisher({ bucket, sites, render: renderProject });
  const source = createAccountSource({ url: 'https://prov.supabase.test', publishableKey: KEY, fetch });
  const env = { APP_ORIGIN: APP, SITES_DOMAIN: 'sites.test' };
  const call = (body, { token = 'token-a', origin = APP, method = 'POST', path = '/api/publish', envOver = {} } = {}) => handlePublishRequest(
    new Request('https://publish.templates.test' + path, { method, headers: { ...(origin ? { Origin: origin } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Content-Type': 'application/json' }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) }),
    { env: { ...env, ...envOver }, sites, publisher, source });
  return { state, bucket, sites, publisher, call };
}

test('The owner publishes an account project; images come from the account and are verified', async () => {
  const w = world();
  const r = await w.call({ siteId: 'cafe-a', projectId: 'pa' });
  const body = await r.json();
  assert.equal(r.status, 200, JSON.stringify(body)); assert.equal(body.url, 'https://cafe-a.sites.test/'); assert.equal(body.projectRevision, 4);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), APP);
  const kontakt = await w.publisher.serve('cafe-a.sites.test', '/kontakt.html');
  assert.match(Buffer.from(kontakt.body).toString(), /images\/bild-\d\.png/);
  const served = [];
  for (const n of [1, 2]) { const img = await w.publisher.serve('cafe-a.sites.test', '/images/bild-' + n + '.png'); if (img.status === 200) served.push(Buffer.from(img.body)); }
  assert.ok(served.some(b => b.equals(png)) && served.some(b => b.equals(png2)), 'slot image and named image are both published');
  assert.ok(w.state.calls.every(p => !/service|admin/.test(p)));
});

test('Missing or invalid login, another account\'s site or project: refused and nothing is written', async () => {
  const w = world(), before = w.bucket.keys().length;
  assert.equal((await w.call({ siteId: 'cafe-a', projectId: 'pa' }, { token: null })).status, 401);
  assert.equal((await w.call({ siteId: 'cafe-a', projectId: 'pa' }, { token: 'forfalskad' })).status, 401);
  const other = await w.call({ siteId: 'cafe-b', projectId: 'pa' });
  const unknown = await w.call({ siteId: 'finns-ej', projectId: 'pa' });
  assert.equal(other.status, 404); assert.equal(unknown.status, 404);
  assert.deepEqual(await other.json(), await unknown.json(), 'another owner\'s site looks exactly like an unknown site');
  assert.equal((await w.call({ siteId: 'cafe-a', projectId: 'pb' })).status, 404, 'B\'s project is invisible to A (RLS)');
  assert.equal((await w.call({ siteId: 'cafe-b', projectId: 'pb' }, { token: 'token-a' })).status, 404);
  assert.equal(w.bucket.keys().length, before);
  assert.equal((await w.publisher.serve('cafe-a.sites.test', '/')).status, 404);
});

test('Only the app origin may call; preflight is answered only for it', async () => {
  const w = world();
  assert.equal((await w.call({ siteId: 'cafe-a', projectId: 'pa' }, { origin: 'https://evil.example' })).status, 403);
  const ok = await w.call(null, { method: 'OPTIONS' });
  assert.equal(ok.status, 204); assert.match(ok.headers.get('Access-Control-Allow-Headers'), /Authorization/);
  assert.equal((await w.call(null, { method: 'OPTIONS', origin: 'https://evil.example' })).status, 403);
  assert.equal((await w.call(null, { method: 'GET' })).status, 405);
  assert.equal((await w.call({}, { path: '/annat' })).status, 404);
  assert.equal((await w.call({ siteId: 'X!', projectId: 'pa' })).status, 400);
});

test('A tampered image, a stale revision or a missing plan never changes the live site', async () => {
  const w = world();
  assert.equal((await w.call({ siteId: 'cafe-a', projectId: 'pa' })).status, 200);
  const live = Buffer.from((await w.publisher.serve('cafe-a.sites.test', '/kontakt.html')).body).toString();
  w.state.objects[A + '/' + imgA] = Buffer.from('manipulerad');
  const tampered = await w.call({ siteId: 'cafe-a', projectId: 'pa' });
  assert.equal(tampered.status, 422); assert.equal((await tampered.json()).code, 'image');
  w.state.objects[A + '/' + imgA] = png;
  const stale = await w.call({ siteId: 'cafe-a', projectId: 'pa', expectedRevision: 0 });
  assert.equal(stale.status, 409);
  assert.equal((await w.call({ siteId: 'cafe-a', projectId: 'pa' }, { envOver: { REQUIRE_PLAN: '1' } })).status, 402);
  assert.equal(Buffer.from((await w.publisher.serve('cafe-a.sites.test', '/kontakt.html')).body).toString(), live);
});

test('Named image settings accept only embedded images; the source refuses a secret key', async () => {
  const w = world();
  w.state.projects[0].content.site = { pages: { 'index.html': { images: { 'weekly.photo': { src: 'https://evil.example/x.png' } } } } };
  const r = await w.call({ siteId: 'cafe-a', projectId: 'pa' });
  assert.equal(r.status, 422); assert.equal((await r.json()).code, 'invalid');
  assert.throws(() => createAccountSource({ url: 'https://x.supabase.test', publishableKey: 'sb_secret_x' }), /publika nyckeln/);
});

test('Sites: list own, create one per account with a valid free address, never reveal others', async () => {
  const w = world();
  const list = async token => (await (await w.call(null, { method: 'GET', path: '/api/sites', token })).json());
  const a = await list('token-a');
  assert.deepEqual(a.sites.map(s => s.siteId), ['cafe-a']); assert.equal(a.domain, 'sites.test'); assert.equal(a.sites[0].url, 'https://cafe-a.sites.test/');
  assert.deepEqual((await list('token-c')).sites, []);
  assert.equal((await w.call(null, { method: 'GET', path: '/api/sites', token: null })).status, 401);
  for (const slug of ['ab', 'www', 'Kafe', '-kafe', 'kafe-', 'kafé', 'a'.repeat(41)]) assert.equal((await w.call({ slug }, { path: '/api/sites', token: 'token-c' })).status, 422, slug);
  assert.match((await (await w.call({ slug: 'www' }, { path: '/api/sites', token: 'token-c' })).json()).error, /reserverad/, 'a reserved word gets its own message');
  assert.equal((await w.call({ slug: 'cafe-a' }, { path: '/api/sites', token: 'token-c' })).status, 409, 'address of another account is taken');
  const made = await w.call({ slug: 'kafe-c' }, { path: '/api/sites', token: 'token-c' });
  assert.equal(made.status, 201); assert.deepEqual(await made.json(), { siteId: 'kafe-c', host: 'kafe-c.sites.test', url: 'https://kafe-c.sites.test/', active: null, revision: 0 });
  const second = await w.call({ slug: 'kafe-c2' }, { path: '/api/sites', token: 'token-c' });
  assert.equal(second.status, 409); assert.equal((await second.json()).code, 'site-exists');
  assert.equal((await w.call({ slug: 'kafe-x' }, { path: '/api/sites', token: 'token-c', envOver: { SITES_DOMAIN: '' } })).status, 503);
  assert.equal((await w.publisher.serve('kafe-c.sites.test', '/')).status, 404, 'a new address shows nothing until published');
  await assert.rejects(w.sites.create('annan', 'annan.sites.test', C), { code: 'site-exists' }, 'the store itself enforces one site per account');
});

test('Shared address (workers.dev): sites are created and listed as https://<host>/<address>/', async () => {
  const w = world(), envOver = { SITES_DOMAIN: '', SITES_PATH_HOST: 'templates-sajter.prov.workers.dev' };
  const status = await (await w.call(null, { method: 'GET', path: '/api/sites', token: 'token-c', envOver })).json();
  assert.equal(status.domain, 'templates-sajter.prov.workers.dev'); assert.equal(status.addressStyle, 'path');
  const made = await w.call({ slug: 'kafe-c' }, { path: '/api/sites', token: 'token-c', envOver });
  assert.equal(made.status, 201);
  assert.deepEqual(await made.json(), { siteId: 'kafe-c', host: 'templates-sajter.prov.workers.dev/kafe-c', url: 'https://templates-sajter.prov.workers.dev/kafe-c/', active: null, revision: 0 });
  assert.equal((await (await w.call(null, { method: 'GET', path: '/api/sites', token: 'token-a' })).json()).addressStyle, 'subdomain');
});
