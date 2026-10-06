# Privat bildlagring – lokal del 4

Status 2026-10-04: lokalt implementerad, ingen tjänst ansluten eller publicerad.
`js/cloud-config.js` är fortfarande tom. Koden använder Supabases officiella SDK;
inga påhittade konton eller simulerade svar ingår i appens produktionskod.

## Vad kunden kan göra

- Välja PNG, JPEG, WebP eller GIF. Editorn tar högst 12 MiB som indata, kontrollerar
  filsignatur och avkodar bilden. Bilder över 40 megapixel avvisas efter avkodning;
  detta är inte ett skydd mot minneskrävande avkodning av fientliga bilder.
- Anpassa till högst 1600 pixlar på längsta sidan enligt befintligt editorbeteende.
  Den färdiga bilden får vara högst 2 MiB; för stora PNG-bilder avvisas med ett
  meddelande. Originalet ersätts först när bearbetningen lyckats. Stora GIF/WebP
  kan bli stillbilder/JPEG enligt samma tidigare anpassning.
- Spara kontoprojekt med privata bilder och öppna dem igen. Numrerade bildfält,
  namngivna bilder, alternativtext, fokus och Caféets sidor följer med.
- Ladda ner en portabel projektfil eller ZIP. Dessa innehåller bilddata/filer,
  aldrig privata lagringsadresser eller länkar som går ut. Hämtning av ett
  kontoprojekt kräver nätanslutning; en hämtad projektfil kan användas lokalt.
- Återanvända samma bild i flera projekt utan en ny bildplats. En ofullständig
  bildhämtning öppnar inte ett halvt projekt som riskerar att sparas över.

## Så hänger lagringen ihop

```text
Editor / projektfil (inbäddade bilder)
   → kontrollera bilder → SHA-256 (fingeravtryck)
   → reservera bildplats för inloggad ägare
   → ladda upp oföränderliga bildfiler till privat Storage
   → spara projektets bildreferenser med revisionskontroll

Öppna projekt → läs referenser → hämta ägarens bilder
   → kontrollera fingeravtryck → öppna komplett editor
```

`js/image-assets.js` arbetar på kopior och ändrar aldrig editorns data. Referenser
har formatet `templates-image:v1:<sha256>.<typ>`. Storage-sökvägen är
`<auth-user-id>/<sha256>.<typ>` för äldre objekt. Del 5 tilldelar nya objekt
`<auth-user-id>/<sha256>-<slumpad generation>.<typ>` i samma privata behållare
`project-images`; båda formaten går att läsa.
Ingen publik URL skapas. Hämtning går genom autentiserad SDK och validerar bytes
mot fingeravtrycket; ett annat kontos lagringsväg accepteras inte.

Uppladdning sker före projektsparning. Fel bevarar utkastet, pausar autosparningen
och erbjuder manuell återhämtning. Ett avbrott efter själva projekttransaktionen
har fortfarande samma revisionskonflikt/filräddning som tidigare; denna del inför
inte idempotenta projekttransaktioner. Inga bildhämtningar görs efter en bekräftad
projektsparning, så ett senare hämtningsfel kan inte dölja dess revisionsnummer.

Alla asynkrona steg kontrollerar att konto och lagringsplats är oförändrade.
Databasfunktionen kontrollerar även begärans ägare mot den autentiserade användaren.
Service worker cachar endast appfiler, inga privata bild- eller API-svar.

## Kvot och livscykel

Migrationen reserverar högst **100 olika bildplatser per konto**. Varje plats
tillåter högst **2 MiB**, vilket ger högst **200 MiB för dessa Storage-objekt**.
UI skriver MB. Kvoten är en lokal pilotinställning, inte en beslutad prisplan.
Den är inte en total kvot för databas, äldre inbäddade bilder eller hela tjänsten.
Projektlagrets befintliga gräns på 20 MiB portabel JSON gäller fortfarande.

