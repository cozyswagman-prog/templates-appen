# Gemensam backup av kontoavslut – lokal återställning

`tools/closure-control-backup.cjs` fångar och återläser kontrolltillståndet för
kontoavslut. Det är en separat **lokal prototyp**, inte en molnbackup eller
ett aktiverat raderingsverktyg. Ingen CLI, nyckelinläsning, nätverksklient,
schemaläggning eller koppling från appen finns.

```text
Jobb + händelser i SQLite ─┐
Supabase: spärr + bindning ├→ två avläsningar → kontrollpaket på disk
D1: spärr + sajtreservation┘                       │
                                  nytt lokalt återställningsutrymme
                                                  ↓
                             spärrar + högre körningsnummer + stoppade jobb
```

## Innehåll och kontroll

Formatet `templates-closure-control-v1` omfattar exakt sex tabelluppsättningar:

- `closure_jobs_v1` och `closure_job_events_v1`.
- `account_closures` och `account_closure_execution`.
- `publication_closures` och `closed_publication_sites`.

Omfattningens kontrollsumma, konto/jobb-bindning, format, dubbletter, fasta
felkoder och händelser, sajtreservationer och obligatoriska register kontrolleras.
Ett avbrott mitt i första spärrsteget får ha bara den ena tjänstens spärr;
senare kontrollpunkter kräver båda bindningarna. Äldre fristående privata
kontospärrar tillåts och bevaras även utan ett jobb. En tjänstebindning utan
sitt jobb nekas. Saknat schema eller saknat register ger ingen nedgradering.

Jobben läses i en SQLite-transaktion. `snapshotPrivate(pg)` läser båda privata
registren i en lokal PGlite-transaktion; `snapshotPublication(db)` läser D1-
tabellerna i lokal SQLite. `capture` tar två kompletta uppsättningar och nekar
ändrat tillstånd. Läsfunktionerna ska returnera **alla** rader; denna prototyp
har inga paginerade molnläsare. Undvik att koppla in ofullständiga API-svar.

Två lika avläsningar är inte en atomär ögonblicksbild av flera molntjänster.
Tillståndet kan ändras efter avläsningen, eller ändras och återställas mellan
avläsningarna. Paketet märks därför `CAPTURED_AS_OF_BACKUP`, inte aktuellt
driftbevis. Verklig fångst kräver samordnad paus/tömning av arbete och verifierad
fullständig läsning från identifierade tjänster. `source` är tre uttryckliga,
hemlighetsfria källidentifierare, inte automatiskt verifierad molnidentitet.

Paketet har SHA-256 och fingeravtryck av jobbformatets kod, D1-schemat,
migreringarna och alla tre SQL-förslagen. En ändrad version kräver granskad
formatmigrering; verktyget gissar inte kompatibilitet. Kontrollsumman upptäcker
oavsiktlig korruption, men ger varken kryptering eller bevis mot någon som
kan ändra både innehåll och checksumma. Paketet innehåller interna konto-id
och bildvägar, men inga inloggningsuppgifter eller kundinnehåll.

`save` skriver en ny fil, aldrig över en befintlig. Sökvägar med länkar och
utdata inne i Git nekas. Filen begär rättighet 0600 och nya återställningsmappar
0700; Windows använder ärvda ACL-rättigheter. Välj därför en privat, redan
skyddad lokal föräldramapp. Verktyget ändrar inte Windows ACL och krypterar
inte disken. Skydda och bevara paketet enligt samma regler som övriga privata
säkerhetskopior; lägg det inte i Git eller offentliga bevismappar.

## Programmeringsgränssnitt för lokal repetition

```js
const control = require('./tools/closure-control-backup.cjs');
const payload = await control.capture({
  mode: 'local-rehearsal',
  source: { jobs: 'rehearsal-jobs', private: 'rehearsal-private', publication: 'rehearsal-d1' },
  jobs, // befintlig lokal ClosureJobStore
  readPrivate: () => control.snapshotPrivate(pg), // lokal PGlite
  readPublication: () => control.snapshotPublication(db) // lokal DatabaseSync
});
control.save(absoluteNewPrivateFile, payload);
const checked = control.load(absoluteNewPrivateFile);
await control.restoreLocal(checked, absoluteNewPrivateDirectory, { mode: 'local-rehearsal' });
```

