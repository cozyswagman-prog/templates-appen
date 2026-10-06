# Ladda ner granskad version – lokal del 11

Implementerad lokalt 2026-10-04. Ingen extern tjänst, publicering, commit eller push.

## För kunden

1. Starta `npm run start:local` och öppna `http://127.0.0.1:8769/`.
2. Öppna ett projekt och välj **Mer → Skapa version för granskning**.
3. Återgå till galleriet och välj **Öppna granskning** vid den sparade kopian.
4. Välj **Ladda ner ZIP** vid samma version. Packa upp hela filen och öppna `index.html`.

ZIP-filen innehåller samma HTML, bilder och typsnitt som den sparade kopian,
samt svenska instruktioner i `LASMIG.txt`. Senare ändringar i utkastet följer inte
med. Skapa en ny granskningsversion för att ta med dem. Ingen publicering sker.
**Spara som fil** i editorn är fortfarande sättet att säkerhetskopiera det
redigerbara projektet; ZIP-filen kan inte importeras som projekt.

## Implementering och gränser

- `tools/version-zip.cjs` verifierar manifest, tillåtna sökvägar, storlekar och
  SHA-256 mot serverns tidigare kända manifest. De faktiska bytes som packas
  kontrolleras igen mot filernas hash. Ingen ny rendering eller bildomkodning.
- Bara manifestets filer under `site/` tas med, utan prefixet. `index.html`
  ligger alltså direkt i ZIP-roten. Intern granskningssida, manifest, original-
  projekt, kontodata och tjänstekonfiguration ingår inte.
- JSZip 3.10.1 är låst som Node-beroende i paket/låsfil. DEFLATE nivå 6 och
  Node-buffer används enligt [officiell JSZip-dokumentation](https://stuk.github.io/jszip/documentation/api_jszip/generate_async.html).
  Den tidigare exporten av aktuellt utkast är oförändrad.
- GET `/__local/versions/:directoryId/download` kräver serverns tillfälliga
  headernyckel och de befintliga Host/Origin/Fetch-Metadata-kontrollerna.
  Granskningsservern erbjuder ingen sådan endpoint. ZIP-svar är `no-store` och
  har attachment-filnamn baserat på ett verifierat UUID, aldrig kundens projektnamn.
- En gemensam låsning tillåter bara ett versionsjobb åt gången, även medan
  ZIP-svaret levereras. Hela paketet verifieras före packning; paketgränsen är
  fortsatt 64 MiB totalt, 20 MiB per fil och högst 256 manifestfiler.
  Arkivet byggs i minnet; detta är ett begränsat lokalt verktyg för en användare,
  inte dimensionerat för samtidiga kunder eller en publik drifttjänst.
- Okänd/borttagen kopia ger 404; ändrade/saknade/extra filer ger 409 med JSON,
  utan ZIP-headers. Varken version, projekt eller syskonversioner skrivs om.
- Knappen spärras under arbetet. Nätfel ger begriplig återförsöksväg; ett sent
  svar efter byte av vy eller lagringskontext startar ingen nedladdning.
  Texten säger att nedladdningen **startat**, inte att operativsystemet garanterat
  har sparat filen. Browserbegäran avbryts efter 45 sekunder.
- Versionskontrollen är ingen digital signatur. En illvillig lokal process med
  skrivrättigheter till filer och manifest ligger utanför denna enanvändargräns.
  Riktiga formulär, bokningar och andra externa tjänster behöver separat test.

## Verifiering

| Kontroll | Resultat |
| --- | --- |
| Kodbaslinje före / efter | PASS – 104 / 108 tester |
| ZIP för alla nio mallar, bytejämförelse, bilder, ändrat utkast, fel och API-skydd | PASS – ingår i kodtesterna |
| Faktisk browsernedladdning och uppackad sajt | PASS – 53 kontroller |
| Versionslista / skapande / bekräftad borttagning | PASS – 51 / 46 / 37 kontroller |
| Befintlig editorgrund före / efter | PASS – 76 / 76 kontroller |

Browser plugin not available; befintlig Playwright/Chromium användes. Versionsrader
testade i 390/412/768/1440 px och ljust/mörkt läge, med minst 44 px höga kontroller.
Mobil-, surfplatte- och datorbilder visuellt granskade; surfplattelayouten fick
knapparna under beskrivningen för att undvika trång text. Nedladdad Café-sajt
öppnad från uppackade filer i alla fyra bredder, alla tre sidor öppnade och varje
levererad sajtfil jämförd byte för byte med källversionen. Inga oväntade konsol-
eller JavaScript-fel. Fysisk Safari/native Responsively ingick inte.

Bevis finns utanför repot i
`C:\Users\cozys\.codex\visualizations\2026\10\04\templates-version-download`.
Tester använder egna syntetiska mappar. Inga användarversioner skapades/raderades.

En samlad [leveranskontroll finns nu i lokal del 12](delivery-check-local.md)
för nya granskningsversioner. Innan
försäljning av appen återstår fortfarande testmiljö med riktiga konton, säker
kundseparering i drift, publicering, backup/återställning och betalningsflöde.
