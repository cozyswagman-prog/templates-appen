# Templates-appen

Ett mini-CMS: kunden väljer en färdig hemsida ur ett galleri, byter bilder och texter i
numrerade rutor, och laddar ner sin färdiga sajt som en zip (ren HTML — fungerar på vilket
webbhotell som helst). Ingen build-kedja, inget backend; allt är statiska filer.

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

## Redigera, spara och förhandsvisa

- På mobil växlar **Förhandsvisa / Redigera** mellan hela sidvyn och fullbreda fält.
  På större skärmar visas fält och förhandsvisning bredvid varandra; knappen ger större förhandsvisning.
- **Dator** renderar alltid sidan i 1200 CSS-pixlar och **Mobil** i 390; bilden skalas
  till tillgänglig yta. **Visa/dölj nummer** styr de klickbara redigeringsmarkörerna.
- **Spara** sparar i aktuell webbläsare. Sparstatus och en dialog skyddar osparade
  ändringar när användaren går till galleriet; en webbläsarvarning begärs även vid omladdning.
- **Mer → Spara som projektfil** tar med de senaste ändringarna direkt från editorn.
  **Mer → Exportera sajt (.zip)** visar först antal oförändrade textfält och exempelbilder per sida.
- Exporten förklarar att nedladdning inte publicerar hemsidan. `LASMIG.txt` beskriver
  hur kunden packar upp, granskar, fortsätter redigera med projektfil och publicerar.
- Exempelbildernas instruktioner visas i editorns fältetiketter; SVG-bilderna saknar
  synlig instruktionstext som annars beskärs i olika bildformat.
- Caféets namn i menyraden kan kopieras till alla sidor med ett uttryckligt knapptryck.
  Detta använder `data-shared` och ändrar inga slotnummer eller projektfilformat.

## Struktur

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
