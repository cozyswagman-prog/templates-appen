(function () {
  // Tatueringsstudio – "Mörkt galleri": nästan-svart varm bas, benvit text, en blodapelsin-
  // accent som används sparsamt; Playfair Display stort och redaktionellt, ui-monospace för
  // etiketter och detaljer; oregelbundet bildgalleri.
  const T = window.tone;
  const BG1 = '#2a241e', BG2 = '#221d18', BG3 = '#332b23', FG = '#ece4d6';

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nålstick Tattoo – tatueringsstudio i Malmö</title>
<meta name="description" content="Tatueringsstudio på Möllan i Malmö. Fineline, blackwork och traditionellt. Skicka en förfrågan med idé, placering och storlek.">
<style>
${window.fontCss('playfair')}
:root {
  --bg: #15120f; --yta: #1d1915; --linje: #3a322b; --text: #ece4d6; --dov: #a99e8d;
  --accent: #ee6a3c; --r: 2px;
  --serif: 'Playfair Display', Georgia, 'Times New Roman', serif;
  --mono: ui-monospace, 'SF Mono', Consolas, 'Liberation Mono', monospace;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { font-variant-numeric: lining-nums; background: var(--bg); color: var(--text); font-family: var(--serif); font-size: 18px; line-height: 1.6;
  -webkit-font-smoothing: antialiased; overflow-wrap: break-word; }
img { display: block; max-width: 100%; }
a { color: inherit; }
h1, h2, h3 { font-weight: 400; line-height: 1.1; text-wrap: balance; letter-spacing: -0.015em; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; border-radius: var(--r); }
.wrap { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.mono, .etikett { font-family: var(--mono); }
.etikett { font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--dov); }
.tal { font-variant-numeric: lining-nums tabular-nums; }
.hoppa { position: absolute; left: 16px; top: -64px; background: var(--text); color: var(--bg); padding: 12px 16px;
  font-family: var(--mono); font-size: 15px; z-index: 10; border-radius: var(--r); }
.hoppa:focus { top: 16px; }

/* Sidhuvud */
header { border-bottom: 1px solid var(--linje); }
header .wrap { display: flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 72px; }
.logga { font-size: 24px; text-decoration: none; letter-spacing: -0.01em; white-space: nowrap; }
nav ul { list-style: none; display: flex; gap: 32px; }
nav a { font-family: var(--mono); font-size: 14px; letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none;
  color: var(--dov); display: inline-flex; align-items: center; min-height: 44px; }
nav a:hover { color: var(--text); }
.knapp.ring { border: 1px solid var(--linje); color: var(--text); min-height: 44px; padding: 8px 16px; font-size: 14px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.knapp.ring:hover { border-color: var(--text); }
/* Smala telefoner: visa bara "Ring" – numret ligger kvar i texten så tel-länken stämmer */
@media (max-width: 400px) { .knapp.ring { font-size: 0; } .knapp.ring::before { content: "Ring"; font-size: 14px; } }

/* Knappar */
.knapp { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 12px 24px;
  font-family: var(--mono); font-size: 15px; letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none;
  border-radius: var(--r); transition: background-color .2s ease-out, color .2s ease-out; }
.knapp-primar { background: var(--accent); color: var(--bg); }
.knapp-primar:hover { background: var(--text); }
.knapp-text { color: var(--text); padding-left: 0; padding-right: 0; border-bottom: 1px solid var(--linje); border-radius: 0; min-height: 44px; }
.knapp-text:hover { border-color: var(--text); }

/* Hero */
.hero { padding: 64px 0 0; }
.hero-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 0 24px; align-items: end; }
.hero-text { grid-column: 1 / 9; padding-bottom: 48px; }
.hero h1 { font-size: clamp(52px, 9.4vw, 136px); line-height: 0.96; letter-spacing: -0.03em; margin: 24px 0 32px; }
.hero .ingress { max-width: 34em; font-size: 20px; color: var(--text); }
.hero-knappar { display: flex; flex-wrap: wrap; align-items: center; gap: 16px 32px; margin-top: 32px; }
.hero-bild { grid-column: 9 / 13; padding-bottom: 48px; }
.hero-bild img { width: 100%; height: auto; aspect-ratio: 4 / 5; object-fit: cover; border-radius: var(--r); }
.hero-bild figcaption { margin-top: 12px; }
.fakta { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--linje); }
.fakta > div { padding: 24px 24px 24px 0; }
.fakta > div + div { border-left: 1px solid var(--linje); padding-left: 24px; }
.fakta dt { margin-bottom: 8px; }
.fakta dd { font-family: var(--mono); font-size: 16px; line-height: 1.5; }
.fakta dd a { text-decoration: none; border-bottom: 1px solid var(--linje); }
.fakta dd a:hover { border-color: var(--accent); }

/* Sektioner */
section { padding: 96px 0; border-top: 1px solid var(--linje); }
.sek-huvud { display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px; align-items: end; margin-bottom: 48px; }
.sek-huvud .etikett { grid-column: 1 / 4; }
.sek-huvud h2 { grid-column: 4 / 11; font-size: clamp(40px, 6vw, 80px); line-height: 1; letter-spacing: -0.025em; }
.sek-huvud p.dov { grid-column: 4 / 11; color: var(--dov); max-width: 36em; }
.dov { color: var(--dov); }

/* Galleri */
.galleri { display: grid; grid-template-columns: repeat(6, 1fr); grid-auto-rows: 104px; gap: 12px; }
.galleri figure { position: relative; overflow: hidden; border-radius: var(--r); background: var(--yta); }
.galleri img { width: 100%; height: 100%; object-fit: cover; }
.galleri figcaption { position: absolute; left: 0; top: 0; background: var(--bg); color: var(--text);
  font-family: var(--mono); font-size: 13px; letter-spacing: 0.04em; padding: 8px 12px; max-width: 100%; }
.g1 { grid-column: 1 / 4; grid-row: 1 / 5; }
.g2 { grid-column: 4 / 6; grid-row: 1 / 3; }
.g3 { grid-column: 6 / 7; grid-row: 1 / 3; }
.g4 { grid-column: 4 / 7; grid-row: 3 / 5; }
.g5 { grid-column: 1 / 3; grid-row: 5 / 9; }
.g6 { grid-column: 3 / 7; grid-row: 5 / 7; }
.g7 { grid-column: 3 / 5; grid-row: 7 / 9; }
.g8 { grid-column: 5 / 7; grid-row: 7 / 9; }

/* Artister */
.artister { list-style: none; border-bottom: 1px solid var(--linje); }
.artist { display: grid; grid-template-columns: 160px 1fr 1fr; gap: 32px; padding: 32px 0; border-top: 1px solid var(--linje); align-items: start; }
.artist img { width: 100%; height: auto; aspect-ratio: 4 / 5; object-fit: cover; border-radius: var(--r); }
.artist h3 { font-size: clamp(36px, 4.4vw, 56px); letter-spacing: -0.02em; margin-bottom: 12px; }
.artist .stil { font-family: var(--mono); font-size: 15px; letter-spacing: 0.04em; color: var(--text); }
.artist .bio { color: var(--text); margin-bottom: 16px; max-width: 32em; }
.artist .vantetid { font-family: var(--mono); font-size: 14px; color: var(--dov); }

/* Så bokar du */
.boka-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px; }
.steg { grid-column: 4 / 13; list-style: none; counter-reset: steg; }
.steg li { counter-increment: steg; display: grid; grid-template-columns: 64px 1fr; gap: 0 24px; padding: 24px 0; border-top: 1px solid var(--linje); }
.steg li::before { content: counter(steg, decimal-leading-zero); font-family: var(--mono); font-size: 15px; color: var(--dov); padding-top: 8px; grid-row: 1 / 3; }
.steg h3 { font-size: 28px; margin-bottom: 8px; }
.steg p { color: var(--dov); max-width: 36em; }
.forfragan { grid-column: 4 / 13; margin-top: 48px; padding: 48px; background: var(--yta); border-radius: var(--r); }
.forfragan .stor-mejl { display: inline-block; font-size: clamp(30px, 5vw, 64px); line-height: 1.15; letter-spacing: -0.02em;
  text-decoration: underline; text-decoration-color: var(--accent); text-decoration-thickness: 2px; text-underline-offset: 8px;
  margin: 16px 0 24px; overflow-wrap: anywhere; }
.forfragan .stor-mejl:hover { color: var(--accent); }
.forfragan p.dov { max-width: 36em; }

/* Priser och eftervård */
.tva { display: grid; grid-template-columns: repeat(12, 1fr); gap: 48px 24px; }
.priser { grid-column: 1 / 7; }
.eftervard { grid-column: 8 / 13; }
.tva h2 { font-size: clamp(40px, 5vw, 64px); letter-spacing: -0.025em; margin: 16px 0 32px; }
table { width: 100%; border-collapse: collapse; }
.pristabell th, .pristabell td { text-align: left; vertical-align: top; padding: 16px 0; border-top: 1px solid var(--linje); }
.pristabell tr:last-child th, .pristabell tr:last-child td { border-bottom: 1px solid var(--linje); }
.pristabell th { font-weight: 400; }
.pristabell th span { display: block; }
.pristabell .namn { font-size: 22px; }
.pristabell .not { font-family: var(--mono); font-size: 14px; color: var(--dov); margin-top: 4px; }
.pristabell td { font-family: var(--mono); font-size: 18px; text-align: right; white-space: nowrap; padding-left: 24px; font-variant-numeric: tabular-nums; }
.liten { font-family: var(--mono); font-size: 14px; color: var(--dov); margin-top: 16px; line-height: 1.6; }
.eftervard ol { list-style: none; counter-reset: ev; }
.eftervard li { counter-increment: ev; position: relative; padding: 12px 0 12px 40px; border-top: 1px solid var(--linje); }
.eftervard li::before { content: counter(ev); position: absolute; left: 0; top: 14px; font-family: var(--mono); font-size: 14px; color: var(--dov); }

/* Hitta hit */
.hitta { display: grid; grid-template-columns: repeat(12, 1fr); gap: 48px 24px; }
.hitta > div:nth-child(1) { grid-column: 1 / 5; }
.hitta > div:nth-child(2) { grid-column: 6 / 9; }
.hitta > div:nth-child(3) { grid-column: 9 / 13; }
.hitta h2 { font-size: 32px; margin: 16px 0 24px; }
.tider { display: grid; grid-template-columns: auto 1fr; gap: 0; font-family: var(--mono); font-size: 16px; }
.tider dt, .tider dd { padding: 12px 0; border-top: 1px solid var(--linje); font-variant-numeric: tabular-nums; }
.tider dd { text-align: right; padding-left: 24px; }
.hitta p { max-width: 30em; }
.hitta a.lank { text-decoration: none; border-bottom: 1px solid var(--accent); }
.hitta .rad { margin-bottom: 16px; }

/* Sidfot */
footer { border-top: 1px solid var(--linje); padding: 64px 0 32px; }
.fot-namn { font-size: clamp(48px, 10vw, 144px); line-height: 0.9; letter-spacing: -0.035em; margin-bottom: 48px; }
.fot-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; font-family: var(--mono); font-size: 15px; line-height: 1.7; }
.fot-grid p, .fot-grid a { color: var(--dov); }
.fot-grid a { text-decoration: none; }
.fot-grid a:hover { color: var(--text); }
.fot-grid .etikett { margin-bottom: 8px; }
.fot-botten { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 24px; margin-top: 48px; padding-top: 24px;
  border-top: 1px solid var(--linje); font-family: var(--mono); font-size: 13px; color: var(--dov); }
