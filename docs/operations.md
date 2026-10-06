# Driftkontroll och release 2026-10-06

App: https://templates-app-cbh.pages.dev/ . API och kundsajter kör på separata
Cloudflare Workers. Incheckad cloud-config är fortsatt tom; driftpaketet får sin
publika konfiguration separat. Inga privata nycklar hör hemma i Git.

## Hälsoprov

Kör `node tools/health-check.mjs`. JSON-resultatet ger PASS/FAIL och processen ger
felkod vid fel. Provet gör endast GET/OPTIONS, följer inte redirects och skriver
inte ut svarskroppar, headers med hemligheter eller råa nätfel. Det kontrollerar:

- appens status och identitet,
- den befintliga syntetiska kundsajtens status och nosniff-rubrik,
- att API:t accepterar appens origin,
- att anonym åtkomst och främmande origin nekas.

Det bevisar inte kontoinloggning, bildsparning, betalning, formulärleverans eller
publicering. Den fasta testsajtadressen måste uppdateras om testsajten avvecklas.
Tre enhetstester omfattar godkända svar, status/innehåll/rubrikfel samt nätfel med
maskning. Ett riktigt driftprov gav fem godkända kontroller.

En separat timvis Codex-automation, `templates-driftkontroll`, har skapats med
ändringsbaserade larm här i arbetschatten. Lokalmiljön och schemaläggaren måste kunna
köra. Detta är inte en extern tjänst med garanterad drift. Schemaläggaren skickar
inga mejl och genomför inga automatiska reparationer.

## Uppdatering av driften

Före driftsättning av `9406f14` exporterades D1 och återlästes i tom SQLite.
Alla elva filers storlek och SHA-256 verifierades. Schema applicerades två gånger
lokalt med oförändrad sajt och filer, därefter additivt i Cloudflare.

Appen uppdaterades före sajt-Worker och API-Worker. De 43 statiska filerna matchade
paketets hashar i drift. Tidigare publicerad HTML förblev byte-identisk, origin-
skydd och anonymspärr fungerade, felaktig webhooksignatur nekades och båda
Stripe-hemlighetsnamnen fanns kvar. Ett verkligt kontoprojekt öppnades och sparades
efter uppdateringen. Ingen ny inloggning eller betalning utfördes av agenten.

Publiceringsdialogen visade Starta abonnemang och 499 kr/månad; D1 hade noll
abonnemang. Tio verkliga kundpubliceringar/CPU-värden är därför BLOCKED av saknad
publiceringsrätt. Abonnemangskravet har inte stängts av. Ägaren har avstått från
nytt abonnemangsprov. Full betalningskedja är fortfarande otestad i drift.

Förhandskontrollen för retention gav noll kandidater. Cron och raderingsflagga är
fortsatt avstängda. Se `version-retention-local.md` före framtida aktivering.

Bevis finns utanför Git i projektmappens `testmiljo/drift-uppgradering-20261006/`.
Backupen av D1 omfattar inte privata Supabase-bilder eller Auth. Befintliga
Supabase-backupverktyg beskrivs i `backup-local.md`; full återställning i separat
Supabase-projekt återstår.

## Mall- och formuläruppföljning

Caféets meny-/kontaktsida har nu en h1 som huvudrubrik, med samma befintliga klass
och innehåll. Formuläret skiljer leverantörens mottagningskvittens från verklig
inkorgsleverans. HTTP 429 ger särskild kvottext och behåller uppgifterna.

65 lokala Chromium-kontroller passerade för Café, Konsult och Hemservice i 390,
412, 768 och 1440 px: overflow, huvudrubrik och bildavkodning; därtill fångade
formulärprov för mottagning, kvot och serverfel. Inga riktiga mejl skickades.
Detta är inte fysisk mobil, full WCAG-granskning eller användartest. Riktig
Formspree-mottagare och endpoint behöver anslutas och verifieras före leveransprov.

Företagsuppgifter och juridisk granskning saknas för slutliga villkor. Utkast,
svensk introduktion, domänguide, GDPR-rutin och pilotprotokoll ligger i den lokala
projektmappens `PILOTPAKET-20261006.md`; de är inte publicerade kundlöften.
