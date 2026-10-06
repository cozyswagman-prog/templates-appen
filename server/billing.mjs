// Abonnemang (T07): Stripe-händelser -> serverstyrd rätt att publicera. Plattformsneutral kärna.
//   - Signaturen i Stripe-Signature kontrolleras (HMAC-SHA256 över "t.rådata", bara v1, tidstolerans).
//   - Varje händelse-id behandlas högst en gång; äldre händelser skriver aldrig över nyare,
//     och en avslutad prenumeration kan inte bli aktiv igen av en sen händelse.
//   - Rätten avgörs av prenumerationens status: active/trialing (och past_due medan Stripe försöker dra
//     betalningen igen) ger rätt; allt annat nekar. Ett kvitto i webbläsaren räknas aldrig som betalning.
//   - Förnyelse syns som customer.subscription.updated med ny period. Återbetalningar (charge.refunded) ändrar
//     inget: rätten följer bara prenumerationens status, så en återbetalning utan uppsägning behåller rätten.
//   store: claimEvent({id,type,created}) -> true om ny (atomiskt), finishEvent(id, result), releaseEvent(id),
//          getSubscription(id), putSubscription(row) -> true om skriven (skriver aldrig över nyare eller avslutad),
//          linkCheckout(subscriptionId, userId), linkedUser(subscriptionId), subscriptionsForUser(userId)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const ENTITLED = new Set(['active', 'trialing', 'past_due']);
const fail = (code, message) => Object.assign(new Error(message), { code });
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export async function stripeSignature(secret, timestamp, payload) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(timestamp + '.' + payload)));
}
// Returnerar den tolkade händelsen eller kastar 'signature'. rawBody måste vara exakt de mottagna byten som text.
export async function verifyStripeEvent(rawBody, header, secret, { now = Date.now(), toleranceSeconds = 300 } = {}) {
  if (!secret || !/^whsec_/.test(secret)) throw fail('config', 'Webhookhemligheten saknas.');
  const parts = String(header || '').split(',').map(p => p.split('=')), t = parts.find(([k]) => k === 't')?.[1];
  const v1 = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!/^\d+$/.test(t || '') || !v1.length) throw fail('signature', 'Ogiltig signatur.');
  const expected = await stripeSignature(secret, t, rawBody);
  if (!v1.some(s => constantTimeEqual(s, expected))) throw fail('signature', 'Ogiltig signatur.');
  if (Math.abs(now / 1000 - Number(t)) > toleranceSeconds) throw fail('signature', 'Signaturen är för gammal.');
  let event; try { event = JSON.parse(rawBody); } catch { throw fail('signature', 'Ogiltig händelse.'); }
  if (!event || event.object !== 'event' || typeof event.id !== 'string' || typeof event.type !== 'string' || !Number.isInteger(event.created)) throw fail('signature', 'Ogiltig händelse.');
  return event;
}

export function createBilling({ store, productId = null, now = () => Date.now() }) {
  const periodEnd = sub => sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null;
  const hasProduct = sub => !productId || (sub.items?.data || []).some(i => (i.price?.product?.id || i.price?.product) === productId);
  return {
    // Behandla en kontrollerad händelse. Returnerar vad som hände, för loggning utan kunddata.
    async handle(event) {
      // Reservera händelsen atomiskt; vid fel släpps den så att Stripes omförsök behandlas.
      if (!await store.claimEvent({ id: event.id, type: event.type, created: event.created, processedAt: new Date(now()).toISOString() })) return { result: 'duplicate' };
      try {
        let result = 'ignored';
        const object = event.data?.object || {};
        if (event.type === 'checkout.session.completed' && object.mode === 'subscription' && object.subscription && UUID.test(object.client_reference_id || '')) {
          await store.linkCheckout(typeof object.subscription === 'string' ? object.subscription : object.subscription.id, object.client_reference_id);
          result = 'linked';
        } else if (/^customer\.subscription\.(created|updated|deleted|paused|resumed)$/.test(event.type) && typeof object.id === 'string') {
          const previous = await store.getSubscription(object.id);
          const userId = UUID.test(object.metadata?.user_id || '') ? object.metadata.user_id : previous?.userId || await store.linkedUser(object.id);
          const status = event.type === 'customer.subscription.deleted' ? 'canceled' : String(object.status || '');
          if (!userId) result = 'unlinked';
          else {
            const written = await store.putSubscription({ id: object.id, userId, customerId: typeof object.customer === 'string' ? object.customer : object.customer?.id || null,
              status, productOk: hasProduct(object), currentPeriodEnd: periodEnd(object), cancelAtPeriodEnd: !!object.cancel_at_period_end, lastEventCreated: event.created });
            result = written ? 'updated' : 'stale';
          }
        }
        await store.finishEvent(event.id, result);
        return { result };
      } catch (error) { await store.releaseEvent(event.id); throw error; }
    },
    async plan(userId) {
      const subs = (await store.subscriptionsForUser(userId)).filter(s => s.productOk);
      const entitled = subs.find(s => ENTITLED.has(s.status));
      return entitled ? { active: true, status: entitled.status, cancelAtPeriodEnd: entitled.cancelAtPeriodEnd, currentPeriodEnd: entitled.currentPeriodEnd, customerId: entitled.customerId }
        : { active: false, status: subs[0]?.status || null, customerId: subs[0]?.customerId || null };
    }
  };
}

