# Beständiga kontoavslutsjobb – lokal prototyp

`tools/account-closure-jobs.cjs` sparar jobb och kontrollpunkter i en separat
SQLite-fil. Det finns ingen kommandoradsfunktion, molnklient, schemaläggare eller
koppling från appens gränssnitt. Modulen och testadaptrarna kräver uttryckligen
`local-rehearsal`. Detta är en utvecklingsspärr, **inte** en säkerhetsgräns som
kan hindra en anropare från att skriva en egen nätverksadapter.

## Ordning och omfattning

```text
Granskad omfattning för ett exakt konto
  → spärra och töm pågående arbete
  → publicerade sajter, samtliga versioner och ofullständiga filer
  → privata bildbytes
  → privata projekt och beroende poster
  → Auth-konto
  → verifiera frånvaro och kvarvarande spärr
```

En granskad omfattning innehåller exakta `projectIds`, `siteIds` och
`storageObjects` för ett enda UUID. Bildnycklar måste börja med just detta
konto-id; sökmönster, dubbletter och extra fält nekas. Ett konto har högst ett
jobb i den lokala jobbförvaringen. Samma begäran returnerar samma jobb; en ändrad
omfattning stoppas. `reviewed: true` anger att den betrodda anroparen har granskat
omfattningen; det ersätter inte identitetskontroll eller godkännande av en
verklig radering. Skapa inga jobb för kundkonton i denna prototyp.

Jobben raderar inte Stripe-objekt, abonnemangsdata, globala faktureringshändelser,
Formspree, supportdata, domäner eller säkerhetskopior. Dessa ligger utanför
jobbet och måste inventeras och beslutas separat. I provet bevaras samtliga
abonnemangs- och faktureringsrader byte för byte.

## Sparat tillstånd och återförsök

- SQLite använder WAL och `synchronous=FULL`. Jobb och händelser uppdateras i
  samma transaktion. Kontrollpunkten flyttas först när steget och en efterföljande
  spärrkontroll godkänts.
- Ett tidsbegränsat arbetslås, kallat *lease*, hindrar två anslutningar från
  att ta samma jobb samtidigt. Varje övertagande får ett högre löpnummer,
  `fence`. En äldre körning får inte uppdatera jobbets kontrollpunkt.
- Efter en krasch återtas det aktuella steget när låset löpt ut. Samma steg har
  samma `idempotencyKey` vid återförsök: tjänsteanrop måste tåla att upprepas
  även när det första anropet lyckades men svaret eller kontrollpunkten försvann.
- Tillfälliga fel väntar med exponentiellt ökande fördröjning, högst en timme.
  Tre försök per steg är standard; därefter krävs uttrycklig lokal granskning
  och `resume(id, expectedFence)`. Ändrade förutsättningar stoppar direkt.
- `runNext` kör ett steg. Ingen bakgrundskörning startas automatiskt.
- Bara fasta felkoder lagras. Råa tjänstefel, sessionsdata och nycklar ska inte
  hamna i databas eller logg. Omfattningen innehåller dock interna identifierare;
  framtida verkliga jobb kräver skyddad lagring och livscykelbeslut.

## Kontrakt som framtida tjänsteadaptrar måste uppfylla

Det sparade jobbet samordnar stegen; det kan inte ensamt bevisa vad som händer
i separata tjänster. Den betrodda adaptern måste:

1. Binda varje förkontroll och kvittens till `jobId`, `ownerId`, `scopeHash` och
   aktuellt `fence`. En kvittens för ett annat konto eller äldre körning nekas.
2. Kontrollera aktuell och fullständig abonnemangsstatus före varje steg och
   efter dess anrop. Aktiv eller okänd status stoppar; ingen uppsägning utförs
   automatiskt. Lokal D1-status ensam är inte tillräckligt bevis i produktion.
3. Före det första destruktiva steget verifiera beständiga spärrar för privata
   skrivningar och publicering samt att äldre pågående arbete är avslutat eller
   säkert stoppat. Alla verkliga skrivvägar, även webhook, versionsåterställning
   och fördröjd publicering, måste respektera dessa spärrar.
4. Upptäcka nya resurser eller ändrat ägarskap utanför den frysta omfattningen.
   Redan borttagna resurser får saknas vid återförsök; nya resurser får inte
   automatiskt läggas till i raderingen.
5. Utföra ägar- och löpnummerkontroll vid själva sidoeffekten, i samma skyddade
   operation när det går. `context.assertLease()` är en lokal kontroll och
   **inte en atomär spärr mellan molntjänster**. Ett anrop som redan skickats
   kan slutföras efter att låset har löpt ut. Sådana anrop måste vara säkra att
   återupprepa och tömmas/avskärmas innan jobbet går vidare.
6. Använda Storage API för bildbytes och Auth API för kontot, verifiera varje
   stegs frånvaro och behålla spärrmarkeringen även efter Auth-radering.
   Slutkontrollen måste också omfatta beroende poster och väntande operationer.

Adaptrarnas `verified`, `scopeMatches`, `billingSettled`, `privateWritesBlocked`,
`publicationWritesBlocked` och `inFlightDrained` är uttryckliga beviskrav.
Koordinatorn kontrollerar deras värden och bindning, men dessa booleska värden
är inte i sig bevis för en molntjänst. En adapter som gissar `true` är felaktig.
Jobbförvaringen är betrodd; dess publika JavaScript-metoder är inte ett API för
slutanvändare. Kontrollsumman upptäcker oavsiktliga omfattningändringar, inte
en angripare som kan ändra både data och kontrollsumma.

## Prov och kvarstående arbete

Kör `node --test tests/account-closure-jobs.test.cjs`. Testerna använder
diskbaserad SQLite, två syntetiska konton, projektets riktiga D1-schema och
testfixturer för Auth, privata projekt och bildbytes. De provar delvis raderade
bilder, omstart/ny process, avbrott efter varje steg, samtidiga anslutningar,
utgångna arbetslås, låsförnyelse, felaktiga kvittenser, ändrad omfattning,
återförsöksgränser och slutkontroll. Ett sajt-id med liknande prefix, okända
ägarfiler, det andra kontot och alla faktureringsrader bevaras.

Separat SQL-prototyp och RLS-prov finns i `account-closure-local.md`.
Backup v2 och skyddad lokal återställning finns i `backup-local.md`.
Publiceringsdelen har nu en D1-adapter, databasbarriär och avstängd Worker-koppling,
provade lokalt; se `account-closure-publication-local.md`. Den ersätter inte
övriga tjänsteadaptrar eller bevisar att alla pågående anrop är avslutade.

**Kvar:** verkliga tjänsteadaptrar och beständiga spärrar över tjänstegränserna,
atomärt införande av spärr/jobb eller en verifierad reparationsväg för avbrott
mellan dem, schemaläggning och övervakning, skyddad backup av jobb/spärrar samt
verkliga parallell- och avbrottsprov i separat godkänd miljö. Jobbdatabasen
ingår ännu inte i Supabase-backup v2. Efter förlust av jobbförvaringen får ett
avslut aldrig gissas vara färdigt: behåll kontospärren och inventera på nytt.
Inga migrationsfiler, produktionsfunktioner eller verkliga raderingar ingår här.
