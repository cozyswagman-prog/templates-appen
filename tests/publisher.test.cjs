// T06: publiceringskärnan med riktig renderare och minneslagring (samma beteende som R2/D1-adaptrarna).
// Bevisar versionslogiken lokalt; ingen sajt publiceras på internet.
const { test } = require('node:test'), assert = require('node:assert/strict');
const { renderProject } = require('../tools/render-project.cjs');
const { createPublisher, memoryStores, SECURITY_HEADERS } = require('../server/publisher.mjs');

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const cafe = (name, extra = {}) => ({ name, templateId: 'cafe', values: { 'index.html': { 1: name, 3: name + ' – Hem ÅÄÖ' }, 'meny.html': { 1: name, 6: '47 kr' }, 'kontakt.html': { 1: name, 4: png, ...extra } } });
const bytesOf = data => Buffer.from(typeof data === 'string' ? data : data);
function setup({ bucket: wrap } = {}) {
  const { bucket, sites } = memoryStores();
  sites.create('qa-cafe', 'qa-cafe.sites.test'); sites.create('annan', 'annan.sites.test');
  let n = 0; const ids = () => '00000000-0000-4000-8000-' + String(++n).padStart(12, '0');
  const b = wrap ? wrap(bucket) : bucket;
  return { bucket, sites, publisher: createPublisher({ bucket: b, sites, render: renderProject, newId: ids, now: () => '2026-10-06T00:00:00Z' }) };
}
const body = r => Buffer.from(r.body).toString();

test('A published site serves exactly the rendered files with safe headers and revalidation', async () => {
  const { publisher } = setup(), project = cafe('QA Café Göteborg');
  const before = await publisher.serve('qa-cafe.sites.test', '/');
  assert.equal(before.status, 404, 'nothing is public before the first publication');
  const result = await publisher.publish('qa-cafe', project);
  assert.equal(result.revision, 1); assert.equal(result.previous, null);
  const expected = renderProject(project);
  for (const [name, data] of expected) {
    const r = await publisher.serve('QA-CAFE.sites.test:443', '/' + name);
    assert.equal(r.status, 200, name);
    // The publication layer changes only resource URLs; renderer baselines stay intact.
    const actual = name.endsWith('.html') ? Buffer.from(body(r).replaceAll('_v/' + result.versionId + '/', '')) : Buffer.from(r.body);
    assert.deepEqual(actual, bytesOf(data), name);
  }
  const index = await publisher.serve('qa-cafe.sites.test', '/');
  assert.match(body(index), /QA Café Göteborg – Hem ÅÄÖ/);
  assert.equal(index.headers['Content-Type'], 'text/html; charset=utf-8');
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) assert.equal(index.headers[k], v);
  assert.equal(index.headers['Cache-Control'], 'public, max-age=0, must-revalidate');
  const again = await publisher.serve('qa-cafe.sites.test', '/', { ifNoneMatch: index.headers.ETag });
  assert.equal(again.status, 304); assert.equal(again.body, null);
  assert.equal((await publisher.serve('qa-cafe.sites.test', '/images/bild-1.png')).headers['Content-Type'], 'image/png');
});

test('Only files the exporter creates are reachable: no manifest, versions, traversal or other sites', async () => {
  const { publisher } = setup(); const { versionId } = await publisher.publish('qa-cafe', cafe('Café A'));
  for (const path of ['/manifest.json', '/../annan/index.html', '/%2e%2e/index.html', '/sites/qa-cafe/v/' + versionId + '/index.html', '/index.html%00', '/fonts/../index.html', '/.env', '/INDEX.HTML'])
    assert.equal((await publisher.serve('qa-cafe.sites.test', path)).status, 404, path);
  assert.equal((await publisher.serve('annan.sites.test', '/')).status, 404, 'an unpublished site shows nothing');
  assert.equal((await publisher.serve('okand.sites.test', '/')).status, 404);
});

