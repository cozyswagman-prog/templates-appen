# Versionslista – lokal del 9

Status 2026-10-04: implementerad och verifierad lokalt. Ingen publicering eller
anslutning till extern tjänst. Starta som tidigare med `npm run start:local` och
öppna `http://127.0.0.1:8769/`.

## Användning

Galleriet visar **Granskningsversioner på datorn** mellan Mina projekt och
mallgalleriet. Varje rad visar namn, mall, tid i svensk tidszon, en kort
versionsbeteckning och **Öppna granskning**. Nyaste kopian visas först; två kopior
med samma namn behålls som separata rader. Alla är markerade **Inte publicerad**.

Listan omfattar den lokala tjänstens versionsmapp, även kopior som skapats från
andra webbläsare på samma dator. Det är inte en konto- eller projektspecifik
versionshistorik: tidigare paket saknar koppling till ett redigerbart projekt-ID.
Använd Mina projekt för fortsatt redigering. Listan öppnar endast sparade kopior.

Listan hämtas när galleriet öppnas, efter lyckat versionsskapande och med
**Uppdatera listan**. Ingen bakgrundspollning körs. Omladdning av appen eller
omstart av tjänsten behåller paketen på disk; länkar byggs med aktuell
granskningsadress. Detta är fortfarande lokalt enkelanvändarläge.

## Tomt, fel och använda platser

- En tom mapp visar hur den första versionen skapas från editorn.
- Räknaren visar använda platser av gränsen 20; ofullständiga eller skadade paket
  tar fortfarande plats. Inga filer tas bort av listning eller uppdatering.
- Filer och kontrollsummor verifieras före listning. Kopior som inte kan verifieras
  visas som ett separat antal utan öppningslänk. Namn eller innehåll läses inte ur
  trasiga paket för att försöka gissa vad de var.
- Vid avbrott/tidsgräns visas fel och en uppdateringsknapp, inte en missvisande tom
  lista. Gamla länkar tas bort under uppdateringen. Ett lyckat återförsök återställer
  de öppningsbara raderna och tar bort felmeddelandet.
- Ett nytt listanrop avbryter föregående klientanrop. Sena svar efter byte av
  lagringsplats/konto ignoreras. Ytan är dold i kontoläge och i vanlig statisk app.

Ett manuellt tillagt paket efter tjänstens start är inte registrerat och får ingen
länk förrän tjänsten startas om och paketet godkänts. Hashkontrollen är fortfarande
inte signering eller skydd mot en lokal aktör som skriver om både filer och manifest.
Tidigare begränsningar från [den lokala tjänsten](editor-versions-local.md) gäller.

## API och åtkomst

`GET /__local/versions` kräver tjänstens tillfälliga headernyckel och samma
Host-/Origin-/Fetch-Metadata-kontroller som den befintliga tjänsten. Svaret använder
`no-store`; inga tillstånd för läsning från andra origins ges.

Svaret innehåller `versions`, `used`, `limit` och `unavailable`. En öppningsbar rad
innehåller bara `versionId`, `name`, `templateId`, `createdAt`, `published:false`
och `previewUrl`. Originalprojekt, kundbilder, diskmapp och API-nyckel ingår inte.
Granskningsfilerna kontrolleras igen när länken öppnas. Under pågående skapande
returneras upptagen-status; klienten kan försöka hämta listan igen efteråt.

Frontend använder textnoder för namn och metadata samt kontrollerar länkmålet mot
tjänstens separata loopback-origin. Det finns inga nya publicerings-, ändrings-
eller raderingsåtgärder.

## Verifiering

| Kontroll | Resultat |
| --- | --- |
| Kodbaslinje före ändring | PASS – 95 tester |
| Node/SQL/rendering/bilder/versioner efter ändring | PASS – 98 tester |
| Ny versionslista i Chromium | PASS – 51 kontroller |
| Befintligt skapa/öppna-flöde | PASS – 46 kontroller |
| Befintlig editorbaslinje före/efter | PASS – 76 / 76 kontroller |
| Konton och privata bilder, simulerad Supabase | PASS – 45 kontroller |
| Autosparning/återställning | PASS – 25 kontroller |

De tre nya HTTP-testerna provar skyddad/tom lista, begränsad metadata och sortering
med samma projektnamn samt skadade/ofullständiga paket utan öppningslänkar.
Omstartstestet verifierar att listan använder den nya granskningsserverns adress.

Browserprovet omfattar 390/412/768/1440 px i ljust och mörkt läge, långa namn,
tryckytor, överlapp, verklig öppning av sparad sida, omladdning och tjänsteomstart,
skadad fil, avbrott och återförsök. Inga oväntade konsol-/körfel. Skärmbilder av
mobil och dator har granskats. Browser plugin not available; befintlig Playwright
användes, inte fysisk iPhone/Safari eller native Responsively.

Det tidigare tillfälliga browserprovet för skapandeflödet räknar nu bara POST som
skapande; den nya listans GET räknas inte som en extra skapandebegäran. Det behåller
samma krav på en enda skapad version. Ingen fryst rendererbaslinje ändrades.

Bevis: `C:\Users\cozys\.codex\visualizations\2026\10\04\templates-version-list`.
Syntetiska kopior, tillfällig browserkod och skärmbilder ligger utanför repot.
Den ordinarie tjänsten startades om på 8769/8770 för att läsa in funktionen;
lagringsmappen och användarens projekt ändrades inte av omstarten.

Bekräftad borttagning av verifierade granskningskopior finns nu i
[lokal del 10](version-delete-local.md). Listning raderar fortfarande inget. Riktiga
konton, säker drift, publicering, backup och betalning återstår före försäljning.
