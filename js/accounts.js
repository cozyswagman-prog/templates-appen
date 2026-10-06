// Provider authentication uses the official SDK; no locally invented user accounts.
window.Accounts = (function () {
  let client = null, recovery = false;
  const config = window.TEMPLATES_CLOUD || {};
  const configured = Boolean(config.url && config.publishableKey);
  const listeners = new Set();
  let store = window.createProjectStore(window.Storage, null);
  const emit = () => listeners.forEach(fn => fn());
  const panel = document.getElementById('account-panel');
  const status = document.getElementById('account-status');
  const form = document.getElementById('account-form');
  const feedback = document.getElementById('account-feedback');
  const password = document.getElementById('account-password');
  const email = document.getElementById('account-email');
  let action = 'login', busy = false;
  function note(text) { feedback.textContent = text; }
  function errorMessage(error, fromLink = false) {
    const code = error && error.code;
    switch (code) {
      case 'invalid_credentials':
        return 'Mejladressen och lösenordet matchar inte. Kontrollera båda eller välj ”Glömt lösenord?”.';
      case 'email_not_confirmed':
        return 'Bekräfta först din mejladress via mejlet du fick när du skapade kontot. Kontrollera även skräpposten.';
      case 'otp_expired': case 'flow_state_expired': case 'flow_state_not_found':
        return 'Mejllänken är ogiltig, har gått ut eller har redan använts. Prova att logga in om du redan har bekräftat kontot. Behöver du byta lösenord, välj ”Glömt lösenord?” och begär en ny länk.';
      case 'bad_code_verifier': case 'pkce_verifier_not_found':
        return 'Mejllänken kunde inte användas i den här webbläsaren. Öppna den i webbläsaren där du startade, eller begär en ny länk här via ”Glömt lösenord?”.';
      case 'over_email_send_rate_limit':
        return 'För många mejl har begärts. Vänta en stund innan du begär en ny länk. Kontrollera även skräpposten.';
      case 'over_request_rate_limit':
        return 'För många försök på kort tid. Vänta en stund och försök igen.';
      case 'email_address_not_authorized':
        return 'Kontotjänsten kan inte skicka mejl till den här adressen. Kontakta den som ansvarar för appen.';
      case 'weak_password':
        return 'Lösenordet uppfyller inte säkerhetskraven. Välj ett unikt lösenord med minst 12 tecken och undvik vanliga lösenord.';
      case 'same_password':
        return 'Välj ett nytt lösenord som skiljer sig från ditt nuvarande.';
      case 'session_expired': case 'session_not_found': case 'refresh_token_not_found':
        return 'Din inloggning har gått ut. Logga in igen. För att byta ett glömt lösenord behöver du begära en ny återställningslänk.';
    }
    if (error && error.status === 429) return 'För många försök på kort tid. Vänta en stund och försök igen.';
    if (error && error.name === 'AuthRetryableFetchError') return 'Kontotjänsten kunde inte nås eller svara just nu. Kontrollera internetanslutningen och försök igen om en stund.';
    if (error && error.status >= 500) return 'Kontotjänsten har ett tillfälligt problem. Försök igen om en stund.';
    if (fromLink) return 'Mejllänken kunde inte användas. Prova att logga in eller välj ”Glömt lösenord?” för att begära en ny länk.';
    return 'Det gick inte att slutföra. Försök igen om en stund. Om felet kvarstår, kontakta den som ansvarar för appen.';
  }
  function takeLinkError() {
    const url = new URL(location.href);
    const fragment = new URLSearchParams(url.hash.slice(1));
    if (!['error', 'error_code'].some(key => url.searchParams.has(key) || fragment.has(key))) return null;
    const code = url.searchParams.get('error_code') || fragment.get('error_code') || '';
    const fragmentHasError = ['error', 'error_code', 'error_description'].some(key => fragment.has(key));
    // Never render provider descriptions or retain error details in a shared URL.
    for (const key of ['error', 'error_code', 'error_description']) {
      url.searchParams.delete(key); fragment.delete(key);
    }
    if (fragmentHasError) url.hash = fragment.toString();
    history.replaceState(history.state, '', url.href);
    return { code };
  }
  function setAction(next) {
    action = next;
    password.closest('label').hidden = next === 'reset';
    email.closest('label').hidden = next === 'password';
    password.required = !['reset'].includes(next);
    email.required = next !== 'password';
    password.minLength = next === 'login' ? 1 : 12;
    password.autocomplete = next === 'login' ? 'current-password' : 'new-password';
    document.getElementById('account-submit').textContent = { login: 'Logga in', signup: 'Skapa konto', reset: 'Skicka återställningslänk', password: 'Spara nytt lösenord' }[next];
    document.getElementById('account-password-help').hidden = !['signup', 'password'].includes(next);
    form.hidden = false;
    note(next === 'reset' ? 'Ange mejladressen för ditt Templates-konto. Öppna den nya länken i samma webbläsare som du använder här.' : '');
  }
  function render() {
    panel.setAttribute('aria-busy', String(busy));
    status.textContent = store.user ? 'Inloggad som ' + store.user.email
      : configured ? 'Logga in för att spara på ditt konto, eller fortsätt på den här enheten.'
        : 'Du arbetar på den här enheten. Molnsparning är inte ansluten ännu.';
    document.getElementById('account-controls').hidden = !client || !!store.user;
    document.getElementById('account-signed-in').hidden = !store.user;
    document.getElementById('image-storage-note').hidden = !store.user || store.mode !== 'cloud';
    document.getElementById('account-local').setAttribute('aria-pressed', String(store.mode === 'local'));
    document.getElementById('account-cloud').setAttribute('aria-pressed', String(store.mode === 'cloud'));
    if (store.user && !recovery) form.hidden = true;
    panel.querySelectorAll('button').forEach(button => { button.disabled = busy; });
  }
  const redirectTo = () => new URL(location.pathname, location.origin).href;
  async function run(fn) {
    if (busy || !client) return;
    busy = true; render(); note('Vänta…');
    try { await fn(); }
    catch (error) { note(errorMessage(error)); }
    finally { busy = false; password.value = ''; render(); }
  }
  panel.querySelectorAll('[data-account-action]').forEach(button => button.addEventListener('click', () => setAction(button.dataset.accountAction)));
  document.getElementById('account-cancel').addEventListener('click', () => { form.hidden = true; password.value = ''; note(''); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    run(async () => {
      let result;
      if (action === 'login') result = await client.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
      if (action === 'signup') result = await client.auth.signUp({ email: email.value.trim(), password: password.value, options: { emailRedirectTo: redirectTo() } });
      if (action === 'reset') result = await client.auth.resetPasswordForEmail(email.value.trim(), { redirectTo: redirectTo() });
      if (action === 'password') result = await client.auth.updateUser({ password: password.value });
      if (result.error) throw result.error;
      if (action === 'signup' || action === 'reset') note('Om adressen kan användas har ett mejl skickats. Öppna länken i samma webbläsare och kontrollera även skräpposten.');
      else if (action === 'password') { recovery = false; form.hidden = true; note('Ditt lösenord har uppdaterats.'); }
      else note('Du är inloggad.');
    });
  });
  document.getElementById('account-signout').addEventListener('click', () => run(async () => {
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw error;
    store.setUser(null); note('Du är utloggad på den här enheten.');
  }));
  document.getElementById('account-local').addEventListener('click', () => store.setMode('local'));
  document.getElementById('account-cloud').addEventListener('click', () => store.setMode('cloud'));
  async function init() {
    render();
    if (!configured) return;
    const linkError = takeLinkError();
    const fromLink = !!linkError || new URL(location.href).searchParams.has('code');
    try {
      const url = new URL(config.url);
      if (url.protocol !== 'https:' || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey)) throw new Error('Invalid public configuration');
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'vendor/supabase.js'; script.onload = resolve; script.onerror = reject; document.head.append(script);
      });
      client = window.supabase.createClient(config.url, config.publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
      });
      store = window.createProjectStore(window.Storage, client);
      store.subscribe(() => { render(); emit(); });
      client.auth.onAuthStateChange((event, session) => {
        // Never await another SDK operation inside this callback (provider auth lock).
        store.setUser(session ? session.user : null);
        if (event === 'PASSWORD_RECOVERY') { recovery = true; setAction('password'); }
        render();
      });
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      store.setUser(data.session ? data.session.user : null);
      render(); emit();
      if (linkError) {
        if (!store.user) setAction('login');
        note(errorMessage(linkError, true));
      }
    } catch (error) {
      if (client) {
        if (!store.user) setAction('login');
        note(errorMessage(linkError || error, fromLink));
      } else note('Kontotjänsten kunde inte startas. Du kan fortfarande arbeta på den här enheten.');
    }
  }
  // Kundens aktuella inloggning för appens egna API-anrop (publicering). Skickas bara till konfigurerad tjänst.
  async function accessToken() {
    if (!client || !store.user) return null;
    const { data, error } = await client.auth.getSession();
    return !error && data.session && data.session.user.id === store.user.id ? data.session.access_token : null;
  }
  return { get store() { return store; }, init, subscribe(fn) { listeners.add(fn); }, accessToken };
})();
