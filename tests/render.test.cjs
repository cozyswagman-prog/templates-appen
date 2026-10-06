const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { DOMParser } = require('linkedom');
const { renderProject, decodeProject, writeNewDirectory } = require('../tools/render-project.cjs');
const describe = require('./describe.cjs');
const baseline = require('./fixtures/render-baseline.json');

// Browser CSSOM expands "top" to "center top" and formats declarations; linkedom
// preserves the shorthand. Compare those equivalent declarations without altering the golden data.
const canonical = require('./canonical.cjs');

for (const { project, expected } of baseline.cases) {
  test('Frozen browser baseline: ' + project.id, () => {
    const before = JSON.stringify(project), files = renderProject(project);
    assert.equal(JSON.stringify(project), before, 'Rendering must not mutate the saved project');
    assert.deepEqual([...files.keys()].filter(k => k.endsWith('.html')).sort(), Object.keys(expected).sort());
    for (const [file, snapshot] of Object.entries(expected)) {
      const doc = new DOMParser().parseFromString(files.get(file), 'text/html');
      assert.deepEqual(canonical(describe(doc)), canonical(snapshot), file);
      assert.equal(doc.querySelectorAll('[data-slot]').length, 0);
      assert.ok(doc.querySelector('#kit-runtime'), 'Export has standalone interactions');
    }
    assert.ok(files.get('fonts/LICENS.txt'));
    for (const html of [...files.values()].filter(v => typeof v === 'string')) {
      for (const [, image] of html.matchAll(/src="(images\/[^\"]+)"/g)) assert.ok(files.get(image)?.length);
      for (const [, font] of html.matchAll(/fonts\/([a-z0-9-]+\.woff2)/g)) assert.ok(files.get('fonts/' + font)?.length);
    }
  });
}

test('Legacy flat values and v1 file preserve the same content', () => {
  const nested = baseline.cases.find(c => c.project.id === 'fixture-restaurang-edited').project;
  const flat = { ...nested, values: nested.values['index.html'] };
  assert.deepEqual([...renderProject(flat)], [...renderProject({ app: 'templates', version: 1, project: nested })]);
});
test('Unknown versions, traversal pages, prototype keys, invalid images and malformed input fail closed', () => {
  const project = baseline.cases[0].project;
  for (const input of ['{', { app: 'templates', version: 2, project }, { ...project, templateId: '../../x' }, { ...project, values: { '../index.html': {} } }, { ...project, values: { 'index.html': { '9999': 'Do not silently lose this' } } }, { ...project, values: [] }, '{"__proto__":{}}']) {
    assert.throws(() => renderProject(input));
  }
  const edited = structuredClone(baseline.cases.find(c => c.project.id === 'fixture-restaurang-edited').project);
  const imageSlot = Object.keys(edited.values['index.html']).find(key => edited.values['index.html'][key].startsWith('data:image'));
  edited.values['index.html'][imageSlot] = 'javascript:alert(1)';
  assert.throws(() => renderProject(edited), /Bildfält/);
  assert.throws(() => decodeProject('x'.repeat(20 * 1024 * 1024 + 1)), /20 MB/);
});
test('Customer text remains text, never executable markup', () => {
  const project = structuredClone(baseline.cases.find(c => c.project.id === 'fixture-restaurang-edited').project);
  project.values['index.html']['3'] = '<script id="attack">alert(1)</script>';
  const doc = new DOMParser().parseFromString(renderProject(project).get('index.html'), 'text/html');
  assert.equal(doc.querySelector('#attack'), null);
  assert.ok(doc.body.textContent.includes('<script id="attack">'));
});
test('CLI writer preserves existing files and rejects unsafe output manifests', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'templates-render-'));
  const output = path.join(parent, 'site');
  writeNewDirectory(new Map([['index.html', 'first']]), output);
  assert.throws(() => writeNewDirectory(new Map([['index.html', 'second']]), output), /finns redan/);
  assert.equal(fs.readFileSync(path.join(output, 'index.html'), 'utf8'), 'first');
  assert.throws(() => writeNewDirectory(new Map([['../escape.html', 'bad']]), path.join(parent, 'unsafe')), /Otillåten/);
  assert.equal(fs.existsSync(path.join(parent, 'unsafe')), false);
  // Temporary test output is deliberately outside the repository.
});
