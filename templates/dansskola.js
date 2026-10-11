(function () {
  // Dansskola – "Energisk men ordnad": varm vit bas, espresso-text, en tomatröd accent;
  // Outfit 700 i mycket stora, tajta rubriker + Inter; riktigt veckoschema som tabell.
  const T = window.tone;
  const Y1 = '#efe5d8', Y2 = '#e8dccb', Y3 = '#f3ebe0', FG = '#2a1f1a';

  // Veckoschemat: [dag, [[tid, kurs, nivå, ålder, sal], ...]]
  const schema = [
    ['Måndag', [
      ['16.30–17.15', 'Barndans', 'Nybörjare', '4–6 år', 'Sal 1'],
      ['17.30–18.30', 'Jazz', 'Fortsättning', '10–13 år', 'Sal 1'],
      ['19.00–20.30', 'Bugg för vuxna', 'Nybörjare', 'Vuxna', 'Sal 2']]],
    ['Tisdag', [
      ['16.30–17.30', 'Balett', 'Nybörjare', '7–9 år', 'Sal 1'],
      ['17.45–18.45', 'Hiphop', 'Nybörjare', '10–13 år', 'Sal 2'],
      ['19.00–20.00', 'Jazz', 'Avancerad', 'Från 14 år', 'Sal 1']]],
    ['Onsdag', [
      ['16.30–17.15', 'Barndans', 'Fortsättning', '5–7 år', 'Sal 1'],
      ['17.30–18.30', 'Hiphop', 'Fortsättning', 'Från 14 år', 'Sal 2'],
      ['18.45–20.15', 'Balett', 'Fortsättning', 'Från 12 år', 'Sal 1']]],
    ['Torsdag', [
      ['16.30–17.30', 'Jazz', 'Nybörjare', '7–9 år', 'Sal 1'],
      ['17.45–18.45', 'Hiphop', 'Nybörjare', '7–9 år', 'Sal 2'],
      ['19.00–20.30', 'Bugg för vuxna', 'Fortsättning', 'Vuxna', 'Sal 2']]],
    ['Fredag', [
      ['16.30–17.30', 'Hiphop', 'Öppen nivå', '10–16 år', 'Sal 2'],
      ['17.45–18.45', 'Jazz', 'Öppen nivå', 'Från 14 år', 'Sal 1']]],
    ['Lördag', [
      ['10.00–10.45', 'Barndans', 'Med vuxen', '3–4 år', 'Sal 1'],
      ['11.00–12.00', 'Balett', 'Nybörjare', '10–13 år', 'Sal 1']]]
  ];
  const schemaRader = schema.map(([dag, pass]) => `
          <tbody>
${pass.map((p, i) => `            <tr>${i === 0 ? `<th class="dag" scope="rowgroup" rowspan="${pass.length}" data-slot="text" data-label="Schema – ${dag.toLowerCase()}">${dag}</th>` : ''}<td class="tid" data-slot="text" data-label="Schema ${dag.toLowerCase()} ${i + 1} – tid">${p[0]}</td><td class="kurs" data-slot="text" data-label="Schema ${dag.toLowerCase()} ${i + 1} – kurs">${p[1]}</td><td class="niva" data-slot="text" data-label="Schema ${dag.toLowerCase()} ${i + 1} – nivå">${p[2]}</td><td class="alder" data-slot="text" data-label="Schema ${dag.toLowerCase()} ${i + 1} – ålder">${p[3]}</td><td class="sal" data-slot="text" data-label="Schema ${dag.toLowerCase()} ${i + 1} – sal">${p[4]}</td></tr>`).join('\n')}
          </tbody>`).join('');

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dansstudion Takt – dansskola i Kiruna</title>
<meta name="description" content="Dansskola i Kiruna för barn, unga och vuxna. Jazz, hiphop, balett, barndans och bugg. Första lektionen är gratis.">
<style>
${window.fontCss('outfit', 'inter')}
:root {
  --bg: #faf6f0; --yta: #f1e9dd; --linje: #e0d3c2; --text: #2a1f1a; --dov: #6b5a4f;
  --accent: #c93a26; --accent-mork: #a82e1d; --r: 6px;
  --rubrik: 'Outfit', 'Inter', system-ui, sans-serif;
  --brod: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { background: var(--bg); color: var(--text); font-family: var(--brod); font-size: 17px; line-height: 1.6;
  -webkit-font-smoothing: antialiased; overflow-wrap: break-word; }
img { display: block; max-width: 100%; }
a { color: inherit; }
h1, h2, h3 { font-family: var(--rubrik); font-weight: 700; line-height: 1.05; letter-spacing: -0.03em; text-wrap: balance; }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; border-radius: var(--r); }
.wrap { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.etikett { font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dov); }
.tal { font-variant-numeric: tabular-nums; }
.hoppa { position: absolute; left: 16px; top: -64px; background: var(--text); color: var(--bg); padding: 12px 16px; z-index: 10; border-radius: var(--r); }
.hoppa:focus { top: 16px; }
.dold { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* Sidhuvud */
header .wrap { display: flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 80px; border-bottom: 1px solid var(--linje); }
.logga { display: flex; align-items: baseline; gap: 8px; text-decoration: none; white-space: nowrap; }
.logga-namn { font-family: var(--rubrik); font-weight: 700; font-size: 28px; letter-spacing: -0.04em; }
.logga-pre { font-size: 14px; color: var(--dov); }
nav ul { list-style: none; display: flex; gap: 24px; }
nav a { display: inline-flex; align-items: center; min-height: 44px; font-size: 15px; text-decoration: none; }
nav a:hover { color: var(--accent); }
.ring { display: inline-flex; align-items: center; min-height: 44px; padding: 8px 16px; border: 1px solid var(--text);
  border-radius: var(--r); font-weight: 700; font-size: 15px; text-decoration: none; white-space: nowrap; }
.ring:hover { background: var(--text); color: var(--bg); }
/* Smala telefoner: visa bara "Ring" – numret ligger kvar i texten så tel-länken stämmer */
@media (max-width: 359px) { .ring { font-size: 0; } .ring::before { content: "Ring"; font-size: 15px; } }

/* Knappar */
.knapp { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 12px 24px;
  border-radius: var(--r); font-weight: 700; font-size: 17px; text-decoration: none; transition: background-color .2s ease-out, transform .2s ease-out; }
.knapp-primar { background: var(--accent); color: #fff; }
.knapp-primar:hover { background: var(--accent-mork); }
.knapp-primar:active { transform: translateY(1px); }
.knapp-sek { color: var(--text); box-shadow: inset 0 0 0 1px var(--text); }
.knapp-sek:hover { background: var(--text); color: var(--bg); }

/* Hero */
.hero { padding: 48px 0 96px; }
.hero-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 0 24px; }
.hero .etikett { grid-column: 1 / -1; }
.hero h1 { grid-column: 1 / -1; font-size: clamp(56px, 11.2vw, 160px); line-height: 0.92; letter-spacing: -0.05em; margin: 16px 0 48px; max-width: 11ch; }
.hero-text { grid-column: 1 / 6; }
.hero .ingress { font-size: 20px; line-height: 1.5; max-width: 30em; }
.hero-knappar { display: flex; flex-wrap: wrap; gap: 12px; margin: 32px 0; }
.snabb { list-style: none; border-top: 1px solid var(--linje); }
.snabb li { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--linje); }
.snabb .etikett { padding-top: 4px; }
.snabb a { font-weight: 700; text-decoration: none; }
.snabb a:hover { color: var(--accent); }
.hero-bild { grid-column: 7 / 13; }
.hero-bild img { width: 100%; height: auto; aspect-ratio: 4 / 3.4; object-fit: cover; border-radius: var(--r); }

/* Sektioner */
section { padding: 96px 0; }
.sek-huvud { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: 16px 48px; margin-bottom: 48px; }
.sek-huvud h2 { font-size: clamp(44px, 6.4vw, 88px); line-height: 0.95; letter-spacing: -0.045em; margin-top: 12px; }
.sek-huvud p { max-width: 30em; color: var(--dov); }
.tonad { background: var(--yta); }

/* Schema */
.schema { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.schema thead th { text-align: left; font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dov);
  padding: 0 16px 12px 0; border-bottom: 2px solid var(--text); }
.schema td, .schema th.dag { text-align: left; vertical-align: top; padding: 16px 16px 16px 0; border-bottom: 1px solid var(--linje); }
.schema tbody tr:last-child td, .schema th.dag { border-bottom: 2px solid var(--text); }
.schema th.dag { font-family: var(--rubrik); font-size: 24px; letter-spacing: -0.02em; line-height: 1.2; width: 18%; padding-top: 12px; }
.schema .tid { width: 16%; white-space: nowrap; }
.schema .kurs { font-family: var(--rubrik); font-weight: 700; font-size: 19px; line-height: 1.4; width: 24%; }
.schema .sal { padding-right: 0; }
.schema-not { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 24px; margin-top: 24px; color: var(--dov); font-size: 16px; }

/* Stilar */
.stilar { list-style: none; border-top: 1px solid var(--linje); }
.stilar li { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 24px; align-items: end; padding: 32px 0; border-bottom: 1px solid var(--linje); }
.stilar h3 { grid-column: 1 / 8; font-size: clamp(56px, 10vw, 144px); line-height: 0.9; letter-spacing: -0.055em; }
.stilar .om { grid-column: 8 / 13; padding-bottom: 8px; }
.stilar .om p:last-child { margin-top: 8px; }
.stilar li:nth-child(even) h3 { grid-column: 6 / 13; text-align: right; grid-row: 1; padding-right: 0.04em; }
.stilar li:nth-child(even) .om { grid-column: 1 / 6; grid-row: 1; }
.stilar li.mindre h3 { font-size: clamp(44px, 7vw, 104px); }
.stilar li.sista h3 { grid-column: 1 / 10; }
.stilar li.sista .om { grid-column: 10 / 13; }

/* Priser */
.pris-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 48px 24px; align-items: start; }
.pris-tabell-wrap { grid-column: 1 / 8; }
.rabatt { grid-column: 9 / 13; }
.priser { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.priser th, .priser td { text-align: left; padding: 16px 16px 16px 0; border-bottom: 1px solid var(--linje); vertical-align: top; }
.priser thead th { font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dov); border-bottom: 2px solid var(--text); padding-top: 0; padding-bottom: 12px; }
.priser tbody th { font-weight: 700; }
.priser .belopp { text-align: right; padding-right: 0; white-space: nowrap; font-weight: 700; }
.priser .not { display: block; font-weight: 400; color: var(--dov); font-size: 16px; }
.liten { font-size: 16px; color: var(--dov); margin-top: 16px; max-width: 40em; }
.stor-siffra { font-family: var(--rubrik); font-weight: 700; font-size: clamp(96px, 13vw, 176px); line-height: 0.85; letter-spacing: -0.06em; margin: 16px 0 16px; font-variant-numeric: tabular-nums; }
.rabatt h3 { font-size: 24px; letter-spacing: -0.02em; margin-bottom: 8px; }
.rabatt-lista { list-style: none; margin-top: 24px; border-top: 2px solid var(--text); }
.rabatt-lista li { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--linje); font-variant-numeric: tabular-nums; }
.rabatt-lista li span:last-child { font-weight: 700; white-space: nowrap; }

