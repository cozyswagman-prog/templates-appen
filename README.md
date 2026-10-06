# Templates-appen

Ett mini-CMS: kunden väljer en färdig hemsida ur ett galleri, byter bilder och texter i
numrerade rutor, och laddar ner sin färdiga sajt som en zip (ren HTML — fungerar på vilket
webbhotell som helst). Appskalet är statiskt. En valfri Supabase-koppling för konto
och projekt finns förberedd men är avstängd i den lokala standardkonfigurationen.

## Installerbar app (PWA)

Appen är deployad på GitHub Pages: **https://cozyswagman-prog.github.io/templates-appen/**
Öppna länken på telefonen → "Lägg till på hemskärmen"/"Installera app" → den blir en
riktig app med egen ikon, fullskärm och offline-stöd (service worker, `sw.js`).

**Automatisk uppdatering:** varje push till `main` triggar GitHub Actions
(`.github/workflows/deploy.yml`) som stämplar versionen automatiskt
(`1.3.<antal commits>` — rör aldrig `js/version.js`/`sw.js` för hand) och deployar
till Pages. Installerade appar upptäcker nya versionen och laddar om sig själva
(aldrig mitt i en redigering). Versionen syns längst ner i galleriet.

Repot är publikt: https://github.com/cozyswagman-prog/templates-appen — lägg aldrig
kunddata, riktiga företagsnamn eller hemligheter i koden.

## Appen på claude.ai (reservlänk)

Även publicerad som privat sida: https://claude.ai/artifact/E73XzAx9PoJfTHfPftmvpr
(kräver inloggning på claude.ai). `artifact.html` är publiceringsversionen av
`index.html` — **håll dem i synk** vid ändringar i sidstrukturen. Nedladdningar går
där via claude:s downloads-kapacitet (se `js/save.js`); lokalt används vanliga länkar.

## Köra appen

Kräver bara en statisk filserver, t.ex.:

```bash
npx -y serve -l 3456 .
```

Öppna sedan http://localhost:3456. (I Claude Code startas den via `.claude/launch.json`.)

## Konton och privata projekt – lokal förberedelse

`js/accounts.js` använder Supabases officiella SDK för registrering, inloggning,
utloggning och lösenordsåterställning. `js/project-store.js` ger samma editor
asynkron tillgång till enhetsprojekt eller kontoprojekt. `js/cloud-config.js` är tom;
inga externa konton, mejl eller tjänster är anslutna i denna leverans.

- Kunden väljer **På mitt konto** eller **På den här enheten**. Lokal data kopieras
  bara efter ett uttryckligt knapptryck; originalet finns kvar.
- Ändringar sparas automatiskt efter 1,5 sekunders skrivpaus. **Spara** kan fortfarande
  användas direkt; sparat visas först efter att lagringen bekräftat resultatet.
  Text som ändras under en pågående begäran sparas i en följande omgång.
- Databasregler begränsar läsning till projektägaren. Skrivning/radering går genom
  databasfunktioner som kontrollerar ägare och revision; klienten får inte skriva
  direkt i tabellen. En gammal flik får aldrig tyst skriva över en ny version.
- Nätfel och versionskrockar lämnar texten kvar för en egen projektfil. Vid byte av
  konto/session rensas editorvyn och kunden får rädda osparat arbete till fil.
- Service worker cachar bara appens kända publika filer, inga privata API-svar.
- Kontobilder lagras separat i en privat bildbehållare. Projektfil och ZIP får
  fortfarande med sig bilderna; äldre inbäddade bilder stöds. Gränsen är 100
  reserverade bildplatser per konto, högst 2 MiB per bild och 20 MiB för projektets
  portabla innehåll före uppladdning. Se [bildlagringens guide](docs/private-images-local.md).
- Rensning av oanvända bilder är lokalt förberedd med sju dagars karens,
  referenskontroll och förhandsläge. Ingen schemaläggning eller riktig rensning är
  aktiverad; se [bildlivscykeln](docs/image-lifecycle-local.md).
- Versionshistorik och återställning från serverbackup ingår **inte** ännu.

