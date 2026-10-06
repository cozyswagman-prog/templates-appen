// Inloggat publicerings-API (kundens Supabase-token i Authorization):
//   GET  /api/sites                 -> kundens sajter med adress och aktiv version
//   POST /api/sites    { slug }     -> skapar kundens sajt på <slug>.<SITES_DOMAIN> (en per konto i piloten)
//   POST /api/publish  { siteId, projectId, expectedRevision }
//   POST /api/billing/checkout      -> adress till Stripes betalsida för abonnemang
//   POST /api/stripe/webhook        -> Stripe-händelser (ingen inloggning; signaturen i Stripe-Signature avgör)
// Bara appens egen origin får anropa (CORS), bara sajtens ägare får publicera, och projektet hämtas
// med kundens egen behörighet. Okänd sajt och annans sajt ger samma svar, så sajter kan inte kartläggas.
// Med env.REQUIRE_PLAN='1' krävs ett aktivt abonnemang (billing.plan) för att publicera.
import { PROJECT_ID } from './account-source.mjs';
import { verifyStripeEvent } from './billing.mjs';
const SITE_ID = /^[a-z0-9][a-z0-9-]{2,62}$/;
const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const RESERVED = new Set(['www', 'api', 'app', 'admin', 'publish', 'control', 'mail', 'smtp', 'ftp', 'static', 'cdn', 'assets', 'templates', 'support', 'hjalp', 'help', 'status', 'test', 'demo']);
const view = site => ({ siteId: site.siteId, host: site.host, url: 'https://' + site.host + '/', active: site.active, revision: site.revision });

export async function handlePublishRequest(request, { env, sites, publisher, source, billing = null, checkout = null }) {
  const path = new URL(request.url).pathname;
  // Stripe anropar server-till-server: ingen origin eller inloggning, bara signaturen räknas.
  if (path === '/api/stripe/webhook') {
    const reply = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    if (request.method !== 'POST') return reply(405, { error: 'Metoden stöds inte.' });
    if (!billing) return reply(503, { error: 'Abonnemang är inte konfigurerat.' });
    const raw = await request.text();
    let event;
    try { event = await verifyStripeEvent(raw, request.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET); }
    catch (error) { return reply(error.code === 'config' ? 503 : 400, { error: error.code === 'config' ? 'Abonnemang är inte konfigurerat.' : 'Ogiltig signatur.' }); }
    try { return reply(200, { received: true, ...(await billing.handle(event)) }); }
    catch { return reply(500, { error: 'Händelsen kunde inte behandlas.' }); }
  }
  const origin = request.headers.get('Origin');
  const allowed = !!env.APP_ORIGIN && origin === env.APP_ORIGIN;
  const cors = allowed ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Max-Age': '600', Vary: 'Origin' } : { Vary: 'Origin' };
  const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (origin && !allowed) return json(403, { error: 'Fel ursprung.', code: 'origin' });
  if (request.method === 'OPTIONS') return new Response(null, { status: allowed ? 204 : 403, headers: cors });
  const route = { 'GET /api/sites': 'list', 'POST /api/sites': 'create', 'POST /api/publish': 'publish', 'POST /api/billing/checkout': 'checkout' }[request.method + ' ' + path];
  if (!route) return json(['/api/sites', '/api/publish', '/api/billing/checkout'].includes(path) ? 405 : 404, { error: 'Okänd åtgärd.', code: 'not-found' });
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  try {
    const user = await source.getUser(token);
    if (!user) return json(401, { error: 'Logga in igen för att publicera.', code: 'auth' });
    const planOf = async () => { if (!billing) return null; const p = await billing.plan(user.id); return { active: p.active, status: p.status, cancelAtPeriodEnd: !!p.cancelAtPeriodEnd, currentPeriodEnd: p.currentPeriodEnd ?? null }; };
    if (route === 'list') return json(200, { sites: (await sites.listByOwner(user.id)).map(s => view(s)), domain: env.SITES_DOMAIN || null, planRequired: env.REQUIRE_PLAN === '1', plan: await planOf() });
    if (route === 'checkout') {
      if (!billing || !checkout) return json(503, { error: 'Abonnemang är inte konfigurerat.', code: 'config' });
      if ((await billing.plan(user.id)).active) return json(409, { error: 'Du har redan ett aktivt abonnemang.', code: 'already-active' });
      return json(200, { url: await checkout(user.id, user.email || null) });
    }
    let body; try { body = await request.json(); } catch { return json(400, { error: 'Ogiltig begäran.', code: 'invalid' }); }
    if (route === 'create') {
      const slug = String(body?.slug || '');
      if (!env.SITES_DOMAIN) return json(503, { error: 'Publicering är inte konfigurerad.', code: 'config' });
      if (!SLUG.test(slug)) return json(422, { error: 'Välj en adress med 3–40 tecken: a–z, 0–9 och bindestreck, inte först eller sist.', code: 'slug' });
      if (RESERVED.has(slug)) return json(422, { error: 'Adressen är reserverad för tjänsten. Välj en annan.', code: 'slug' });
      if ((await sites.listByOwner(user.id)).length) return json(409, { error: 'Ditt konto har redan en sajt.', code: 'site-exists' });
      try { await sites.create(slug, slug + '.' + env.SITES_DOMAIN, user.id); }
      catch (error) {
        if (error.code === 'taken') return json(409, { error: 'Adressen är upptagen. Välj en annan.', code: 'taken' });
        if (error.code === 'site-exists') return json(409, { error: 'Ditt konto har redan en sajt.', code: 'site-exists' });
        throw error;
      }
      return json(201, view(await sites.get(slug)));
    }
    const { siteId, projectId, expectedRevision } = body || {};
    if (!SITE_ID.test(siteId || '') || !PROJECT_ID.test(projectId || '') || (expectedRevision !== undefined && !Number.isInteger(expectedRevision))) return json(400, { error: 'Ogiltig begäran.', code: 'invalid' });
    const site = await sites.get(siteId);
    if (!site || site.ownerId !== user.id) return json(404, { error: 'Sajten finns inte.', code: 'unknown-site' });
    if (env.REQUIRE_PLAN === '1' && !(billing && (await billing.plan(user.id)).active)) return json(402, { error: 'Publicering kräver ett aktivt abonnemang.', code: 'plan' });
    const loaded = await source.loadProject(token, user.id, projectId);
    if (!loaded) return json(404, { error: 'Projektet finns inte.', code: 'unknown-project' });
    const result = await publisher.publish(siteId, loaded.project, { expectedRevision });
    return json(200, { ...result, projectRevision: loaded.revision, url: 'https://' + site.host + '/' });
  } catch (error) {
    const status = { conflict: 409, invalid: 422, image: 422, incomplete: 502, upstream: 502, config: 503, 'unknown-site': 404 }[error.code] || 500;
    return json(status, { error: status === 500 ? 'Publiceringen misslyckades. Föregående version visas fortfarande.' : error.message, code: error.code || 'error' });
  }
}
