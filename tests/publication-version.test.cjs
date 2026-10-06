const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { createHash } = require('node:crypto'), { spawnSync, spawn } = require('node:child_process');
const sharp = require('sharp');
const { createVersion, verifyVersion } = require('../tools/publication-version.cjs');
const { renderProject } = require('../tools/render-project.cjs');
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'templates-version-test-'));
const project = () => ({ id: 'private-draft-id', name: 'Versionsprov ÅÄÖ', templateId: 'cafe', values: { 'index.html': { 3: 'Första versionen' } } });
const digest = value => createHash('sha256').update(value).digest('hex');
function editManifest(root, update) {
  const filename = path.join(root, 'manifest.json'), { integrity, ...body } = JSON.parse(fs.readFileSync(filename));
  update(body); fs.writeFileSync(filename, JSON.stringify({ ...body, integrity: digest(JSON.stringify(body)) }));
}

test('Versions snapshot draft content, preserve older versions and contain only standalone delivery assets', async () => {
  const root = temp(), input = project(), before = JSON.stringify(input);
  const first = await createVersion({ app: 'templates', version: 1, project: input }, path.join(root, 'first'));
  assert.equal(JSON.stringify(input), before);
  input.values['index.html'][3] = 'Andra versionen';
  const second = await createVersion(input, path.join(root, 'second'));
  assert.notEqual(first.manifest.versionId, second.manifest.versionId);
  assert.match(fs.readFileSync(path.join(root, 'first/site/index.html'), 'utf8'), /Första versionen/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'first/site/index.html'), 'utf8'), /Andra versionen/);
  assert.match(fs.readFileSync(path.join(root, 'second/site/index.html'), 'utf8'), /Andra versionen/);
  assert.deepEqual(verifyVersion(first.directory, { expectedIntegrity: first.manifest.integrity }), first.manifest);
  assert.equal(first.manifest.published, false);
  assert.equal(first.manifest.files.filter(f => /^site\/.*\.html$/.test(f.path)).length, 3);
  assert.ok(first.manifest.files.some(f => f.path === 'site/fonts/LICENS.txt'));
  assert.doesNotMatch(JSON.stringify(first.manifest), /private-draft-id/);
  assert.deepEqual(fs.readdirSync(first.directory).sort(), ['manifest.json', 'preview.html', 'site']);
});

test('All nine template packages retain exact pages and bundled fonts', async () => {
  const root = temp();
  for (const templateId of ['restaurang','salong','byggfirma','butik','portfolio','cafe','gym','konsult','hemservice']) {
    const input = { templateId, values: {} }, destination = path.join(root, templateId);
    await createVersion(input, destination);
    const original = renderProject(input);
    for (const [name, bytes] of original) assert.deepEqual(fs.readFileSync(path.join(destination, 'site', name)), Buffer.from(bytes));
    assert.equal(verifyVersion(destination).files.length, original.size + 1);
  }
});

test('Image processing is mandatory; draft edits during decoding cannot change the snapshot', async () => {
  const root = temp(), input = project();
  const png = await sharp({ create: { width: 20, height: 10, channels: 4, background: '#84664380' } }).png().toBuffer();
  input.values['index.html'][2] = 'data:image/png;base64,' + png.toString('base64');
  const promise = createVersion(input, path.join(root, 'image'));
  input.values['index.html'][3] = 'Too late'; input.values['index.html'][2] = 'https://example.test/not-fetched.png';
  const result = await promise;
  assert.equal(result.manifest.imageReport.length, 1);
  const image = result.manifest.files.find(f => f.path.endsWith('.webp'));
  assert.equal((await sharp(fs.readFileSync(path.join(result.directory, image.path))).metadata()).hasAlpha, true);
  assert.match(fs.readFileSync(path.join(result.directory, 'site/index.html'), 'utf8'), /Första versionen/);
  await assert.rejects(createVersion(input, path.join(root, 'bad')), /Bild|bild/);
  assert.equal(fs.existsSync(path.join(root, 'bad')), false);
});

test('Changed, missing, extra and incomplete files fail verification', async () => {
  const root = path.join(temp(), 'package'); await createVersion(project(), root);
  const file = path.join(root, 'site/index.html'), original = fs.readFileSync(file);
  fs.writeFileSync(file, Buffer.concat([original, Buffer.from('tamper')]));
  assert.throws(() => verifyVersion(root), /Ändrad/);
  fs.writeFileSync(file, original);
  const moved = path.join(path.dirname(root), 'page'); fs.renameSync(file, moved);
  assert.throws(() => verifyVersion(root), /saknas/); fs.renameSync(moved, file);
  const extra = path.join(root, 'unexpected.txt'); fs.writeFileSync(extra, 'x');
  assert.throws(() => verifyVersion(root), /Oväntad/); fs.renameSync(extra, path.join(path.dirname(root), 'extra'));
  const manifest = path.join(root, 'manifest.json'), bytes = fs.readFileSync(manifest);
  fs.writeFileSync(manifest, '{'); assert.throws(() => verifyVersion(root));
  fs.writeFileSync(manifest, bytes); assert.equal(verifyVersion(root).published, false);
  const unfinished = path.join(temp(), 'incomplete'); fs.mkdirSync(unfinished);
  assert.throws(() => verifyVersion(unfinished), /ENOENT/);
});

