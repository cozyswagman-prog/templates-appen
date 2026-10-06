// Egna domäner (T08): anspråk, DNS-verifiering och skydd mot övertagande. Plattformsneutral kärna.
//   - Kunden gör anspråk på ett exakt värdnamn för sin sajt och får en slumpmässig TXT-utmaning som bara gäller
//     det kontot och värdnamnet. Bara den som styr domänens DNS kan alltså verifiera den.
//   - Flera konton kan ha väntande anspråk samtidigt; den som verifierar först får domänen. En verifierad domän
//     tillhör exakt en sajt (unikt index i D1), och övriga anspråk på samma namn tas bort.
//   - Väntande anspråk upphör efter 7 dagar. Frånkoppling tar bort raden, så en kvarlämnad DNS-post ger ingen annan
//     kund åtkomst: en ny kund måste ändå lägga in sin egen utmaning i DNS.
//   - Aktivering (certifikat + trafik via Cloudflare for SaaS) är ett separat steg som kräver Templates egen zon.
//   store: listByOwner(ownerId), get(hostname, ownerId), verifiedOwner(hostname), put(row), markVerified(hostname, ownerId, at),
//          removeOthers(hostname, ownerId), remove(hostname, ownerId), countForSite(siteId, now), activeSite(hostname)
const fail = (code, message) => Object.assign(new Error(message), { code });
export const CHALLENGE_PREFIX = '_templates-verifiering';
export const PENDING_DAYS = 7, MAX_PER_SITE = 2;
const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

// Normaliserar det kunden skriver (även en hel adress) till ett värdnamn i ASCII (punycode) eller kastar 'domain'.
export function normalizeHostname(input, { reserved = [] } = {}) {
  const raw = String(input || '').trim();
  if (!raw || raw.length > 300) throw fail('domain', 'Skriv domänen, till exempel www.dittforetag.se.');
  let host;
  try { host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : 'https://' + raw).hostname; } catch { throw fail('domain', 'Domänen ser inte giltig ut.'); }
  host = host.toLowerCase().replace(/\.$/, '');
  const labels = host.split('.');
  if (host.length > 253 || labels.length < 2 || !labels.every(l => LABEL.test(l)) || /^\d+$/.test(labels.at(-1)) || labels.at(-1).length < 2) throw fail('domain', 'Domänen ser inte giltig ut. Skriv den utan https:// och sökväg.');
  if (/^\[|:/.test(host) || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.test') || host.endsWith('.invalid') || host.endsWith('.example')) throw fail('domain', 'Domänen kan inte användas för en publik hemsida.');
  for (const r of ['workers.dev', 'pages.dev', ...reserved].filter(Boolean).map(s => String(s).toLowerCase())) {
    if (host === r || host.endsWith('.' + r)) throw fail('domain', 'Den adressen tillhör tjänsten och kan inte kopplas som egen domän.');
  }
  return host;
}

const randomToken = () => [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2, '0')).join('');

// DNS-över-HTTPS (JSON-format). Returnerar TXT-värden för exakt namn; kastar 'dns' vid nät- eller tjänstefel.
export function dohResolver({ endpoint = 'https://cloudflare-dns.com/dns-query', fetch: request = (...a) => fetch(...a) } = {}) {
  return async function resolveTxt(name) {
    let response;
    try { response = await request(endpoint + '?name=' + encodeURIComponent(name) + '&type=TXT', { headers: { accept: 'application/dns-json' } }); }
    catch { throw fail('dns', 'DNS-kontrollen svarade inte. Försök igen om en stund.'); }
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || typeof data.Status !== 'number') throw fail('dns', 'DNS-kontrollen svarade inte. Försök igen om en stund.');
    if (data.Status === 3) return []; // NXDOMAIN: posten finns inte än
    if (data.Status !== 0) throw fail('dns', 'DNS-kontrollen gav ett fel. Försök igen om en stund.');
    // TXT-data kommer citerad och kan vara uppdelad i flera strängar: "abc" "def" -> abcdef
    return (data.Answer || []).filter(a => a.type === 16).map(a => String(a.data || '').replace(/^"|"$/g, '').split('" "').join(''));
  };
}

