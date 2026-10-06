const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { prepareAccountData, main } = require('../tools/account-data.cjs');
const { renderProject } = require('../tools/render-project.cjs');
const A = 'a1111111-1111-4111-8111-111111111111', B = 'b2222222-2222-4222-8222-222222222222';
const sha = b => createHash('sha256').update(b).digest('hex');
const date = '2026-10-06T01:34:00.000Z';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'templates-account-data-'));
  const backup = path.join(root, 'backup'), destination = path.join(root, 'export');
  fs.mkdirSync(path.join(backup, 'db'), { recursive: true });
  const bytes = [Buffer.from('image-A'), Buffer.from('image-B')];
  const names = bytes.map(b => sha(b) + '.png');
  const db = {
    users: [A, B].map((id, n) => ({ id, email: (n ? 'B-PRIVATE' : 'a') + '@example.test', created_at: date, email_confirmed_at: date, unexpected_token: 'DO-NOT-EXPORT' })),
    projects: [A, B].map((owner_id, n) => ({ owner_id, id: 'same-id', revision: 3, updated_at: date,
      content: { name: n ? 'B-PRIVATE-PROJECT' : 'Café ÅÄÖ', templateId: 'cafe', values: { 'kontakt.html': { 4: 'templates-image:v1:' + names[n] } } } })),
    project_images: [A, B].map((owner_id, n) => ({ owner_id, name: names[n], created_at: date, state: 'active', delete_token: 'DO-NOT-EXPORT' })),
    project_image_refs: [A, B].map((owner_id, n) => ({ owner_id, project_id: 'same-id', image_name: names[n] }))
  };
  const writeDb = () => { for (const [name, rows] of Object.entries(db)) fs.writeFileSync(path.join(backup, 'db', name + '.json'), JSON.stringify(rows)); };
  writeDb();
  [A, B].forEach((id, n) => {
    fs.mkdirSync(path.join(backup, 'storage/project-images', id), { recursive: true });
    fs.writeFileSync(path.join(backup, 'storage/project-images', id, names[n]), bytes[n]);
  });
  const paths = [...Object.keys(db).map(n => 'db/' + n + '.json'), ...[A, B].map((id, n) => 'storage/project-images/' + id + '/' + names[n])];
  const rehash = () => {
    const manifest = { format: 'templates-backup-v1', created: date, files: paths.map(name => {
      const b = fs.readFileSync(path.join(backup, name)); return { path: name, bytes: b.length, sha256: sha(b) };
    }) };
    fs.writeFileSync(path.join(backup, 'manifest.json'), JSON.stringify(manifest));
  };
  rehash();
  return { root, backup, destination, names, db, paths, writeDb, rehash,
    run: (ownerId = A, dest = destination) => prepareAccountData({ backupDirectory: backup, ownerId, destination: dest }) };
}
function allFiles(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(e => e.isDirectory() ? allFiles(path.join(root, e.name)) : [path.join(root, e.name)]);
}

test('Account export isolates equal project ids, embeds only owner images and preserves source bytes', () => {
  const f = fixture(), before = allFiles(f.backup).map(p => [p, sha(fs.readFileSync(p))]);
  const result = f.run();
  assert.deepEqual(result.counts, { accounts: 1, projects: 1, images: 1 });
  const output = allFiles(f.destination).map(p => fs.readFileSync(p));
  const text = Buffer.concat(output).toString();
  for (const forbidden of [B, 'B-PRIVATE', 'DO-NOT-EXPORT', f.names[1], 'image-B']) assert.ok(!text.includes(forbidden), forbidden);
  const portable = JSON.parse(fs.readFileSync(path.join(f.destination, 'projects/project-1.projekt.json')));
  assert.equal(portable.project.name, 'Café ÅÄÖ');
  assert.equal(portable.project.values['kontakt.html'][4], 'data:image/png;base64,' + Buffer.from('image-A').toString('base64'));
  for (const file of result.files) assert.equal(sha(fs.readFileSync(path.join(f.destination, file.path))), file.sha256);
  assert.deepEqual(allFiles(f.backup).map(p => [p, sha(fs.readFileSync(p))]), before);
  const review = JSON.parse(fs.readFileSync(path.join(f.destination, 'deletion-preview.json')));
  assert.equal(review.executionAllowed, false); assert.equal(result.deletionExecuted, false);
  assert.deepEqual(review.projects, [{ id: 'same-id', revision: 3 }]);
  assert.deepEqual(review.storageObjects, [A + '/' + f.names[0]]);
  assert.equal(f.run(B, path.join(f.root, 'export-b')).counts.accounts, 1);
});

test('Unknown, ambiguous and nonexact account selectors stop without output', () => {
  const f = fixture();
  for (const id of ['', '%', 'a@example.test', A.toUpperCase(), 'c3333333-3333-4333-8333-333333333333']) assert.throws(() => f.run(id));
  assert.ok(!fs.existsSync(f.destination));
  f.db.users.push(f.db.users[0]); f.writeDb(); f.rehash();
  assert.throws(() => f.run(), /Dubbla/);
});

