// Abonnemang (T07): Stripe-signatur, händelseordning, dubbletter och rätt att publicera.
// Simulerade Stripe-händelser och -svar; ingen riktig Stripe-tjänst eller betalning används.
const { test } = require('node:test'), assert = require('node:assert/strict');
const { verifyStripeEvent, stripeSignature, createBilling, memoryBillingStore, createStripeCheckout, createStripePortal } = require('../server/billing.mjs');
const { createPublisher, memoryStores } = require('../server/publisher.mjs');
const { handlePublishRequest } = require('../server/publish-api.mjs');
const { renderProject } = require('../tools/render-project.cjs');

const SECRET = 'whsec_provhemlighet', NOW = 1_800_000_000_000, T = Math.floor(NOW / 1000);
const A = 'a1111111-1111-4111-8111-111111111111', B = 'b2222222-2222-4222-8222-222222222222';
const sign = async (body, { secret = SECRET, t = T, extra = '' } = {}) => 't=' + t + ',v1=' + await stripeSignature(secret, String(t), body) + extra;
let n = 0;
const subEvent = (type, status, created, { id = 'sub_1', user = A, product = 'prod_templates', extra = {} } = {}) => ({ id: 'evt_' + (++n), object: 'event', type, created,
  data: { object: { id, object: 'subscription', status, customer: 'cus_1', metadata: user ? { user_id: user } : {}, cancel_at_period_end: false, items: { data: [{ price: { id: 'price_1', product }, current_period_end: created + 2592000 }] }, ...extra } } });

test('Signature: only an exact, recent v1 signature with the endpoint secret is accepted', async () => {
  const body = JSON.stringify(subEvent('customer.subscription.updated', 'active', T));
  assert.equal((await verifyStripeEvent(body, await sign(body), SECRET, { now: NOW })).type, 'customer.subscription.updated');
  assert.ok(await verifyStripeEvent(body, 't=' + T + ',v1=' + 'ab'.repeat(32) + ',v1=' + (await sign(body)).split('v1=')[1], SECRET, { now: NOW }), 'rolled secrets: any matching v1 counts');
  for (const [label, header, payload] of [
    ['ändrad kropp', await sign(body), body.replace('active', 'trialing')],
    ['fel hemlighet', await sign(body, { secret: 'whsec_annan' }), body],
    ['för gammal', await sign(body, { t: T - 301 }), body],
    ['bara v0', 't=' + T + ',v0=' + (await sign(body)).split('v1=')[1], body],
    ['saknas', '', body]
  ]) await assert.rejects(verifyStripeEvent(payload, header, SECRET, { now: NOW }), { code: 'signature' }, label);
  await assert.rejects(verifyStripeEvent(body, await sign(body), '', { now: NOW }), { code: 'config' });
});

test('Lifecycle: entitlement follows subscription status; duplicates and late events change nothing', async () => {
  const store = memoryBillingStore(), billing = createBilling({ store, productId: 'prod_templates' });
  assert.deepEqual(await billing.plan(A), { active: false, status: null, customerId: null });
  assert.equal((await billing.handle(subEvent('customer.subscription.created', 'incomplete', T))).result, 'updated');
  assert.equal((await billing.plan(A)).active, false, 'incomplete payment gives no access');
  const active = subEvent('customer.subscription.updated', 'active', T + 10);
  assert.equal((await billing.handle(active)).result, 'updated');
  assert.equal((await billing.plan(A)).active, true);
  assert.equal((await billing.handle(active)).result, 'duplicate');
  assert.equal((await billing.handle(subEvent('customer.subscription.updated', 'incomplete', T + 5))).result, 'stale', 'an older event arriving late is ignored');
  assert.equal((await billing.plan(A)).status, 'active');
  await billing.handle(subEvent('customer.subscription.updated', 'past_due', T + 20));
  assert.equal((await billing.plan(A)).active, true, 'past_due keeps access while Stripe retries');
  await billing.handle(subEvent('customer.subscription.updated', 'unpaid', T + 30));
  assert.equal((await billing.plan(A)).active, false);
  await billing.handle(subEvent('customer.subscription.deleted', 'canceled', T + 40));
  assert.equal((await billing.handle(subEvent('customer.subscription.updated', 'active', T + 50))).result, 'stale', 'a canceled subscription never becomes active again');
  assert.equal((await billing.plan(A)).active, false);
  assert.equal((await billing.plan(B)).active, false, 'another account is unaffected');
});

