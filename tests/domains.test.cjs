// Egna domäner (T08): normalisering, TXT-utmaning, skydd mot övertagande, utgång, gräns, bortkoppling,
// DNS-svar, API-rutterna och D1-lagringen mot server/schema.sql. Ingen riktig DNS eller Cloudflare används.
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { normalizeHostname, createDomains, memoryDomainStore, d1DomainStore, dohResolver, domainsFromEnv, CHALLENGE_PREFIX, PENDING_DAYS } = require('../server/domains.mjs');
const { handlePublishRequest } = require('../server/publish-api.mjs');

const A = 'a1111111-1111-4111-8111-111111111111', B = 'b2222222-2222-4222-8222-222222222222';
const code = c => e => e.code === c;

// Falsk DNS: TXT-värden per namn, som en domänleverantör skulle publicera dem.
function world(store = memoryDomainStore()) {
  const dns = new Map(), clock = { t: Date.UTC(2026, 9, 6) };
  const domains = createDomains({ store, resolveTxt: async name => dns.get(name) || [], now: () => clock.t, reserved: ['templates-api.templates-hemsidor.workers.dev', 'sites.test'] });
  const publish = (record) => dns.set(record.name, [...(dns.get(record.name) || []), record.value]);
  return { dns, clock, domains, publish };
}

test('Hostnames are normalized to lowercase ASCII and unusable names are refused', () => {
  assert.equal(normalizeHostname('  WWW.Kafé-Exempel.se. '), 'www.xn--kaf-exempel-dbb.se');
  assert.equal(normalizeHostname('https://www.exempel.se/meny.html?x=1'), 'www.exempel.se');
  for (const bad of ['', 'exempel', 'localhost', '127.0.0.1', '[::1]', 'exempel.123', 'a..se', '-bad.se', 'x'.repeat(64) + '.se', 'kund.test', 'cafe.workers.dev', 'x.pages.dev'])
    assert.throws(() => normalizeHostname(bad), code('domain'), bad);
  assert.throws(() => normalizeHostname('cafe.sites.test', { reserved: ['sites.test'] }), code('domain'));
  assert.throws(() => normalizeHostname('sites.test', { reserved: ['sites.test'] }), code('domain'));
});

test('Only the account whose own TXT challenge is in DNS can verify; the loser cannot take it over', async () => {
  const w = world();
  const a = await w.domains.claim(A, 'cafe-a', 'www.exempel.se'), b = await w.domains.claim(B, 'cafe-b', 'www.exempel.se');
  assert.equal(a.record.name, CHALLENGE_PREFIX + '.www.exempel.se'); assert.equal(a.record.type, 'TXT');
  assert.notEqual(a.record.value, b.record.value, 'each account gets its own challenge');
  assert.match(a.record.value, /^templates=[0-9a-f]{48}$/);
  await assert.rejects(w.domains.verify(A, 'www.exempel.se'), code('domain-pending'));
  w.publish(b.record); // DNS-ägaren är B
  await assert.rejects(w.domains.verify(A, 'www.exempel.se'), code('domain-pending'), 'B:s value does not prove A');
  assert.equal((await w.domains.verify(B, 'www.exempel.se')).status, 'verified');
  assert.deepEqual(await w.domains.list(A), [], "A's competing claim is removed");
  w.publish(a.record);
  await assert.rejects(w.domains.claim(A, 'cafe-a', 'WWW.exempel.se'), code('domain-taken'));
  await assert.rejects(w.domains.verify(A, 'www.exempel.se'), code('domain-unknown'));
  await assert.rejects(w.domains.remove(A, 'www.exempel.se'), code('domain-unknown'), 'another account cannot disconnect it');
  assert.equal((await w.domains.list(B))[0].status, 'verified');
});