test('A new publication switches completely; rollback returns to the earlier complete version', async () => {
  const { publisher } = setup();
  const v1 = await publisher.publish('qa-cafe', cafe('Version ett'));
  const v2 = await publisher.publish('qa-cafe', cafe('Version två'));
  assert.equal(v2.previous, v1.versionId);
  for (const page of ['/', '/meny.html', '/kontakt.html']) assert.match(body(await publisher.serve('qa-cafe.sites.test', page)), /Version två/);
  const back = await publisher.rollback('qa-cafe', v1.versionId);
  assert.equal(back.revision, 3);
  for (const page of ['/', '/meny.html', '/kontakt.html']) {
    const html = body(await publisher.serve('qa-cafe.sites.test', page));
    assert.match(html, /Version ett/); assert.doesNotMatch(html, /Version två/);
  }
  await assert.rejects(publisher.rollback('qa-cafe', '00000000-0000-4000-8000-999999999999'), { code: 'unknown-version' });
  const other = await publisher.publish('annan', cafe('Annan sajt'));
  await assert.rejects(publisher.rollback('qa-cafe', other.versionId), { code: 'unknown-version' }, 'a version of another site cannot be activated');
});

test('An interrupted or incomplete job leaves the previous site untouched', async () => {
  let failAfter = Infinity, puts = 0, drop = null;
  const { publisher, sites } = setup({ bucket: b => ({ ...b,
    async put(key, bytes, meta) { if (++puts > failAfter) throw new Error('nätet bröts'); if (drop && key.endsWith(drop)) return; return b.put(key, bytes, meta); } }) });
  await publisher.publish('qa-cafe', cafe('Stabil version'));
  const stable = body(await publisher.serve('qa-cafe.sites.test', '/meny.html'));
  puts = 0; failAfter = 3;
  await assert.rejects(publisher.publish('qa-cafe', cafe('Avbruten version')), /nätet bröts/);
  failAfter = Infinity; drop = 'images/bild-1.png';
  await assert.rejects(publisher.publish('qa-cafe', cafe('Ofullständig version')), { code: 'incomplete' });
  assert.equal((await sites.get('qa-cafe')).revision, 1);
  assert.equal(body(await publisher.serve('qa-cafe.sites.test', '/meny.html')), stable);
  assert.equal((await publisher.serve('qa-cafe.sites.test', '/kontakt.html')).status, 200);
});

test('Two simultaneous publications: exactly one wins and the site never mixes their files', async () => {
  const { publisher } = setup();
  await publisher.publish('qa-cafe', cafe('Start'));
  const [a, b] = await Promise.allSettled([publisher.publish('qa-cafe', cafe('Flik A')), publisher.publish('qa-cafe', cafe('Flik B'))]);
  const won = [a, b].filter(r => r.status === 'fulfilled'), lost = [a, b].filter(r => r.status === 'rejected');
  assert.equal(won.length, 1); assert.equal(lost[0].reason.code, 'conflict');
  const winner = a.status === 'fulfilled' ? 'Flik A' : 'Flik B', loser = winner === 'Flik A' ? 'Flik B' : 'Flik A';
  for (const page of ['/', '/meny.html', '/kontakt.html']) {
    const html = body(await publisher.serve('qa-cafe.sites.test', page));
    assert.match(html, new RegExp(winner)); assert.doesNotMatch(html, new RegExp(loser));
  }
  await assert.rejects(publisher.publish('qa-cafe', cafe('Gammal flik'), { expectedRevision: 1 }), { code: 'conflict' });
});

test('Customer text is published as text, and unsafe input is refused before anything is written', async () => {
  const { publisher, bucket } = setup();
  await publisher.publish('qa-cafe', { ...cafe('Säker'), values: { 'index.html': { 3: '<script>alert(1)</script><img src=x onerror=alert(2)>' } } });
  const html = body(await publisher.serve('qa-cafe.sites.test', '/'));
  assert.doesNotMatch(html, /<script>alert\(1\)/); assert.doesNotMatch(html, /<img src=x onerror/); assert.match(html, /&lt;script&gt;alert\(1\)/);
  const written = bucket.keys().length;
  for (const bad of [
    { ...cafe('X'), templateId: 'okand' },
    { ...cafe('X'), values: { 'kontakt.html': { 4: 'data:image/svg+xml;base64,PHN2Zy8+' } } },
    { ...cafe('X'), values: { 'kontakt.html': { 4: 'templates-image:v1:' + 'a'.repeat(64) + '.png' } } },
    { ...cafe('X'), values: { '../index.html': { 1: 'X' } } },
    { ...cafe('X'), name: '' }
  ]) await assert.rejects(publisher.publish('qa-cafe', bad), { code: 'invalid' });
  assert.equal(bucket.keys().length, written, 'refused projects write nothing');
});

