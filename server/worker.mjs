// Cloudflare Worker för publicerade kundsajter (prototyp).
//   Bindningar: SITES (R2-bucket), DB (D1, schema i server/schema.sql),
//   PUBLISH_HOST + APP_ORIGIN + SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY för det inloggade API:t,
//   CONTROL_HOST + CONTROL_TOKEN (hemlighet) för provets styrgränssnitt, ALLOW_FAULTS='1' endast lokalt.
// Besökare: GET/HEAD på kundens värdnamn -> aktiv version. Kunder publicerar via PUBLISH_HOST/api/publish
// med sin egen inloggning; styrgränssnittet är bara för lokala prov och ska inte konfigureras i drift.
import { createPublisher } from './publisher.mjs';
import { renderSite } from './render-worker.mjs';
import { createAccountSource } from './account-source.mjs';
import { handlePublishRequest } from './publish-api.mjs';

export function r2Bucket(binding) {
  return {
    put: (key, bytes, { contentType, sha256 }) => binding.put(key, bytes, { httpMetadata: { contentType }, customMetadata: { sha256 }, sha256 }),
    async head(key) { const o = await binding.head(key); return o ? { size: o.size, sha256: o.customMetadata?.sha256 } : null; },
    async get(key) {
      const o = await binding.get(key);
      return o ? { bytes: new Uint8Array(await o.arrayBuffer()), size: o.size, sha256: o.customMetadata?.sha256, contentType: o.httpMetadata?.contentType } : null;
    }
  };
}
export function d1Sites(db) {
  const row = r => r && { siteId: r.id, host: r.host, ownerId: r.owner_id, active: r.active_version, revision: r.revision };
  return {
    get: async id => row(await db.prepare('select id, host, owner_id, active_version, revision from sites where id = ?').bind(id).first()),
    byHost: async host => row(await db.prepare('select id, host, owner_id, active_version, revision from sites where host = ?').bind(host).first()),
    // En enda UPDATE med revisionsvillkor: atomiskt jämför-och-byt i D1.
    async swap(id, expected, versionId) {
      const r = await db.prepare('update sites set active_version = ?, revision = revision + 1 where id = ? and revision = ?').bind(versionId, id, expected).run();
      return r.meta.changes === 1;
    },
    create: (id, host, ownerId = null) => db.prepare('insert into sites (id, host, owner_id, revision) values (?, ?, ?, 0)').bind(id, host, ownerId).run()
  };
}
async function equalSecret(a, b) {
  const enc = new TextEncoder(), [x, y] = await Promise.all([a, b].map(s => crypto.subtle.digest('SHA-256', enc.encode(String(s)))));
  return crypto.subtle.timingSafeEqual ? crypto.subtle.timingSafeEqual(x, y) : new Uint8Array(x).every((v, i) => v === new Uint8Array(y)[i]);
}
const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url), host = url.hostname.toLowerCase();
    let bucket = r2Bucket(env.SITES);
    const sites = d1Sites(env.DB);
    if (env.PUBLISH_HOST && host === env.PUBLISH_HOST) {
      const source = createAccountSource({ url: env.SUPABASE_URL, publishableKey: env.SUPABASE_PUBLISHABLE_KEY });
      return handlePublishRequest(request, { env, sites, source, publisher: createPublisher({ bucket, sites, render: renderSite }) });
    }
    if (env.CONTROL_HOST && host === env.CONTROL_HOST) {
      const token = (request.headers.get('Authorization') || '').replace(/^Bearer /, '');
      if (!env.CONTROL_TOKEN || !await equalSecret(token, env.CONTROL_TOKEN)) return json(401, { error: 'Ej behörig.' });
      if (env.ALLOW_FAULTS === '1' && request.headers.has('X-Prov-Fail-After')) {
        let left = Number(request.headers.get('X-Prov-Fail-After')); const real = bucket;
        bucket = { ...real, put: (...a) => { if (left-- <= 0) throw new Error('Simulerat avbrott vid filskrivning'); return real.put(...a); } };
      }
      const publisher = createPublisher({ bucket, sites, render: renderSite });
      const m = /^\/sites\/([a-z0-9-]+)\/(publish|rollback)$/.exec(url.pathname);
      try {
        if (request.method === 'POST' && url.pathname === '/sites') { const { id, host: siteHost, ownerId } = await request.json(); await sites.create(id, siteHost, ownerId); return json(201, { id }); }
        if (request.method === 'POST' && m && m[2] === 'publish') { const { project, expectedRevision } = await request.json(); return json(200, await publisher.publish(m[1], project, { expectedRevision })); }
        if (request.method === 'POST' && m && m[2] === 'rollback') { const { versionId, expectedRevision } = await request.json(); return json(200, await publisher.rollback(m[1], versionId, { expectedRevision })); }
        return json(404, { error: 'Okänd åtgärd.' });
      } catch (error) {
        const status = { conflict: 409, invalid: 422, incomplete: 502, 'unknown-site': 404, 'unknown-version': 404 }[error.code] || 500;
        return json(status, { error: error.message, code: error.code || 'error' });
      }
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Metoden stöds inte.', { status: 405, headers: { Allow: 'GET, HEAD' } });
    const r = await createPublisher({ bucket, sites, render: renderSite }).serve(host, url.pathname, { ifNoneMatch: request.headers.get('If-None-Match') });
    return new Response(request.method === 'HEAD' ? null : r.body, { status: r.status, headers: r.headers });
  }
};
