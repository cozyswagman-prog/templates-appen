# Städning av publicerade versioner

Status 2026-10-06: implementerad och provad lokalt med D1 och R2. Ingen molndata
har raderats och inget schemajobb har aktiverats i Cloudflare.

## Vad som behålls

Regeln är **aktiv version plus fem andra senast publicerade versioner**, alltså
upp till sex versioner per sajt. Ordningen kommer från första lyckade publiceringens
revisionsnummer. En återställd äldre version skyddas alltid så länge den är aktiv.
Det privata redigeringsprojektet och dess bilder i Supabase berörs inte.

Endast versioner registrerade i `published_versions` är kandidater. En uppladdning
utan registrering kan fortfarande pågå och lämnas därför orörd. Separat städning av
avbrutna uppladdningar och historiska versioner som aldrig registrerades återstår.

Äldre öppna sidor kan få 404 för en resurs som inte redan finns i webbläsarens cache
när versionen fallit utanför historiken och städats. Versionsadresser garanterar rätt
innehåll när det finns kvar, inte obegränsad lagring eller tillgänglighet.

## Skydd vid samtidighet och avbrott

1. Förhandsläget läser kandidater och påbörjade städjobb. Det ändrar inga rader/filer.
2. En enda villkorad SQL-sats kontrollerar aktuell aktiv version och historiken igen
   och registrerar en raderingsspärr i `version_retirements`.
3. Publicering/återställning får inte växla till en spärrad version. Om en återställning
   hann först kan städjobbet inte ta den versionen. Databasvillkoren avgör ordningen.
4. Först efter spärren tas filer bort, enbart under exakt `sites/<sajt>/v/<version>/`.
5. När prefixet är tomt tas publiceringsposten bort och jobbet markeras klart.
   Den lilla spärrposten behålls permanent för att hindra sena återställningsförsök.

Varje körning behandlar högst två versioner och tjugo filer per version. En ny körning
börjar med kvarvarande filer under samma prefix; den gissar inte att en kort lista
innebär att alla filer är borta. Fel ger ett misslyckat jobb och kan återförsökas.
Städningen körs separat från kundens publiceringsanrop.

D1-förfrågningarna använder index för versionernas ordning och filernas prefix.
R2 använder leverantörens [list- och delete-anrop](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#bucket-method-definitions).
Lokala prov är inte bevis för molnets processortid eller kvoter.

## Lokal körning

```powershell
node --test tests/version-retention.test.cjs
node tests/version-retention.worker.mjs "$env:TEMP/tw-prov"
```

Workerd-provet skapar endast tillfälliga D1/R2-resurser och syntetiska filer.
Det provar förhandsläge, behörighet, aktiv plus fem, ändrad aktiv version efter
förhandsgranskning, samtidig återställning, radering i flera omgångar, separat kund,
pågående uppladdning, blockerade gamla resursadresser och upprepad schemaimport.
Enhetstesterna provar också partiellt lagringsfel och oväntade filprefix.

Det befintliga lokala styrgränssnittet har `POST /maintenance/versions`. Tom JSON
ger förhandsläge; endast `{"execute":true}` utför städning. Vanlig besöksvärd och
kund-API ger inte åtkomst. Styrgränssnittet ska fortsatt vara avstängt i drift.

## Senare driftsättning och återgång

1. Ta och verifiera en säkerhetskopia av D1 och eventuell R2. Raderade filer kan
   bara återfås ur backup; en kodåtergång återställer dem inte.
2. Kör det idempotenta schemat med städning avstängd. Befintliga aktiva versioner
   registreras; äldre okända uppladdningar antas inte vara säkra att radera.
3. Driftsätt sajtvärden och därefter API:t, enligt publiceringsguiden. Alla skrivande
   Workers måste nu kontrollera raderingsspärren. Blanda inte med äldre skrivarkod.
4. Granska kandidater med read-only D1. `RETENTION_PLAN_SQL` i
   `server/version-retention.mjs` exporterar exakt samma SELECT som körningen använder;
   ersätt dess enda `?` med en rimlig heltalsgräns, exempelvis 20. Påbörjade jobb visas
   med `select site_id,version_id from version_retirements where completed=0`.
5. Efter godkänd raderingsomfattning: sätt `VERSION_RETENTION_ENABLED="1"` och en
   Cron Trigger på **en** API-Worker. Ingen trigger eller flagga sätts av denna ändring.
   Följ jobbens resultat och köstorlek; körfrekvensen måste passa backlogg och gratisnivå.

För att pausa städning: ta bort triggern eller flaggan. Behåll schemat och kodens
spärrkontroll. Återgå inte till äldre kod som kan aktivera en raderad version.
Överlappande städjobb är idempotenta; parallella publiceringar avgörs av SQL-villkoren.

Detta är versionshistorik, inte full backup eller kontoradering. Små spärrposter
växer med antalet städade versioner. Larm, orphan-städning och molnacceptans återstår.