/* Lärare */
.larare { list-style: none; display: grid; grid-template-columns: repeat(3, 1fr); gap: 48px 24px; }
.larare img { width: 100%; height: auto; aspect-ratio: 4 / 5; object-fit: cover; border-radius: var(--r); margin-bottom: 16px; }
.larare li:nth-child(2) { margin-top: 64px; }
.larare h3 { font-size: 32px; letter-spacing: -0.03em; }
.larare .stil { font-weight: 700; color: var(--text); font-size: 15px; letter-spacing: 0.02em; margin: 4px 0 8px; }
.larare p:last-child { color: var(--dov); }

/* Vårshow */
.show { padding: 0 0 96px; }
.show-bild img { width: 100%; height: auto; aspect-ratio: 21 / 9; object-fit: cover; }
.show-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 32px 24px; padding-top: 48px; }
.show-rubrik { grid-column: 1 / 7; }
.show-grid h2 { font-size: clamp(44px, 6.4vw, 88px); line-height: 0.95; letter-spacing: -0.045em; margin-top: 12px; }
.show-text { grid-column: 8 / 13; padding-top: 32px; }
.show-datum { font-family: var(--rubrik); font-weight: 700; font-size: 32px; letter-spacing: -0.02em; line-height: 1.2; text-wrap: balance; }
.show-text p + p { margin-top: 12px; }
.show-text .dov { color: var(--dov); }