export function createDomains({ store, resolveTxt, now = () => Date.now(), reserved = [] }) {
  const view = row => ({ hostname: row.hostname, status: row.status, expiresAt: row.status === 'pending' ? row.expiresAt : null,
    record: { type: 'TXT', name: CHALLENGE_PREFIX + '.' + row.hostname, value: 'templates=' + row.token } });
  return {
    normalize: input => normalizeHostname(input, { reserved }),
    async list(ownerId) { return (await store.listByOwner(ownerId)).filter(r => r.status !== 'pending' || r.expiresAt > now()).map(view); },
    async claim(ownerId, siteId, input) {
      const hostname = normalizeHostname(input, { reserved });
      const verifiedBy = await store.verifiedOwner(hostname);
      if (verifiedBy && verifiedBy !== ownerId) throw fail('domain-taken', 'Domänen är redan kopplad till en annan hemsida.');
      const existing = await store.get(hostname, ownerId);
      if (existing && (existing.status !== 'pending' || existing.expiresAt > now())) return view(existing);
      if (!existing && await store.countForSite(siteId, now()) >= MAX_PER_SITE) throw fail('domain-limit', 'En hemsida kan ha högst två egna domäner, till exempel med och utan www.');
      const row = { hostname, siteId, ownerId, token: randomToken(), status: 'pending', createdAt: now(), verifiedAt: null, expiresAt: now() + PENDING_DAYS * 86400000 };
      await store.put(row);
      return view(row);
    },
    async verify(ownerId, input) {
      const hostname = normalizeHostname(input, { reserved });
      const row = await store.get(hostname, ownerId);
      if (!row) throw fail('domain-unknown', 'Lägg först till domänen.');
      if (row.status !== 'pending') return view(row);
      if (row.expiresAt <= now()) throw fail('domain-expired', 'Utmaningen har gått ut. Ta bort domänen och lägg till den igen.');
      const verifiedBy = await store.verifiedOwner(hostname);
      if (verifiedBy && verifiedBy !== ownerId) throw fail('domain-taken', 'Domänen är redan kopplad till en annan hemsida.');
      const values = await resolveTxt(CHALLENGE_PREFIX + '.' + hostname);
      if (!values.includes('templates=' + row.token)) throw fail('domain-pending', 'TXT-posten hittades inte än. Det kan ta upp till några timmar efter ändringen hos din domänleverantör.');
      // Unikt index i D1: om någon annan hann verifiera samtidigt misslyckas detta med 'domain-taken'.
      await store.markVerified(hostname, ownerId, now());
      await store.removeOthers(hostname, ownerId);
      return view({ ...row, status: 'verified' });
    },
    async remove(ownerId, input) {
      const hostname = normalizeHostname(input, { reserved });
      if (!await store.get(hostname, ownerId)) throw fail('domain-unknown', 'Domänen finns inte på ditt konto.');
      await store.remove(hostname, ownerId);
      return { hostname, removed: true };
    }
  };
}

