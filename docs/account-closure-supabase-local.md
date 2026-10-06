# Supabase-adapter för kontoavslut – lokalt verifierad

`tools/account-closure-supabase.cjs` kopplar jobbets privata steg till en
uttryckligen tillförd Supabase-serverklient. Den innehåller ingen CLI,
nyckelinläsning, klientstart, app-route eller schemaläggning. Endast läget
`local-rehearsal` accepteras. Det är en utvecklingsspärr, inte en garanti mot
nätanrop om en anropare själv skickar in en verklig klient.

**Inga verkliga konton eller molnscheman har ändrats.** Testerna använder den
installerade Supabase JavaScript-klienten med en lokal HTTP-ersättare, riktiga
Postgres-funktioner i PGlite och syntetiska Auth-/Storage-tjänster. Alla
HTTP-anrop fångas lokalt; okänd adress eller metod stoppar provet.

## Databasfunktioner och behörighet

`supabase/proposals/account-closure-execution.sql` är ett separat SQL-förslag
som förutsätter `account-closure.sql`. Det ligger utanför migrationsmappen
och ingår inte i någon automatisk driftsättning.

- `claim_closure_execution` binder ett konto till exakt jobb, omfattningens
  hash, löpnummer, projekt-id:n och bildvägar. Bindningen och den privata
  stängningsmarkeringen skrivs i samma transaktion. Felaktig eller utökad
  inventering rullar tillbaka båda. Samma jobb kan återförsökas; ett nytt
  högre löpnummer kan ta över utan att ändra omfattningen.
- `closure_execution_state` kontrollerar aktuell bindning och spärr och ger
  aktuella antal projekt, bildreservationer, referenser och Storage-objekt
  samt om Auth-identiteten finns kvar. Nya resurser utanför omfattningen stoppar.
- `erase_closed_projects` kräver samma bindning och att privata Storage-objekt
  redan är borta. Den tar bort projekt, deras referenser och bildmetadata i
  samma transaktion. Den raderar varken `storage.objects` eller `auth.users`.
- Endast serverrollen får anropa dessa RPC-funktioner. Kunder och anonyma
  saknar åtkomst. Serverrollen får läsa men inte skriva/radera bindningstabellen
  direkt. Hjälpfunktionen har ingen allmän anropsrätt.

Funktionerna använder samma transaktionslås per konto som sparning och
bildreservation. Befintliga triggers blockerar nya privata skrivningar och
kundens läsningar efter spärren. Bindningen saknar beroende till Auth-raden och
behålls efter radering, liksom stängningsmarkeringen.

## Bild- och kontoradering

Adaptern behandlar högst 100 objekt per Storage-anrop som standard, aldrig
över 1000. Bara exakta, granskade vägar under konto-id:t i `project-images`
får skickas till `storage.from('project-images').remove(...)`. Efter varje
omgång kontrolleras SQL-läget igen. Ett lyckat API-svar utan verklig minskning
stoppas. En delvis genomförd radering kan återförsökas från kvarvarande objekt.

Jobbomfattningen måste omfatta **även bildreservationer utan uppladdade bytes**.
Jobbets namnkontroll följer nu databasens format: PNG/JPEG/WebP/GIF med valfri
32-teckens versionsdel. Projekt-id:n begränsas till databasens 100 tecken.
Äldre lokala jobb med namn som databasen aldrig tillåter stoppas i stället för
att accepteras. Ingen verklig jobbdatabas har konverterats.

Auth-steget kräver att projekt, reservationer, referenser och Storage-objekt
är verifierat borta. Därefter används `auth.admin.deleteUser(ownerId, false)`.
Efterkontrollen måste visa att Auth-identiteten saknas. Ett förlorat svar efter
lyckad radering ger ett återförsök som läser den redan uppnådda frånvaron;
ingen ny Auth-radering skickas då. Råa leverantörsfel ersätts av fasta felkoder.

Detta följer Supabases krav att Storage-objekt hanteras före Auth-radering och
att administrativ kontoradering hör hemma på servern:
[User Management](https://supabase.com/docs/guides/auth/managing-user-data),
[deleteUser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser),
[Delete Objects](https://supabase.com/docs/guides/storage/management/delete-objects).

## Samordning och bevisens gränser

Det kombinerade provet kör jobbkoordinatorn med denna adapter och den riktiga
D1-publiceringsadaptern mot lokala Postgres/SQLite-databaser. Det avbryter
mellan Supabase-spärren och D1-spärren. Den privata spärren står kvar, jobbet
stannar i spärrsteget och ingen fysisk radering börjar. Återförsök sätter båda
spärrarna och genomför sedan de granskade stegen. Det andra kontot bevaras.

**Det finns ännu ingen generell produktionsorkestrering.** I det kombinerade
provet är bedömningen av fakturering och tömda pågående anrop testfixturer.
Deras positiva svar får inte kopieras till drift utan verkliga kontroller.
PGlites enkelanslutning bevisar inte låsbeteende i parallella molnanslutningar.

Varje API-anrop kontrollerar jobbets lokala arbetslås före och efter anropet.
SQL-radering kontrollerar dessutom löpnumret i sin egen transaktion. Storage
och Auth kan däremot inte ingå i den transaktionen: ett redan skickat anrop
kan avslutas efter att arbetslåset löpt ut. Provet visar detta för Storage och
kontrollerar att körningen då inte fortsätter till Auth eller godkänner steget.
En verklig körning måste tömma/hantera sådana anrop innan senare steg tillåts.

Kvar före aktivering:

1. Beständig och verifierbar orkestrering av båda tjänsterna, fakturering,
   inflight-anrop, schema- och versionskontroll, schemaläggning och övervakning.
2. Molnfångst och samordning av backup med kunddata. Gemensamt kontrollpaket
   för jobb, båda D1-spärrregistren och `account_closure_execution` kan nu
   fångas/återläsas lokalt; se `closure-control-backup-local.md`. Alla återlästa
   jobb stannar för granskning. Supabase-backup v2 är oförändrad och fångar
   fortfarande bara de tidigare privata stängningsmarkeringarna.
3. Verkligt prov i separat godkänd Supabase/Cloudflare-miljö, inklusive
   Storage-fel, Auth-fel, parallella anslutningar och återstart av körprocesser.
4. Hantering av andra Storage-buckets och data utanför Templates-omfattningen,
   Formspree, domäner, support, finansiell retention och äldre backupkopior.
   Okända objekt får inte tas bort för att få Auth-raderingen att lyckas.
5. Redan utfärdade bildlänkar, sessions-token och cachade svar. En databas-
   eller Auth-radering återkallar inte automatiskt allt redan lämnat innehåll.

Kör `node --test tests/account-closure-supabase.test.cjs` för det lokala provet.
Full kontoavslutsfunktion och liveåterställning är fortfarande inte klara.