.radbryt { white-space: pre-line; }

@media (max-width: 960px) {
  nav { display: none; }
  .hero h1 { font-size: clamp(56px, 12vw, 112px); }
  .hero-text { grid-column: 1 / -1; }
  .hero-bild { grid-column: 1 / -1; order: 3; padding: 0 0 48px; }
  .hero-bild img { aspect-ratio: 16 / 10; }
  .fakta { order: 2; grid-template-columns: 1fr 1fr; margin-bottom: 48px; }
  .fakta > div:nth-child(3) { border-left: 0; padding-left: 0; }
  .fakta > div:nth-child(n+3) { border-top: 1px solid var(--linje); }
  .sek-huvud .etikett, .sek-huvud h2, .sek-huvud p.dov { grid-column: 1 / -1; }
  .artist { grid-template-columns: 160px 1fr; }
  .artist .om { grid-column: 2; }
  .steg, .forfragan { grid-column: 1 / -1; }
  .priser, .eftervard { grid-column: 1 / -1; }
  .hitta > div:nth-child(n) { grid-column: 1 / -1; }
  .hitta > div:nth-child(1), .hitta > div:nth-child(2) { grid-column: span 6; }
  .fot-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 720px) {
  body { font-size: 17px; }
  .wrap { padding: 0 16px; }
  header .wrap { min-height: 64px; }
  .hero { padding-top: 32px; }
  .hero h1 { margin: 16px 0 24px; }
  .hero .ingress { font-size: 18px; }
  .hero-bild img { aspect-ratio: 4 / 3; }
  .fakta { grid-template-columns: 1fr; }
  .fakta > div, .fakta > div + div { border-left: 0; padding: 16px 0; }
  .fakta > div + div { border-top: 1px solid var(--linje); }
  section { padding: 64px 0; }
  .sek-huvud { margin-bottom: 32px; gap: 16px; }
  .galleri { grid-template-columns: 1fr 1fr; grid-auto-rows: 120px; gap: 8px; }
  .g1 { grid-column: 1 / 3; grid-row: span 2; }
  .g2, .g3 { grid-column: span 1; grid-row: span 2; }
  .g4 { grid-column: 1 / 3; grid-row: span 2; }
  .g5 { grid-column: 1 / 2; grid-row: span 4; }
  .g6, .g7 { grid-column: 2 / 3; grid-row: span 2; }
  .g8 { grid-column: 1 / 3; grid-row: span 2; }
  .galleri figcaption { font-size: 12px; padding: 4px 8px; }
  .artist { grid-template-columns: 96px 1fr; gap: 16px 24px; padding: 24px 0; }
  .artist .om { grid-column: 1 / -1; }
  .steg li { grid-template-columns: 40px 1fr; gap: 0 12px; }
  .steg h3 { font-size: 24px; }
  .forfragan { padding: 32px 24px; }
  .forfragan .stor-mejl { text-underline-offset: 6px; }
  .pristabell .namn { font-size: 20px; }
  .pristabell td { font-size: 16px; padding-left: 16px; }
  .hitta > div:nth-child(1), .hitta > div:nth-child(2) { grid-column: 1 / -1; }
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
    <a class="logga" href="#" data-slot="text" data-label="Studions namn (sidhuvud)">Nålstick Tattoo</a>
    <nav aria-label="Huvudmeny">
      <ul>
        <li><a href="#galleri">Galleri</a></li>
        <li><a href="#artister">Artister</a></li>
        <li><a href="#boka">Boka</a></li>
        <li><a href="#priser">Priser</a></li>
        <li><a href="#hitta">Hitta hit</a></li>
      </ul>
    </nav>
    <a class="knapp ring" data-tel data-slot="text" data-label="Telefon (sidhuvud)" href="#">040-628 04 92</a>
  </div>
</header>

<main id="innehall">
  <div class="hero">
    <div class="wrap hero-grid">
      <div class="hero-text">
        <p class="etikett" data-slot="text" data-label="Hero – liten etikett">Tatueringsstudio · Möllan, Malmö</p>
        <h1 data-slot="text" data-label="Hero – rubrik">Tatueringar på Möllan i Malmö</h1>
        <p class="ingress" data-slot="text" data-label="Hero – ingress">Tre artister, en lugn studio och egna skisser till varje kund. Fineline, blackwork och traditionellt – från små motiv till hela ärmar.</p>
        <div class="hero-knappar">
          <a class="knapp knapp-primar" href="#boka">Skicka förfrågan</a>
          <a class="knapp knapp-text" href="#galleri">Se galleriet</a>
        </div>
      </div>
      <figure class="hero-bild">
        <img data-slot="image" data-label="Hero – bild" src="${T(800, 1000, BG1, FG, 'bild: pågående tatuering', 'arch')}" width="800" height="1000" alt="Tatuering pågår i studion">
        <figcaption class="etikett" data-slot="text" data-label="Hero – bildtext">Studion, Bergsgatan 18</figcaption>
      </figure>
      <dl class="fakta">
        <div>
          <dt class="etikett">Telefon</dt>
          <dd><a data-tel data-slot="text" data-label="Telefon" href="#">040-628 04 92</a></dd>
        </div>
        <div>
          <dt class="etikett">Öppet</dt>
          <dd class="tal" data-slot="text" data-label="Hero – öppettider kort">tis–lör kl. 11–19</dd>
        </div>
        <div>
          <dt class="etikett">Adress</dt>
          <dd><a data-map data-slot="text" data-label="Adress" href="#">Bergsgatan 18, Malmö</a></dd>
        </div>
        <div>
          <dt class="etikett">Ålder</dt>
          <dd data-slot="text" data-label="Hero – åldersgräns">18 år och legitimation</dd>
        </div>
      </dl>
    </div>
  </div>

  <section id="galleri" aria-labelledby="galleri-rubrik">
    <div class="wrap">
      <div class="sek-huvud">
        <p class="etikett">01 — Galleri</p>
        <h2 id="galleri-rubrik" data-slot="text" data-label="Galleri – rubrik">Nyligen gjort i studion</h2>
      </div>
      <div class="galleri">
        <figure class="g1"><img data-slot="image" data-label="Galleri – bild 1 (stor)" src="${T(900, 900, BG1, FG, 'bild: ärm i blackwork', 'circle')}" width="900" height="900" alt="Ärm i blackwork" loading="lazy"><figcaption data-slot="text" data-label="Galleri – bildtext 1">Blackwork · underarm</figcaption></figure>
        <figure class="g2"><img data-slot="image" data-label="Galleri – bild 2" src="${T(600, 440, BG2, FG, 'bild: fineline', 'none')}" width="600" height="440" alt="Fineline-tatuering" loading="lazy"><figcaption data-slot="text" data-label="Galleri – bildtext 2">Fineline · nyckelben</figcaption></figure>
        <figure class="g3"><img data-slot="image" data-label="Galleri – bild 3" src="${T(300, 440, BG3, FG, 'bild: detalj', 'arch')}" width="300" height="440" alt="Detalj av tatuering" loading="lazy"><figcaption data-slot="text" data-label="Galleri – bildtext 3">Dotwork</figcaption></figure>
        <figure class="g4"><img data-slot="image" data-label="Galleri – bild 4" src="${T(900, 440, BG2, FG, 'bild: traditionellt motiv', 'sun')}" width="900" height="440" alt="Traditionell tatuering i färg" loading="lazy"><figcaption data-slot="text" data-label="Galleri – bildtext 4">Traditionellt · vad</figcaption></figure>
        <figure class="g5"><img data-slot="image" data-label="Galleri – bild 5 (hög)" src="${T(600, 900, BG3, FG, 'bild: rygg', 'grid')}" width="600" height="900" alt="Större arbete på ryggen" loading="lazy"><figcaption data-slot="text" data-label="Galleri – bildtext 5">Blackwork · rygg</figcaption></figure>
        <figure class="g6"><img data-slot="image" data-label="Galleri – bild 6 (bred)" src="${T(1200, 440, BG1, FG, 'bild: skissbordet', 'hills')}" width="1200" height="440" alt="Skisser på arbetsbordet" loading="lazy"><figcaption data-slot="text" data-label="Galleri – bildtext 6">Skisser inför veckan</figcaption></figure>
        <figure class="g7"><img data-slot="image" data-label="Galleri – bild 7" src="${T(600, 440, BG2, FG, 'bild: liten tatuering', 'circle')}" width="600" height="440" alt="Liten tatuering på handleden" loading="lazy"><figcaption data-slot="text" data-label="Galleri – bildtext 7">Minimotiv · handled</figcaption></figure>
        <figure class="g8"><img data-slot="image" data-label="Galleri – bild 8" src="${T(600, 440, BG1, FG, 'bild: studion', 'arch')}" width="600" height="440" alt="Studion inifrån" loading="lazy"><figcaption data-slot="text" data-label="Galleri – bildtext 8">Studion</figcaption></figure>
      </div>
    </div>
  </section>

  <section id="artister" aria-labelledby="artister-rubrik">
    <div class="wrap">
      <div class="sek-huvud">
        <p class="etikett">02 — Artister</p>
        <h2 id="artister-rubrik" data-slot="text" data-label="Artister – rubrik">Tre artister, tre handstilar</h2>
        <p class="dov" data-slot="text" data-label="Artister – ingress">Skriv gärna vem du vill gå till i din förfrågan. Vet du inte – beskriv stilen så matchar vi.</p>
      </div>
      <ul class="artister">
        <li class="artist">
          <img data-slot="image" data-label="Artist 1 – porträtt" src="${T(400, 500, BG3, FG, 'porträtt', 'arch')}" width="400" height="500" alt="Porträtt av Elin" loading="lazy">
          <div>
            <h3 data-slot="text" data-label="Artist 1 – namn">Elin</h3>
            <p class="stil" data-slot="text" data-label="Artist 1 – stilar">Fineline · Botaniskt</p>
          </div>
          <div class="om">
            <p class="bio" data-slot="text" data-label="Artist 1 – om">Tunna linjer, växter och små motiv som håller sig skarpa över tid. Ritar varje skiss från grunden.</p>
            <p class="vantetid" data-slot="text" data-label="Artist 1 – väntetid">Väntetid ca 4–6 veckor</p>
          </div>
        </li>
        <li class="artist">
          <img data-slot="image" data-label="Artist 2 – porträtt" src="${T(400, 500, BG1, FG, 'porträtt', 'arch')}" width="400" height="500" alt="Porträtt av Jonas" loading="lazy">
          <div>
            <h3 data-slot="text" data-label="Artist 2 – namn">Jonas</h3>
            <p class="stil" data-slot="text" data-label="Artist 2 – stilar">Blackwork · Ornamentalt</p>
          </div>
          <div class="om">
            <p class="bio" data-slot="text" data-label="Artist 2 – om">Mättat svart, mönster och större arbeten över flera sessioner. Tar gärna täckningar av gamla tatueringar.</p>
            <p class="vantetid" data-slot="text" data-label="Artist 2 – väntetid">Väntetid ca 2–3 månader</p>
          </div>
        </li>
        <li class="artist">
          <img data-slot="image" data-label="Artist 3 – porträtt" src="${T(400, 500, BG2, FG, 'porträtt', 'arch')}" width="400" height="500" alt="Porträtt av Sara" loading="lazy">
          <div>
            <h3 data-slot="text" data-label="Artist 3 – namn">Sara</h3>
            <p class="stil" data-slot="text" data-label="Artist 3 – stilar">Traditionellt · Färg</p>
          </div>
          <div class="om">
            <p class="bio" data-slot="text" data-label="Artist 3 – om">Klassiska motiv med tydliga konturer och klara färger. Har ofta färdiga flash-motiv till minipris.</p>
            <p class="vantetid" data-slot="text" data-label="Artist 3 – väntetid">Väntetid ca 2–4 veckor</p>
          </div>
        </li>
      </ul>
    </div>
  </section>

  <section id="boka" aria-labelledby="boka-rubrik">
    <div class="wrap">
      <div class="sek-huvud">
        <p class="etikett">03 — Boka</p>
        <h2 id="boka-rubrik" data-slot="text" data-label="Boka – rubrik">Så bokar du</h2>
      </div>
      <div class="boka-grid">
        <ol class="steg">
          <li>
            <h3 data-slot="text" data-label="Steg 1 – rubrik">Mejla din idé</h3>
            <p data-slot="text" data-label="Steg 1 – text">Beskriv motivet, var på kroppen det ska sitta och ungefär hur stort (i cm). Bifoga gärna referensbilder och skriv vilken artist du önskar.</p>
          </li>
          <li>
            <h3 data-slot="text" data-label="Steg 2 – rubrik">Vi svarar med förslag</h3>
            <p data-slot="text" data-label="Steg 2 – text">Inom tre vardagar får du svar med prisuppskattning och lediga tider. Större arbeten börjar med ett kort samtal i studion.</p>
          </li>
          <li>
            <h3 data-slot="text" data-label="Steg 3 – rubrik">Handpenning bokar tiden</h3>
            <p data-slot="text" data-label="Steg 3 – text">500 kr via Swish. Den dras av från slutpriset. Flyttar du senast 48 timmar innan följer handpenningen med till den nya tiden.</p>
          </li>
          <li>
            <h3 data-slot="text" data-label="Steg 4 – rubrik">18 år och legitimation</h3>
            <p data-slot="text" data-label="Steg 4 – text">Vi tatuerar inte någon under 18 år, inte heller med målsmans godkännande. Ta med giltig legitimation, ät ordentligt och sov gott natten innan.</p>
          </li>
        </ol>
        <div class="forfragan">
          <p class="etikett" data-slot="text" data-label="Förfrågan – etikett">Skicka förfrågan till</p>
          <a class="stor-mejl" data-mail data-slot="text" data-label="E-post" href="#">hej@nalstick.se</a>
          <p class="dov" data-slot="text" data-label="Förfrågan – text">Vi tar inte bokningar via telefon eller sociala medier – mejlet gör att inget faller mellan stolarna. Drop-in endast när det står på dörren.</p>
        </div>
      </div>
    </div>
  </section>

  <section id="priser" aria-labelledby="priser-rubrik">
    <div class="wrap tva">
      <div class="priser">
        <p class="etikett">04 — Priser</p>
        <h2 id="priser-rubrik" data-slot="text" data-label="Priser – rubrik">Vad det kostar</h2>
        <table class="pristabell">
          <tbody>
            <tr>
              <th scope="row"><span class="namn" data-slot="text" data-label="Pris 1 – namn">Minipris</span><span class="not" data-slot="text" data-label="Pris 1 – beskrivning">Små motiv upp till ca 5 cm</span></th>
              <td data-slot="text" data-label="Pris 1 – belopp">900 kr</td>
            </tr>
            <tr>
              <th scope="row"><span class="namn" data-slot="text" data-label="Pris 2 – namn">Timpris</span><span class="not" data-slot="text" data-label="Pris 2 – beskrivning">Debiteras per påbörjad halvtimme</span></th>
              <td data-slot="text" data-label="Pris 2 – belopp">1 400 kr/tim</td>
            </tr>
            <tr>
              <th scope="row"><span class="namn" data-slot="text" data-label="Pris 3 – namn">Dagssession</span><span class="not" data-slot="text" data-label="Pris 3 – beskrivning">Ca 6 timmar, för större arbeten</span></th>
              <td data-slot="text" data-label="Pris 3 – belopp">7 500 kr</td>
            </tr>
            <tr>
              <th scope="row"><span class="namn" data-slot="text" data-label="Pris 4 – namn">Handpenning</span><span class="not" data-slot="text" data-label="Pris 4 – beskrivning">Dras av från slutpriset</span></th>
              <td data-slot="text" data-label="Pris 4 – belopp">500 kr</td>
            </tr>
          </tbody>
        </table>
        <p class="liten" data-slot="text" data-label="Priser – notering">Kort och Swish. Skiss ingår. Priset bekräftas alltid innan vi börjar.</p>
      </div>
      <div class="eftervard">
        <p class="etikett">05 — Eftervård</p>
        <h2 data-slot="text" data-label="Eftervård – rubrik">När du kommit hem</h2>
        <ol>
          <li data-slot="text" data-label="Eftervård 1">Låt skyddsfilmen sitta i 3–5 dygn, ta sedan av den i duschen.</li>
          <li data-slot="text" data-label="Eftervård 2">Tvätta varsamt med parfymfri tvål och ljummet vatten.</li>
          <li data-slot="text" data-label="Eftervård 3">Ett tunt lager salva två–tre gånger om dagen i två veckor.</li>
          <li data-slot="text" data-label="Eftervård 4">Inget bad, bastu, gym eller sol på fyra veckor.</li>
        </ol>
        <p class="liten" data-slot="text" data-label="Eftervård – notering">Undrar du något under läkningen? Mejla en bild, så svarar artisten.</p>
      </div>
    </div>
  </section>

  <section id="hitta" aria-labelledby="hitta-rubrik">
    <div class="wrap">
      <div class="sek-huvud">
        <p class="etikett">06 — Hitta hit</p>
        <h2 id="hitta-rubrik" data-slot="text" data-label="Hitta hit – rubrik">Mitt på Möllan</h2>
      </div>
      <div class="hitta">
        <div>
          <p class="etikett">Öppettider</p>
          <dl class="tider">
            <dt data-slot="text" data-label="Öppettider – dagar 1">tis–fre</dt><dd data-slot="text" data-label="Öppettider – tid 1">kl. 11–19</dd>
            <dt data-slot="text" data-label="Öppettider – dagar 2">lör</dt><dd data-slot="text" data-label="Öppettider – tid 2">kl. 11–16</dd>
            <dt data-slot="text" data-label="Öppettider – dagar 3">sön–mån</dt><dd data-slot="text" data-label="Öppettider – tid 3">stängt</dd>
          </dl>
          <p class="liten" data-slot="text" data-label="Öppettider – notering">Endast bokade tider. Ring eller mejla innan du kommer förbi.</p>
        </div>
        <div>
          <p class="etikett">Adress</p>
          <p class="rad" style="margin-top:12px"><a class="lank" data-map data-slot="text" data-label="Adress (hitta hit)" href="#">Bergsgatan 18, 214 22 Malmö</a></p>
          <p class="dov" data-slot="text" data-label="Hitta hit – kollektivtrafik">Buss 1, 5 och 7 till Möllevångstorget, två minuters promenad. Cykelställ på gården.</p>
        </div>
        <div>
          <p class="etikett">Kontakt</p>
          <p class="rad" style="margin-top:12px"><a class="lank tal" data-tel data-slot="text" data-label="Telefon (hitta hit)" href="#">040-628 04 92</a></p>
          <p class="rad"><a class="lank" data-mail data-slot="text" data-label="E-post (hitta hit)" href="#">hej@nalstick.se</a></p>
          <p class="dov" data-slot="text" data-label="Kontakt – notering">Telefonen är öppen under öppettiderna. Vi svarar inte när vi tatuerar – lämna gärna ett sms.</p>
        </div>
      </div>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <p class="fot-namn" data-slot="text" data-label="Sidfot – studions namn">Nålstick</p>
    <div class="fot-grid">
      <div>
        <p class="etikett">Studion</p>
        <p class="radbryt" data-slot="text" data-multiline data-label="Sidfot – adress">Nålstick Tattoo
Bergsgatan 18
214 22 Malmö</p>
      </div>
      <div>
        <p class="etikett">Öppet</p>
        <p class="radbryt tal" data-slot="text" data-multiline data-label="Sidfot – öppettider">tis–fre kl. 11–19
lör kl. 11–16
sön–mån stängt</p>
      </div>
      <div>
        <p class="etikett">Kontakt</p>
        <p><a data-tel data-slot="text" data-label="Sidfot – telefon" href="#">040-628 04 92</a></p>
        <p><a data-mail data-slot="text" data-label="Sidfot – e-post" href="#">hej@nalstick.se</a></p>
      </div>
      <div>
        <p class="etikett">Bra att veta</p>
        <p class="radbryt" data-slot="text" data-multiline data-label="Sidfot – bra att veta">18-årsgräns
Kort och Swish
Handpenning 500 kr</p>
      </div>
    </div>
    <div class="fot-botten">
      <span data-slot="text" data-label="Sidfot – copyright">© 2026 Nålstick Tattoo</span>
      <span data-slot="text" data-label="Sidfot – org.nr">Org.nr 556000-0000</span>
    </div>
  </div>
</footer>
${window.siteJs}
</body>
</html>`;

  window.TEMPLATES.push({ id: 'tatuering', name: 'Tatueringsstudio', category: 'Kreativt', html });
})();
