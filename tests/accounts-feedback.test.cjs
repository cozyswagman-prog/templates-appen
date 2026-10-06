// Exercise the real account controller against a synthetic SDK without network or credentials.
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { parseHTML } = require('linkedom');
const source = fs.readFileSync(path.join(__dirname, '../js/accounts.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));
async function fixture({ url = 'https://app.example.test/', sessionError = null, user = null } = {}) {
  const { document, Event } = parseHTML(html);
  let address = new URL(url), response = { error: null }, listener;
  const calls = [], replacements = [];
  const store = { user: null, mode: 'local', subscribe() {}, setUser(value) { this.user = value; }, setMode(value) { this.mode = value; } };
  const auth = { getSession: async () => ({ data: { session: user ? { user } : null }, error: sessionError }),
    onAuthStateChange(fn) { listener = fn; } };
  for (const method of ['signInWithPassword', 'signUp', 'resetPasswordForEmail', 'updateUser', 'signOut']) {
    auth[method] = async (...args) => { calls.push({ method, args }); return response; };
  }
  const client = { auth };
  const window = { TEMPLATES_CLOUD: { url: 'https://provider.example.test', publishableKey: 'sb_publishable_SYNTHETIC' },
    Storage: {}, createProjectStore: () => store, supabase: { createClient: () => client } };
  const append = document.head.append.bind(document.head);
  document.head.append = script => { append(script); queueMicrotask(() => script.onload()); };
  const context = vm.createContext({ window, document, URL, URLSearchParams,
    location: address, history: { state: { marker: true }, replaceState(state, title, next) { replacements.push({ state, next }); address = new URL(next); } } });
  vm.runInContext(source, context);
  await window.Accounts.init();
  const get = id => document.getElementById(id);
  return { get, calls, replacements, store, address: () => address, feedback: () => get('account-feedback').textContent,
    action(name) { document.querySelector('[data-account-action="' + name + '"]').click(); },
    event(name) { listener(name, { user: { id: 'synthetic', email: 'test@example.test' } }); },
    async submit(error = null) { response = { error }; get('account-form').dispatchEvent(new Event('submit', { cancelable: true })); await settle(); } };
}
test('Invalid login explains the next step without revealing which credential exists', async () => {
  const f = await fixture(); f.action('login');
  f.get('account-email').value = '  test@example.test  '; f.get('account-password').value = 'synthetic-only';
  await f.submit({ code: 'invalid_credentials', status: 400 });
  assert.match(f.feedback(), /Mejladressen och lösenordet matchar inte/);
  assert.match(f.feedback(), /Glömt lösenord/);
  assert.equal(f.calls[0].args[0].email, 'test@example.test');
  assert.equal(f.get('account-password').value, '');
  assert.equal(f.get('account-email').value, '  test@example.test  ');
  assert.equal(f.get('account-submit').disabled, false);
});
test('Known provider failures have actionable messages and never expose raw provider text', async () => {
  const f = await fixture(); f.action('login');
  const cases = [
    [{ code: 'email_not_confirmed' }, /Bekräfta först/],
    [{ code: 'over_email_send_rate_limit' }, /För många mejl/],
    [{ code: 'over_request_rate_limit' }, /Vänta/],
    [{ status: 429 }, /Vänta/],
    [{ code: 'email_address_not_authorized' }, /kan inte skicka mejl/],
    [{ code: 'weak_password' }, /minst 12/],
    [{ code: 'same_password' }, /skiljer sig/],
    [{ code: 'session_expired' }, /Logga in igen/],
    [{ name: 'AuthRetryableFetchError' }, /internetanslutningen/],
    [{ status: 503 }, /tillfälligt problem/],
    [{ code: '__proto__', message: '<img src=x onerror=secret>' }, /kontakta/]
  ];
  for (const [error, expected] of cases) {
    await f.submit({ ...error, message: 'SECRET_PROVIDER_DETAIL' });
    assert.match(f.feedback(), expected); assert.ok(!f.feedback().includes('SECRET_PROVIDER_DETAIL'));
    assert.equal(f.get('account-feedback').children.length, 0);
  }
});
test('Expired callback errors in query and fragment are removed while ordinary state is preserved', async () => {
  const f = await fixture({ url: 'https://app.example.test/?view=gallery&error=access_denied&error_code=otp_expired&error_description=SECRET#error=access_denied&error_code=otp_expired&error_description=SECRET&tab=one' });
  assert.match(f.feedback(), /redan använts/); assert.match(f.feedback(), /Glömt lösenord/);
  assert.equal(f.get('account-form').hidden, false);
  assert.equal(f.address().href, 'https://app.example.test/?view=gallery#tab=one');
  assert.equal(f.replacements[0].state.marker, true);
  assert.equal(f.calls.length, 0); assert.equal(f.store.user, null);
});
test('Hash-only failures are explained, and a regular anchor survives a query failure', async () => {
  const hash = await fixture({ url: 'https://app.example.test/#error=access_denied&error_code=otp_expired' });
  assert.match(hash.feedback(), /Mejllänken/); assert.equal(hash.address().hash, '');
  const anchor = await fixture({ url: 'https://app.example.test/?error=access_denied#my-projects' });
  assert.equal(anchor.address().hash, '#my-projects');
  assert.match(anchor.feedback(), /Mejllänken kunde inte användas/);
});
test('Valid authorization code remains untouched for the official SDK', async () => {
  const f = await fixture({ url: 'https://app.example.test/?code=synthetic-recovery&view=gallery#my-projects' });
  assert.equal(f.replacements.length, 0);
  assert.equal(f.address().searchParams.get('code'), 'synthetic-recovery');
  assert.equal(f.feedback(), '');
});
test('PKCE session errors leave login available and explain browser mismatch', async () => {
  const f = await fixture({ sessionError: { code: 'bad_code_verifier' } });
  assert.match(f.feedback(), /webbläsaren där du startade/);
  assert.equal(f.get('account-form').hidden, false);
  assert.equal(f.get('account-submit').disabled, false);
});
test('An ordinary session startup error is not mislabeled as a failed email link', async () => {
  const f = await fixture({ sessionError: { code: 'unexpected_failure' } });
  assert.match(f.feedback(), /Det gick inte att slutföra/);
  assert.ok(!f.feedback().includes('Mejllänken'));
});
test('An invalid link never signs out an existing account or opens password update', async () => {
  const user = { id: 'synthetic', email: 'test@example.test' };
  const f = await fixture({ url: 'https://app.example.test/?error_code=otp_expired', user });
  assert.equal(f.store.user, user); assert.equal(f.get('account-form').hidden, true);
  assert.equal(f.calls.length, 0);
});
test('Reset preserves email, explains same-browser use, and sends only on explicit submit', async () => {
  const f = await fixture(); f.get('account-email').value = 'test@example.test'; f.action('reset');
  assert.match(f.feedback(), /samma webbläsare/); assert.equal(f.calls.length, 0);
  assert.equal(f.get('account-password').required, false);
  await f.submit();
  assert.equal(f.calls[0].method, 'resetPasswordForEmail');
  assert.equal(f.calls[0].args[1].redirectTo, 'https://app.example.test/');
  assert.match(f.feedback(), /Om adressen kan användas/);
});
test('Recovery still permits a retry after rejection and closes only after successful password update', async () => {
  const f = await fixture(); f.event('PASSWORD_RECOVERY');
  assert.equal(f.get('account-password').minLength, 12);
  assert.equal(f.get('account-form').hidden, false);
  await f.submit({ code: 'same_password' });
  assert.equal(f.get('account-form').hidden, false); assert.match(f.feedback(), /skiljer sig/);
  await f.submit();
  assert.equal(f.calls[1].method, 'updateUser');
  assert.equal(f.get('account-form').hidden, true); assert.match(f.feedback(), /uppdaterats/);
});