test('Checkout link, product check and unlinked subscriptions', async () => {
  const store = memoryBillingStore(), billing = createBilling({ store, productId: 'prod_templates' });
  assert.equal((await billing.handle(subEvent('customer.subscription.created', 'active', T, { id: 'sub_x', user: null }))).result, 'unlinked');
  assert.equal((await billing.handle({ id: 'evt_c', object: 'event', type: 'checkout.session.completed', created: T + 1, data: { object: { mode: 'subscription', subscription: 'sub_x', client_reference_id: B } } })).result, 'linked');
  assert.equal((await billing.handle(subEvent('customer.subscription.updated', 'active', T + 2, { id: 'sub_x', user: null }))).result, 'updated');
  assert.equal((await billing.plan(B)).active, true, 'the checkout session links the subscription to the account');
  await billing.handle(subEvent('customer.subscription.created', 'active', T, { id: 'sub_other', user: A, product: 'prod_annat' }));
  assert.equal((await billing.plan(A)).active, false, 'a subscription for another product gives no access');
  assert.equal((await billing.handle({ id: 'evt_i', object: 'event', type: 'invoice.paid', created: T, data: { object: {} } })).result, 'ignored');
});

test('Simultaneous duplicates are processed once; a failed attempt is released for Stripe\'s retry', async () => {
  const store = memoryBillingStore(), billing = createBilling({ store });
  const ev = subEvent('customer.subscription.updated', 'active', T);
  const results = (await Promise.all([billing.handle(ev), billing.handle(ev)])).map(r => r.result).sort();
  assert.deepEqual(results, ['duplicate', 'updated']);
  const put = store.putSubscription; let failOnce = true;
  store.putSubscription = async row => { if (failOnce) { failOnce = false; throw new Error('databasen svarade inte'); } return put(row); };
  const ev2 = subEvent('customer.subscription.updated', 'past_due', T + 5);
  await assert.rejects(billing.handle(ev2), /svarade inte/);
  assert.equal((await billing.handle(ev2)).result, 'updated', 'the retry is not treated as a duplicate');
  assert.equal((await billing.plan(A)).status, 'past_due');
});

test('Renewal, cancellation at period end, refunds and a new subscription after cancellation', async () => {
  const store = memoryBillingStore(), billing = createBilling({ store, productId: 'prod_templates' }), MONTH = 2592000;
  await billing.handle(subEvent('customer.subscription.created', 'active', T));
  assert.equal((await billing.plan(A)).currentPeriodEnd, T + MONTH);
  assert.equal((await billing.handle({ id: 'evt_inv', object: 'event', type: 'invoice.paid', created: T + MONTH, data: { object: {} } })).result, 'ignored');
  await billing.handle(subEvent('customer.subscription.updated', 'active', T + MONTH));
  assert.equal((await billing.plan(A)).currentPeriodEnd, T + 2 * MONTH, 'renewal moves the period forward');
  assert.equal((await billing.handle({ id: 'evt_ref', object: 'event', type: 'charge.refunded', created: T + MONTH + 1, data: { object: { refunded: true } } })).result, 'ignored');
  assert.equal((await billing.plan(A)).active, true, 'a refund alone does not end access; only the subscription status does');
  await billing.handle(subEvent('customer.subscription.updated', 'active', T + MONTH + 2, { extra: { cancel_at_period_end: true } }));
  let p = await billing.plan(A);
  assert.equal(p.active, true); assert.equal(p.cancelAtPeriodEnd, true, 'cancelled at period end: access until the period ends');
  await billing.handle(subEvent('customer.subscription.updated', 'active', T + MONTH + 3));
  assert.equal((await billing.plan(A)).cancelAtPeriodEnd, false, 'resumed in the portal');
  await billing.handle(subEvent('customer.subscription.deleted', 'canceled', T + 2 * MONTH));
  p = await billing.plan(A);
  assert.equal(p.active, false); assert.equal(p.status, 'canceled'); assert.equal(p.customerId, 'cus_1', 'the customer is kept for a later subscription');
  await billing.handle(subEvent('customer.subscription.created', 'active', T + 2 * MONTH + 10, { id: 'sub_2' }));
  assert.equal((await billing.plan(A)).active, true, 'a new subscription after cancellation gives access again');
});

