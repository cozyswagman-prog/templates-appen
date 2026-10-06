const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('Stripe owner setup: validation, recovery, redaction, working directory and safe preflight (24 cases)', { timeout: 30000 }, () => {
  const result = spawnSync('pwsh', ['-NoProfile', '-File', path.join(__dirname, 'stripe-setup.cases.ps1')], { encoding: 'utf8', timeout: 25000, windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const cases = JSON.parse(result.stdout.trim());
  assert.equal(cases.length, 24);
  assert.ok(cases.every(c => c.status === 'PASS'));
  assert.equal(result.stderr, '');
});
