# Publicering av kundsajter – lokal prototyp (T06)

Uppdaterad 2026-10-06. Den här guiden beskriver koden och lokala verifieringar.
Separata driftprov finns i projektets bevismapp; ett lokalt PASS är inte ett driftbevis.

## Vad det gör

```text
projekt (validerat) ──render──▶ filer ──▶ R2: sites/<sajt>/v/<ny version>/…  (oföränderlig)
                                              │  varje fil kontrolleras (storlek + SHA-256)
                                              ▼
                               D1: sites.active_version ◀── växlas med jämför-och-byt på revision
                                              │
besökare ─▶ kundens värdnamn ─▶ aktiv version ─▶ fil (bara filnamn som exporten själv skapar)
```

- **Utkast är privata.** HTML hämtas bara från den aktiva versionen. Bilder och typsnitt har adresser
  med versions-id och kan hämtas från en tidigare publicerad version av samma sajt. Opublicerade
  uppladdningar, gamla HTML-sidor, manifest och andra sajter går inte att nå via versionsadresserna.
- **Ett avbrutet jobb ändrar ingenting.** Allt skrivs under ett nytt prefix och kontrolleras innan pekaren
  växlas. Om något fel uppstår före växlingen visas föregående version oförändrad.
- **Samtidiga jobb blandas aldrig.** Varje jobb har eget prefix. En D1-transaktion växlar med villkor
  på revisionen och registrerar versionen som publicerad. Två flikar från samma revision får en
  vinnare och en konflikt; den förlorande uppladdningens filer blir inte publika.
- **Återställning** pekar om till en tidigare version efter att alla dess filer har kontrollerats.
- **Säkerhetsrubriker:** CSP (bara egna filer, inbäddade bilder och Formspree för formulär),
  `nosniff`, `Referrer-Policy` och `X-Frame-Options: DENY`.
- **Cache:** HTML använder `ETag` från SHA-256 och `must-revalidate`. Versionsmärkta bilder och
  typsnitt får ett års `immutable`-cache; deras innehåll ändras aldrig på samma adress.
- **Projektet valideras före rendering:** känd mall, bara textfält, och bilder bara som inbäddad
  PNG/JPEG/WebP/GIF (SVG och bildreferenser till kontot avvisas). Kundtext publiceras som text.

## Publicera i appen

När `publishUrl` i `js/cloud-config.js` pekar på publiceringstjänsten och kunden är inloggad, visas
**Mer → Publicera på nätet…** i editorn (`js/publish-client.js` och dialogen `#publish-dialog`):

1. Första gången väljer kunden en adress, `<adress>.<SITES_DOMAIN>`. Förslaget görs från projektnamnet.
   Adressen kan inte bytas under piloten, och kontot får en sajt.
2. **Publicera** sparar först eventuella osparade ändringar och publicerar sedan den sparade versionen.
   Dialogen visar adress, tid och versionsnummer samt en knapp till hemsidan. Förra versionen visas tills
   den nya är klar.
3. Fel visas på svenska: upptagen eller reserverad adress, inloggning, konflikt med en annan flik och
   nätfel. Vid nätfel står det att förra versionen fortfarande visas.

API: `GET /api/sites` (egna sajter och domän) och `POST /api/sites { slug }`, med regeln en sajt per konto
även i databasen (`sites_one_per_owner`), samt `POST /api/publish` nedan.

## Publicering med kundens inloggning

`POST https://<PUBLISH_HOST>/api/publish` med `{ siteId, projectId, expectedRevision? }` och kundens
Supabase-token i `Authorization`:

1. Bara appens origin (`APP_ORIGIN`) får anropa. Svar på preflight ges bara till den.
2. Workern kontrollerar inloggningen hos Supabase (`/auth/v1/user`).
3. Bara sajtens ägare (`sites.owner_id`) får publicera. Okänd sajt och annans sajt ger samma 404.
4. Projektet hämtas med **kundens egen token**, så RLS ger bara egna rader. Bilderna hämtas från kontots
   privata lagring på samma sätt och kontrolleras mot sin innehållsnyckel. Workern har bara den publika
   nyckeln. Ingen hemlig nyckel behövs, och den avvisas.
5. Därefter samma versionsflöde som ovan. `expectedRevision` skyddar mot två flikar.

`REQUIRE_PLAN='1'` nekar publicering (402) när kontot saknar aktiv abonnemangsrätt.
Det inloggade API:t knyter nya sajter till kunden och kontrollerar adressen.
Det separata styrgränssnittet används i lokala prov och ska inte vara konfigurerat i drift.

## Filer

