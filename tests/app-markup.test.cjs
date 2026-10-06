const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { parseHTML } = require('linkedom');
test('Artifact keeps the same app structure and scripts without website/PWA wrapper', () => {
  const html = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8').replace(/\r\n/g, '\n');
  const index = parseHTML(html('index.html')).document;
  const fragment = html('artifact.html'), artifact = parseHTML(fragment).document;
  assert.deepEqual([...index.querySelectorAll('[id]')].map(el => el.id), [...artifact.querySelectorAll('[id]')].map(el => el.id));
  assert.deepEqual([...index.querySelectorAll('script[src]')].map(el => el.getAttribute('src')), [...artifact.querySelectorAll('script[src]')].map(el => el.getAttribute('src')));
  for (const id of ['view-gallery', 'view-editor', 'leave-dialog', 'session-dialog', 'export-dialog']) {
    assert.equal(index.getElementById(id).outerHTML, artifact.getElementById(id).outerHTML);
  }
  assert.ok(!/serviceWorker\.register|<!DOCTYPE|<html[\s>]/i.test(fragment));
});
