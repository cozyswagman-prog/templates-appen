// Appens publiceringsklient: anrop med kundens token, begripliga fel och adressförslag.
const { test } = require('node:test'), assert = require('node:assert/strict');
const { createPublishClient, suggestSlug } = require('../js/publish-client.js');

function client(responder, token = 'kundtoken') {
  const calls = [];
  const fetch = async (url, init) => { calls.push({ url, init }); return responder(url, init); };
  return { calls, c: createPublishClient({ baseUrl: 'https://publish.test/', getToken: async () => token, fetch }) };
}
test('Calls the API with the customer token and returns site, address and result', async () => {
  const { c, calls } = client(async (url, init) => url.endsWith('/api/sites') && init.method === 'GET'
    ? Response.json({ sites: [{ siteId: 'kafe', url: 'https://kafe.sites.test/', revision: 2 }], domain: 'sites.test' })
    : url.endsWith('/api/sites') ? Response.json({ siteId: 'ny' }, { status: 201 }) : Response.json({ versionId: 'v', revision: 3, url: 'https://kafe.sites.test/' }));
  assert.equal(c.configured, true);
  const s = await c.status(); assert.equal(s.site.siteId, 'kafe'); assert.equal(s.domain, 'sites.test');
  assert.equal((await c.createSite('ny')).siteId, 'ny');
  assert.equal((await c.publish('kafe', 'p1', 2)).revision, 3);
  assert.deepEqual(calls.map(x => x.init.method + ' ' + x.url), ['GET https://publish.test/api/sites', 'POST https://publish.test/api/sites', 'POST https://publish.test/api/publish']);
  assert.ok(calls.every(x => x.init.headers.Authorization === 'Bearer kundtoken'));
  assert.deepEqual(JSON.parse(calls[2].init.body), { siteId: 'kafe', projectId: 'p1', expectedRevision: 2 });
});
test('Errors become clear Swedish messages with a code', async () => {
  await assert.rejects(client(async () => { throw new TypeError('Failed to fetch'); }).c.status(), e => e.code === 'network' && /förra publicerade version visas fortfarande/.test(e.message));
  await assert.rejects(client(async () => Response.json({ code: 'conflict', error: 'x' }, { status: 409 })).c.publish('k', 'p', 1), e => e.code === 'conflict' && /annan flik/.test(e.message));
  await assert.rejects(client(async () => Response.json({ code: 'taken', error: 'Adressen är upptagen. Välj en annan.' }, { status: 409 })).c.createSite('x'), e => e.code === 'taken' && /upptagen/.test(e.message));
  await assert.rejects(client(async () => new Response('fel', { status: 500 })).c.status(), e => /misslyckades/.test(e.message));
  const noLogin = client(async () => { throw new Error('ska inte anropas'); }, null);
  await assert.rejects(noLogin.c.status(), { code: 'auth' }); assert.equal(noLogin.calls.length, 0);
  assert.equal(createPublishClient({ baseUrl: '', getToken: async () => 't' }).configured, false);
});
test('Address suggestion from the project name', () => {
  assert.equal(suggestSlug('Kafé Ängen – Göteborg'), 'kafe-angen-goteborg');
  assert.equal(suggestSlug('QA Café Göteborg – kontoprov 20261005'), 'qa-cafe-goteborg-kontoprov-20261005');
  assert.equal(suggestSlug('Ö'), '');
  assert.ok(suggestSlug('x'.repeat(80)).length <= 40);
});
test('Subscription: status tells when a plan is required, checkout only returns a Stripe address', async () => {
  const ok = client(async (url, init) => url.endsWith('/api/sites') ? Response.json({ sites: [], domain: 'sites.test', planRequired: true, plan: { active: false, status: null }, price: { sek: 499, vat: 'exclusive' } })
    : Response.json({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' }));
  const s = await ok.c.status(); assert.equal(s.planRequired, true); assert.equal(s.plan.active, false); assert.equal(s.price.sek, 499);
  assert.equal(await ok.c.checkout(), 'https://checkout.stripe.com/c/pay/cs_test_1');
  assert.equal(ok.calls[1].init.method, 'POST'); assert.ok(ok.calls[1].url.endsWith('/api/billing/checkout'));
  await assert.rejects(client(async () => Response.json({ url: 'https://evil.example/pay' })).c.checkout(), { code: 'checkout' });
  await assert.rejects(client(async () => Response.json({ code: 'plan', error: 'Publicering kräver ett aktivt abonnemang.' }, { status: 402 })).c.publish('k', 'p', 0), e => e.code === 'plan' && /abonnemang/.test(e.message));
});

test('Subscription portal only returns a Stripe billing address', async () => {
  const ok = client(async () => Response.json({ url: 'https://billing.stripe.com/p/session/test_1' }));
  assert.equal(await ok.c.portal(), 'https://billing.stripe.com/p/session/test_1');
  assert.equal(ok.calls[0].init.method, 'POST'); assert.ok(ok.calls[0].url.endsWith('/api/billing/portal'));
  await assert.rejects(client(async () => Response.json({ url: 'https://checkout.stripe.com/c/pay/x' })).c.portal(), { code: 'portal' });
  await assert.rejects(client(async () => Response.json({ code: 'no-customer', error: 'Det finns inget abonnemang att hantera ännu.' }, { status: 409 })).c.portal(), { code: 'no-customer' });
});