test('A page keeps its own images and fonts when a new version is published', async () => {
  const { bucket, sites } = memoryStores();
  await sites.create('pinned-cafe', 'pinned.sites.test');
  const publisher = createPublisher({ bucket, sites, render: p => new Map([
    ['index.html', '<a href="meny.html">Meny</a><img src="images/bild-1.png"><style>@font-face{src:url(\'fonts/inter-400.woff2\')}</style>'],
    ['images/bild-1.png', p.name], ['fonts/inter-400.woff2', 'font-' + p.name]
  ]) });
  const first = await publisher.publish('pinned-cafe', cafe('old'));
  const oldPage = body(await publisher.serve('pinned.sites.test', '/'));
  assert.match(oldPage, new RegExp('_v/' + first.versionId + '/images/bild-1.png'));
  assert.match(oldPage, new RegExp('_v/' + first.versionId + '/fonts/inter-400.woff2'));
  assert.match(oldPage, /href="meny.html"/, 'page navigation stays at stable public URLs');
  const second = await publisher.publish('pinned-cafe', cafe('new'));
  for (const [name, expected] of [['images/bild-1.png', 'old'], ['fonts/inter-400.woff2', 'font-old']]) {
    const resource = await publisher.serve('pinned.sites.test', '/_v/' + first.versionId + '/' + name);
    assert.equal(resource.status, 200); assert.equal(body(resource), expected);
    assert.equal(resource.headers['X-Templates-Version'], first.versionId);
    assert.match(resource.headers['Cache-Control'], /immutable/);
    assert.equal((await publisher.serve('pinned.sites.test', '/_v/' + first.versionId + '/' + name, { ifNoneMatch: resource.headers.ETag })).status, 304);
  }
  assert.equal(body(await publisher.serve('pinned.sites.test', '/images/bild-1.png')), 'new');
  assert.match(body(await publisher.serve('pinned.sites.test', '/')), new RegExp('_v/' + second.versionId + '/'));
  await publisher.rollback('pinned-cafe', first.versionId);
  assert.match(body(await publisher.serve('pinned.sites.test', '/')), new RegExp('_v/' + first.versionId + '/'));
});

test('Pinned URLs cannot expose losing uploads, another site, manifests or old HTML', async () => {
  const { bucket, sites } = memoryStores();
  await sites.create('pinned-cafe', 'pinned.sites.test');
  await sites.create('other-cafe', 'other.sites.test');
  const render = () => new Map([['index.html','<img src="images/bild-1.png">'],['images/bild-1.png','image']]);
  const publisher = createPublisher({ bucket, sites, render });
  const live = await publisher.publish('pinned-cafe', cafe('live'));
  const other = await publisher.publish('other-cafe', cafe('other'));
  const lost = '00000000-0000-4000-8000-000000000099';
  const loser = createPublisher({ bucket, sites: { ...sites, swap: async () => false }, render, newId: () => lost });
  await assert.rejects(loser.publish('pinned-cafe', cafe('loser')), {code:'conflict'});
  assert.ok(bucket.keys().some(key => key.includes(lost + '/manifest.json')), 'losing version is complete but private');
  for (const url of [
    '/_v/' + lost + '/images/bild-1.png', '/_v/' + other.versionId + '/images/bild-1.png',
    '/_v/' + live.versionId + '/index.html', '/_v/' + live.versionId + '/manifest.json',
    '/_v/' + live.versionId + '/images/%2e%2e/index.html'
  ]) assert.equal((await publisher.serve('pinned.sites.test', url)).status,404,url);
});
