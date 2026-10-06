# Bildkontroll inför publicering – lokal del 6

Status 2026-10-04: implementerad och testad lokalt med Node 24 på Windows.
Ingen server, molnanslutning, uppladdning eller publicering har aktiverats.
Detta är en separat, striktare väg till förberedda publiceringsfiler. Befintlig
webbläsareditor, ZIP-export, kontolagring och `npm run render` behåller sitt beteende.
De använder inte automatiskt det nya steget.

## Användning

```powershell
npm ci --ignore-scripts
npm run prepare:publication -- C:\sokvag\kund.projekt.json C:\sokvag\NY_UTMAPP
```

Inmatningen är en portabel projektfil v1 eller motsvarande projektobjekt. Bilder
ska vara inbäddade: kontoprojekt måste hämtas via det autentiserade projektlagret
och laddas ner som projektfil först. Verktyget hämtar aldrig privata referenser,
fjärradresser eller filer som anges i bildfält.

Resultatet är HTML, lokala WebP-bilder och typsnitt i en ny mapp. Vid framgång
skrivs `LOCAL_PREPARED` och `published:false`. En befintlig målmapp skrivs aldrig
över. Ogiltiga projekt eller bilder skapar ingen utmapp; diskfel under slutlig
skrivning kan lämna en ofullständig ny mapp, som aldrig är publicerad.

Servermodulen `tools/prepare-publication.cjs` exporterar även
`preparePublication(input)` och returnerar `{files, imageReport}` i minnet.
Projektet som anroparen skickade in ändras inte. Textfält behandlas som text även
om de börjar med exempelvis `data:image/`. Egna bilder hittas genom mallens faktiska
numrerade bildfält och namngivna bildinställningar, även på flera sidor.

## Vad som kontrolleras och ändras

```text
Projektfil → kontroll av struktur och bildfält
  → filsignatur och faktisk avkodning
  → orientering, storleksanpassning och ny WebP-kodning
  → gemensam renderer → lokala publiceringsfiler
```

- Endast PNG, JPEG, WebP och stillbilds-GIF accepteras som kundbilder. Filtypen
  jämförs med vad avkodaren identifierar. Trasiga/trunkerade pixeldata avvisas.
- Kund-SVG, externa bildadresser, lokala filsökvägar och ohämtade privata referenser
  avvisas. Mallarnas inbyggda, betrodda SVG-platshållare påverkas inte.
- Animerad GIF/WebP och PNG med APNG-markering avvisas. Ingen animation omvandlas
  tyst till en stillbild i detta nya steg.
- Kamerans EXIF-orientering tillämpas. Utdata kodas om till WebP, kvalitet 85,
  högst 1600 pixlar på längsta sidan, utan förstoring. Transparens behålls;
  EXIF, XMP, ICC och andra medföljande metadata kopieras inte till utdata.
- Dubbletter av samma inbäddade bild behandlas en gång. Alternativtext, beskärningsfokus,
  svenska tecken och flersidigt innehåll bevaras. Bildbytes kan ändras genom omkodning.

## Gränser och processhantering

| Begränsning | Värde |
| --- | --- |
| Projektfil | 20 MiB |
| Indata per bild | 2 MiB |
| Olika kundbilder per projekt | 100 |
| Bildens angivna pixelantal | 40 megapixel |
| Sammanlagt pixelantal för olika bilder | 80 megapixel |
| Utdata per bild / sammanlagt | 2 MiB / 12 MiB |
| Avkodningstid för bildgruppen | högst 30 sekunder |
| Pågående bildgrupper per Node-process | 1; övriga nekas som upptagen |

Sharp 0.35.5 är låst i paketfilerna och används endast av Node-verktyget.
Det körs i en egen barnprocess med en tråd, avstängd cache och en 128 MiB-gräns
för JavaScript-heapen. Föräldern avbryter barnprocessen vid tidsgränsen och inväntar
att den stängs innan kapaciteten frigörs. Bara kodens fasta worker startas;
kunddata får aldrig välja program, argument, filnamn för avkodning eller URL.

Barnprocessen får ett minimalt miljöurval och inga ärvda Node-startflaggor eller
kontonycklar. **Detta är inte en operativsystemsandbox.** Heapgränsen begränsar
inte Sharps/libvips native-minne, pixelgränser bygger på bildmetadata och
total renderings-/skrivtid omfattas inte av avkodningens timeout. Före en publik
tjänst behövs en separat arbetarmiljö med OS-begränsat minne/CPU, begränsade
filrättigheter, nätverksisolering, kö, anropskvoter och övervakning.

Det krävs en Node-miljö som tillåter barnprocesser och Sharps plattformsberoende
bibliotek. Cloudflare Workers, Vercel eller annan drifttjänst har inte verifierats
eller valts genom denna implementation.

## Lokal verifiering

```powershell
npm test
npm run test:publication
npm run test:browser
npm audit
```

`image-processing.test.cjs` använder verklig Sharp-avkodning och barnprocesser.
Testerna provar orientering, metadata, transparens, storlek, trasiga pixlar,
filtyper, animerade format, privata/externa adresser, äldre platta fält, namngivna
bilder, oförändrat källprojekt, tidsgräns, upptagen arbetare och CLI utan överskrivning.
Alla nio mallar utan egna kundbilder ska ge exakt samma resultat som tidigare.

`publication.browser.cjs` öppnar verkligt genererade filer i Chromium och kontrollerar
bildavkodning, dimensioner, sidlänkar, alternativtext/fokus, konsolfel samt bredderna
390/412/768/1440 px. Det är lokal filvisning, inte en publicerad sajt eller fysisk
iPhone/Safari. Browser plugin not available; befintlig Playwright används.

Den frysta renderingsbaslinjen ändras inte. Testets inledande orienteringsfel
visade sig vara en felkonstruerad EXIF-fixtur: den angav orientering 1. Fixturen
anger nu verifierat orientering 6, och samma krav på rätt rotering passerar.

## Kvar före drift

Gör denna kodväg obligatorisk i framtida serverpublicering och använd aldrig den
äldre renderern ensam som en säkerhetsgräns. Verifiera verklig körmiljö, resursgränser,
behörighetskontroller, felåterhämtning och visuell kvalitet på representativa
kundfoton. Ett godkänt bildprov är inte en fullständig säkerhetsgranskning av sajten.

Kontolagring tar fortfarande emot privata original enligt tidigare regler; den
är inte ombyggd till en serverstyrd uppladdningstjänst här. Framtida publicerade
versioner måste lagra sina kontrollerade bilder så att bildrensning inte kan ta
bort dem. Betalning, hosting, backup och riktig testtjänst återstår.

Versionspaket med förhandsgranskning är nu implementerade i
[lokal del 7](publication-versions-local.md). De använder denna bildkontroll
obligatoriskt och lagrar egna leveransbilder separat från utkastet.

Primärkällor: [Sharp constructor](https://sharp.pixelplumbing.com/api-constructor/),
[metadata](https://sharp.pixelplumbing.com/api-input/) och
[output options](https://sharp.pixelplumbing.com/api-output/).
