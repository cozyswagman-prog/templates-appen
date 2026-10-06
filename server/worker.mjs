// Cloudflare Worker för publicerade kundsajter (prototyp).
//   Bindningar: DB (D1, schema i server/schema.sql), SITES (R2-bucket, valfri; utan den lagras filerna i D1),
//   PUBLISH_HOST + APP_ORIGIN + SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY för det inloggade API:t,
//   abonnemang: STRIPE_WEBHOOK_SECRET (whsec_, hemlighet), STRIPE_SECRET_KEY (hemlighet), STRIPE_PRICE_ID,
//   STRIPE_PRODUCT_ID (valfri), STRIPE_PORTAL_CONFIGURATION (valfri, bpc_), STRIPE_TAX_RATE_ID (txr_, valfri moms;
//   utan den faktureras utan moms),
//   PLAN_PRICE_SEK (priset som visas i appen, ska motsvara Stripe-priset), REQUIRE_PLAN='1' för att kräva
//   aktivt abonnemang vid publicering,
//   CONTROL_HOST + CONTROL_TOKEN (hemlighet) för provets styrgränssnitt, ALLOW_FAULTS='1' endast lokalt.
//   SITES_PATH_HOST: värdnamn där sajterna visas som https://<värd>/<adress>/ (t.ex. workers.dev utan egen domän);
//   ska vara en egen Worker-adress, skild från PUBLISH_HOST, så kundsajter och API inte delar ursprung.
// Besökare: GET/HEAD på kundens värdnamn -> aktiv version. Kunder publicerar via PUBLISH_HOST/api/publish
// med sin egen inloggning; styrgränssnittet är bara för lokala prov och ska inte konfigureras i drift.
import { createPublisher } from './publisher.mjs';
import { renderSite } from './render-worker.mjs';
import { createAccountSource } from './account-source.mjs';
import { handlePublishRequest } from './publish-api.mjs';
import { createBilling, createStripeCheckout, createStripePortal } from './billing.mjs';

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
// Filerna i D1 i stället för R2: gratis utan betalkort och starkt konsistent. D1 tillåter högst 2 MB per rad.
const D1_MAX_FILE = 1900000;
export function d1Bucket(db) {
  return {
    async put(key, bytes, { contentType, sha256 }) {
      if (bytes.length > D1_MAX_FILE) throw Object.assign(new Error('En bild är för stor för publicering (högst 1,9 MB). Byt till en mindre bild.'), { code: 'image' });
      await db.prepare('insert or replace into site_files (key, bytes, size, sha256, content_type) values (?, ?, ?, ?, ?)').bind(key, bytes, bytes.length, sha256, contentType).run();
    },
    async head(key) { const r = await db.prepare('select size, sha256 from site_files where key = ?').bind(key).first(); return r ? { size: r.size, sha256: r.sha256 } : null; },
    async get(key) {
      const r = await db.prepare('select bytes, size, sha256, content_type from site_files where key = ?').bind(key).first();
      return r ? { bytes: new Uint8Array(r.bytes), size: r.size, sha256: r.sha256, contentType: r.content_type } : null;
    }
  };
}
export function d1Sites(db) {
  const row = r => r && { siteId: r.id, host: r.host, ownerId: r.owner_id, active: r.active_version, revision: r.revision };
  return {
    get: async id => row(await db.prepare('select id, host, owner_id, active_version, revision from sites where id = ?').bind(id).first()),
    byHost: async host => row(await db.prepare('select id, host, owner_id, active_version, revision from sites where host = ?').bind(host).first()),
    wasPublished: async (id, versionId) => !!await db.prepare('select 1 from published_versions where site_id = ? and version_id = ?').bind(id, versionId).first(),
    // D1 batch is transactional: public asset access and the pointer switch commit together.
    async swap(id, expected, versionId) {
      const result = await db.batch([
        db.prepare('update sites set active_version = ?, revision = revision + 1 where id = ? and revision = ?').bind(versionId, id, expected),
        db.prepare('insert or ignore into published_versions (site_id, version_id, published_revision) select id, active_version, revision from sites where id = ? and active_version = ? and revision = ?').bind(id, versionId, expected + 1)
      ]);
      return result[0].meta.changes === 1;
    },
    listByOwner: async ownerId => ((await db.prepare('select id, host, owner_id, active_version, revision from sites where owner_id = ? order by id').bind(ownerId).all()).results || []).map(row),
    async create(id, host, ownerId = null) {
      try { await db.prepare('insert into sites (id, host, owner_id, revision) values (?, ?, ?, 0)').bind(id, host, ownerId).run(); }
      catch (error) {
        const msg = String(error.message);
        if (/sites\.owner_id|sites_one_per_owner/i.test(msg)) throw Object.assign(new Error('Kontot har redan en sajt.'), { code: 'site-exists' });
        if (/UNIQUE|constraint/i.test(msg)) throw Object.assign(new Error('Adressen är upptagen.'), { code: 'taken' });
        throw error;
      }
    }
  };
}
// Abonnemang i D1. Villkoren i SQL gör ordningen säker även när två händelser kommer samtidigt.
export function d1Billing(db) {
  const sub = r => r && { id: r.id, userId: r.user_id, customerId: r.customer_id, status: r.status, productOk: !!r.product_ok, currentPeriodEnd: r.current_period_end, cancelAtPeriodEnd: !!r.cancel_at_period_end, lastEventCreated: r.last_event_created };
  return {
    async claimEvent(e) { const r = await db.prepare("insert or ignore into billing_events (id, type, created, result, processed_at) values (?, ?, ?, 'processing', ?)").bind(e.id, e.type, e.created, e.processedAt).run(); return r.meta.changes === 1; },
    finishEvent: (id, result) => db.prepare('update billing_events set result = ? where id = ?').bind(result, id).run(),
    releaseEvent: id => db.prepare('delete from billing_events where id = ?').bind(id).run(),
    getSubscription: async id => sub(await db.prepare('select * from subscriptions where id = ?').bind(id).first()),
    async putSubscription(s) {
      const r = await db.prepare(`insert into subscriptions (id, user_id, customer_id, status, product_ok, current_period_end, cancel_at_period_end, last_event_created)
        values (?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set user_id = excluded.user_id, customer_id = excluded.customer_id, status = excluded.status, product_ok = excluded.product_ok,
          current_period_end = excluded.current_period_end, cancel_at_period_end = excluded.cancel_at_period_end, last_event_created = excluded.last_event_created
        where excluded.last_event_created >= subscriptions.last_event_created and not (subscriptions.status = 'canceled' and excluded.status <> 'canceled')`)
        .bind(s.id, s.userId, s.customerId, s.status, s.productOk ? 1 : 0, s.currentPeriodEnd, s.cancelAtPeriodEnd ? 1 : 0, s.lastEventCreated).run();
      return r.meta.changes === 1;
    },
    linkCheckout: (subId, userId) => db.prepare('insert or ignore into checkout_links (subscription_id, user_id) values (?, ?)').bind(subId, userId).run(),
    linkedUser: async subId => (await db.prepare('select user_id from checkout_links where subscription_id = ?').bind(subId).first())?.user_id || null,
    subscriptionsForUser: async userId => ((await db.prepare('select * from subscriptions where user_id = ? order by last_event_created desc').bind(userId).all()).results || []).map(sub)
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
    let bucket = env.SITES ? r2Bucket(env.SITES) : d1Bucket(env.DB);
    const sites = d1Sites(env.DB);
    if (env.PUBLISH_HOST && host === env.PUBLISH_HOST) {
      const source = createAccountSource({ url: env.SUPABASE_URL, publishableKey: env.SUPABASE_PUBLISHABLE_KEY });
      const billing = env.STRIPE_WEBHOOK_SECRET ? createBilling({ store: d1Billing(env.DB), productId: env.STRIPE_PRODUCT_ID || null }) : null;
      const checkout = env.STRIPE_SECRET_KEY ? createStripeCheckout({ secretKey: env.STRIPE_SECRET_KEY, priceId: env.STRIPE_PRICE_ID, appOrigin: env.APP_ORIGIN, taxRateId: env.STRIPE_TAX_RATE_ID || null }) : null;
      const portal = env.STRIPE_SECRET_KEY ? createStripePortal({ secretKey: env.STRIPE_SECRET_KEY, appOrigin: env.APP_ORIGIN, configurationId: env.STRIPE_PORTAL_CONFIGURATION || null }) : null;
      return handlePublishRequest(request, { env, sites, source, billing, checkout, portal, publisher: createPublisher({ bucket, sites, render: renderSite }) });
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
    let siteHost = host, pathname = url.pathname;
    if (env.SITES_PATH_HOST && host === env.SITES_PATH_HOST) {
      // /<adress>/<fil>: sajtens länkar är relativa, så adressen måste sluta med snedstreck.
      const m = /^\/([a-z0-9][a-z0-9-]{1,38}[a-z0-9])(\/.*)?$/.exec(pathname);
      if (m && !m[2]) return new Response(null, { status: 301, headers: { Location: '/' + m[1] + '/', 'Cache-Control': 'no-store' } });
      siteHost = m ? host + '/' + m[1] : ''; pathname = m ? m[2] : '/';
    }
    const r = await createPublisher({ bucket, sites, render: renderSite }).serve(siteHost, pathname, { ifNoneMatch: request.headers.get('If-None-Match') });
    return new Response(request.method === 'HEAD' ? null : r.body, { status: r.status, headers: r.headers });
  }
};