export function memoryBillingStore() {
  const events = new Map(), subs = new Map(), links = new Map();
  return {
    claimEvent: async e => { if (events.has(e.id)) return false; events.set(e.id, { ...e, result: 'processing' }); return true; },
    finishEvent: async (id, result) => { events.get(id).result = result; },
    releaseEvent: async id => { events.delete(id); },
    getSubscription: async id => subs.get(id) ? { ...subs.get(id) } : null,
    // Samma villkor som D1-varianten: aldrig äldre över nyare, aldrig avslutad tillbaka till aktiv.
    putSubscription: async row => {
      const old = subs.get(row.id);
      if (old && (old.lastEventCreated > row.lastEventCreated || (old.status === 'canceled' && row.status !== 'canceled'))) return false;
      subs.set(row.id, { ...row }); return true;
    },
    linkCheckout: async (sub, user) => { links.set(sub, user); }, linkedUser: async sub => links.get(sub) || null,
    subscriptionsForUser: async user => [...subs.values()].filter(s => s.userId === user).sort((a, b) => b.lastEventCreated - a.lastEventCreated).map(s => ({ ...s })),
    events
  };
}

// Stripe Checkout för abonnemang: kunden betalar på Stripes egen sida; rätten ges först av webhooken.
const validKey = key => /^(sk|rk)_(test|live)_/.test(key || '');
async function stripePost(request, secretKey, path, form, pattern, message) {
  const r = await request('https://api.stripe.com/v1/' + path, { method: 'POST', headers: { Authorization: 'Bearer ' + secretKey, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': crypto.randomUUID() }, body: form.toString() });
  const data = await r.json().catch(() => null);
  if (!r.ok || !data?.url || !pattern.test(data.url)) throw fail('upstream', message);
  return data.url;
}
// En kund som haft abonnemang förut återanvänder sin Stripe-kund (customerId), så kvitton och kort hålls samman.
// Moms: priset är exklusive moms och en manuell skattesats (taxRateId, txr_, t.ex. 25 % moms) läggs på varje faktura.
// Manuella skattesatser kostar inget, till skillnad från Stripe Tax. Faktureringsadress och momsnummer samlas in för kvittot.
export function createStripeCheckout({ secretKey, priceId, appOrigin, taxRateId = null, fetch: request = (...a) => fetch(...a) }) {
  return async function checkout(userId, email, customerId = null) {
    if (!validKey(secretKey) || !/^price_/.test(priceId || '') || (taxRateId && !/^txr_/.test(taxRateId))) throw fail('config', 'Abonnemang är inte konfigurerat.');
    const form = new URLSearchParams({ mode: 'subscription', 'line_items[0][price]': priceId, 'line_items[0][quantity]': '1',
      success_url: appOrigin + '/?betalning=klar', cancel_url: appOrigin + '/?betalning=avbruten', client_reference_id: userId,
      'subscription_data[metadata][user_id]': userId, locale: 'sv', billing_address_collection: 'required', 'tax_id_collection[enabled]': 'true' });
    if (taxRateId) form.set('subscription_data[default_tax_rates][0]', taxRateId);
    if (/^cus_/.test(customerId || '')) { form.set('customer', customerId); form.set('customer_update[address]', 'auto'); form.set('customer_update[name]', 'auto'); }
    else if (email) form.set('customer_email', email);
    return stripePost(request, secretKey, 'checkout/sessions', form, /^https:\/\/checkout\.stripe\.com\//, 'Betalsidan kunde inte öppnas. Försök igen.');
  };
}

// Stripes kundportal: kunden säger upp, återupptar, byter kort och hämtar kvitton på Stripes egen sida.
// Ändringarna når oss bara som signerade händelser. Portalen ställs in i Stripes kontrollpanel (eller configurationId).
export function createStripePortal({ secretKey, appOrigin, configurationId = null, fetch: request = (...a) => fetch(...a) }) {
  return async function portal(customerId) {
    if (!validKey(secretKey)) throw fail('config', 'Abonnemang är inte konfigurerat.');
    if (!/^cus_/.test(customerId || '')) throw fail('no-customer', 'Det finns inget abonnemang att hantera ännu.');
    const form = new URLSearchParams({ customer: customerId, return_url: appOrigin + '/?betalning=hanterat', locale: 'sv' });
    if (/^bpc_/.test(configurationId || '')) form.set('configuration', configurationId);
    return stripePost(request, secretKey, 'billing_portal/sessions', form, /^https:\/\/billing\.stripe\.com\//, 'Abonnemangssidan kunde inte öppnas. Försök igen.');
  };
}
