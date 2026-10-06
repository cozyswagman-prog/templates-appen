# Ägarens Stripe-installation

För Templates live-pris 499 kr/månad, efter att appens HTTPS-adress är driftsatt.
Verktyget gör inga köp, återbetalningar eller abonnemangsändringar.

Kör i egen PowerShell 7-terminal, utan transkribering eller felsökningsinspelning:

```powershell
pwsh -NoProfile -File tools/stripe-setup.ps1 -Config "SÖKVÄG/TILL/wrangler-api.toml"
```

Driftmappens `stripe-setup.ps1` är en identisk kopia och kan köras utan `-Config`
när `wrangler-api.toml` finns bredvid skriptet. Verktyget använder befintlig Wrangler
i `%TEMP%/tw-prov`; ägaren ska redan ha godkänt Cloudflare-inloggningen.
Skriptet startar Wrangler i konfigurationsfilens mapp oavsett var terminalen står.
Det hindrar att en projektcache i användarens hemmapp skymmer den sparade inloggningen.

Om Cloudflare-kontrollen stoppar: kör samma kommando med `-CheckOnly`. Det läget
kontrollerar bara konfiguration och Cloudflare-åtkomst, frågar aldrig efter en nyckel
och gör inga Stripe-anrop. Felkategorier som `[CF_LOGIN]`, `[CF_NODE]`, `[CF_KEYRING]`
eller `[CF_JSON]` kan delas för felsökning; råa tjänstesvar visas inte.
Efter ett fel har skriptet avslutats. Klistra aldrig in en nyckel vid den vanliga
PowerShell-prompten (`PS ...>`). En nyckel som blivit synlig i chatten eller en
skärmbild ska spärras och ersättas innan installationen fortsätter.

Skapa en begränsad live-nyckel i Stripe: Write för Checkout Sessions, Customer portal,
Customers och Webhook Endpoints; Read för Products och Prices. Klistra bara in den
vid skriptets dolda fråga, aldrig i chatten eller som kommandoradsargument.

Verktyget kontrollerar Worker-konfigurationen, Cloudflare-åtkomst, det exakta aktiva
priset och produkten, valuta, månadsintervall och live-läge före hemlighetsöverföring.
Webhook-listan läses med sidindelning. Bara Templates-adressen får en ny endpoint;
inga befintliga endpoints ändras eller raderas. API-versionen är låst till
`2026-09-30.endive`, kontrollerad mot Stripes dokumentation 2026-10-06.

En befintlig endpoint måste ha Templates-markering, rätt adress, live-läge och rätt
händelser. Då ber skriptet ägaren visa just den endpointens signeringshemlighet i
Workbench och klistra in den dolt. Det fungerar även efter ett tidigare avbrott.
Skriptet ger inte rådet att radera webhooken. Flera matchande endpoints stoppar
installationen för manuell utredning.

Båda hemligheterna skickas tillsammans som JSON via processens standardindata till
`wrangler secret bulk`. Värdena finns inte i processens argument. Barnprocessens
stdout/stderr fångas i minnet; råa fel visas inte. `WRANGLER_WRITE_LOGS=false`,
`WRANGLER_LOG_SANITIZE=true` och `WRANGLER_SEND_METRICS=false` sätts uttryckligen.
Tre försök använder samma värden utan att skapa fler endpoints. Verktyget skriver
inga hemlighetsfiler. Detta är ingen garanti mot operativsystemets minnesdumpning,
extern terminalinspelning eller annan programvara på datorn.

Slutkontrollen kräver att båda hemligheternas namn finns och att en felaktig
webhooksignatur ger HTTP 400. Ett riktigt Stripe-event, faktisk betalning och hela
abonnemangslivscykeln måste fortfarande verifieras separat; namnlistan bevisar inte
att Stripe har levererat någon händelse.

Lokala tester: `node --test tests/stripe-setup.test.cjs` (kräver PowerShell 7).
24 fall med simulerad Stripe/Cloudflare inklusive riktiga lokala barnprocesstester
av loggkontroller, undertryckning av råa fel, rätt arbetsmapp och kontrolläge utan
nyckelinmatning. Inga riktiga hemligheter används.

Referenser: [webhook-endpoints](https://docs.stripe.com/api/webhook_endpoints),
[API-versioner](https://docs.stripe.com/api/versioning).
