const { test } = require('node:test'), assert = require('node:assert/strict');
const { createProjectStore } = require('../js/project-store.js');
const project = () => ({ id: 'p-one', name: 'Min sida', templateId: 'cafe', values: { 'index.html': { 1: 'Hej' } } });
function local() {
  const values = new Map();
  return { list: () => [...values.values()], get: id => values.get(id), save: p => { p.updatedAt = 123; values.set(p.id, p); return true; }, remove: id => values.delete(id) };
}
test('Local adapter remains compatible and never persists cloud metadata or mutates input', async () => {
  const storage = local(), store = createProjectStore(storage, null), p = project();
  p.cloudRevision = 9;
  const saved = await store.save(p);
  assert.equal(saved.updatedAt, 123); assert.equal(p.updatedAt, undefined);
  assert.equal(saved.cloudRevision, undefined); assert.equal(p.cloudRevision, 9);
  assert.equal((await store.list()).length, 1);
  assert.equal((await store.get(p.id)).name, p.name);
  await store.remove(saved); assert.equal((await store.list()).length, 0);
});
test('Cloud requests send expected revision, not a client-supplied owner', async () => {
  let call;
  const store = createProjectStore(local(), { rpc: async (name, args) => {
    call = { name, args };
    return { data: [{ id: args.p_id, content: args.p_content, revision: 8, updated_at: '2026-10-03T12:00:00Z' }] };
  } });
  store.setUser({ id: 'A' });
  const p = { ...project(), cloudRevision: 7, owner_id: 'B' };
  const result = await store.save(p);
  assert.equal(call.name, 'save_project'); assert.equal(call.args.p_revision, 7);
  assert.equal(call.args.p_content.owner_id, undefined); assert.equal(result.cloudRevision, 8);
  assert.equal(p.cloudRevision, 7);
});
test('In-flight results and stale editor saves are rejected after a session/scope change', async () => {
  let finish;
  const store = createProjectStore(local(), { rpc: () => new Promise(resolve => { finish = resolve; }) });
  store.setUser({ id: 'A' }); const context = store.context();
  const pending = store.save(project());
  await new Promise(resolve => setImmediate(resolve)); // image preparation precedes the RPC
  store.setUser({ id: 'B' });
  finish({ data: [{ content: project(), id: 'p-one', revision: 1, updated_at: '2026-10-03' }] });
  await assert.rejects(pending, /Kontot/);
  await assert.rejects(store.save(project(), context), /Kontot/);
  store.setUser({ id: 'A' }); await assert.rejects(store.save(project(), context), /Kontot/);
});
test('An expired session never falls back to silently saving private drafts on the device', async () => {
  const storage = local(), store = createProjectStore(storage, {});
  store.setUser({ id: 'A' }); const context = store.context(); store.setUser(null);
  await assert.rejects(store.save(project(), context), /Kontot/);
  assert.deepEqual(storage.list(), []);
});
test('Conflict errors preserve the draft and direct users to save a file', async () => {
  const store = createProjectStore(local(), { rpc: async () => ({ error: { code: 'PT409' } }) });
  store.setUser({ id: 'A' }); const p = project(), before = JSON.stringify(p);
  await assert.rejects(store.save(p), /projektfil/); assert.equal(JSON.stringify(p), before);
});
test('Copy to account retains local original and always creates, never overwrites', async () => {
  const storage = local(), p = project(); storage.save(p);
  let args;
  const store = createProjectStore(storage, { rpc: async (name, payload) => { args = payload; return { data: [] }; } });
  store.setUser({ id: 'A' }); store.setMode('local'); await store.copyToAccount(p);
  assert.equal(args.p_revision, 0); assert.equal(args.p_id, p.id);
  assert.equal(storage.list().length, 1); assert.equal(store.mode, 'local');
});
