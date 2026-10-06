# Konton och privata projekt: lokal leverans

Datum: 2026-10-03. Status: kod och lokal verifiering klara; riktig Supabase-anslutning
BLOCKED eftersom inget testprojekt finns och användaren har valt lokal förberedelse.
Inga konton skapades, inga mejl skickades, inga databaser på nätet ändrades och inget publicerades.

## Begripliga kontofel – lokal uppdatering 2026-10-05

Klienten visar nu svenska åtgärdsförslag för fel inloggningsuppgifter, obekräftad
mejladress, ogiltig/utgången mejllänk, webbläsarrelaterat återställningsfel,
hastighetsgränser, mejlbegränsningar och lösenordskrav. Okända svar får en neutral
feltext; leverantörens råa felbeskrivning återges aldrig. Ingen automatisk
mejlsändning eller lösenordsändring sker som följd av ett fel.

Felparametrar i återlänkens query/hash tas bort efter avläsning. Giltiga
auktoriseringskoder lämnas till den officiella SDK:n, och en befintlig inloggning
avslutas inte när en gammal mejllänk öppnas. ”Glömt lösenord?” förklarar vilken
mejladress som ska anges och att länken ska öppnas i samma webbläsare.

`accounts-feedback.test.cjs` provar den riktiga klientkontrollern med en simulerad
SDK, utan nätverk eller riktiga kontouppgifter. Dessa tester bevisar inte verklig
mejlleverans eller en genomförd lösenordsåterställning. Standardkonfigurationen i
källkoden är fortsatt frånkopplad; testmiljöns verkliga status dokumenteras utanför
repot. Äldre startpaket behöver ersättas med ett nytt paket när klientens hash ändras;
det är inte en instruktion att köra databasens migrationer igen.