Ingen funktion ska få tjänsteadaptrar eller riktiga kunddata i dessa exempel.
Lokal lägeskontroll är en utvecklingsspärr; den kan inte hindra en anropare
från att själv skriva en nätverksansluten läsfunktion.

`merge(base, newer)` kräver samma tre källidentifierare och att den nyare
fångsten börjar tidigast när den äldre slutar. Kontospärrar, jobb, händelser
och sajtreservationer förenas. Frånvaro i den senare filen kan aldrig ta bort
en tidigare spärr. Ändrad bindning, kolliderande händelsenummer, minskat
körningsnummer eller återanvänt sajt-id för annat konto stoppar sammanslagningen.
Två oberoende jobbdatabaser får inte märkas med samma källidentifierare.

## Återställning och stoppat arbete

`restoreLocal` skapar egna, tomma databaser i en **ny** katalog. Den tar aldrig
emot en befintlig databasanslutning för återställning. Ordningen är:

1. Spara det kontrollerade originalpaketet och markera katalogen `INCOMPLETE`.
2. Skapa tom PGlite med migrations- och spärrförslagen; återlägg privata
   spärrar och bindningar utan att behöva återskapa borttagna Auth-konton.
3. Skapa tom lokal SQLite med verkligt D1-schema och spärrförslaget.
   Databasens egen trigger återbildar och kontrollerar sajtreservationerna.
4. Höj körningsnumret för varje återläst jobb **och båda tjänstebindningarna**
   till ett över det högsta fångade numret för kontot. Gamla körningar från
   paketet får inte återanvända sin behörighet i den lokala kopian.
5. Återlägg händelserna. Alla jobb får `blocked`, steget `freeze`, inga aktiva
   arbetslås och `RESTORE_REVIEW_REQUIRED`, även tidigare färdiga jobb.
6. Stäng databaserna, skriv `report.json` och ta bort `INCOMPLETE`.

Ett avbrott kan lämna en delvis återställd katalog. Den används inte igen och
verktyget skriver inte över den vid återförsök. Endast en avslutad körning med
rapport och utan `INCOMPLETE` är en godkänd lokal återläsning. Jobben är ändå
spärrade. `claim`, `runNext` och vanlig `resume` kan inte starta dem. Det finns
ännu **ingen återstartsfunktion efter restore**: operatörsflödet för ny kontroll
av samtliga tjänster behöver byggas innan radering kan återupptas.

De högre numren skyddar bara mot de körningar som paketet känner till. De
ersätter inte kontroll av nyare molntillstånd eller isolering/tömning av gamla
processer. Ingen kopia får anslutas till verkliga raderingsadaptrar utifrån
detta resultat. Ursprunglig kontrollpunkt och status finns kvar i paketet
för granskning, men används inte som aktuellt bevis för färdig radering.

## Förhållande till vanlig backup och kvarstående arbete

Supabase-backup v1/v2 är oförändrad. Detta paket innehåller **inte** privata
projekt, bildbytes, Auth-identiteter, publicerat innehåll eller Stripe-data.
Det återläser bara spärrar, bindningar och jobb i isolerade lokala databaser.
Det är ännu inte inkopplat i den vanliga dataåterställningen. En framtida
samordnad återställning måste lägga tillbaka föreningen av aktuella spärrar
**före** kunddata och utesluta stängda kontons privata och publicerade innehåll.

Kvar: verkliga fullständiga molnläsare, skyddad återkommande lagring,
samordning med innehållsbackup, granskad återstartsprocedur, fakturerings- och
inflight-kontroller, övervakning samt separat godkänt molnprov. Inget SQL-förslag
eller `ACCOUNT_CLOSURE_ENABLED` aktiveras av detta arbete.

Kör `node --test tests/closure-control-backup.test.cjs`. Proven använder
diskbaserad lokal PGlite/SQLite och syntetiska konton. De provar full och
avbruten återläsning, ofullständigt spärrsteg, gamla körningar, färdiga jobb,
oförändrad källa, det andra kontots åtkomst, registerkonflikter, sammanslagning,
format-/filkorruption och skydd mot överskrivning. Dessa bevisar inte en
återställning i Supabase eller Cloudflare.
