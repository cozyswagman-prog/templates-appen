# Säker återvinning av bildplatser – lokal del 5

Status 2026-10-04: lokalt implementerad och testad. Ingen molntjänst, service-nyckel,
schemaläggning eller verklig filradering har aktiverats. Konfigurationen är fortsatt
tom. Den här delen förbereder serverarbetet; kunden får ingen direkt raderingsrätt
till bildlagringen.

## Regler

- En bild som används av något sparat projekt är skyddad. Även namngivna bilder,
  flersidiga projekt och dolda avsnitt räknas. En konservativ sökning räknar varje
  komplett bildreferens i projektets JSON; reserverade men ogiltiga referenser
  avvisas vid sparning.
- När sista projektet släpper en bild startar **sju dagars karens**. Nya eller
  avbrutna uppladdningar får också minst sju dagar från sin reservation.
- Varje ny sparning förnyar en **en timmes uppladdningsreservation** på servern.
  En gammal flik får aldrig förlita sig på en lokal lista över uppladdade bilder.
- Sju dagar och en timme är försiktiga lokala pilotvärden, inte fastställda
  kundvillkor eller en utlovad återställningstid. En bild som redan rensats kan
  laddas upp igen från en portabel projektfil eller från en ännu öppen editor.
- Bilder i osparade flikar och fristående projektfiler är inte serverreferenser.
  De behåller sina inbäddade bilddata, vilka kan laddas upp som en ny generation.
- Bildplatser frigörs först när Storage-raderingen har lyckats och databasen
  bekräftar att objektet är borta. Pågående/felaktig radering räknas fortfarande
  mot kontots 100 platser.

## Skydd mot samtidiga operationer

```text
Aktiv bild → oanvänd i minst 7 dagar + ingen aktiv uppladdningsreservation
  → servern markerar bilden för radering
  → Storage API tar bort den exakta filen
  → databasen bekräftar att filen är borta
  → bildplatsen frigörs
```

Reservation, projektsparning, projektradering, Storage-insert och rensningsanspråk
använder samma korta databaslås per konto. Filanropet sker utanför transaktionen.
Referenskontroll och projektrevision sker i samma transaktion som projektändringen.
Om rensningen hinner först får en föråldrad bildreferens inte sparas; editorns
portabla bilddata kan reserveras och laddas upp igen vid nästa sparförsök.

Varje ny lagringsgeneration får ett slumpat tillägg i filnamnet. Ett pensionerat
namn återanvänds aldrig, även om bildens bytes är identiska. Ett fördröjt eller
upprepat raderingsanrop kan därför inte träffa en senare uppladdning av samma bild.
Äldre namn utan tillägg kan fortfarande läsas och skyddas av referenserna.

`project_image_refs` är en serverhanterad koppling mellan projekt och bilder.
Klienten får inte skriva i den. Migrationen fyller den från befintliga projekt;
okända befintliga bildreferenser avbryter migrationen i stället för att markeras
som oanvända. Felaktig migration får inte kringgås genom att ta bort kundinnehåll.

`project_images` behåller en liten metadata-rad för pensionerade generationer.
Statusen `deleted` tar ingen bildplats. Metadata-raderna rensas inte i denna del;
retention och kontoradering måste lösas separat före betald pilot.

## Serververktyg, standardläge utan radering

`tools/cleanup-images.cjs` exporterar `runImageCleanup(client, options)`.
Det är en servermodul för en framtida godkänd drifttjänst, inte en webbläsarmodul
eller ett redan anslutet schemalagt jobb. Den läser inga miljövariabler eller
hemligheter och ansluter ingenstans själv.

```js
// client måste tillhandahållas av den framtida godkända servermiljön.
const { runImageCleanup } = require('./tools/cleanup-images.cjs');
const preview = await runImageCleanup(client); // dryRun: true, högst 20 objekt
// Verklig körning kräver separat driftsättningsgodkännande och testbevis.
// await runImageCleanup(client, { dryRun: false, limit: 20 });
```

