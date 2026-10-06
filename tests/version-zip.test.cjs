const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), http = require('node:http');
const JSZip = require('jszip'), sharp = require('sharp');
const { createVersion, verifyVersion } = require('../tools/publication-version.cjs');
const { createVersionZip } = require('../tools/version-zip.cjs');
const { startLocalServer } = require('../tools/local-version-server.cjs');
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'templates-zip-test-'));

test('All nine ZIPs contain byte-identical reviewed pages, fonts and no internal files', async () => {
  for (const templateId of ['restaurang','salong','byggfirma','butik','portfolio','cafe','gym','konsult','hemservice']) {
    const directory = path.join(temp(), 'version');
    const { manifest } = await createVersion({ name: 'Café ÅÄÖ / "file"', templateId, values: {} }, directory);
    const result = await createVersionZip(directory, manifest.integrity);
    assert.equal(result.filename, 'templates-version-' + manifest.versionId + '.zip');
    const zip = await JSZip.loadAsync(result.bytes, { checkCRC32: true });
    const site = manifest.files.filter(f => f.path.startsWith('site/'));
    assert.deepEqual(Object.keys(zip.files).sort(), [...site.map(f => f.path.slice(5)), 'LASMIG.txt'].sort());
    for (const file of site) assert.deepEqual(await zip.file(file.path.slice(5)).async('nodebuffer'), fs.readFileSync(path.join(directory, file.path)));
    const readme = await zip.file('LASMIG.txt').async('string');
    assert.match(readme, /Nedladdningen publicerar ingenting/); assert.ok(readme.includes(manifest.versionId));
    assert.deepEqual(verifyVersion(directory), manifest);
  }
});

test('ZIP preserves prepared image bytes and reviewed text after the draft changes', async () => {
  const directory = path.join(temp(), 'version');
  const image = await sharp({ create: { width: 20, height: 10, channels: 4, background: '#84664380' } }).png().toBuffer();
  const project = { templateId: 'cafe', values: { 'index.html': { 2: 'data:image/png;base64,' + image.toString('base64'), 3: 'Granskad rubrik' } } };
  const { manifest } = await createVersion(project, directory);
  project.values['index.html'][3] = 'Ändrat utkast'; project.values['index.html'][2] = '';
  const zip = await JSZip.loadAsync((await createVersionZip(directory, manifest.integrity)).bytes);
  const html = await zip.file('index.html').async('string');
  assert.match(html, /Granskad rubrik/); assert.doesNotMatch(html, /Ändrat utkast/);
  const file = manifest.files.find(f => f.path.startsWith('site/images/'));
  assert.ok(file); assert.deepEqual(await zip.file(file.path.slice(5)).async('nodebuffer'), fs.readFileSync(path.join(directory, file.path)));
});

test('ZIP refuses changed, missing and unexpected files or a wrong expected integrity', async () => {
  for (const damage of ['changed', 'missing', 'extra', 'integrity']) {
    const directory = path.join(temp(), 'version');
    const { manifest } = await createVersion({ templateId: 'restaurang', values: {} }, directory);
    if (damage === 'changed') fs.appendFileSync(path.join(directory, 'site/index.html'), 'changed');
    if (damage === 'missing') fs.unlinkSync(path.join(directory, 'site/index.html'));
    if (damage === 'extra') fs.writeFileSync(path.join(directory, 'site/secret.txt'), 'not for export');
    await assert.rejects(createVersionZip(directory, damage === 'integrity' ? '0'.repeat(64) : manifest.integrity));
  }
});

test('Download API protects ZIP delivery, retains versions and rejects damaged or deleted copies', async t => {
  const service = await startLocalServer({ port: 0, previewPort: 0, root: temp() }); t.after(() => service.close());
  const { token } = await (await fetch(service.origin + '/__local/session')).json();
  const headers = { Origin: service.origin, 'Content-Type': 'application/json', 'X-Templates-Local': token };
  const create = async () => (await fetch(service.origin + '/__local/versions', { method: 'POST', headers, body: JSON.stringify({ name: 'Prov', templateId: 'cafe', values: {} }) })).json();
  const first = await create(), sibling = await create(), id = new URL(first.previewUrl).pathname.split('/')[1];
  const url = service.origin + '/__local/versions/' + id + '/download';
  const slow = http.request(service.origin + '/__local/versions', { method: 'POST', headers: { ...headers, 'Content-Length': 1000 } });
  slow.on('error', () => {}); slow.write('{');
  try {
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal((await fetch(url, { headers })).status, 409);
  } finally { slow.destroy(); }
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal((await fetch(url)).status, 403);
  assert.equal((await fetch(url, { headers: { ...headers, Origin: service.previewOrigin } })).status, 403);
  assert.equal((await fetch(url, { headers: { ...headers, 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await fetch(service.previewOrigin + new URL(url).pathname, { headers })).status, 404);
  assert.equal((await fetch(url.replace(id, '0'.repeat(36)), { headers })).status, 404);
  const response = await fetch(url, { headers }); assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'application/zip'); assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Content-Disposition'), 'attachment; filename="templates-version-' + first.versionId + '.zip"');
  const bytes = Buffer.from(await response.arrayBuffer()); assert.equal(bytes.length, Number(response.headers.get('Content-Length')));
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true }); assert.ok(zip.file('index.html'));
  assert.equal((await fetch(first.previewUrl)).status, 200); assert.equal((await fetch(sibling.previewUrl)).status, 200);
  fs.appendFileSync(path.join(service.root, id, 'site/index.html'), 'tampered');
  const damaged = await fetch(url, { headers }); assert.equal(damaged.status, 409); assert.match(damaged.headers.get('Content-Type'), /application\/json/); assert.equal(damaged.headers.get('Content-Disposition'), null);
  const secondId = new URL(sibling.previewUrl).pathname.split('/')[1];
  assert.equal((await fetch(service.origin + '/__local/versions/' + secondId, { method: 'DELETE', headers, body: JSON.stringify({ confirm: true, versionId: sibling.versionId }) })).status, 200);
  assert.equal((await fetch(url.replace(id, secondId), { headers })).status, 404);
});
