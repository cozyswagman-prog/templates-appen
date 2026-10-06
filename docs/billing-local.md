# Abonnemang (T07) – lokal prototyp med Stripe

Förberett 2026-10-06. Ingen Stripe-tjänst är ansluten, inga produkter eller priser är skapade och ingen
betalning har gjorts. Pris och leverantörsval är inte beslutade. 499 kr/mån exkl. moms är en prishypotes.

## Princip: betalning bekräftas bara av servern

```text
Kunden ── "Starta abonnemang" ──▶ POST /api/billing/checkout ──▶ Stripes betalsida (Checkout)
                                                                       │ betalar
Stripe ── signerad händelse ──▶ POST /api/stripe/webhook ──▶ D1: subscriptions (status per prenumeration)
                                                                       │
Kunden ── "Hantera abonnemang" ──▶ POST /api/billing/portal ──▶ Stripes kundportal (säga upp, kort, kvitton)
Kunden ── "Publicera" ──▶ /api/publish ── kräver aktivt abonnemang (REQUIRE_PLAN=1) ──▶ publicering
```

- **Webbläsaren kan aldrig ge rätt att publicera.** Återkomsten från Stripe (`?betalning=klar`) visar bara
  ett besked.
- **Signaturen kontrolleras** i `Stripe-Signature`: HMAC-SHA256 över `t.rådata` med endpointens `whsec_`,
  bara `v1`, jämförelse i konstant tid och högst 5 minuters tidsskillnad.
- **Varje händelse-id behandlas en gång.** Det reserveras atomiskt och släpps om behandlingen misslyckas,
  så att Stripes omförsök fungerar.
- **Ordningen skyddas** i SQL-villkoret: en äldre händelse skriver aldrig över en nyare, och en avslutad
  prenumeration kan inte bli aktiv igen.
- **Rätt att publicera** ges av `active`, `trialing` och `past_due`, det sista medan Stripe försöker dra
  betalningen igen. `unpaid`, `canceled`, `incomplete` och `paused` nekar. Med `STRIPE_PRODUCT_ID` räknas
  bara Templates-produkten.
- **Livscykeln** följer bara prenumerationens status:
  - Förnyelse kommer som `customer.subscription.updated` med en ny period, som appen visar som förnyelsedatum.
  - Uppsägning i kundportalen ger `cancel_at_period_end`. Kunden kan publicera till periodens slut och kan
    återuppta abonnemanget innan dess.
  - Vid periodens slut kommer `customer.subscription.deleted`. Publicering spärras, men den publicerade sajten
    ligger kvar.
  - Återbetalningar (`charge.refunded`) ändrar ingenting. Ska kunden förlora rätten måste abonnemanget också
    sägas upp.
- **Kopplingen till kontot** görs med `subscription_data.metadata.user_id` och `client_reference_id` från
  Checkout. Inga Stripe-id skickas till webbläsaren.

## Inställningar i Workern

| Inställning | Innehåll |
| --- | --- |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` (hemlighet, från Stripes webhook-endpoint) |
| `STRIPE_SECRET_KEY` | `sk_test_…` eller `rk_test_…` (hemlighet; begränsad nyckel rekommenderas) |
| `STRIPE_PRICE_ID` | `price_…` för abonnemanget |
| `STRIPE_PRODUCT_ID` | valfri, `prod_…` |
| `STRIPE_PORTAL_CONFIGURATION` | valfri, `bpc_…`. Annars gäller portalens standardinställning i Stripe. |
| `REQUIRE_PLAN` | `1` = publicering kräver aktivt abonnemang |

Hemligheterna läggs som Worker-hemligheter och aldrig i Git, i appen eller i chatten. Stripe-händelser
att skicka: `checkout.session.completed` och `customer.subscription.created`, `.updated` och `.deleted`.

## Kundportalen

"Hantera abonnemang" visas när kontot har en Stripe-kund, även efter en uppsägning, så att kvittona går att
hämta. Servern skapar en portalsession för kundens eget Stripe-id, som aldrig skickas till webbläsaren.
Återkomsten `?betalning=hanterat` visar bara ett besked. Ändringarna gäller först när Stripes signerade
händelse har kommit. En kund som tecknar nytt abonnemang återanvänder sin Stripe-kund, så kort och kvitton hålls
samman. I Stripes testläge måste portalens standardinställning sparas en gång i kontrollpanelen innan portalen
går att öppna.

## Prov

- `tests/billing.test.cjs`: signatur, livscykel med förnyelse, uppsägning, återupptagning, återbetalning och nytt
  abonnemang, dubbletter, sena och samtidiga händelser, omförsök efter fel, spärr för publicering, och fälten i
  anropen till Checkout och kundportalen.
- Integrationsprov i workerd med D1 (SQLite) och prov i appen mot Supabase-testmiljön ligger i
  `testmiljo/abonnemang-20261006/` och `testmiljo/abonnemang-portal-20261006/`.

## Inte gjort – kräver beslut eller konto

- Pris, moms, kvitton och fakturauppgifter samt avtal och villkor.
- Stripe-konto, produkt, pris och webhook-endpoint i testläge. Det skapar ägaren.
- Portalens inställningar i Stripe, till exempel om uppsägning ska gälla direkt eller vid periodens slut. Återbetalningar och tvister hanteras manuellt i Stripe.
- Vad som händer med en publicerad sajt när abonnemanget upphör. I dag spärras bara nya publiceringar, och sajten ligger kvar.
- Om adressen ska få reserveras utan abonnemang. I dag går det.