Se [kontodelens installations- och verifieringsguide](docs/accounts-local.md).
Inför separat tjänstetest kan `npm run accounts:prepare-kit -- NY_PAKETMAPP`
skapa ett frånkopplat startpaket med tre migrationer i ordning, guider och 13
ännu inte körda acceptansprov. `npm run accounts:check-kit -- PAKETMAPP`
kontrollerar att paketet matchar aktuell källkod. Verktyget ansluter ingenting
och kör varken SQL eller tjänstetester; se [arbetsgång och beslut före anslutning](docs/account-test-runbook.md).
Kontoguiden beskriver vad som är lokalt testat och vad som måste verifieras i en riktig
separat testtjänst före pilot. Kör `npm test`, `npm run test:browser` och
`npm run test:accounts` med befintlig Playwright-miljö. `npm run vendor:supabase`
kopierar den låsta SDK-versionen och dess licens från npm-paketet till `vendor/`;
SDK-filen är incheckningsbar och ingen byggkedja krävs för att öppna appen.

## Automatisk sparning och återställning i fliken

`js/autosave.js` samlar snabba ändringar till en sparning efter skrivpausen. När en
bild behandlas eller en sparning redan pågår startas ingen parallell autosparning.
Vid fel eller versionskrock pausas automatiken tills kunden uttryckligen försöker
igen med **Spara**. Galleribesök och dialogen för att lämna avbryter väntande sparning.

En separat tillfällig kopia av osparat arbete lagras i `sessionStorage` för den
aktuella fliken och lagringsplatsen. Efter omladdning erbjuder galleriet **Återställ
som nytt projekt**, **Spara kopian som fil** och bekräftad borttagning. Flera väntande
projekt behålls; en lyckad sparning tar bara bort den aktuella återställningskopian.
Kopior för kontoprojekt rensas vid utloggning/kontobyte. Det är inte serverbackup,
lagring för stängda flikar eller en garanti vid full/avstängd webbläsarlagring.

Lokala projekt får revisionskontroll och alla ändringar av projektlistan samordnas
med Web Locks för att skydda mot samtidig skrivning i flera flikar. Saknas Web Locks
är automatisk lokal sparning avstängd; manuell sparning och projektfil finns kvar.
Se [avbrotts- och återställningsguiden](docs/autosave-local.md). Kör även
`npm run test:autosave` med befintlig Playwright-miljö.

## Lokal grund för serverpublicering

Kör `npm run start:local` för appen med **Mer → Skapa version för granskning**
på `http://127.0.0.1:8769/`. Den lokala tjänsten skapar en separat kopia och öppnar
granskningen på en annan lokal port. Den nya adressen har egen projektlagring;
använd projektfil för att ta över ett projekt från en annan adress. Se
[editorflöde och lokala begränsningar](docs/editor-versions-local.md).

Nya granskningsversioner innehåller **Kontrollera din hemsida** med råd per sida:
tomma textrutor, oförändrad malltext, exempelbilder, ofullständiga gemensamma
kontaktuppgifter och knappar/formulär utan anslutning. Råden anger fältnummer
eller namn i editorn. Externa länkar och mottagning provas inte automatiskt;
manuell kontroll återstår. Äldre versioner ändras inte. Se
[leveranskontroll och begränsningar](docs/delivery-check-local.md).

Galleriets **Granskningsversioner på datorn** visar sparade kopior, nyast först,
med datum, status och öppningslänk. Listan finns kvar efter omladdning och
tjänsteomstart; skadade/ofullständiga paket ger information utan öppningslänk.
Se [versionslistan och dess verifiering](docs/version-list-local.md).

**Ladda ner ZIP** vid en sparad version levererar exakt den granskade kopians
sidor, bilder och typsnitt. Senare ändringar i utkastet ingår inte; inget publiceras.
Packa upp hela filen och öppna `index.html`. ZIP-filen är en hemsida, inte en
redigerbar projektfil. Se [nedladdning av granskad version](docs/version-download-local.md).

Gamla verifierade kopior kan tas bort med **Ta bort kopia**, följt av en uttrycklig
bekräftelse av den valda versionen. Utkast och andra kopior lämnas kvar. Se
[borttagning och felhantering](docs/version-delete-local.md), inklusive begränsningen
att diskfel kan lämna en ofullständig kopia som behöver kontrolleras manuellt.

Versionspaket kan nu skapas lokalt med `npm run version:create -- PROJEKTFIL NY_PAKETMAPP`
och kontrolleras med `npm run version:check -- PAKETMAPP`. Varje paket får en egen
granskningssida och fristående sidor/bilder/typsnitt, separat från det redigerbara
utkastet. Ingen publicering aktiveras; editorknappen finns bara i det lokala körläget ovan. Se
[versionspaket och lokal verifiering](docs/publication-versions-local.md).

Ett separat steg kontrollerar och omkodar kundbilder inför framtida publicering:
`npm run prepare:publication -- projekt.projekt.json NY_UTMAPP`. Det skapar en
lokal sida med kontrollerade WebP-bilder; ingen fil laddas upp. Se
[bildbearbetning inför publicering](docs/image-processing-local.md) för gränser,
testbevis och skillnaden mot den befintliga exporten.