export function memoryDomainStore() {
  const rows = new Map(), key = (h, o) => h + '\n' + o;
  return {
    listByOwner: async ownerId => [...rows.values()].filter(r => r.ownerId === ownerId).sort((a, b) => a.hostname.localeCompare(b.hostname)).map(r => ({ ...r })),
    get: async (hostname, ownerId) => rows.has(key(hostname, ownerId)) ? { ...rows.get(key(hostname, ownerId)) } : null,
    verifiedOwner: async hostname => [...rows.values()].find(r => r.hostname === hostname && r.status !== 'pending')?.ownerId || null,
    put: async row => { rows.set(key(row.hostname, row.ownerId), { ...row }); },
    async markVerified(hostname, ownerId, at) {
      if ([...rows.values()].some(r => r.hostname === hostname && r.status !== 'pending' && r.ownerId !== ownerId)) throw fail('domain-taken', 'Domänen är redan kopplad till en annan hemsida.');
      Object.assign(rows.get(key(hostname, ownerId)), { status: 'verified', verifiedAt: at });
    },
    removeOthers: async (hostname, ownerId) => { for (const [k, r] of rows) if (r.hostname === hostname && r.ownerId !== ownerId) rows.delete(k); },
    remove: async (hostname, ownerId) => { rows.delete(key(hostname, ownerId)); },
    countForSite: async (siteId, at) => [...rows.values()].filter(r => r.siteId === siteId && (r.status !== 'pending' || r.expiresAt > at)).length,
    activeSite: async hostname => [...rows.values()].find(r => r.hostname === hostname && r.status === 'active')?.siteId || null
  };
}

// D1-lagring. Det partiella unika indexet garanterar att en verifierad domän bara tillhör ett konto, även vid samtidighet.
export function d1DomainStore(db) {
  const row = r => r && { hostname: r.hostname, siteId: r.site_id, ownerId: r.owner_id, token: r.token, status: r.status, createdAt: r.created_at, verifiedAt: r.verified_at, expiresAt: r.expires_at };
  return {
    listByOwner: async ownerId => ((await db.prepare('select * from custom_domains where owner_id = ? order by hostname').bind(ownerId).all()).results || []).map(row),
    get: async (hostname, ownerId) => row(await db.prepare('select * from custom_domains where hostname = ? and owner_id = ?').bind(hostname, ownerId).first()),
    verifiedOwner: async hostname => (await db.prepare("select owner_id from custom_domains where hostname = ? and status <> 'pending'").bind(hostname).first())?.owner_id || null,
    put: r => db.prepare('insert or replace into custom_domains (hostname, owner_id, site_id, token, status, created_at, verified_at, expires_at) values (?, ?, ?, ?, ?, ?, ?, ?)').bind(r.hostname, r.ownerId, r.siteId, r.token, r.status, r.createdAt, r.verifiedAt, r.expiresAt).run(),
    async markVerified(hostname, ownerId, at) {
      try { await db.prepare("update custom_domains set status = 'verified', verified_at = ? where hostname = ? and owner_id = ?").bind(at, hostname, ownerId).run(); }
      catch (error) { if (/UNIQUE|constraint/i.test(String(error.message))) throw fail('domain-taken', 'Domänen är redan kopplad till en annan hemsida.'); throw error; }
    },
    removeOthers: (hostname, ownerId) => db.prepare('delete from custom_domains where hostname = ? and owner_id <> ?').bind(hostname, ownerId).run(),
    remove: (hostname, ownerId) => db.prepare('delete from custom_domains where hostname = ? and owner_id = ?').bind(hostname, ownerId).run(),
    countForSite: async (siteId, at) => (await db.prepare("select count(*) as n from custom_domains where site_id = ? and (status <> 'pending' or expires_at > ?)").bind(siteId, at).first())?.n || 0,
    activeSite: async hostname => (await db.prepare("select site_id from custom_domains where hostname = ? and status = 'active'").bind(hostname).first())?.site_id || null
  };
}

// Påslaget med CUSTOM_DOMAINS_ENABLED='1'. Tjänstens egna värdnamn kan aldrig göras anspråk på.
export function domainsFromEnv(env, { fetch: request } = {}) {
  if (env.CUSTOM_DOMAINS_ENABLED !== '1') return null;
  let app = null; try { app = new URL(env.APP_ORIGIN).hostname; } catch { /* ingen app-origin */ }
  return createDomains({ store: d1DomainStore(env.DB), resolveTxt: dohResolver(request ? { fetch: request } : {}),
    reserved: [env.PUBLISH_HOST, env.SITES_PATH_HOST, env.SITES_DOMAIN, env.CONTROL_HOST, app] });
}
