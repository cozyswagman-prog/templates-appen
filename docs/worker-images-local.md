# Bildbehandling för publicering i Workers

Status 2026-10-06: byggd och verifierad lokalt. Inga bilder har laddats upp till
verkliga kundkonton, inga molnändringar och inga nya betaltjänster eller paket.

## Flödet

```text
Välj bild / spara äldre kontoprojekt / publicera
  → webbläsaren avkodar bilden och följer EXIF-orienteringen
  → vid behov: sRGB-canvas, högst 1600 px, ta bort kamerametadata
  → högst 1 900 000 byte, annars minska vidare
  → privata kontobilder och sparat projekt
  → Worker kontrollerar format, dimensioner, metadata och bytegräns
  → rendera från projektdata och växla först när hela sajten är klar
```

Ingen Sharp-omkodning körs i Workers. Sharp finns kvar för de fristående lokala
verktygen och för oberoende avkodning av testresultat.

- Valda filer får vara PNG, JPEG, WebP eller GIF, högst 12 MiB och 40 megapixel.
  Headerns pixelgräns kontrolleras före avkodning och avkodade dimensioner kontrolleras igen.
- JPEG blir JPEG. Övriga format blir PNG när omkodning behövs, så transparens bevaras.
  GIF och animerad WebP blir en stillbild från första bildrutan. Animation bevaras inte.
- EXIF, GPS, XMP, kommentarer och ursprungliga färgprofiler följer inte med vid
  omkodning. Även den ICC-profil som Chromium själv lägger i canvas-JPEG tas bort
  efter att pixlarna konverterats till sRGB. Standardiserade färg-/upplösningsfält
  i PNG och JFIF kan finnas kvar; ingen fri kameratext tillåts av publiceringspolicyn.
- En redan avkodningsbar, godkänd PNG/JPEG återanvänds oförändrad. Det hindrar
  upprepad kvalitetsförlust och onödigt nya bildhashar vid varje sparning.
- Brusiga eller stora bilder kan behöva bli mindre än 1600 px för att också klara
  bytegränsen. Bildens proportioner behålls, och små bilder förstoras inte.

Webbläsarens [EXIF-orientering](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap#imageorientation)
och [canvas-kodning](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)
används utan externa bildtjänster.

## Äldre projekt och samtidiga ändringar

Kontosparning och uttrycklig kopiering till kontot bearbetar portabla bilddata före
reservation/uppladdning. Alla bilder förbereds på en kopia, och kontots identitet
kontrolleras efter asynkrona steg. Ett kontobyte stoppar överföringen.

Publicera sparar även ett tidigare oförändrat kontoprojekt, så att gamla inlinebilder
och gamla privata bildreferenser bearbetas utan att användaren behöver välja dem igen.
Appen tar bara över de förberedda bilderna om inga nyare redigeringar har tillkommit
under sparningen. Lokala original som kopieras till kontot lämnas oförändrade.

Ett bildfel hindrar sparning/publicering. Feltexten visas och utkastet finns kvar.
En skadad nyvald bild ersätter inte den tidigare bilden. Befintlig publicerad
version ändras först efter lyckad fullständig publicering.

## Serverns kontroll och gränser

`js/image-policy.js` delas mellan appen och Workern. Servern kräver förberedda
PNG/JPEG-bilder med kända containerstrukturer, högst 1600 px per sida och högst
1 900 000 byte. Otillåten metadata, okända chunks/markörer, ofullständiga containrar,
fel format och data efter filslutet nekas innan publiceringsfiler skrivs.
Kontrollsumman mot den privata bildens innehållsnyckel kontrolleras också som tidigare.

Det är en strukturell kontroll, **inte full pixelavkodning i Workern**. Den verifierar
inte PNG-CRC eller hela PNG/JPEG-komprimeringen. Webbläsaren avkodar pixlarna, och
den vanliga appvägen har testats med skadade bilder. En egen klient som kringgår
appen kan fortfarande spara strukturellt godtagbara men trasiga komprimerade pixlar.
Servern accepterar aldrig kundskapad HTML som ersättning för sin renderare.

## Verifiering

- Ordinarie baslinje före ändringen: 177/177.
- Slutprov: 182/182 ordinarie tester, kontoflöde 45/45, autosparande 26/26 och
  riktade bild-/publiceringsprov 18/18. Workerd/D1-gräns 3/3, tidigare
  tio publiceringar vardera med D1 och R2 fortsatt PASS.
- Bildpolicy: rena PNG/JPEG, metadata, dimensioner, GIF/WebP, skadade containrar,
  pixelbevarande metadatahantering och verklig PNG över 1,9 MB via autentiserat API.
- Webbläsare med syntetiskt konto: stora och små EXIF-bilder, färgpixlar efter
  rotation, transparens, brusig stor PNG, stabila bytes, skadad bild, kontobyte,
  gräns före pixelavkodning, äldre projekt → sparande → verklig lokal publiceringskod.
- Mobil publiceringsruta: faktiskt HTTP 422-fel från publiceringskoden visas,
  och aktiv version är oförändrad. Desktop 1200 px och mobil 390 px inspekterade.
- Workerd/D1-adapter: 1 899 999 och 1 900 000 byte godtas; 1 900 001 ger fel och
  den tidigare filen är oförändrad. Här används en uttrycklig rå byte-fixture för
  att isolera databasadapterns exakta gräns, inte som bevis för bildavkodning.
- Den gamla kontotestbilden hade trasiga PNG-pixlar som både createImageBitmap och
  Sharp avvisade. Den ersattes med en giltig syntetisk PNG. Den trasiga bilden
  används separat för att verifiera att tidigare bild bevaras vid fel.

Bevisen ligger utanför Git i `testmiljo/worker-images-20261006/`. Browser-pluginen
var inte tillgänglig; befintlig Playwright/Chromium användes. Testerna kontaktade
inga riktiga konton eller Stripe och är inte CPU-bevis för Cloudflare Free.

## Driftsättning återstår

Bygg ett nytt statiskt apppaket med båda nya skripten och uppdaterad service-worker-
fillista. Uppdatera appen före den striktare publiceringsservern, annars kan en äldre
app skicka bilder som servern nekar. Befintliga öppna appflikar behöver den nya koden.
Följ också schema- och serverordningen för versionsadresser/städning; aktivera ingen
radering utan granskad backup och raderingsomfattning.

Prov på fysisk mobil, andra webbläsarmotorer och tio CPU-mätningar i molnet återstår.
Utökad pixelavkodning på servern är en separat framtida förbättring.