test('Manifest checks reject traversal, duplicates, missing entrypoints and changed trusted digest', async () => {
  const root = path.join(temp(), 'package'), { manifest } = await createVersion(project(), root);
  const original = fs.readFileSync(path.join(root, 'manifest.json'));
  for (const update of [
    body => { body.files[0].path = '../private.txt'; },
    body => { body.files.push(body.files[0]); },
    body => { body.files = body.files.filter(f => f.path !== 'site/index.html'); },
    body => { body.files[0].bytes = 67108865; },
    body => { body.published = true; }
  ]) {
    fs.writeFileSync(path.join(root, 'manifest.json'), original); editManifest(root, update);
    assert.throws(() => verifyVersion(root));
  }
  fs.writeFileSync(path.join(root, 'manifest.json'), original);
  editManifest(root, body => { body.projectName = 'Ändrat namn'; });
  assert.throws(() => verifyVersion(root, { expectedIntegrity: manifest.integrity }), /kontrollsumma/);
});

test('Existing destinations and directory junctions are never overwritten or followed', async () => {
  const root = temp(), destination = path.join(root, 'package');
  const { manifest } = await createVersion(project(), destination);
  await assert.rejects(createVersion(project(), destination), /finns redan/);
  assert.equal(verifyVersion(destination).integrity, manifest.integrity);
  const external = temp(), linked = path.join(root, 'linked');
  fs.writeFileSync(path.join(external, 'keep.txt'), 'Keep');
  fs.symlinkSync(external, linked, 'junction');
  await assert.rejects(createVersion(project(), linked), /finns redan/);
  assert.throws(() => verifyVersion(linked), /vanlig mapp/);
  fs.rmSync(path.join(destination, 'site/images'), { recursive: true, force: true }); // the template's example photos
  fs.symlinkSync(external, path.join(destination, 'site/images'), 'junction');
  assert.throws(() => verifyVersion(destination), /Länkade/);
  assert.equal(fs.readFileSync(path.join(external, 'keep.txt'), 'utf8'), 'Keep');
});

test('Preview escapes user text, blocks scripts/forms and labels local status', async () => {
  const input = project(); input.name = '<script>alert("x")</script> ÅÄÖ';
  const root = path.join(temp(), 'package'); await createVersion(input, root);
  const html = fs.readFileSync(path.join(root, 'preview.html'), 'utf8');
  assert.doesNotMatch(html, /<script>/); assert.match(html, /&lt;script&gt;/);
  assert.match(html, /sandbox="allow-same-origin"/); assert.doesNotMatch(html, /allow-scripts|allow-forms/); assert.match(html, /Inte publicerad/);
  assert.match(html, /form-action 'none'/); assert.match(html, /rel="noopener"/);
});

test('CLI creates/checks a package; concurrent processes cannot overwrite the same destination', async () => {
  const root = temp(), source = path.join(root, 'project.json'), destination = path.join(root, 'version');
  fs.writeFileSync(source, JSON.stringify(project()));
  const script = path.resolve(__dirname, '../tools/publication-version.cjs');
  const run = () => new Promise(resolve => {
    const child = spawn(process.execPath, [script, 'create', source, destination], { windowsHide: true });
    let stdout = '', stderr = '';
    child.stdout.on('data', data => { stdout += data; }); child.stderr.on('data', data => { stderr += data; });
    child.on('close', status => resolve({ status, stdout, stderr }));
  });
  const results = await Promise.all([run(), run()]);
  assert.deepEqual(results.map(r => r.status).sort(), [0, 1]);
  assert.equal(JSON.parse(results.find(r => r.status === 0).stdout).published, false);
  const check = spawnSync(process.execPath, [script, 'check', destination], { encoding: 'utf8', windowsHide: true });
  assert.equal(check.status, 0); assert.equal(JSON.parse(check.stdout).status, 'LOCAL_VERSION_VERIFIED');
  fs.writeFileSync(path.join(destination, 'site/index.html'), 'Changed');
  const failed = spawnSync(process.execPath, [script, 'check', destination], { encoding: 'utf8', windowsHide: true });
  assert.equal(failed.status, 1); assert.equal(failed.stdout, '');
});