| Fil | Roll |
| --- | --- |
| `server/publisher.mjs` | Plattformsneutral kärna: publicera, återställa, visa, validera, minneslagring för tester |
| `server/worker.mjs` | Cloudflare Worker: R2- och D1-adaptrar, besöksdel, `/api/publish` och styrgränssnitt för lokala prov |
| `server/publish-api.mjs` | Det inloggade publicerings-API:t: ursprung, inloggning, ägare, felkoder |
| `server/account-source.mjs` | Hämtar projekt och bilder från Supabase med kundens token och bildkontroll |
| `server/render-worker.mjs`, `server/worker-globals.mjs` | Appens oförändrade renderare och typsnitt i Workers |
| `server/schema.sql` | D1-tabeller för sajter, publicerade versioner, filer och abonnemang |
| `tests/publisher.test.cjs` | Kärnan med riktig renderare: 8 tester |
| `tests/publish-api.test.cjs` | API:t mot simulerad Supabase med RLS-beteende: 7 tester |
| `tests/pinned-assets.worker.mjs` | Workerd med D1/R2: tio publiceringar, versionsresurser, samtidighet och migrering |

Workern paketeras med esbuild (`.woff2` som binary, `.txt` som text, villkoret `worker`), som wrangler gör vid
driftsättning. Integrationsprovet i workerd (Miniflare, R2 och D1 simulerade) och i Chromium ligger i
`testmiljo/publicering-t06-20261006/` utanför källkoden.

## Sajter under en gemensam adress (workers.dev)

Utan egen domän visas sajterna på `https://<SITES_PATH_HOST>/<adress>/`. En adress utan snedstreck på slutet
skickas vidare till adressen med snedstreck, eftersom sajtens länkar är relativa. Sajterna körs som en egen
Worker, skild från API:t (`PUBLISH_HOST`), så att kundsajter och API inte delar ursprung. Båda använder samma
kod och samma D1.

Utan R2-bindning (`SITES`) lagras sajtens filer i D1-tabellen `site_files`. Det är gratis utan betalkort och
starkt konsistent. D1 tillåter högst 2 MB per rad, så en fil över 1,9 MB nekas med ett tydligt fel. Provet finns i `testmiljo/cloudflare-20261006/run-path.mjs`.

## Versionsresurser och uppgradering

Publicerad HTML pekar på relativa adresser som `_v/<versions-id>/images/bild-1.png` och
`_v/<versions-id>/fonts/inter-400.woff2`. Det fungerar både under ett eget värdnamn och
under `/<sajt>/` på workers.dev. Länkar mellan sidor behåller sina vanliga adresser.

Tabellen `published_versions` registreras i samma D1-batch som växlingen av aktiv version.
Om någon SQL-sats misslyckas återställs hela transaktionen; detta är både
[D1:s dokumenterade beteende](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch)
och verifierat med ett avsiktligt schemafel i en tillfällig lokal databas.

Vid driftsättning: ta säkerhetskopia, kör det idempotenta schemat först, uppdatera sedan
Worker för kundsajter och sist API-Worker. Sajtvärden måste förstå versionsadresser innan
API:t skapar HTML som använder dem. Schemat registrerar befintliga aktiva versioner;
det gissar inte vilka andra uppladdningar som någon gång har varit publika.

Vid återgång kan API-Worker återställas först. Behåll stödet för versionsadresser på
sajtvärden så länge någon aktiv HTML använder dem. En äldre sajtvärd kan inte läsa
de nya adresserna. Schemauppdateringen är additiv och behöver inte tas bort.

Kör med en befintlig verktygsmapp som innehåller Miniflare 4 och esbuild:

```text
node tests/pinned-assets.worker.mjs <verktygsmapp>
```

Provet gör inga nätpubliceringar. Tiderna är lokal väggtid inklusive I/O, inte
Cloudflares processortid eller bevis på att gratisplanens CPU-gräns klaras.

## Kvarstående gränser

- **Abonnemang (T07):** med `REQUIRE_PLAN=1` krävs aktivt abonnemang för att publicera.
  Styrgränssnittet är bara för lokala prov. En separat fakturabetalning bevisar inte
  kedjan Checkout → webhook → publiceringsrätt → uppsägning.
- **Tidigare kontoacceptansprov:** Publicera-flödet provades mot riktiga Supabase-testkonton med
  publiceringsservern lokalt (workerd) och adresser under `sites.test`. Dessa prov bevisar
  inte att kundens fullständiga abonnemangsflöde fungerar i den senare molndriftsättningen.
- **Bildkontroll:** varje bild kontrolleras mot sin innehållsnyckel, MIME-typ och storlek. Sharp-omkodningen
  (metadata, orientering, max 1600 px) fungerar inte i Workers och återstår.
- **Kostnad och gränser:** tio riktiga publiceringar med `cpuTime` och `outcome` i
  Cloudflare behöver fortfarande mätas. Lokala tider får inte användas som CPU-bevis.
  Betalplan är inte beslutad; eventuella optimeringar ska hålla sig inom gratislösningen.
- **Versionsstädning:** aktiv version plus fem tidigare skyddas i den lokalt verifierade
  städningen. [Förhandsläge, samtidighet och aktivering](version-retention-local.md).
  Ingen radering eller schemaläggning har aktiverats i molnet; ofullständiga uppladdningar lämnas kvar.
- **Inte gjort:** egna domäner och HTTPS-certifikat (T08), övervakning och
  verifiering av hela abonnemangskedjan i drift.
