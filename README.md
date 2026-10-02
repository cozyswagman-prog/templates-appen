# Templates-appen

Ett mini-CMS: kunden väljer en färdig hemsida ur ett galleri, byter bilder och texter i
numrerade rutor, och laddar ner sin färdiga sajt som en zip (ren HTML — fungerar på vilket
webbhotell som helst). Ingen build-kedja, inget backend; allt är statiska filer.

## Köra appen

Kräver bara en statisk filserver, t.ex.:

```bash
npx -y serve -l 3456 .
```

Öppna sedan http://localhost:3456. (I Claude Code startas den via `.claude/launch.json`.)

## Struktur

```
index.html          App-skalet (galleri + editor)
css/app.css         Appens utseende
js/app.js           Vyer, hash-routing, sidflikar
js/editor.js        Slot-numrering, badges, live-redigering, bilduppladdning
js/storage.js       Projekt i localStorage ("Mina projekt")
js/export.js        Zip-export (en html per sida + images/)
templates/index.js  Template-register + SVG-platshållare (window.ph)
templates/*.js      En fil per template
```

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