/* Anmälan */
.anmalan { background: var(--text); color: var(--bg); }
.anmalan .etikett { color: #c9b8a8; }
.anm-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 48px 24px; }
.anm-vanster { grid-column: 1 / 7; }
.anm-vanster h2 { font-size: clamp(48px, 7vw, 104px); line-height: 0.92; letter-spacing: -0.05em; margin: 12px 0 32px; }
.anm-steg { list-style: none; counter-reset: s; margin-bottom: 32px; }
.anm-steg li { counter-increment: s; display: grid; grid-template-columns: 40px 1fr; padding: 12px 0; border-top: 1px solid #4a3c33; }
.anm-steg li::before { content: counter(s); font-family: var(--rubrik); font-weight: 700; font-size: 20px; line-height: 1.4; color: #c9b8a8; }
.anm-kontakt { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.anm-kontakt .knapp-sek { color: var(--bg); box-shadow: inset 0 0 0 1px var(--bg); }
.anm-kontakt .knapp-sek:hover { background: var(--bg); color: var(--text); }
.anm-hoger { grid-column: 8 / 13; }
.info { margin-bottom: 32px; }
.info .etikett { margin-bottom: 8px; }
.tider { display: grid; grid-template-columns: auto 1fr; font-variant-numeric: tabular-nums; }
.tider dt, .tider dd { padding: 8px 0; border-top: 1px solid #4a3c33; }
.tider dd { text-align: right; padding-left: 16px; }
.anmalan a.lank { text-decoration: none; border-bottom: 1px solid #c9b8a8; }
.anmalan a.lank:hover { border-color: var(--bg); }
.anmalan p.dov { color: #c9b8a8; margin-top: 8px; }

/* Sidfot */
footer { padding: 64px 0 32px; }
.fot-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 32px 24px; font-size: 16px; }
.fot-namn { font-family: var(--rubrik); font-weight: 700; font-size: 40px; letter-spacing: -0.045em; line-height: 1; }
.fot-grid .etikett { margin-bottom: 8px; }
.fot-grid a { text-decoration: none; }
.fot-grid a:hover { color: var(--accent); }
.radbryt { white-space: pre-line; }
.fot-botten { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 24px; margin-top: 48px; padding-top: 24px;
  border-top: 1px solid var(--linje); color: var(--dov); font-size: 14px; }

@media (max-width: 960px) {
  nav { display: none; }
  .hero-text { grid-column: 1 / -1; }
  .hero-bild { grid-column: 1 / -1; margin-top: 48px; }
  .hero-bild img { aspect-ratio: 16 / 9; }
  .stilar li.sista h3 { grid-column: 1 / 9; }
  .stilar li.sista .om { grid-column: 9 / 13; }
  .pris-tabell-wrap, .rabatt { grid-column: 1 / -1; }
  .show-rubrik, .show-text { grid-column: 1 / -1; }
  .show-text { padding-top: 0; }
  .anm-vanster, .anm-hoger { grid-column: 1 / -1; }
  .fot-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 720px) {
  body { font-size: 17px; }
  .wrap { padding: 0 16px; }
  header .wrap { min-height: 64px; }
  .logga-namn { font-size: 26px; }
  .hero { padding: 32px 0 64px; }
  .hero h1 { margin: 12px 0 32px; letter-spacing: -0.045em; }
  .hero .ingress { font-size: 18px; }
  .hero-knappar .knapp { flex: 1 1 auto; }
  .hero-bild img { aspect-ratio: 4 / 3; }
  section { padding: 64px 0; }
  .show { padding: 0 0 64px; }
  .sek-huvud { margin-bottom: 32px; }

  /* Schemat blir en lista per dag – ingen horisontell scroll */
  .schema, .schema tbody, .schema tr, .schema td, .schema th { display: block; }
  .schema thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .schema tbody { border-top: 2px solid var(--text); }
  .schema tbody + tbody { margin-top: 32px; }
  .schema tr { display: flex; flex-wrap: wrap; padding: 12px 0; border-bottom: 1px solid var(--linje); }
  .schema tbody tr:last-child { border-bottom: 0; }
  .schema th.dag { flex: 0 0 100%; width: auto; border: 0; padding: 0 0 12px; font-size: 24px; }
  .schema td, .schema tbody tr:last-child td { border: 0; padding: 0; width: auto; }
  .schema .kurs { order: 1; flex: 1 1 auto; width: auto; font-size: 18px; }
  .schema .tid { order: 2; flex: 0 0 auto; width: auto; padding-left: 16px; font-weight: 700; }
  .schema .niva { order: 3; }
  .schema .alder { order: 4; }
  .schema .sal { order: 5; }
  .schema .niva, .schema .alder, .schema .sal { color: var(--dov); font-size: 16px; margin-top: 4px; }
  .schema .niva { flex-basis: auto; }
  .schema tr::after { content: ""; order: 2; flex-basis: 100%; height: 0; }
  .schema .niva::after, .schema .alder::after { content: "·"; padding: 0 8px; }

  .stilar li { padding: 24px 0; }
  .stilar h3, .stilar li:nth-child(even) h3, .stilar li.sista h3 { grid-column: 1 / -1; text-align: left; grid-row: auto; }
  .stilar .om, .stilar li:nth-child(even) .om, .stilar li.sista .om { grid-column: 1 / -1; grid-row: auto; }
  .priser .langd { display: none; }
  .larare { grid-template-columns: 1fr; gap: 32px; }
  .larare li { display: grid; grid-template-columns: 112px 1fr; gap: 0 16px; align-content: start; }
  .larare li:nth-child(2) { margin-top: 0; }
  .larare img { grid-row: 1 / 5; margin: 0; }
  .larare h3 { font-size: 28px; }
  .show-bild img { aspect-ratio: 4 / 3; }
  .show-grid { padding-top: 32px; }
  .anm-kontakt .knapp { flex: 1 1 100%; }
  .fot-grid { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { transition: none !important; animation: none !important; }
}
</style>
</head>
<body>
<a class="hoppa" href="#innehall">Hoppa till innehåll</a>

<header>
  <div class="wrap">
    <a class="logga" href="#"><span class="logga-pre" data-slot="text" data-label="Namn – förled (sidhuvud)">Dansstudion</span><span class="logga-namn" data-slot="text" data-label="Namn – huvudord (sidhuvud)">Takt</span></a>
    <nav aria-label="Huvudmeny">
      <ul>
        <li><a href="#schema">Schema</a></li>
        <li><a href="#stilar">Stilar</a></li>
        <li><a href="#priser">Priser</a></li>
        <li><a href="#larare">Lärare</a></li>
        <li><a href="#varshow">Vårshow</a></li>
        <li><a href="#anmalan">Anmälan</a></li>
      </ul>
    </nav>
    <a class="ring" data-tel data-slot="text" data-label="Telefon (sidhuvud)" href="#">0980-31 92 47</a>
  </div>
</header>

<main id="innehall">
  <div class="hero">
    <div class="wrap hero-grid">
      <p class="etikett" data-slot="text" data-label="Hero – liten etikett">Dansskola i Kiruna · barn, unga och vuxna</p>
      <h1 data-slot="text" data-label="Hero – rubrik">Dans för alla åldrar i Kiruna</h1>
      <div class="hero-text">
        <p class="ingress" data-slot="text" data-label="Hero – ingress">Barndans från 3 år, jazz, hiphop och balett för barn och unga – och bugg för vuxna på kvällarna. Första lektionen är alltid gratis.</p>
        <div class="hero-knappar">
          <a class="knapp knapp-primar" href="#anmalan">Prova på gratis</a>
          <a class="knapp knapp-sek" href="#schema">Se schemat</a>
        </div>
        <ul class="snabb">
          <li><span class="etikett">Telefon</span><a data-tel data-slot="text" data-label="Telefon" href="#">0980-31 92 47</a></li>
          <li><span class="etikett">Telefontid</span><span data-slot="text" data-label="Hero – telefontid">mån–tor kl. 15–19</span></li>
          <li><span class="etikett">Adress</span><a data-map data-slot="text" data-label="Adress" href="#">Gruvvägen 8, Kiruna</a></li>
        </ul>
      </div>
      <figure class="hero-bild">
        <img data-slot="image" data-label="Hero – bild" src="${T(1200, 1020, Y1, FG, 'bild: elever mitt i ett hopp', 'sun')}" width="1200" height="1020" alt="Elever som dansar i den stora salen">
      </figure>
    </div>
  </div>

  <section id="schema" class="tonad" aria-labelledby="schema-rubrik">
    <div class="wrap">
      <div class="sek-huvud">
        <div>
          <p class="etikett" data-slot="text" data-label="Schema – etikett">Veckoschema hösttermin</p>
          <h2 id="schema-rubrik" data-slot="text" data-label="Schema – rubrik">Veckans lektioner</h2>
        </div>
        <p data-slot="text" data-label="Schema – ingress">Terminen är 14 veckor. Osäker på nivå? Välj nybörjare – det är enkelt att byta grupp efter första veckan.</p>
      </div>
      <table class="schema">
        <caption class="dold">Veckoschema med dag, tid, kurs, nivå, ålder och sal</caption>
        <thead>
          <tr><th scope="col">Dag</th><th scope="col">Tid</th><th scope="col">Kurs</th><th scope="col">Nivå</th><th scope="col">Ålder</th><th scope="col">Sal</th></tr>
        </thead>${schemaRader}
      </table>
      <div class="schema-not">
        <p data-slot="text" data-label="Schema – notering 1">Sal 1 och 2 ligger på plan 2, hiss finns.</p>
        <p data-slot="text" data-label="Schema – notering 2">Inga lektioner under höstlovet (v. 44).</p>
      </div>
    </div>
  </section>

  <section id="stilar" aria-labelledby="stilar-rubrik">
    <div class="wrap">
      <div class="sek-huvud">
        <div>
          <p class="etikett">Stilar</p>
          <h2 id="stilar-rubrik" data-slot="text" data-label="Stilar – rubrik">Fem sätt att dansa</h2>
        </div>
      </div>
      <ol class="stilar">
        <li>
          <h3 data-slot="text" data-label="Stil 1 – namn">Jazz</h3>
          <div class="om">
            <p class="etikett" data-slot="text" data-label="Stil 1 – ålder">Från 7 år</p>
            <p data-slot="text" data-label="Stil 1 – beskrivning">Snabba kombinationer, svängar och hopp till pop och musikal. Bra grund för all annan dans.</p>
          </div>
        </li>
        <li>
          <h3 data-slot="text" data-label="Stil 2 – namn">Hiphop</h3>
          <div class="om">
            <p class="etikett" data-slot="text" data-label="Stil 2 – ålder">Från 7 år</p>
            <p data-slot="text" data-label="Stil 2 – beskrivning">Grooves, koreografi och egen stil. Mycket fart, inga krav på att kunna något innan.</p>
          </div>
        </li>
        <li class="mindre">
          <h3 data-slot="text" data-label="Stil 3 – namn">Balett</h3>
          <div class="om">
            <p class="etikett" data-slot="text" data-label="Stil 3 – ålder">Från 7 år</p>
            <p data-slot="text" data-label="Stil 3 – beskrivning">Klassisk teknik vid stången och på golvet. Ger hållning, styrka och balans.</p>
          </div>
        </li>
        <li class="mindre">
          <h3 data-slot="text" data-label="Stil 4 – namn">Barndans</h3>
          <div class="om">
            <p class="etikett" data-slot="text" data-label="Stil 4 – ålder">3–7 år</p>
            <p data-slot="text" data-label="Stil 4 – beskrivning">Lek, rytm och rörelse. De allra minsta dansar tillsammans med en vuxen på lördagar.</p>
          </div>
        </li>
        <li class="mindre sista">
          <h3 data-slot="text" data-label="Stil 5 – namn">Bugg för vuxna</h3>
          <div class="om">
            <p class="etikett" data-slot="text" data-label="Stil 5 – ålder">Vuxna · par eller ensam</p>
            <p data-slot="text" data-label="Stil 5 – beskrivning">Kom med eller utan partner – vi roterar. Måndagar och torsdagar kl. 19.</p>
          </div>
        </li>
      </ol>
    </div>
  </section>

  <section id="priser" class="tonad" aria-labelledby="priser-rubrik">
    <div class="wrap">
      <div class="sek-huvud">
        <div>
          <p class="etikett">Priser</p>
          <h2 id="priser-rubrik" data-slot="text" data-label="Priser – rubrik">Terminsavgifter</h2>
        </div>
        <p data-slot="text" data-label="Priser – ingress">Faktura skickas efter andra lektionen. Hoppar du av innan dess betalar du ingenting.</p>
      </div>
      <div class="pris-grid">
        <div class="pris-tabell-wrap">
          <table class="priser">
            <thead>
              <tr><th scope="col">Kurs</th><th scope="col" class="langd">Längd</th><th scope="col" class="belopp">Per termin</th></tr>
            </thead>
            <tbody>
              <tr><th scope="row"><span data-slot="text" data-label="Pris 1 – kurs">Barndans</span><span class="not" data-slot="text" data-label="Pris 1 – omfattning">12 tillfällen</span></th><td class="langd" data-slot="text" data-label="Pris 1 – längd">45 min</td><td class="belopp" data-slot="text" data-label="Pris 1 – belopp">1 150 kr</td></tr>
              <tr><th scope="row"><span data-slot="text" data-label="Pris 2 – kurs">Jazz, hiphop, balett</span><span class="not" data-slot="text" data-label="Pris 2 – omfattning">14 tillfällen</span></th><td class="langd" data-slot="text" data-label="Pris 2 – längd">60 min</td><td class="belopp" data-slot="text" data-label="Pris 2 – belopp">1 550 kr</td></tr>
              <tr><th scope="row"><span data-slot="text" data-label="Pris 3 – kurs">Balett fortsättning</span><span class="not" data-slot="text" data-label="Pris 3 – omfattning">14 tillfällen</span></th><td class="langd" data-slot="text" data-label="Pris 3 – längd">90 min</td><td class="belopp" data-slot="text" data-label="Pris 3 – belopp">1 950 kr</td></tr>
              <tr><th scope="row"><span data-slot="text" data-label="Pris 4 – kurs">Bugg för vuxna</span><span class="not" data-slot="text" data-label="Pris 4 – omfattning">10 tillfällen, pris per person</span></th><td class="langd" data-slot="text" data-label="Pris 4 – längd">90 min</td><td class="belopp" data-slot="text" data-label="Pris 4 – belopp">1 400 kr</td></tr>
              <tr><th scope="row"><span data-slot="text" data-label="Pris 5 – kurs">Medlemsavgift</span><span class="not" data-slot="text" data-label="Pris 5 – omfattning">En gång per år och elev</span></th><td class="langd" data-slot="text" data-label="Pris 5 – längd">–</td><td class="belopp" data-slot="text" data-label="Pris 5 – belopp">200 kr</td></tr>
            </tbody>
          </table>
          <p class="liten" data-slot="text" data-label="Priser – notering">Vuxenkurserna går att betala med friskvårdsbidrag via Epassi och Benify.</p>
        </div>
        <div class="rabatt">
          <p class="etikett">Syskonrabatt</p>
          <p class="stor-siffra" data-slot="text" data-label="Rabatt – stor siffra">20 %</p>
          <h3 data-slot="text" data-label="Rabatt – rubrik">på syskon nummer två</h3>
          <ul class="rabatt-lista">
            <li><span data-slot="text" data-label="Rabatt 1 – villkor">Syskon nr 2</span><span data-slot="text" data-label="Rabatt 1 – rabatt">20 %</span></li>
            <li><span data-slot="text" data-label="Rabatt 2 – villkor">Syskon nr 3 och fler</span><span data-slot="text" data-label="Rabatt 2 – rabatt">40 %</span></li>
            <li><span data-slot="text" data-label="Rabatt 3 – villkor">Andra kursen, samma elev</span><span data-slot="text" data-label="Rabatt 3 – rabatt">25 %</span></li>
          </ul>
          <p class="liten" data-slot="text" data-label="Rabatt – notering">Rabatten dras på den billigaste kursen.</p>
        </div>
      </div>
    </div>
  </section>

  <section id="larare" aria-labelledby="larare-rubrik">
    <div class="wrap">
      <div class="sek-huvud">
        <div>
          <p class="etikett">Lärare</p>
          <h2 id="larare-rubrik" data-slot="text" data-label="Lärare – rubrik">De som håller i takten</h2>
        </div>
      </div>
      <ul class="larare">
        <li>
          <img data-slot="image" data-label="Lärare 1 – porträtt" src="${T(600, 750, Y2, FG, 'porträtt', 'arch')}" width="600" height="750" alt="Porträtt av Maja" loading="lazy">
          <h3 data-slot="text" data-label="Lärare 1 – namn">Maja</h3>
          <p class="stil" data-slot="text" data-label="Lärare 1 – stilar">Jazz · Balett</p>
          <p data-slot="text" data-label="Lärare 1 – om">Utbildad danspedagog. Har koll på varje elevs teknik och lika mycket koll på att det ska vara roligt.</p>
        </li>
        <li>
          <img data-slot="image" data-label="Lärare 2 – porträtt" src="${T(600, 750, Y1, FG, 'porträtt', 'arch')}" width="600" height="750" alt="Porträtt av Amir" loading="lazy">
          <h3 data-slot="text" data-label="Lärare 2 – namn">Amir</h3>
          <p class="stil" data-slot="text" data-label="Lärare 2 – stilar">Hiphop</p>
          <p data-slot="text" data-label="Lärare 2 – om">Har dansat street sedan tonåren och bygger koreografier som får även de blyga att våga.</p>
        </li>
        <li>
          <img data-slot="image" data-label="Lärare 3 – porträtt" src="${T(600, 750, Y2, FG, 'porträtt', 'arch')}" width="600" height="750" alt="Porträtt av Karin" loading="lazy">
          <h3 data-slot="text" data-label="Lärare 3 – namn">Karin</h3>
          <p class="stil" data-slot="text" data-label="Lärare 3 – stilar">Barndans · Bugg</p>
          <p data-slot="text" data-label="Lärare 3 – om">Lugn med de minsta på lördagar och peppig med vuxenbuggen på kvällarna.</p>
        </li>
      </ul>
    </div>
  </section>

  <div class="show" id="varshow">
    <figure class="show-bild">
      <img data-slot="image" data-label="Vårshow – stor bild" src="${T(2000, 860, Y3, FG, 'bild: vårshowen på scen', 'hills')}" width="2000" height="860" alt="Elever på scen under vårshowen" loading="lazy">
    </figure>
    <div class="wrap show-grid">
      <div class="show-rubrik">
        <p class="etikett">Vårshow</p>
        <h2 data-slot="text" data-label="Vårshow – rubrik">Varje vår står alla elever på scen</h2>
      </div>
      <div class="show-text">
        <p class="show-datum" data-slot="text" data-label="Vårshow – datum">Lördag 16 maj, kl. 14 och 17</p>
        <p class="dov" data-slot="text" data-label="Vårshow – plats">Folkets hus, Kiruna</p>
        <p data-slot="text" data-label="Vårshow – text">Alla grupper är med, från treåringarna till vuxenbuggen. Kostymer lånar ni av oss. Biljetter släpps i april: 120 kr, barn under 7 år går gratis.</p>
      </div>
    </div>
  </div>

  <section id="anmalan" class="anmalan" aria-labelledby="anmalan-rubrik">
    <div class="wrap anm-grid">
      <div class="anm-vanster">
        <p class="etikett">Anmälan</p>
        <h2 id="anmalan-rubrik" data-slot="text" data-label="Anmälan – rubrik">Prova en lektion gratis</h2>
        <ol class="anm-steg">
          <li><span data-slot="text" data-label="Anmälan steg 1">Mejla eller ring och säg vilken kurs du vill prova.</span></li>
          <li><span data-slot="text" data-label="Anmälan steg 2">Kom tio minuter innan i mjuka kläder, med vattenflaska.</span></li>
          <li><span data-slot="text" data-label="Anmälan steg 3">Gillar du det skriver vi in dig direkt efter lektionen.</span></li>
        </ol>
        <div class="anm-kontakt">
          <a class="knapp knapp-primar" data-mail data-slot="text" data-label="E-post (anmälan)" href="#">hej@dansstudiontakt.se</a>
          <a class="knapp knapp-sek" data-tel data-slot="text" data-label="Telefon (anmälan)" href="#">0980-31 92 47</a>
        </div>
      </div>
      <div class="anm-hoger">
        <div class="info">
          <p class="etikett">Telefontid</p>
          <dl class="tider">
            <dt data-slot="text" data-label="Telefontid – dagar 1">mån–tor</dt><dd data-slot="text" data-label="Telefontid – tid 1">kl. 15–19</dd>
            <dt data-slot="text" data-label="Telefontid – dagar 2">fre</dt><dd data-slot="text" data-label="Telefontid – tid 2">kl. 15–17</dd>
            <dt data-slot="text" data-label="Telefontid – dagar 3">lör–sön</dt><dd data-slot="text" data-label="Telefontid – tid 3">mejla oss</dd>
          </dl>
        </div>
        <div class="info">
          <p class="etikett">Hitta hit</p>
          <p><a class="lank" data-map data-slot="text" data-label="Adress (hitta hit)" href="#">Gruvvägen 8, 981 38 Kiruna</a></p>
          <p class="dov" data-slot="text" data-label="Hitta hit – vägbeskrivning">Ingång från gården, plan 2. Gratis parkering framför huset, buss 1 stannar vid Gruvvägen.</p>
        </div>
        <div class="info">
          <p class="etikett">Bra att veta</p>
          <p class="dov" data-slot="text" data-label="Bra att veta">Omklädningsrum med skåp. Föräldrar väntar gärna i kaféhörnan – dörren till salen är stängd under lektionen.</p>
        </div>
      </div>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <div class="fot-grid">
      <div>
        <p class="fot-namn" data-slot="text" data-label="Sidfot – namn">Dansstudion Takt</p>
      </div>
      <div>
        <p class="etikett">Adress</p>
        <p class="radbryt" data-slot="text" data-multiline data-label="Sidfot – adress">Gruvvägen 8
981 38 Kiruna</p>
      </div>
      <div>
        <p class="etikett">Telefontid</p>
        <p class="radbryt tal" data-slot="text" data-multiline data-label="Sidfot – telefontid">mån–tor kl. 15–19
fre kl. 15–17</p>
      </div>
      <div>
        <p class="etikett">Kontakt</p>
        <p><a data-tel data-slot="text" data-label="Sidfot – telefon" href="#">0980-31 92 47</a></p>
        <p><a data-mail data-slot="text" data-label="Sidfot – e-post" href="#">hej@dansstudiontakt.se</a></p>
      </div>
    </div>
    <div class="fot-botten">
      <span data-slot="text" data-label="Sidfot – copyright">© 2026 Dansstudion Takt</span>
      <span data-slot="text" data-label="Sidfot – org.nr">Org.nr 556000-0000</span>
    </div>
  </div>
</footer>
${window.siteJs}
</body>
</html>`;

  window.TEMPLATES.push({ id: 'dansskola', name: 'Dansskola', category: 'Utbildning & fritid', html });
})();