function api({ requirePlan = true, checkoutFetch, portalFetch } = {}) {
  const { bucket, sites } = memoryStores(); sites.create('kafe-a', 'kafe-a.sites.test', A);
  const store = memoryBillingStore(), billing = createBilling({ store });
  const source = { getUser: async t => t === 'token-a' ? { id: A, email: 'a@example.test' } : null,
    loadProject: async (t, owner, id) => owner === A && id === 'pa' ? { project: { name: 'Kafé A', templateId: 'cafe', values: { 'index.html': { 3: 'Kafé A' } } }, revision: 1 } : null };
  const checkout = createStripeCheckout({ secretKey: 'sk_test_prov', priceId: 'price_1', appOrigin: 'https://app.test', taxRateId: 'txr_moms25', fetch: checkoutFetch || (async () => Response.json({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' })) });
  const env = { APP_ORIGIN: 'https://app.test', SITES_DOMAIN: 'sites.test', STRIPE_WEBHOOK_SECRET: SECRET, PLAN_PRICE_SEK: '499', ...(requirePlan ? { REQUIRE_PLAN: '1' } : {}) };
  const portal = createStripePortal({ secretKey: 'sk_test_prov', appOrigin: 'https://app.test', fetch: portalFetch || (async () => Response.json({ url: 'https://billing.stripe.com/p/session/test_1' })) });
  const deps = { env, sites, source, billing, checkout, portal, publisher: createPublisher({ bucket, sites, render: renderProject }) };
  const call = (method, path, body, headers = {}) => handlePublishRequest(new Request('https://publish.test' + path, { method, headers: { Origin: 'https://app.test', Authorization: 'Bearer token-a', 'Content-Type': 'application/json', ...headers }, ...(body != null ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) }), deps);
  const webhook = async (event, { bad = false } = {}) => { const raw = JSON.stringify(event); return handlePublishRequest(new Request('https://publish.test/api/stripe/webhook', { method: 'POST', headers: { 'Stripe-Signature': await sign(bad ? raw + 'x' : raw, { t: Math.floor(Date.now() / 1000) }) }, body: raw }), deps); };
  return { call, webhook, billing, deps };
}

test('Publishing requires an active subscription set by a signed webhook, never by the browser', async () => {
  const w = api(), now = Math.floor(Date.now() / 1000);
  assert.equal((await w.call('POST', '/api/publish', { siteId: 'kafe-a', projectId: 'pa' })).status, 402);
  const status = await (await w.call('GET', '/api/sites')).json();
  assert.equal(status.planRequired, true); assert.equal(status.plan.active, false); assert.deepEqual(status.price, { sek: 499, vat: 'exclusive' }); assert.equal(status.plan.customerId, undefined, 'no Stripe ids are sent to the browser');
  assert.equal((await w.webhook(subEvent('customer.subscription.created', 'active', now), { bad: true })).status, 400, 'a forged event is refused');
  assert.equal((await w.call('POST', '/api/publish', { siteId: 'kafe-a', projectId: 'pa' })).status, 402);
  const ok = await w.webhook(subEvent('customer.subscription.created', 'active', now));
  assert.equal(ok.status, 200); assert.equal((await ok.json()).result, 'updated');
  assert.equal((await (await w.call('GET', '/api/sites')).json()).plan.active, true);
  assert.equal((await w.call('POST', '/api/publish', { siteId: 'kafe-a', projectId: 'pa' })).status, 200);
  await w.webhook(subEvent('customer.subscription.deleted', 'canceled', now + 1));
  assert.equal((await w.call('POST', '/api/publish', { siteId: 'kafe-a', projectId: 'pa' })).status, 402, 'access ends when the subscription ends');
  assert.equal((await handlePublishRequest(new Request('https://publish.test/api/stripe/webhook', { method: 'GET' }), w.deps)).status, 405);
});

test('Checkout opens Stripe\'s page for the signed-in account with the configured price', async () => {
  let sent;
  const w = api({ checkoutFetch: async (url, init) => { sent = { url, init, form: new URLSearchParams(init.body) }; return Response.json({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' }); } });
  const r = await w.call('POST', '/api/billing/checkout', {});
  assert.equal(r.status, 200); assert.equal((await r.json()).url, 'https://checkout.stripe.com/c/pay/cs_test_1');
  assert.equal(sent.url, 'https://api.stripe.com/v1/checkout/sessions'); assert.equal(sent.init.headers.Authorization, 'Bearer sk_test_prov');
  for (const [k, v] of [['mode', 'subscription'], ['line_items[0][price]', 'price_1'], ['client_reference_id', A], ['subscription_data[metadata][user_id]', A], ['success_url', 'https://app.test/?betalning=klar'], ['cancel_url', 'https://app.test/?betalning=avbruten'], ['customer_email', 'a@example.test'],
    ['subscription_data[default_tax_rates][0]', 'txr_moms25'], ['billing_address_collection', 'required'], ['tax_id_collection[enabled]', 'true']])
    assert.equal(sent.form.get(k), v, k);
  await w.webhook(subEvent('customer.subscription.created', 'active', Math.floor(Date.now() / 1000)));
  assert.equal((await w.call('POST', '/api/billing/checkout', {})).status, 409, 'no second subscription while one is active');
  const evil = api({ checkoutFetch: async () => Response.json({ url: 'https://evil.example/pay' }) });
  assert.equal((await evil.call('POST', '/api/billing/checkout', {})).status, 502, 'only a Stripe checkout address is passed on');
  assert.equal((await api().call('POST', '/api/billing/checkout', {}, { Authorization: '' })).status, 401);
  await assert.rejects(createStripeCheckout({ secretKey: 'pk_test_x', priceId: 'price_1', appOrigin: 'https://app.test' })(A), { code: 'config' });
  await assert.rejects(createStripeCheckout({ secretKey: 'sk_test_x', priceId: 'price_1', appOrigin: 'https://app.test', taxRateId: '25' })(A), { code: 'config' }, 'only a Stripe tax rate id is accepted');
});

test('Customer portal: only for an account with a Stripe customer; a returning customer reuses it at checkout', async () => {
  let sent, checkoutSent;
  const w = api({ portalFetch: async (url, init) => { sent = { url, init, form: new URLSearchParams(init.body) }; return Response.json({ url: 'https://billing.stripe.com/p/session/test_1' }); },
    checkoutFetch: async (url, init) => { checkoutSent = new URLSearchParams(init.body); return Response.json({ url: 'https://checkout.stripe.com/c/pay/cs_test_2' }); } });
  assert.equal((await (await w.call('GET', '/api/sites')).json()).plan.manageable, false);
  const none = await w.call('POST', '/api/billing/portal', {});
  assert.equal(none.status, 409); assert.equal((await none.json()).code, 'no-customer');
  const now = Math.floor(Date.now() / 1000);
  await w.webhook(subEvent('customer.subscription.created', 'active', now));
  const status = await (await w.call('GET', '/api/sites')).json();
  assert.equal(status.plan.manageable, true); assert.ok(!JSON.stringify(status).includes('cus_'), 'the customer id stays on the server');
  const r = await w.call('POST', '/api/billing/portal', {});
  assert.equal(r.status, 200); assert.equal((await r.json()).url, 'https://billing.stripe.com/p/session/test_1');
  assert.equal(sent.url, 'https://api.stripe.com/v1/billing_portal/sessions'); assert.equal(sent.init.headers.Authorization, 'Bearer sk_test_prov');
  assert.equal(sent.form.get('customer'), 'cus_1'); assert.equal(sent.form.get('return_url'), 'https://app.test/?betalning=hanterat');
  await w.webhook(subEvent('customer.subscription.deleted', 'canceled', now + 1));
  assert.equal((await w.call('POST', '/api/billing/checkout', {})).status, 200);
  assert.equal(checkoutSent.get('customer'), 'cus_1'); assert.equal(checkoutSent.get('customer_email'), null, 'a returning customer keeps cards and receipts together');
  assert.equal(checkoutSent.get('customer_update[name]'), 'auto'); assert.equal(checkoutSent.get('customer_update[address]'), 'auto');
  assert.equal((await w.call('POST', '/api/billing/portal', {})).status, 200, 'receipts stay reachable after cancellation');
  const evil = api({ portalFetch: async () => Response.json({ url: 'https://evil.example/portal' }) });
  await evil.webhook(subEvent('customer.subscription.created', 'active', now));
  assert.equal((await evil.call('POST', '/api/billing/portal', {})).status, 502, 'only a Stripe billing address is passed on');
  assert.equal((await handlePublishRequest(new Request('https://publish.test/api/billing/portal', { method: 'POST', headers: { Origin: 'https://app.test', Authorization: 'Bearer token-a' }, body: '{}' }), { ...w.deps, portal: null })).status, 503);
  await assert.rejects(createStripePortal({ secretKey: 'sk_test_x', appOrigin: 'https://app.test' })('acct_1'), { code: 'no-customer' });
  await assert.rejects(createStripePortal({ secretKey: 'pk_test_x', appOrigin: 'https://app.test' })('cus_1'), { code: 'config' });
});