test('Pending claims expire; a stale DNS record left by a former owner proves nothing for a new account', async () => {
  const w = world();
  const a = await w.domains.claim(A, 'cafe-a', 'exempel.se');
  w.clock.t += PENDING_DAYS * 86400000;
  w.publish(a.record);
  await assert.rejects(w.domains.verify(A, 'exempel.se'), code('domain-expired'));
  assert.deepEqual(await w.domains.list(A), [], 'expired claims are not listed');
  const again = await w.domains.claim(A, 'cafe-a', 'exempel.se');
  assert.notEqual(again.record.value, a.record.value, 'a new claim gets a new challenge');
  w.publish(again.record);
  assert.equal((await w.domains.verify(A, 'exempel.se')).status, 'verified');
  // A kopplar bort domänen men glömmer TXT-posterna. B kan inte använda dem.
  assert.deepEqual(await w.domains.remove(A, 'exempel.se'), { hostname: 'exempel.se', removed: true });
  const b = await w.domains.claim(B, 'cafe-b', 'exempel.se');
  await assert.rejects(w.domains.verify(B, 'exempel.se'), code('domain-pending'));
  w.publish(b.record);
  assert.equal((await w.domains.verify(B, 'exempel.se')).status, 'verified');
});

test('A site can have at most two domains, and claiming the same name again returns the same challenge', async () => {
  const w = world();
  const first = await w.domains.claim(A, 'cafe-a', 'exempel.se');
  assert.deepEqual(await w.domains.claim(A, 'cafe-a', 'https://exempel.se/'), first);
  await w.domains.claim(A, 'cafe-a', 'www.exempel.se');
  await assert.rejects(w.domains.claim(A, 'cafe-a', 'shop.exempel.se'), code('domain-limit'));
  await w.domains.remove(A, 'www.exempel.se');
  assert.equal((await w.domains.claim(A, 'cafe-a', 'shop.exempel.se')).status, 'pending');
});

test('DNS over HTTPS: quoted and split TXT strings are joined; NXDOMAIN is empty; failures are reported, not passed', async () => {
  const calls = [];
  const fake = body => async (url, init) => { calls.push({ url, accept: init.headers.accept }); return typeof body === 'function' ? body() : new Response(JSON.stringify(body), { status: 200 }); };
  const answer = { Status: 0, Answer: [{ type: 16, data: '"templates=abc" "def"' }, { type: 5, data: 'cname.example.' }, { type: 16, data: '"annat"' }] };
  assert.deepEqual(await dohResolver({ fetch: fake(answer) })('_templates-verifiering.exempel.se'), ['templates=abcdef', 'annat']);
  assert.equal(calls[0].url, 'https://cloudflare-dns.com/dns-query?name=_templates-verifiering.exempel.se&type=TXT');
  assert.equal(calls[0].accept, 'application/dns-json');
  assert.deepEqual(await dohResolver({ fetch: fake({ Status: 3 }) })('x.se'), []);
  await assert.rejects(dohResolver({ fetch: fake({ Status: 2 }) })('x.se'), code('dns'));
  await assert.rejects(dohResolver({ fetch: fake(() => new Response('fel', { status: 500 })) })('x.se'), code('dns'));
  await assert.rejects(dohResolver({ fetch: async () => { throw new Error('offline'); } })('x.se'), code('dns'));
});

function d1(sqlite) {
  return { prepare(sql) { let params = []; const q = { bind: (...p) => { params = p; return q; },
    first: async () => sqlite.prepare(sql).get(...params) || null, all: async () => ({ results: sqlite.prepare(sql).all(...params) }),
    run: async () => { const r = sqlite.prepare(sql).run(...params); return { meta: { changes: Number(r.changes) } }; } }; return q; } };
}
const schemaDb = () => { const sql = new DatabaseSync(':memory:'); sql.exec('pragma foreign_keys=on;' + fs.readFileSync(path.join(__dirname, '../server/schema.sql'), 'utf8')); return sql; };