Felkoder: [Supabases officiella referens](https://supabase.com/docs/guides/auth/debugging/error-codes).

## Så hänger delarna ihop

```text
Editor → ProjectStore → På enheten: befintlig localStorage
                     → På kontot: officiell Supabase SDK
                                  ├─ Auth: inloggning och återställning
                                  └─ Postgres: projects + RLS + revisionskontroll
```

Ett konto äger sina projekt. Delade team/medlemskap är inte implementerade.
RLS betyder regler i databasen som begränsar vilka rader ett konto får läsa.
Save/delete-funktionerna använder den verifierade identiteten från Auth och jämför
även med kontot som startade begäran; ett kontobyte under en pågående begäran får
inte flytta sparningen till det nya kontot. Direkt tabellskrivning är nekad.
Varken en gissad projektidentitet eller ett manipulerat ägarfält ger annan åtkomst.

Varje lyckad sparning ökar revisionen. En annan flik måste använda aktuell revision
för nästa ändring eller radering. Misslyckad/oklar sparning skriver aldrig över lokalt
som reserv och markeras aldrig som lyckad. Efter ett avbrutet svar kan en retry ge
versionskrock: spara då den osparade texten som projektfil och öppna serverversionen.

Projekt innehåller samma numrerade fält, sidfiler och namngivna inställningar som
tidigare. Den senare bildlagringen använder privata filer och bildreferenser;
äldre inbäddade bilder stöds och portabla projektfiler får med bildinnehållet.
Se [privata bilder och lokalt förberedda kvoter](private-images-local.md).
Listvyn hämtar bara metadata; hela projektet hämtas när det öppnas/exporteras.

## Kör verifieringen lokalt

Kräver Node >=22. Installera enbart låsta projektberoenden:

```powershell
npm ci --ignore-scripts
npm run vendor:supabase
npm test
# Befintlig Chromium/Playwright krävs för följande; starta också den statiska servern.
npm run test:browser
npm run test:accounts
```

`TEMPLATES_TEST_URL` kan ange annan lokal adress än `http://127.0.0.1:8767/`.
Webbläsarresultat, skärmbilder och testprojekt skrivs till en ny temporär mapp.
Browser plugin not available; befintlig Playwright används.

- `accounts-rls.test.cjs` kör den faktiska SQL-migrationen i PGlite (Postgres i
  WebAssembly). Två påhittade identiteter provar läsning, ägarförfalskning, RPC,
  direkt skrivning, anonym åtkomst, revisioner, radering och ogiltigt innehåll.
  Auth-schema/roller är testfixturer. Detta bevisar inte Supabases riktiga JWT-
  validering, PostgREST, mejl, parallella serveranslutningar eller driftinställningar.
- `project-store.test.cjs` provar fel och kontobyten medan svar är på väg samt
  att lokal kopiering bevarar original och inte skriver över kontoprojekt.
- `accounts.browser.cjs` använder den riktiga SDK-filen och simulerar leverantörens
  HTTP-svar. Inga riktiga mejl eller kontooperationer sker. Testet provar bland annat
  återställningslänkens PKCE-flöde, två flikar, omladdning, bilder, konflikter,
  import, radering, nätfel och filräddning. Fyra bredder: 390, 412, 768, 1440 px.
- `service-worker-cache.test.cjs` kontrollerar att privata API-anrop inte cachas.
- Tidigare export- och renderingsbaslinje ska förbli oförändrad.

## Nästa anslutningssteg – kräver separat godkännande

Ett samlat, lokalt startpaket kan nu skapas med `npm run accounts:prepare-kit -- NY_MAPP`.
Det kopierar migrationer/guider och ger 13 testfall, utan att ansluta någon tjänst.
Se [testmiljöns arbetsgång](account-test-runbook.md). Filkontroll är inte livebevis.

1. Skapa ett separat Supabase-testprojekt i beslutad EU-region. Bekräfta kostnad,
   databehandling och testmiljö innan anslutning; använd endast fiktiva projekt först.
2. Kör `supabase/migrations/202610030001_projects.sql` och därefter
   `supabase/migrations/202610040001_private_images.sql` en gång via den normala
   migrationsprocessen. Migrationen är transaktionell och ska granskas före körning.
   `public` måste exponeras för Data API; endast angivna rättigheter ska beviljas.
   Fortsätt med `supabase/migrations/202610040002_image_lifecycle.sql` enligt
   [livscykelguiden](image-lifecycle-local.md). Den senaste klienten kräver alla tre
   migrationerna; rensningsverktyget får aldrig kopplas till webbläsarkoden.
3. Konfigurera e-postbekräftelse, minst 12 teckens lösenord, godkända exakta
   återlänkar för appens testadress, avsändare och leverantörens skydd mot missbruk.
   PKCE-länkar måste öppnas i samma webbläsare som startade registrering/återställning.
4. Fyll `js/cloud-config.js` med testprojektets HTTPS-adress och **publika**
   `sb_publishable_...`-nyckel. Aldrig service-role, databaslösenord eller hemlig nyckel.
   Standardfilen ska förbli frånkopplad tills denna anslutning är godkänd.
5. Prova två riktiga testkonton från separata webbläsare: registrering/mejl,
   bekräftelse, login/logout, förnyad/utgången session, återställning, data på en
   annan enhet och explicit lokal kopiering. Prova även återkallad session och offline.
6. Med båda kontonas vanliga tokens: försök läsa, skriva och radera varandras projekt
   direkt via Data API, inklusive manipulerad ägare. Verifiera att endast ägaren har
   åtkomst och att gammal revision ger HTTP 409 utan ändring.
7. Prova verkliga samtidiga skrivningar, storleksgränser, timeout efter genomförd
   skrivning, serverbackup/återställning och leverantörens begränsningar. Dokumentera
   PASS/FAIL/BLOCKED per kontroll innan detta betraktas som tjänstens acceptansbevis.

## Kvar före en betald pilot

- Automatisk sparning och återhämtning vid omladdning finns nu lokalt, se
  [avbrottsguiden](autosave-local.md). Verifiering mot riktig tjänst och serverbackup återstår.
- Privat bildlagring med ägarregler och kvoter finns lokalt förberedd, se
  [bildguiden](private-images-local.md). Riktig Storage-verifiering, servervalidering
  och egen bildbackup återstår. Kontrollerad rensning är lokalt förberedd, men
  verklig Storage-radering och parallella serveranslutningar behöver verifieras.
- Kontrollerad projektåterställning, användarradering och dokumenterad datalivscykel.
- Projektgränser, hastighetsbegränsning och sidindelning för stora projektlistor.
- HTTPS-publicering av fristående versioner, betalning/abonnemang och supportflöde.
- Samlad säkerhetsgranskning, riktig iPhone/Safari och pilotens användartester.

SQL-skyddet gäller redigeringsdata. En framtida publiceringstjänst måste också
validera projektets innehåll/bilder och serverns resursförbrukning. Den får inte
behandla sparad JSON som betrodd kod.

## Primärkällor

- [Supabase: RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: registrering](https://supabase.com/docs/reference/javascript/auth-signup)
- [Supabase: återställning](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)
- [Supabase: auth-händelser](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [PGlite: lokal Postgres](https://pglite.dev/docs/)