Reservationer serialiseras per konto med ett transaktionslås innan antalet räknas.
En befintlig reservation kan återanvändas även vid full kvot. RLS tillåter endast
INSERT av en exakt reserverad ägarväg och SELECT av egna bilder. Klienten får inte
UPDATE/DELETE på bildfiler eller ändra reservationstabellen direkt.

Misslyckade uppladdningar och borttagna projekt frigör inte omedelbart bildplatser.
[Del 5: bildlivscykel](image-lifecycle-local.md) förbereder nu serverstyrd rensning
med referenskontroll, sju dagars karens och bekräftad radering innan kvoten släpps.
Den är lokalt testad men inte schemalagd eller ansluten. Kontoradering och bildbackup
återstår. Radera aldrig Storage-objektrader direkt via SQL; faktisk filradering
måste gå genom Storage-tjänsten.

## Lokala testkommandon och bevisgräns

Kör samma paket och befintliga Playwright-miljö som i kontoguiden:

```powershell
npm test
npm run test:accounts
npm run test:autosave
npm run test:browser
```

- `image-assets.test.cjs`: format/storlek, deduplicering, äldre format, portabla
  resultat, korrupta/saknade/fel ägares bytes, avbrott, kvot och kontobyte.
- `images-rls.test.cjs`: den riktiga nya migrationen i PGlite (lokal Postgres),
  med testfixturer för Auth och Storage-schema. Ägare, förbjudna direktmutationer,
  bildreservation och 100-platstak prövas. Bucket-konfigurationen kontrolleras,
  men den lokala fixturen kör inte Storage-tjänstens storleks-/MIME-validering.
- `accounts.browser.cjs`: officiell SDK med avlyssnade syntetiska HTTP-svar.
  Kopiering, bildsparning/omladdning, projektfil, ZIP, fel/återförsök, kvotmeddelande
  och ofullständig hämtning prövas. UI i 390/412/768/1440 px och mörkt läge.
- Tidigare rendererbaslinje, autosparning, lokal redigering och export ska förbli
  gröna. Browser plugin not available; befintlig Playwright/Chromium används.

## Krävs före en riktig pilot

1. Efter separat godkännande: kör alla tre migrationerna i ordning i en ny testmiljö,
   enligt [livscykelguiden](image-lifecycle-local.md).
   Kontrollera att det inte finns bredare befintliga Storage-policyer som tillåter
   åtkomst till denna behållare. Migrationen avbryter om dess bucket redan finns.
2. Prova två riktiga konton, direkt API-åtkomst utan appen, återkallad session,
   ändrad token under uppladdning och riktiga samtidiga reservationer runt plats 100.
3. Prova tjänstens verkliga 2 MiB-gräns, MIME-regler, SDK:s binära uppladdning,
   uppladdningsavbrott, återförsök och hämtning på annan enhet. Detta är ännu
   `BLOCKED` eftersom extern testmiljö inte finns.
4. Anslut den [lokalt förberedda bildbearbetningen](image-processing-local.md)
   som obligatoriskt serversteg före framtida publicering.
   Klientens filsignatur, hash och decoder är användarstöd, inte säkerhetsbevis
   för godtyckliga API-klienter. MIME-metadata bevisar inte verkligt bildinnehåll.
5. Testa backup/återställning av både projekt och bildfiler, samt säker rensning,
   kontoradering och kvoter för projekt/API-anrop. Prova fysisk iPhone/Safari.

Bildlivscykeln är därefter lokalt förberedd i del 5. Betrodd kontroll och omkodning
av bildinnehåll inför publicering är lokalt förberedd i del 6.

## Primärkällor för kopplingen

- [Supabase Storage: åtkomstregler](https://supabase.com/docs/guides/storage/security/access-control)
- [Privata behållare och begränsningar](https://supabase.com/docs/guides/storage/buckets/creating-buckets)
- [SDK upload](https://supabase.com/docs/reference/javascript/storage-from-upload)
- [SDK download](https://supabase.com/docs/reference/javascript/storage-from-download)