Webbläsarappen är fortfarande statisk. `js/render.js` är nu gemensam för ZIP-export
och ett lokalt Node-verktyg; konto, molnsparning, betalning och hosting ingår inte i
detta verktyg. Provet verifierar Node, inte Cloudflare Workers eller annan drifttjänst.

Kräver Node 22 eller senare. Installera verktygets låsta beroenden och kör testerna:

```powershell
npm ci --ignore-scripts
npm test
npm run render -- C:\sokvag\exempel.projekt.json C:\sokvag\NY-utmatningsmapp
```

Renderingen läser en befintlig projektfil (v1) eller ett projektobjekt. Den skapar
HTML, bilder och typsnitt i en **ny** mapp och vägrar skriva över en befintlig mapp.
Ingen webbläsare eller nätverksanslutning behövs efter installationen, och inga filer
publiceras. Gamla platta slotvärden normaliseras i en kopia; originalprojektet ändras inte.

Node-verktyget accepterar bara registrerade mallar och deras sid-/fältstruktur,
begränsar indata till 20 MB och avvisar okända formatversioner och farliga nycklar.
Det är ett lokalt renderingsprov, inte ett skyddat API för kundtrafik. Inför en sådan
tjänst återstår bland annat autentisering, kundseparering, jobbgränser, fullständig
bildvalidering, behörighetskontroll och kontrollerad publicering.

`tests/fixtures/render-baseline.json` är fryst från webbläsarexporten på commit
`f724abd52f95ad93955975a5f0e1e447bda505bc`: 18 syntetiska projekt och 22 sidresultat.
Tester jämför text, länkar, bilder, avsnitt, kategorier och CSS samt kontrollerar
äldre format och säkert filskrivande. Likvärdig CSS-serialisering normaliseras i
testjämförelsen; baslinjen ska inte genereras om för att dölja en regression.

Med en befintlig Playwright-installation och Chromium kan även browserprovet köras:

```powershell
# Starta först den statiska servern på 127.0.0.1:8767.
# Playwright ska vara tillgängligt i Nodes modulsökväg, exempelvis via NODE_PATH.
npm run test:browser
```

`TEMPLATES_TEST_URL` kan ange en annan lokal serveradress. Testet öppnar riktiga
Node-genererade filer, granskar fyra skärmbredder och provar skript-/formulärblockering.
Skärmbilder och resultat skrivs till en ny temporär mapp utanför källkoden; sökvägen
skrivs ut. Installera inga nya webbläsare för detta om en fungerande testmiljö redan finns.

### Förhandsvisningens säkerhetsgräns

Editor och galleriminiatyrer använder `sandbox="allow-same-origin"` utan
`allow-scripts`, `allow-forms` eller popup-rättigheter. En innehållspolicy blockerar
också skript, anslutningar och formulärsändning; skript, inline-händelser, inbäddningar
och automatiska omdirigeringar tas bort före visning.

Editorns betrodda kod kan fortfarande läsa dokumentet och koppla filter, formulärdemo
och badge-klick till det. Mallens egen kod får inte köras i förhandsvisningen.
**Lägg aldrig till `allow-scripts` på dessa ramar:** kombinationen med
`allow-same-origin` skulle försvaga gränsen. Exporterade fristående sajter får sin
interaktionskod precis som tidigare.

Detta är skriptisolering för våra registrerade mallar, inte en separat säker origin
eller stöd för godtyckliga HTML-/JavaScript-mallar. Om sådan kod ska stödjas krävs
separat origin och ett begränsat meddelandegränssnitt. Molnkonton och en framtida
produktlansering kräver fortfarande en samlad säkerhetsgranskning.

## Redigera, spara och förhandsvisa

- Galleriet har en samlad projektyta och rubriken **Välj en mall**. Tomma projektlistor
  visar en kort startinstruktion; information om säkerhetskopiering visas när projekt finns.
- Mallkort med plats för två knappar visar dem bredvid varandra. Långa projektnamn
  radbryts och projektåtgärderna anpassas till mobil och surfplatta.
- Inställningen för minskad rörelse stänger av appens animationer och kortens lyft.
- **Titta på mallen** visar sidan utan redigeringsnummer även vid växling mellan
  dator och mobil. **Visa nummer** aktiverar dem; redigering återgår till sparad visningspreferens.
