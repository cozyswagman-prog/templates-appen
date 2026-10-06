// Klient för publicerings-API:t (server/publish-api.mjs). Skickar kundens egen inloggning; inga nycklar.
// Fel blir begripliga svenska meddelanden med en kod som appen kan agera på.
(function (root) {
  function createPublishClient({ baseUrl, getToken, fetch: request = (...a) => root.fetch(...a) }) {
    const base = String(baseUrl || '').replace(/\/+$/, '');
    async function call(method, path, body) {
      const token = await getToken();
      if (!token) throw Object.assign(new Error('Logga in igen för att publicera.'), { code: 'auth' });
      let response;
      try {
        response = await request(base + path, { method, headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store' });
      } catch {
        throw Object.assign(new Error('Kunde inte nå publiceringstjänsten. Din förra publicerade version visas fortfarande.'), { code: 'network' });
      }
      let data = null;
      try { data = await response.json(); } catch { /* tomt svar */ }
      if (!response.ok) {
        const code = data?.code || 'error';
        const text = code === 'conflict' ? 'Hemsidan publicerades nyss från en annan flik. Stäng rutan och försök igen.'
          : code === 'auth' ? 'Logga in igen för att publicera.'
          : data?.error || 'Publiceringen misslyckades. Din förra publicerade version visas fortfarande.';
        throw Object.assign(new Error(text), { code, status: response.status });
      }
      return data;
    }
    return {
      configured: !!base,
      async status() {
        const data = await call('GET', '/api/sites');
        return { site: (data.sites || [])[0] || null, domain: data.domain || '', addressStyle: data.addressStyle === 'path' ? 'path' : 'subdomain', customDomains: !!data.customDomains, planRequired: !!data.planRequired, plan: data.plan || null, price: data.price || null };
      },
      // Adress till Stripes betalsida. Rätten att publicera ges först när Stripe bekräftat betalningen.
      async checkout() {
        const { url } = await call('POST', '/api/billing/checkout', {});
        if (!/^https:\/\/checkout\.stripe\.com\//.test(url || '')) throw Object.assign(new Error('Betalsidan kunde inte öppnas. Försök igen.'), { code: 'checkout' });
        return url;
      },
      // Stripes kundportal: säga upp, återuppta, byta kort och hämta kvitton.
      async portal() {
        const { url } = await call('POST', '/api/billing/portal', {});
        if (!/^https:\/\/billing\.stripe\.com\//.test(url || '')) throw Object.assign(new Error('Abonnemangssidan kunde inte öppnas. Försök igen.'), { code: 'portal' });
        return url;
      },
      // Egna domäner: anspråk, kontroll av TXT-posten och bortkoppling. Servern avgör allt; klienten visar bara läget.
      domains: async () => (await call('GET', '/api/domains')).domains || [],
      addDomain: hostname => call('POST', '/api/domains', { hostname }),
      verifyDomain: hostname => call('POST', '/api/domains/verify', { hostname }),
      removeDomain: hostname => call('POST', '/api/domains/remove', { hostname }),
      createSite: slug => call('POST', '/api/sites', { slug }),
      publish: (siteId, projectId, expectedRevision) => call('POST', '/api/publish', { siteId, projectId, expectedRevision })
    };
  }
  // Förslag på adress från projektnamnet: a–z, 0–9 och bindestreck, 3–40 tecken.
  function suggestSlug(name) {
    const slug = String(name || '').toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/é|è|ê/g, 'e').replace(/ü/g, 'u')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
    return slug.length >= 3 ? slug : '';
  }
  root.createPublishClient = createPublishClient;
  root.suggestPublishSlug = suggestSlug;
  if (typeof module !== 'undefined') module.exports = { createPublishClient, suggestSlug };
})(typeof window === 'undefined' ? globalThis : window);