test('D1 store against the real schema: the unique index stops a second confirmed owner even if checks race', async () => {
  const sql = schemaDb(), store = d1DomainStore(d1(sql)), w = world(store);
  const a = await w.domains.claim(A, 'cafe-a', 'www.exempel.se'), b = await w.domains.claim(B, 'cafe-b', 'www.exempel.se');
  w.publish(a.record); w.publish(b.record);
  assert.equal((await w.domains.verify(A, 'www.exempel.se')).status, 'verified');
  // Simulera att B:s kontroll redan passerat innan A hann skriva: själva skrivningen nekas av indexet.
  sql.prepare("insert into custom_domains (hostname, owner_id, site_id, token, status, created_at, expires_at) values ('x.se', ?, 'cafe-b', 't', 'pending', 1, 9e15)").run(B);
  sql.prepare("insert into custom_domains (hostname, owner_id, site_id, token, status, created_at, expires_at) values ('x.se', ?, 'cafe-a', 't', 'verified', 1, 9e15)").run(A);
  await assert.rejects(store.markVerified('x.se', B, 2), code('domain-taken'));
  assert.throws(() => sql.prepare("update custom_domains set status = 'bogus' where hostname = 'x.se'").run(), /CHECK/);
  assert.equal(await store.countForSite('cafe-a', Date.UTC(2026, 9, 6)), 2);
  assert.equal(await store.activeSite('www.exempel.se'), null, 'verified is not yet active');
  sql.prepare("update custom_domains set status = 'active' where hostname = 'www.exempel.se'").run();
  assert.equal(await store.activeSite('www.exempel.se'), 'cafe-a');
  assert.deepEqual((await w.domains.list(A)).map(d => [d.hostname, d.status]), [['www.exempel.se', 'active'], ['x.se', 'verified']]);
  assert.deepEqual((await w.domains.list(B)).map(d => [d.hostname, d.status]), [['x.se', 'pending']], "B keeps only the refused pending claim");
  // Sajten kan raderas (ingen främmande nyckel som blockerar kontoavslut).
  sql.prepare("insert into sites (id, host, owner_id) values ('cafe-a', 'cafe-a.sites.test', ?)").run(A);
  sql.prepare("delete from sites where id = 'cafe-a'").run();
});

test('Turned off unless CUSTOM_DOMAINS_ENABLED=1, and the service\'s own hosts are always reserved', async () => {
  assert.equal(domainsFromEnv({}), null);
  const env = { CUSTOM_DOMAINS_ENABLED: '1', DB: d1(schemaDb()), PUBLISH_HOST: 'api.minplattform.se', SITES_DOMAIN: 'sajter.minplattform.se', APP_ORIGIN: 'https://app.minplattform.se' };
  const domains = domainsFromEnv(env, { fetch: async () => Response.json({ Status: 3 }) });
  for (const host of ['api.minplattform.se', 'kund.sajter.minplattform.se', 'app.minplattform.se']) await assert.rejects(domains.claim(A, 'cafe-a', host), code('domain'), host);
  assert.equal((await domains.claim(A, 'cafe-a', 'minplattform.se')).status, 'pending');
});

