const { test, before } = require('node:test');
const assert = require('node:assert/strict');
let cleanupVersions, versionPrefix;
before(async () => ({ cleanupVersions, versionPrefix } = await import('../server/version-retention.mjs')));
const row = { siteId: 'qa-cafe', versionId: '00000000-0000-4000-8000-000000000001' };
function setup() {
  let claimed = false, complete = false, deletes = 0;
  const files = new Set(Array.from({ length: 45 }, (_, i) => versionPrefix(row.siteId, row.versionId) + i + '.html'));
  const store = {
    pending: async () => claimed && !complete ? [row] : [],
    plan: async () => claimed ? [] : [row],
    claim: async () => { claimed = true; return true; },
    finish: async () => { complete = true; }
  };
  const bucket = {
    listKeys: async (prefix, limit) => [...files].filter(k => k.startsWith(prefix)).slice(0, limit),
    deleteKeys: async keys => { deletes++; keys.forEach(k => files.delete(k)); }
  };
  return { store, bucket, files, state: () => ({ claimed, complete, deletes }) };
}
test('Retention preview defaults to read-only and preserves every file', async () => {
  const s = setup(), plan = await cleanupVersions(s);
  assert.equal(plan.dryRun, true); assert.deepEqual(plan.candidates, [row]);
  assert.equal(s.files.size, 45); assert.deepEqual(s.state(), { claimed: false, complete: false, deletes: 0 });
});
test('A stale plan cannot delete a version when the atomic claim loses', async () => {
  const s = setup(); s.store.claim = async () => false;
  const result = await cleanupVersions({ ...s, dryRun: false });
  assert.deepEqual(result.results, []); assert.equal(s.files.size, 45);
});
test('Cleanup is bounded and resumes a partially failed delete idempotently', async () => {
  const s = setup(), realDelete = s.bucket.deleteKeys;
  s.bucket.deleteKeys = async keys => { s.files.delete(keys[0]); throw new Error('Synthetic storage failure'); };
  await assert.rejects(cleanupVersions({ ...s, dryRun: false }), /Synthetic storage failure/);
  assert.deepEqual(s.state(), { claimed: true, complete: false, deletes: 0 });
  s.bucket.deleteKeys = realDelete;
  for (const size of [24, 4, 0]) {
    const result = await cleanupVersions({ ...s, dryRun: false });
    assert.ok(result.results[0].deletedFiles <= 20); assert.equal(s.files.size, size);
  }
  assert.equal(s.state().complete, true);
  assert.deepEqual((await cleanupVersions({ ...s, dryRun: false })).results, []);
});
test('Cleanup rejects paths and listings outside the exact site/version prefix', async () => {
  assert.throws(() => versionPrefix('../qa-cafe', row.versionId));
  assert.throws(() => versionPrefix(row.siteId, '../version'));
  const s = setup(); s.bucket.listKeys = async () => ['sites/other-site/v/file'];
  await assert.rejects(cleanupVersions({ ...s, dryRun: false }), /Unsafe cleanup listing/);
  assert.equal(s.state().deletes, 0);
});
test('A short storage page is not mistaken for a complete version deletion', async () => {
  const s = setup(), list = s.bucket.listKeys;
  s.bucket.listKeys = (prefix, limit) => list(prefix, Math.min(limit, 7));
  for (let i = 0; i < 7; i++) await cleanupVersions({ ...s, dryRun: false });
  assert.equal(s.files.size, 0); assert.equal(s.state().complete, true);
});
