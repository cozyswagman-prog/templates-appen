// Inloggat publicerings-API: POST /api/publish { siteId, projectId, expectedRevision } med kundens token.
// Bara appens egen origin får anropa (CORS), bara sajtens ägare får publicera, och projektet hämtas
// med kundens egen behörighet. Okänd sajt och annans sajt ger samma svar, så sajter kan inte kartläggas.
// Abonnemangskontroll (T07) är inte inkopplad ännu: env.REQUIRE_PLAN='1' nekar alla tills den finns.
import { PROJECT_ID } from './account-source.mjs';
const SITE_ID = /^[a-z0-9][a-z0-9-]{2,62}$/;

export async function handlePublishRequest(request, { env, sites, publisher, source }) {
  const origin = request.headers.get('Origin');
  const allowed = !!env.APP_ORIGIN && origin === env.APP_ORIGIN;
  const cors = allowed ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Max-Age': '600', Vary: 'Origin' } : { Vary: 'Origin' };
  const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (origin && !allowed) return json(403, { error: 'Fel ursprung.', code: 'origin' });
  if (request.method === 'OPTIONS') return new Response(null, { status: allowed ? 204 : 403, headers: cors });
  if (new URL(request.url).pathname !== '/api/publish') return json(404, { error: 'Okänd adress.', code: 'not-found' });
  if (request.method !== 'POST') return json(405, { error: 'Metoden stöds inte.', code: 'method' });
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  try {
    const user = await source.getUser(token);
    if (!user) return json(401, { error: 'Logga in igen för att publicera.', code: 'auth' });
    let body; try { body = await request.json(); } catch { return json(400, { error: 'Ogiltig begäran.', code: 'invalid' }); }
    const { siteId, projectId, expectedRevision } = body || {};
    if (!SITE_ID.test(siteId || '') || !PROJECT_ID.test(projectId || '') || (expectedRevision !== undefined && !Number.isInteger(expectedRevision))) return json(400, { error: 'Ogiltig begäran.', code: 'invalid' });
    const site = await sites.get(siteId);
    if (!site || site.ownerId !== user.id) return json(404, { error: 'Sajten finns inte.', code: 'unknown-site' });
    if (env.REQUIRE_PLAN === '1') return json(402, { error: 'Publicering kräver ett aktivt abonnemang.', code: 'plan' });
    const loaded = await source.loadProject(token, user.id, projectId);
    if (!loaded) return json(404, { error: 'Projektet finns inte.', code: 'unknown-project' });
    const result = await publisher.publish(siteId, loaded.project, { expectedRevision });
    return json(200, { ...result, projectRevision: loaded.revision, url: 'https://' + site.host + '/' });
  } catch (error) {
    const status = { conflict: 409, invalid: 422, image: 422, incomplete: 502, upstream: 502, 'unknown-site': 404 }[error.code] || 500;
    return json(status, { error: status === 500 ? 'Publiceringen misslyckades. Föregående version visas fortfarande.' : error.message, code: error.code || 'error' });
  }
}