- På mobil växlar **Förhandsvisa / Redigera** mellan hela sidvyn och fullbreda fält.
  På större skärmar visas fält och förhandsvisning bredvid varandra; knappen ger större förhandsvisning.
- **Dator** renderar alltid sidan i 1200 CSS-pixlar och **Mobil** i 390; bilden skalas
  till tillgänglig yta. **Visa/dölj nummer** styr de klickbara redigeringsmarkörerna.
- Ändringar sparas automatiskt på vald lagringsplats; **Spara** kan användas direkt. Sparstatus och en dialog skyddar osparade
  ändringar när användaren går till galleriet; en webbläsarvarning begärs även vid omladdning.
- **Mer → Spara som projektfil** tar med de senaste ändringarna direkt från editorn.
  **Mer → Exportera sajt (.zip)** visar först antal oförändrade textfält och exempelbilder per sida.
- Exporten förklarar att nedladdning inte publicerar hemsidan. `LASMIG.txt` beskriver
  hur kunden packar upp, granskar, fortsätter redigera med projektfil och publicerar.
- Exempelbildernas instruktioner visas i editorns fältetiketter; SVG-bilderna saknar
  synlig instruktionstext som annars beskärs i olika bildformat.
- Caféets namn i menyraden kan kopieras till alla sidor med ett uttryckligt knapptryck.
  Detta använder `data-shared` och ändrar inga slotnummer eller projektfilformat.

## Branschfunktioner och gemensamma inställningar

Alla nio mallar har kompletterats med redigerbara, namngivna innehållsfält:

| Mall | Tillägg |
| --- | --- |
| Restaurang | Lunchavsnitt, kökets berättelse, menyfilter och bokningslänk |
| Frisör & Salong | Behandlingstider, bokningslänkar och före-/efterbilder |
| Byggfirma & Hantverk | Projektbeskrivningar, före-/efterbilder och offert i tre steg |
| Butik & Produkter | Kategorifilter, produktdetaljer/skötsel och separata köplänkar |
| Portfolio | Utvalt huvudprojekt, kategorifilter, projektberättelser och förfrågan |
| Café & Bageri | Veckans bakverk/berättelse på Hem, filter/kostinfo på Meny och besöksinfo/beställningsförfrågan på Kontakt |
| Gym & Träning | Filter på dag/passtyp, tränarpresentationer, medlems-/passlänkar och provträningsförfrågan |
| Konsult & Byrå | Tjänstevägvisare, fördjupningar, kundberättelse och samtalsbokning |
| Hemservice & Städ | Innehåll per tjänst, prisindikator och offert med förifylld uppskattning |

Varje sida har vanliga frågor och ett kontaktavsnitt. Kundomdömen är dolda som
standard och ska fyllas med äkta uppgifter innan avsnittet aktiveras.

Öppna **Företag, funktioner & nya avsnitt** ovanför de numrerade rutorna. Där finns:

- **Företag & funktioner:** gemensamt namn, telefon, e-post, adress, bokningslänk,
  formulärmottagare och integritetslänk. **Använd uppgifterna på alla sidor** uppdaterar
  även ursprungliga namn-/kontaktfält och igenkännbara företagsnamn i sidfoten;
  kontrollera återstående sidfotstext och öppettider efteråt.
- **Knappar & länkar:** redigera text, destination och typ (webb, telefon, mejl, avsnitt).
  Externa webblänkar måste använda HTTPS. Osäkra/ogiltiga destinationer aktiveras inte.
- **Visa eller dölj avsnitt**, **Nya texter**, kategoritillhörighet och bildbeskrivningar/
  bildfokus. Nya bilder laddas upp här; äldre bilder byts i sina numrerade rutor.
- Hemservice har egna priser per m² och tillfälle. Prisindikatorn kräver både ett
  positivt pris och en förklarande prisgrund; frekvens följer med som önskemål,
  inga RUT-avdrag eller frekvensrabatter beräknas automatiskt.

### Tjänster som måste anslutas av företaget

Bokning, betalning och formulär är **inte anslutna i grundmallarna**. Ange företagets
publika boknings-/köplänkar; mallarna hanterar inte lager, varukorg, tillgänglighet
eller medlemsregister. Ange en Formspree-adress `https://formspree.io/f/FORM_ID`
för formulär och testa mottagningen på publicerad adress. Inga API-hemligheter hör
hemma i appen eller exporten.

Förhandsvisningen skickar aldrig formulär. Exportens formulär validerar uppgifter,
behåller dem vid misslyckad sändning och visar skickat först efter ett lyckat
serversvar. Export utan konfigurerad mottagare har avstängd skicka-knapp och tydlig
information. Internet behövs för externa tjänster, medan filter, bildväxling och
prisindikator fungerar även offline.