test('API: routes require login and the right origin, map errors to statuses and are refused when turned off', async () => {
  const APP = 'https://app.templates.test', w = world(), dnsRecords = w;
  const sites = { listByOwner: async id => id === A ? [{ siteId: 'cafe-a', host: 'cafe-a.sites.test', active: null, revision: 0 }] : [], get: async () => null };
  const source = { getUser: async token => ({ 'token-a': { id: A }, 'token-b': { id: B } })[token] || null };
  const call = (method, p, body, { token = 'token-a', origin = APP, domains = w.domains } = {}) => handlePublishRequest(
    new Request('https://publish.templates.test' + p, { method, headers: { ...(origin ? { Origin: origin } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Content-Type': 'application/json' }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) }),
    { env: { APP_ORIGIN: APP, SITES_DOMAIN: 'sites.test' }, sites, source, publisher: null, domains });
  const res = async r => ({ status: r.status, body: await r.json() });

  assert.equal((await res(await call('GET', '/api/domains', null, { token: null }))).status, 401);
  assert.equal((await res(await call('GET', '/api/domains', null, { origin: 'https://evil.test' }))).status, 403);
  assert.equal((await res(await call('GET', '/api/domains', null, { domains: null }))).body.code, 'config');
  assert.equal((await res(await call('DELETE', '/api/domains'))).status, 405);
  assert.equal((await res(await call('GET', '/api/sites'))).body.customDomains, true);
  assert.equal((await res(await call('GET', '/api/sites', null, { domains: null }))).body.customDomains, false);

  const added = await res(await call('POST', '/api/domains', { hostname: 'www.exempel.se' }));
  assert.equal(added.status, 201); assert.equal(added.body.status, 'pending');
  assert.equal((await res(await call('POST', '/api/domains', { hostname: 'www.exempel.se' }, { token: 'token-b' }))).body.code, 'no-site');
  const invalid = await res(await call('POST', '/api/domains', { hostname: 'localhost' }));
  assert.equal(invalid.status, 422); assert.equal(invalid.body.code, 'domain');
  const notYet = await res(await call('POST', '/api/domains/verify', { hostname: 'www.exempel.se' }));
  assert.equal(notYet.status, 409); assert.equal(notYet.body.code, 'domain-pending'); assert.match(notYet.body.error, /TXT-posten hittades inte/);
  dnsRecords.publish(added.body.record);
  assert.equal((await res(await call('POST', '/api/domains/verify', { hostname: 'www.exempel.se' }))).body.status, 'verified');
  const listed = await res(await call('GET', '/api/domains'));
  assert.deepEqual(listed.body.domains.map(d => [d.hostname, d.status]), [['www.exempel.se', 'verified']]);
  assert.equal((await res(await call('POST', '/api/domains/remove', { hostname: 'www.exempel.se' }, { token: 'token-b' }))).status, 404);
  assert.equal((await res(await call('POST', '/api/domains/remove', { hostname: 'www.exempel.se' }))).body.removed, true);
  assert.deepEqual((await res(await call('GET', '/api/domains'))).body.domains, []);
  const dnsDown = createDomains({ store: memoryDomainStore(), resolveTxt: async () => { throw Object.assign(new Error('DNS-kontrollen svarade inte.'), { code: 'dns' }); } });
  await dnsDown.claim(A, 'cafe-a', 'exempel.se');
  assert.equal((await res(await call('POST', '/api/domains/verify', { hostname: 'exempel.se' }, { domains: dnsDown }))).status, 502);
});

test('Client: domain calls use the customer token and the server\'s Swedish error text', async () => {
  const { createPublishClient } = require('../js/publish-client.js');
  const calls = [];
  const c = createPublishClient({ baseUrl: 'https://publish.test', getToken: async () => 'kundtoken', fetch: async (url, init) => {
    calls.push(init.method + ' ' + url.replace('https://publish.test', '') + (init.body ? ' ' + init.body : ''));
    if (url.endsWith('/api/sites')) return Response.json({ sites: [], customDomains: true });
    if (url.endsWith('/verify')) return Response.json({ code: 'domain-pending', error: 'TXT-posten hittades inte än.' }, { status: 409 });
    return url.endsWith('/api/domains') && init.method === 'GET' ? Response.json({ domains: [{ hostname: 'exempel.se', status: 'pending' }] }) : Response.json({ hostname: 'exempel.se' });
  } });
  assert.equal((await c.status()).customDomains, true);
  assert.equal((await c.domains())[0].hostname, 'exempel.se');
  await c.addDomain('exempel.se'); await c.removeDomain('exempel.se');
  await assert.rejects(c.verifyDomain('exempel.se'), e => e.code === 'domain-pending' && e.message === 'TXT-posten hittades inte än.');
  assert.deepEqual(calls, ['GET /api/sites', 'GET /api/domains', 'POST /api/domains {"hostname":"exempel.se"}', 'POST /api/domains/remove {"hostname":"exempel.se"}', 'POST /api/domains/verify {"hostname":"exempel.se"}']);
});
