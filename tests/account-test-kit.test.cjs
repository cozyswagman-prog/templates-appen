const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), { createHash } = require('node:crypto'), { spawnSync } = require('node:child_process');
const { createKit, checkKit } = require('../tools/account-test-kit.cjs');
const destination = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'templates-account-kit-')), 'kit');
const root = path.resolve(__dirname, '..');
test('Account kit copies migrations in order with pending live cases and a disabled example', () => {
  const directory = destination(), result = createKit(directory);
  assert.deepEqual(result, { status: 'LOCAL_FILES_VERIFIED', files: 11, migrations: 3, liveTests: 'NOT_RUN', connected: false, approvedForRelease: false });
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json')));
  for (const name of manifest.migrationOrder) assert.deepEqual(fs.readFileSync(path.join(directory, name)), fs.readFileSync(path.join(root, 'supabase', name)));
  const acceptance = JSON.parse(fs.readFileSync(path.join(directory, 'acceptance-template.json')));
  assert.equal(acceptance.checks.length, 13); assert.equal(new Set(acceptance.checks.map(c => c.id)).size, 13);
  assert.ok(acceptance.checks.every(c => c.status === 'NOT_RUN' && c.checkedAt === null && c.evidence === '' && c.actual === ''));
  assert.equal(acceptance.serviceStatus, 'BLOCKED_NO_APPROVED_TEST_SERVICE');
  assert.match(fs.readFileSync(path.join(directory, 'cloud-config.example.js'), 'utf8'), /url: '', publishableKey: ''/);
  assert.ok(!manifest.source.some(s => /cloud-config|\.env/.test(s.file)));
  assert.deepEqual(checkKit(directory), result);
});
test('Existing destinations and source checkout are never overwritten', () => {
  const directory = destination(); fs.mkdirSync(directory); fs.writeFileSync(path.join(directory, 'keep.txt'), 'Keep');
  assert.throws(() => createKit(directory), /finns redan/); assert.equal(fs.readFileSync(path.join(directory, 'keep.txt'), 'utf8'), 'Keep');
  const inSource = path.join(root, 'never-create-account-kit');
  assert.throws(() => createKit(inSource), /utanför/); assert.equal(fs.existsSync(inSource), false);
});
test('Changed files fail even if the manifest is rehashed to match tampering', () => {
  const directory = destination(); createKit(directory);
  const name = 'migrations/202610030001_projects.sql'; fs.appendFileSync(path.join(directory, name), '\n-- changed');
  assert.throws(() => checkKit(directory), /ändrats/);
  const file = path.join(directory, 'manifest.json'), manifest = JSON.parse(fs.readFileSync(file)), bytes = fs.readFileSync(path.join(directory, name));
  const item = manifest.files.find(f => f.file === name); item.bytes = bytes.length; item.sha256 = createHash('sha256').update(bytes).digest('hex'); fs.writeFileSync(file, JSON.stringify(manifest));
  assert.throws(() => checkKit(directory), /ändrats/);
});
test('Missing and extra files, traversal and stale source fingerprints fail closed', () => {
  for (const kind of ['missing','extra','traversal','source','order','duplicate']) {
    const directory = destination(); createKit(directory);
    const file = path.join(directory, 'manifest.json'), manifest = JSON.parse(fs.readFileSync(file));
    if (kind === 'missing') fs.unlinkSync(path.join(directory, 'START_HAR.md'));
    if (kind === 'extra') fs.writeFileSync(path.join(directory, 'unintended.txt'), 'no');
    if (kind === 'traversal') manifest.files[0].file = '../outside.txt';
    if (kind === 'source') manifest.source[0].sha256 = '0'.repeat(64);
    if (kind === 'order') manifest.migrationOrder.reverse();
    if (kind === 'duplicate') manifest.files.push(manifest.files[0]);
    fs.writeFileSync(file, JSON.stringify(manifest)); assert.throws(() => checkKit(directory), undefined, kind);
  }
});
test('Directory links and incomplete packages cannot be used as checked kits', () => {
  const directory = destination(); createKit(directory);
  const link = path.join(path.dirname(directory), 'linked'); fs.symlinkSync(directory, link, 'junction');
  assert.throws(() => checkKit(link), /vanlig mapp/); assert.throws(() => createKit(link), /finns redan/);
  const other = destination(); fs.mkdirSync(other);
  fs.symlinkSync(other, path.join(directory, 'unexpected-link'), 'junction');
  assert.throws(() => checkKit(directory), /Länkar/); assert.throws(() => checkKit(other));
});
test('CLI outputs only local verification and refuses unknown commands without executing anything', () => {
  const directory = destination(), tool = path.join(root, 'tools/account-test-kit.cjs');
  const run = (...args) => spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8', windowsHide: true });
  const create = run('create', directory); assert.equal(create.status, 0, create.stderr); assert.equal(JSON.parse(create.stdout).connected, false);
  const verify = run('check', directory); assert.equal(verify.status, 0); assert.equal(JSON.parse(verify.stdout).liveTests, 'NOT_RUN');
  const unknown = run('apply', directory); assert.equal(unknown.status, 1); assert.equal(unknown.stdout, '');
});