### Projektformat och export

`project.site` innehåller frivilliga `business`, `links`, `rates` samt
`pages[filnamn].{content,images,hidden,categories}`. Gamla `values` och slotnummer
är oförändrade. Tilläggen använder fasta nycklar i `data-content`/`data-image-key`,
så nya innehållsfält flyttar aldrig gamla sparade värden.

`SiteKit` i `templates/index.js` kompletterar ursprungsmallarna via
`Editor.pagesOf`, och samma `apply` används av editor och export. Den fristående
interaktionskoden följer med inline i varje exportsida; inga nya bibliotek eller
filer behöver laddas från nätet. Koden ligger i befintliga precachade filer.

Exportkontrollen visar nu även saknade länkar, formulärmottagare och oförändrade
nya fält. Den tidigare testförväntningen exakt tre listpunkter för caféet är därför
avsiktligt ersatt med tre sidöversikter **plus** dessa kompletterande kontroller.

## Filstruktur

```
index.html          App-skalet (galleri + editor)
css/app.css         Appens utseende
js/app.js           Vyer, hash-routing, sidflikar
js/editor.js        Slot-numrering, badges, live-redigering, bilduppladdning
js/storage.js       Projekt i localStorage + projektfiler + migrering
js/export.js        Zip-export (en html per sida + images/ + fonts/)
templates/index.js  Template-register, SVG-platshållare (ph) och typsnitt (fontCss)
templates/*.js      En fil per template
fonts/              Självhostade typsnitt (OFL-licens, se fonts/LICENS.txt)
```

## Typsnitt

Fyra typsnitt är nedladdade från Google Fonts (latin-subset, vikt 400 + 700, OFL-licens)
och självhostas: **Inter**, **Playfair Display**, **Outfit** och **Lora**. En template
använder dem genom att lägga `${window.fontCss('playfair', 'inter')}` först i sin
`<style>` och sedan referera `font-family: 'Playfair Display', Georgia, serif`.
Exporten upptäcker vilka typsnittsfiler sidorna refererar och packar med dem + licensen
i zip:ens `fonts/`-mapp, så kundsajten är helt fristående (ingen Google-koppling).

## Så fungerar en template

En template är en komplett HTML-sida (eller flera) där allt som kunden ska kunna ändra är
märkt med `data-slot`:

```html
<h1 data-slot="text" data-label="Restaurangens namn">Trattoria Milano</h1>
<img data-slot="image" data-label="Hero-bild" src="...">
<p data-slot="text" data-multiline data-label="Öppettider">...</p>
```

Editorn numrerar alla `data-slot`-element i dokumentordning (1, 2, 3 …) och visar dem som
badges i förhandsvisningen + fält i sidopanelen. `data-multiline` ger ett textarea-fält.

**Viktigt:** slot-numren är positionsbaserade. Lägg nya slots **sist** i en template, annars
förskjuts sparade projekt som byggts på den gamla versionen.

## Lägga till en ny template

1. Skapa `templates/minmall.js`:

```js
(function () {
  const ph = window.ph; // ph(bredd, höjd, bakgrund, färg, etikett) → platshållarbild

  const html = `<!DOCTYPE html>...hela sidan med data-slot-markeringar...`;

  window.TEMPLATES.push({
    id: 'minmall',
    name: 'Min mall',
    category: 'Lokalt företag',
    html: html                 // en sida …
    // … eller flera sidor:
    // pages: [
    //   { file: 'index.html', title: 'Hem', html: hemHtml },
    //   { file: 'kontakt.html', title: 'Kontakt', html: kontaktHtml }
    // ]
  });
})();
```

2. Lägg till `<script src="templates/minmall.js"></script>` i `index.html` (före `js/`-skripten).

Flersidiga templates: länkar mellan sidorna skrivs som vanliga `href="meny.html"` — editorn
fångar klicken och byter sida, och exporten skapar en fil per sida.

## Regler (från valvet Templates)

- Platshållarbilder är genererade SVG:er — aldrig riktiga företags foton eller logotyper.
- Ingen påhittad fakta presenterad som verklig; exempeltexter är tydligt generiska.
- Dokumentation av mallpaketet ligger i valvet under `Hemsidor/Templates-appen/`
  (mallkort, bytlista, färger/typsnitt, skärmbilder och en kopia av koden). Ändras koden
  här ska kopian och mallkortets ändringslogg uppdateras i samma arbetspass.