test('Corruption, missing and unexpected files fail before an export is created', () => {
  for (const mode of ['corrupt', 'missing', 'extra']) {
    const f = fixture();
    if (mode === 'corrupt') fs.appendFileSync(path.join(f.backup, 'db/projects.json'), ' ');
    if (mode === 'missing') fs.unlinkSync(path.join(f.backup, 'db/projects.json'));
    if (mode === 'extra') fs.writeFileSync(path.join(f.backup, 'unexpected.txt'), 'x');
    assert.throws(() => f.run()); assert.ok(!fs.existsSync(f.destination));
  }
});

test('Manifest traversal, absolute paths and duplicate file entries are rejected', () => {
  for (const injected of ['../outside.json', 'C:/private.json', '/private.json', 'db/projects.json']) {
    const f = fixture(), file = path.join(f.backup, 'manifest.json'), m = JSON.parse(fs.readFileSync(file));
    m.files.push({ path: injected, bytes: 1, sha256: sha('x') }); fs.writeFileSync(file, JSON.stringify(m));
    assert.throws(() => f.run(), /filsökväg/); assert.ok(!fs.existsSync(f.destination));
  }
});

test('Cross-account image references and orphan rows cannot produce a misleading export', () => {
  for (const mode of ['content', 'reference', 'owner']) {
    const f = fixture();
    if (mode === 'content') f.db.projects[0].content.values['kontakt.html'][4] = 'templates-image:v1:' + f.names[1];
    if (mode === 'reference') f.db.project_image_refs[0].image_name = f.names[1];
    if (mode === 'owner') f.db.projects[0].owner_id = 'c3333333-3333-4333-8333-333333333333';
    f.writeDb(); f.rehash(); assert.throws(() => f.run()); assert.ok(!fs.existsSync(f.destination));
  }
});

test('Unreferenced owner objects are included, but absent unused reservations do not invent files', () => {
  const f = fixture(), bytes = Buffer.from('orphan-A'), name = sha(bytes) + '.png';
  const rel = 'storage/project-images/' + A + '/' + name;
  fs.writeFileSync(path.join(f.backup, rel), bytes); f.paths.push(rel);
  f.db.project_images.push({ owner_id: A, name: sha('never-uploaded') + '.png', state: 'active' });
  f.writeDb(); f.rehash();
  assert.equal(f.run().counts.images, 2);
  assert.deepEqual(fs.readFileSync(path.join(f.destination, 'images', name)), bytes);
});

test('Existing, partial, Git, source and overlapping destinations never get overwritten', () => {
  const f = fixture(); fs.mkdirSync(f.destination); fs.writeFileSync(path.join(f.destination, 'keep'), 'preserved');
  assert.throws(() => f.run(), /finns redan/); assert.equal(fs.readFileSync(path.join(f.destination, 'keep'), 'utf8'), 'preserved');
  const partial = path.join(f.root, 'busy'); fs.mkdirSync(partial + '.partial');
  assert.throws(() => f.run(A, partial), /finns redan/);
  assert.throws(() => f.run(A, path.join(f.backup, 'nested')), /separat/);
  assert.throws(() => f.run(A, f.root), /separat/);
  assert.throws(() => f.run(A, path.join(__dirname, '../test-export')), /Git|källkoden/);
  const git = path.join(f.root, 'git'); fs.mkdirSync(git); fs.writeFileSync(path.join(git, '.git'), 'gitdir: elsewhere');
  assert.throws(() => f.run(A, path.join(git, 'export')), /Git/);
});

test('Directory junctions cannot redirect backup reads or account exports', () => {
  const f = fixture(), link = path.join(f.root, 'linked');
  fs.symlinkSync(f.backup, link, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => prepareAccountData({ backupDirectory: link, ownerId: A, destination: f.destination }), /Länkade/);
  assert.throws(() => f.run(A, path.join(link, 'export')), /Länkade/);
  const broken = path.join(f.root, 'broken');
  fs.symlinkSync(path.join(f.root, 'missing'), broken, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => f.run(A, broken), /Länkade/);
});

test('Portable output can render a project with all page values without private Storage access', () => {
  const f = fixture();
  f.db.projects[0].content.values = { 'index.html': { 1: 'Återställt café' }, 'kontakt.html': { 1: 'Kontakt ÅÄÖ' } };
  f.writeDb(); f.rehash(); f.run();
  const project = JSON.parse(fs.readFileSync(path.join(f.destination, 'projects/project-1.projekt.json')));
  const files = renderProject(project);
  assert.ok(files.has('index.html') && files.has('kontakt.html') && files.has('meny.html'));
  assert.match(files.get('index.html').toString(), /Återställt café/);
});

test('CLI refuses execute/delete flags and redacts errors without reading service credentials', () => {
  assert.throws(() => main(['delete', 'x', A, 'y']), /Använd/);
  const f = fixture(), file = path.join(f.backup, 'manifest.json');
  fs.writeFileSync(file, 'PRIVATE-NOT-TO-LOG');
  const child = spawnSync(process.execPath, [path.join(__dirname, '../tools/account-data.cjs'), 'prepare', f.backup, A, f.destination],
    { encoding: 'utf8', env: { ...process.env, TEMPLATES_BACKUP_SECRET_KEY: 'SECRET-NOT-TO-LOG' } });
  assert.equal(child.status, 1);
  assert.doesNotMatch(child.stdout + child.stderr, /PRIVATE-NOT-TO-LOG|SECRET-NOT-TO-LOG|a@example/);
  assert.ok(!fs.existsSync(f.destination));
});