Förhandsläget listar kandidater och ändrar inga anspråk, filer eller kvoter.
Arbetaren kan hantera högst 25 objekt per anrop och granskar hela svarets sökvägar
före första filoperationen. Den använder enbart `storage.from('project-images')
.remove([exaktSökväg])`; aldrig SQL för själva filraderingen.

Misslyckade eller tvetydiga operationer får `RETRY_LATER`. Anspråk återkommer tidigast
efter 15 minuter och använder samma raderingstoken och pensionerade filnamn.
Ett tomt lyckat Storage-svar får bara frigöra kvoten om slutkontrollen också
bekräftar frånvaro. Verktyget lämnar antal valda, bekräftat borttagna och misslyckade
objekt; hela anropet avbryts före radering vid ogiltiga urvalsdata.

Endast serverrollen `service_role` får anropa förhandsgranskning, anspråk och
slutkontroll. En sådan roll är privilegierad och får aldrig finnas i appens JS,
projektfil, ZIP, PWA-cache eller publika konfiguration.

## Installation och verifiering inför drift

Efter separat godkännande i en ny testmiljö:

1. Kör migrationerna i ordning: `202610030001_projects.sql`,
   `202610040001_private_images.sql`, `202610040002_image_lifecycle.sql`.
2. Använd klienten från denna del. Reservationssvaret innehåller nu det faktiska
   lagringsnamnet och om objektet redan finns. Gamla klienter måste laddas om;
   nya referenser kan inte redigeras säkert med den gamla bildadaptern.
3. Kontrollera behörigheter och policyer med riktiga tokens. Kör först enbart
   förhandsläge mot fiktiva data och granska kandidaterna.
4. Testa riktiga samtidiga sparningar/uppladdningar/rensningar på separata
   anslutningar, även över timeout, avbruten uppladdning och omstart. Kontrollera
   Storage-tjänstens hantering av bytes och metadata; PGlite bevisar inte detta.
5. Testa radering genom riktiga Storage API, behörighetsfel, utebliven bekräftelse,
   upprepat raderingsanrop, full kvot och ny uppladdning med samma bildinnehåll.
6. Verifiera separat bildbackup och återställning innan rensning kan aktiveras.
   Framtida versionshistorik/publicerade versioner måste få egna referenser som
   skyddar deras bilder. Nuvarande referenstabell skyddar endast sparade projekt.
7. Bestäm körintervall, övervakning och felhantering. Inget sådant har installerats
   här. Behandla kontoradering separat: radera inte Auth-användaren innan dess
   Storage-objekt och väntande rensningsjobb är hanterade.

Riktig Storage-radering, parallella serveranslutningar och backupbevis är
`BLOCKED` tills en godkänd testtjänst finns. Ingen försäljningsklar drift påstås.

## Lokal QA

```powershell
npm test
npm run test:accounts
npm run test:autosave
npm run test:browser
```

`image-lifecycle.test.cjs` kör alla tre riktiga migrationerna i lokal Postgres med
syntetiska Auth/Storage-tabeller. Proven täcker migration av gamla referenser,
behörigheter, delade bilder, karens, reservation, full kvot, återförsök, tokenkontroll,
bekräftad filfrånvaro, nya generationer och båda ordningarna mellan spara/rensa.
Testernas metadata-radering är en uttrycklig Storage-fixtur, inte produktionskod.
PGlite har inte verifierat samtidiga separata serveranslutningar.

Webbläsarprovet använder officiell SDK med simulerade HTTP-svar. Det provar också
att samma öppna flik kan använda en rensad bild igen, och att rätt bytes hämtas
efter omladdning. Browser plugin not available; befintlig Playwright/Chromium används.

Betrodd avkodning/omkodning av bildinnehåll är nu lokalt förberedd i
[del 6](image-processing-local.md) som separat publiceringssteg.
Det återstår även riktig molnanslutning, backup, versionshantering, publicering,
betalning, kontoradering och pilotens användartester.

Primärkälla: [Supabase – Delete Objects](https://supabase.com/docs/guides/storage/management/delete-objects)
och [SDK remove](https://supabase.com/docs/reference/javascript/storage-from-remove).
