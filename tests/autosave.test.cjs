const { test } = require('node:test'), assert = require('node:assert/strict');
const { createAutosave, createDraftRecovery } = require('../js/autosave.js');
const { createProjectStore } = require('../js/project-store.js');
function storage() {
  const items = new Map();
  return { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value), removeItem: key => items.delete(key), key: index => [...items.keys()][index], get length() { return items.size; } };
}
test('Autosave coalesces edits, pauses on error, respects a busy editor and cancels on leave', () => {
  const pending = new Map(); let next = 0, saves = 0, ready = true;
  const auto = createAutosave({ save: () => saves++, canSave: () => ready, timers: { setTimeout: fn => { pending.set(++next, fn); return next; }, clearTimeout: id => pending.delete(id) } });
  const flush = () => { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(fn => fn()); };
  auto.changed(); auto.changed(); auto.changed(); assert.equal(pending.size, 1);
  flush(); assert.equal(saves, 1);
  auto.pause(); auto.changed(); flush(); assert.equal(saves, 1);
  auto.resume(); auto.changed(); ready = false; flush(); assert.equal(saves, 1);
  ready = true; auto.changed(); auto.stop(); flush(); assert.equal(saves, 1);
  auto.changed(); flush(); assert.equal(saves, 2);
});
test('Recovery preserves all project data, isolates accounts and only removes the matching draft', () => {
  const data = storage(), recovery = createDraftRecovery(() => data);
  const project = { id: 'p1', templateId: 'cafe', name: 'ÅÄÖ', values: { 'meny.html': { 1: 'Privat A' } }, site: { business: { name: 'Företag' } }, cloudRevision: 7 };
  assert.equal(recovery.write('cloud:A', project), true);
  assert.deepEqual(recovery.read('cloud:A').project, project);
  assert.equal(recovery.read('cloud:B'), null);
  project.name = 'Ändrat efter kopiering'; assert.equal(recovery.read('cloud:A').project.name, 'ÅÄÖ');
  recovery.clear('cloud:A', 'another'); assert.ok(recovery.read('cloud:A'));
  recovery.write('local', project); recovery.clearAccountsExcept('cloud:B');
  assert.equal(recovery.read('cloud:A'), null); assert.ok(recovery.read('local'));
});
test('Blocked/quota-full storage and malformed recovery do not crash or pretend to succeed', () => {
  const broken = createDraftRecovery(() => { throw new Error('storage denied'); });
  assert.equal(broken.write('local', {}), false); assert.equal(broken.read('local'), null); assert.equal(broken.clear('local'), false);
  const data = storage(), recovery = createDraftRecovery(() => data);
  for (const bad of ['{', 'null', '{"version":8}', '{"version":1,"project":{"values":[]}}']) {
    data.setItem('templates.recovery.v1:local', bad); assert.equal(recovery.read('local'), null);
  }
});
test('Starting another project or clearing one recovery never discards another pending draft', () => {
  const data = storage(), recovery = createDraftRecovery(() => data);
  const first = { id: 'first', templateId: 'cafe', name: 'Första', values: {} };
  recovery.write('local', first);
  recovery.write('local', { ...first, id: 'second', name: 'Andra' });
  assert.equal(recovery.list('local').length, 2);
  recovery.clear('local', 'second'); assert.equal(recovery.read('local').project.name, 'Första');
  data.setItem('templates.recovery.v1:local', JSON.stringify({ version: 1, project: first }));
  assert.equal(recovery.read('local').project.id, 'first');
});
test('Local revision protects parallel snapshots and deletes; legacy data still opens', async () => {
  const rows = new Map();
  const local = { get: id => rows.get(id), list: () => [...rows.values()], save: p => { rows.set(p.id, structuredClone(p)); return true; }, remove: id => rows.delete(id) };
  const first = createProjectStore(local), second = createProjectStore(local);
  const project = { id: 'p1', templateId: 'cafe', name: 'Gammalt', values: {} };
  local.save(project); // v1 project, before revision metadata existed
  const a = await first.get('p1'), b = await second.get('p1');
  a.name = 'Nyare'; const saved = await first.save(a);
  await assert.rejects(second.save(b), /annan flik/);
  await assert.rejects(second.remove(b), /annan flik/);
  assert.equal((await first.get('p1')).name, 'Nyare');
  await first.remove(saved); await assert.rejects(first.save(saved), /annan flik/);
  // Also protect an old legacy snapshot with no revision after its row is deleted.
  local.save(project); const legacy = await first.get('p1'); await first.remove(legacy);
  await assert.rejects(first.save(legacy), /annan flik/);
});
