const { test } = require('node:test'), assert = require('node:assert/strict');
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
test('Service worker only intercepts public app shell, never auth or customer API traffic', () => {
  const listeners = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8'), {
    self: { registration: { scope: 'https://app.example.test/templates/' }, addEventListener: (name, fn) => { listeners[name] = fn; } },
    URL, fetch: () => Promise.resolve({ ok: false }), caches: {}, console
  });
  function intercepted(url, options) {
    let called = false;
    listeners.fetch({ request: new Request(url, options), respondWith: () => { called = true; } });
    return called;
  }
  assert.equal(intercepted('https://app.example.test/templates/js/app.js'), true);
  assert.equal(intercepted('https://app.example.test/templates/vendor/supabase.js'), true);
  for (const url of ['https://project.supabase.co/rest/v1/projects', 'https://project.supabase.co/auth/v1/user', 'https://app.example.test/api/projects', 'https://app.example.test/templates/?code=private-code', 'https://project.supabase.co/storage/v1/object/sign/private/image']) {
    assert.equal(intercepted(url), false, url);
  }
  assert.equal(intercepted('https://app.example.test/templates/js/app.js', { headers: { Authorization: 'Bearer synthetic' } }), false);
  assert.equal(intercepted('https://app.example.test/templates/', { method: 'POST' }), false);
});
