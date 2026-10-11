(function () {
  // Hunddagis & hundfrisör – riktning: varm och lekfull men vuxen. Krämvit bas,
  // kakaobrun text, en senapsgul accent som yta/knapp med mörk text, Outfit + Inter,
  // runda och välvda bildbeskärningar, tidslinje över dagen och tydliga pristabeller.
  const tone = window.tone;
  const paw = `<svg class="paw" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><ellipse cx="6" cy="9.5" rx="2.1" ry="2.7"/><ellipse cx="10" cy="5.6" rx="2.1" ry="2.8"/><ellipse cx="14.6" cy="5.6" rx="2.1" ry="2.8"/><ellipse cx="18.4" cy="9.6" rx="2.1" ry="2.7"/><path d="M12.3 11.4c-3 0-6.3 3.9-6.3 6.6 0 1.9 1.5 2.6 3 2.6 1.4 0 2.2-.7 3.3-.7s1.9.7 3.3.7c1.5 0 3-.7 3-2.6 0-2.7-3.3-6.6-6.3-6.6z"/></svg>`;
  const check = `<svg class="check" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="11"/><path d="M7 12.4l3.2 3.1L17 8.7"/></svg>`;

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tassebo – hunddagis och hundfrisör utanför Västerås</title>
<meta name="description" content="Hunddagis och hundfrisör strax utanför Västerås. Små grupper, skogspromenader och inhägnad rastgård. Öppet mån–fre kl. 07–18.">
<style>
${window.fontCss('outfit', 'inter')}
  :root {
    --paper: #fbf7f0;
    --paper-2: #f3eadb;
    --ink: #3a281d;
    --ink-2: #6b5546;
    --line: #e3d5c1;
    --accent: #e2ae3f;
    --accent-hover: #d39d2c;
    --r: 12px;
    --wrap: 1160px;
  }
  *, *::before, *::after { box-sizing: border-box; }
  * { margin: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 17px; line-height: 1.6;
    color: var(--ink); background: var(--paper); -webkit-font-smoothing: antialiased; }
  img { display: block; max-width: 100%; height: auto; }
  a { color: inherit; }
  h1, h2, h3 { font-family: 'Outfit', system-ui, sans-serif; font-weight: 700; line-height: 1.12; letter-spacing: -0.015em; text-wrap: balance; }
  h1 { font-size: clamp(38px, 6vw, 64px); }
  h2 { font-size: clamp(30px, 4vw, 44px); }
  h3 { font-size: 21px; line-height: 1.25; letter-spacing: -0.005em; }
  p { text-wrap: pretty; }
  .wrap { max-width: var(--wrap); margin: 0 auto; padding: 0 24px; }
  .eyebrow { font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-2); margin-bottom: 16px; }
  .num { font-variant-numeric: tabular-nums; }

  .skip { position: absolute; left: 16px; top: -64px; z-index: 10; background: var(--ink); color: var(--paper);
    padding: 12px 16px; border-radius: var(--r); text-decoration: none; font-weight: 600; }
  .skip:focus { top: 16px; }
  :focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; border-radius: 4px; }
  .dark :focus-visible { outline-color: var(--accent); }

  /* Knappar: en primär (senap) och en sekundär (kontur) */
  .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 12px 24px;
    border-radius: var(--r); font-weight: 600; font-size: 17px; text-decoration: none; line-height: 1.2;
    transition: background-color .18s ease-out, transform .18s ease-out; }
  .btn-primary { background: var(--accent); color: var(--ink); }
  .btn-primary:hover { background: var(--accent-hover); }
  .btn-primary:active { transform: translateY(1px); }
  .btn-ghost { border: 1px solid var(--ink); color: var(--ink); }
  .btn-ghost:hover { background: var(--paper-2); }

  /* Sidhuvud */
  .top { border-bottom: 1px solid var(--line); background: var(--paper); }
  .top-in { display: flex; align-items: center; gap: 16px; min-height: 72px; }
  .brand { display: inline-flex; align-items: center; gap: 8px; text-decoration: none; font-family: 'Outfit', sans-serif;
    font-weight: 700; font-size: 24px; letter-spacing: -0.02em; min-height: 44px; }
  .paw { fill: var(--accent); flex: none; }
  .top nav { display: none; margin-left: auto; }
  .menu { display: flex; list-style: none; padding: 0; gap: 24px; }
  .menu a { display: inline-flex; align-items: center; min-height: 44px; text-decoration: none; font-size: 16px; font-weight: 500; }
  .menu a:hover { text-decoration: underline; text-underline-offset: 6px; text-decoration-thickness: 2px; text-decoration-color: var(--accent); }
  .top-call { margin-left: auto; display: inline-flex; align-items: center; min-height: 44px; padding: 8px 16px;
    border: 1px solid var(--ink); border-radius: var(--r); font-weight: 600; font-size: 16px; text-decoration: none;
    font-variant-numeric: tabular-nums; white-space: nowrap; }
  .top-call::before, .call-pre::before { content: "Ring\\00a0"; font-weight: 400; }
  .top-call:hover { background: var(--paper-2); }
  .top-book { display: none; }

  /* Hero */
  .hero { padding: 48px 0 64px; }
  .hero-grid { display: grid; gap: 48px; }
  .hero h1 { margin-bottom: 24px; max-width: 14ch; }
  .lead { font-size: 19px; color: var(--ink-2); max-width: 44ch; margin-bottom: 32px; }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 48px; }
  .facts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; border-top: 1px solid var(--line); padding-top: 24px; max-width: 520px; }
  .facts dt { font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-2); margin-bottom: 4px; }
  .facts dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; }
  .facts a { display: inline-flex; align-items: center; min-height: 44px; margin-top: -10px; margin-bottom: -10px; text-underline-offset: 4px; }
  .hero-media { position: relative; padding-bottom: 32px; width: 100%; max-width: 520px; margin-left: auto; }
  .arch { width: 100%; max-width: 520px; aspect-ratio: 4 / 5; object-fit: cover; border-radius: 999px 999px var(--r) var(--r); }
  .bubble { position: absolute; left: -8px; bottom: 0; width: 38%; max-width: 200px; aspect-ratio: 1; object-fit: cover;
    border-radius: 50%; border: 8px solid var(--paper); }

  /* Sektioner */
  .sec { padding: 64px 0; }
  .sec-head { max-width: 640px; margin-bottom: 48px; }
  .sec-head p:not(.eyebrow) { color: var(--ink-2); margin-top: 16px; }
  .tint { background: var(--paper-2); }

  /* En dag – tidslinje */
  .day-grid { display: grid; gap: 48px; }
  .day-photo { width: 100%; max-width: 360px; aspect-ratio: 1; object-fit: cover; border-radius: 50%; }
  .timeline { list-style: none; padding: 0; position: relative; }
  .timeline::before { content: ""; position: absolute; left: 7px; top: 12px; bottom: 12px; width: 1px; background: var(--line); }
  .timeline li { position: relative; display: grid; gap: 4px; padding: 0 0 32px 40px; }
  .timeline li:last-child { padding-bottom: 0; }
  .timeline li::before { content: ""; position: absolute; left: 0; top: 6px; width: 15px; height: 15px; border-radius: 50%;
    background: var(--paper); border: 2px solid var(--ink); }
  .t-time { font-family: ui-monospace, 'SF Mono', Consolas, monospace; font-size: 15px; font-weight: 600; color: var(--ink-2);
    font-variant-numeric: tabular-nums; letter-spacing: 0.02em; }
  .t-text { color: var(--ink-2); max-width: 52ch; }

  /* Hundfrisör – split */
  .split { display: grid; gap: 48px; align-items: center; }
  .split-img { width: 100%; aspect-ratio: 4 / 5; max-width: 480px; object-fit: cover; border-radius: 999px 999px var(--r) var(--r); }
  .split p:not(.eyebrow) { color: var(--ink-2); margin-top: 16px; max-width: 52ch; }
  .plain { list-style: none; padding: 0; margin-top: 24px; border-top: 1px solid var(--line); max-width: 52ch; }
  .plain li { padding: 12px 0; border-bottom: 1px solid var(--line); }

  /* Priser */
  .prices { display: grid; gap: 48px; }
  table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  caption { text-align: left; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 21px; padding-bottom: 16px; }
  th, td { text-align: left; padding: 16px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
  thead th { font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-2); padding-top: 0; padding-bottom: 12px; border-bottom: 1px solid var(--ink); }
  tbody th { font-weight: 600; padding-right: 16px; }
  .sub { display: block; font-weight: 400; color: var(--ink-2); font-size: 16px; }
  td.pris { text-align: right; white-space: nowrap; font-weight: 600; }
  thead th.pris { text-align: right; }
  .note { margin-top: 24px; color: var(--ink-2); font-size: 16px; max-width: 70ch; }

  /* Krav + boka */
  .req-grid { display: grid; gap: 48px; align-items: start; }
  .checks { list-style: none; padding: 0; display: grid; gap: 24px; margin-top: 32px; }
  .checks li { display: grid; grid-template-columns: 24px 1fr; gap: 16px; align-items: start; }
  .check { flex: none; margin-top: 2px; }
  .check circle { fill: var(--accent); }
  .check path { fill: none; stroke: var(--ink); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
  .checks strong { display: block; font-weight: 600; }
  .checks .c-text { color: var(--ink-2); display: block; }
  .book { background: var(--ink); color: var(--paper); border-radius: var(--r); padding: 32px 24px; }
  .book .eyebrow { color: #d9c9b6; }
  .book h2 { margin-bottom: 16px; }
  .book p { color: #e9dfd1; }
  .book .actions { margin: 32px 0 24px; }
  .book .btn-ghost { border-color: var(--paper); color: var(--paper); }
  .book .btn-ghost:hover { background: rgb(255 255 255 / .08); }
  .book small { display: block; font-size: 16px; color: #d9c9b6; border-top: 1px solid rgb(251 247 240 / .2); padding-top: 16px; }

  /* Hitta hit */
  .find-grid { display: grid; gap: 48px; }
  .map { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--r); }
  .addr { display: inline-flex; align-items: center; min-height: 44px; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 21px; text-underline-offset: 6px; }
  .find dl { margin-top: 24px; border-top: 1px solid var(--line); }
  .find dl div { padding: 16px 0; border-bottom: 1px solid var(--line); display: grid; gap: 4px; }
  .find dt { font-weight: 600; }
  .find dd { margin: 0; color: var(--ink-2); }

  /* Sidfot */
  footer { background: var(--paper-2); border-top: 1px solid var(--line); padding: 64px 0 32px; font-size: 16px; }
  .foot { display: grid; gap: 32px; }
  .foot h2 { font-size: 13px; font-family: 'Inter', sans-serif; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-2); margin-bottom: 12px; }
  .foot p { white-space: pre-line; font-variant-numeric: tabular-nums; }
  .foot a { display: inline-flex; align-items: center; min-height: 44px; margin: -8px 0; text-underline-offset: 4px; }
  .foot .brand { margin: 0 0 8px; }
  .legal { margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--line); color: var(--ink-2); display: flex; flex-wrap: wrap; gap: 8px 24px; }

  @media (min-width: 720px) {
    .facts { grid-template-columns: repeat(3, auto); }
    .prices { grid-template-columns: 1fr 1fr; }
    .foot { grid-template-columns: 1fr 1fr; }
    .book { padding: 48px; }
    .day-grid, .split, .find-grid { grid-template-columns: 1fr 1fr; }
    .find-grid { align-items: center; }
    .hero-media { max-width: 440px; }
  }
  @media (min-width: 900px) {
    .sec { padding: 96px 0; }
    .hero { padding: 64px 0 96px; }
    .hero-grid { grid-template-columns: 1.15fr 1fr; align-items: center; gap: 64px; }
    .hero-media { max-width: 520px; }
    .day-grid { grid-template-columns: 1fr 1.3fr; gap: 96px; }
    .day-side { position: relative; }
    .split { grid-template-columns: 1fr 1fr; gap: 96px; }
    .split-img { margin-left: auto; }
    .req-grid { grid-template-columns: 1.1fr 1fr; gap: 96px; }
    .find-grid { grid-template-columns: 1.2fr 1fr; gap: 64px; align-items: center; }
  }
  @media (min-width: 1000px) {
    .top-in { gap: 32px; }
    .foot { grid-template-columns: 1.4fr 1fr 1fr 1fr; }
    .top nav { display: block; }
    .top-call { margin-left: 0; }
    .top-book { display: inline-flex; min-height: 44px; padding: 8px 16px; font-size: 16px; }
  }
  @media (max-width: 359px) {
    .top-call::before, .call-pre::before { content: none; }
    .brand { font-size: 21px; }
  }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    * { transition: none !important; }
  }
</style>
</head>
<body>
<a class="skip" href="#innehall">Hoppa till innehåll</a>

<header class="top">
  <div class="wrap top-in">
    <a class="brand" href="#innehall">${paw}<span data-slot="text" data-label="Företagsnamn i menyn">Tassebo</span></a>
    <nav aria-label="Huvudmeny">
      <ul class="menu">
        <li><a href="#dagen">En dag hos oss</a></li>
        <li><a href="#frisor">Hundfrisör</a></li>
        <li><a href="#priser">Priser</a></li>
        <li><a href="#krav">Krav</a></li>
        <li><a href="#hitta">Hitta hit</a></li>
      </ul>
    </nav>
    <a class="top-call" data-tel data-slot="text" data-label="Telefon i menyn" href="#">070-174 06 33</a>
    <a class="btn btn-primary top-book" href="#boka">Boka provdag</a>
  </div>
</header>

<main id="innehall">
  <section class="hero">
    <div class="wrap hero-grid">
      <div>
        <p class="eyebrow" data-slot="text" data-label="Hero – liten etikett">Hunddagis &amp; hundfrisör · Västerås</p>
        <h1 data-slot="text" data-label="Hero – rubrik">Hunddagis och hundfrisör utanför Västerås</h1>
        <p class="lead" data-slot="text" data-label="Hero – ingress">Små grupper, långa skogspromenader och en stor inhägnad rastgård. Din hund får röra sig, vila ordentligt och kommer hem trött och nöjd.</p>
        <div class="actions">
          <a class="btn btn-primary" href="#boka" data-slot="text" data-label="Hero – knapp">Boka provdag</a>
          <a class="btn btn-ghost" href="#priser" data-slot="text" data-label="Hero – sekundär knapp">Se priser</a>
        </div>
        <dl class="facts">
          <div><dt>Öppet</dt><dd data-slot="text" data-label="Hero – öppettider">Mån–fre kl. 07–18</dd></div>
          <div><dt>Telefon</dt><dd><a data-tel data-slot="text" data-label="Hero – telefon" href="#">070-174 06 33</a></dd></div>
          <div><dt>Gruppstorlek</dt><dd data-slot="text" data-label="Hero – gruppstorlek">Högst 12 hundar</dd></div>
        </dl>
      </div>
      <div class="hero-media">
        <img class="arch" data-slot="image" data-label="Hero – stor bild" src="${tone(800, 1000, '#ead9bc', '#3a281d', 'bild: hundar i rastgården', 'hills')}" width="800" height="1000" alt="Hundar som leker i den inhägnade rastgården">
        <img class="bubble" data-slot="image" data-label="Hero – liten rund bild" src="${tone(400, 400, '#d8bf96', '#3a281d', 'bild: närbild', 'circle')}" width="400" height="400" alt="Närbild på en av dagishundarna">
      </div>
    </div>
  </section>

  <section class="sec tint" id="dagen" aria-labelledby="dagen-rubrik">
    <div class="wrap day-grid">
      <div class="day-side">
        <p class="eyebrow" data-slot="text" data-label="Dagen – etikett">Hur dagen ser ut</p>
        <h2 id="dagen-rubrik" data-slot="text" data-label="Dagen – rubrik">En dag på Tassebo</h2>
        <p class="t-text" style="margin:16px 0 48px" data-slot="text" data-label="Dagen – ingress">Hundar mår bra av rutiner. Samma ordning varje dag gör att även nya hundar landar snabbt i gruppen.</p>
        <img class="day-photo" data-slot="image" data-label="Dagen – rund bild" src="${tone(720, 720, '#e6d4b4', '#3a281d', 'bild: promenad i skogen', 'sun')}" width="720" height="720" loading="lazy" alt="Personal och hundar på promenad i skogen">
      </div>
      <ol class="timeline">
        <li><p class="t-time" data-slot="text" data-label="Dagen 1 – tid">kl. 07–09</p><h3 data-slot="text" data-label="Dagen 1 – rubrik">Lämning</h3><p class="t-text" data-slot="text" data-label="Dagen 1 – text">Vi möter er vid grinden, tar emot mat och koppel och hör hur natten har varit.</p></li>
        <li><p class="t-time" data-slot="text" data-label="Dagen 2 – tid">kl. 09–11</p><h3 data-slot="text" data-label="Dagen 2 – rubrik">Skogspromenad</h3><p class="t-text" data-slot="text" data-label="Dagen 2 – text">I grupper om fyra till sex hundar, anpassade efter storlek och tempo.</p></li>
        <li><p class="t-time" data-slot="text" data-label="Dagen 3 – tid">kl. 11–12</p><h3 data-slot="text" data-label="Dagen 3 – rubrik">Vatten och mat</h3><p class="t-text" data-slot="text" data-label="Dagen 3 – text">Hundar som äter lunch får sin egen medhavda mat, var för sig och i lugn och ro.</p></li>
        <li><p class="t-time" data-slot="text" data-label="Dagen 4 – tid">kl. 12–14</p><h3 data-slot="text" data-label="Dagen 4 – rubrik">Vila</h3><p class="t-text" data-slot="text" data-label="Dagen 4 – text">Varje hund har en egen bädd. Vi håller det tyst – vilan är lika viktig som leken.</p></li>
        <li><p class="t-time" data-slot="text" data-label="Dagen 5 – tid">kl. 14–16</p><h3 data-slot="text" data-label="Dagen 5 – rubrik">Lek och vardagsträning</h3><p class="t-text" data-slot="text" data-label="Dagen 5 – text">Fri lek i rastgården, nosarbete och lite inkallning och kontakt mellan varven.</p></li>
        <li><p class="t-time" data-slot="text" data-label="Dagen 6 – tid">kl. 16–18</p><h3 data-slot="text" data-label="Dagen 6 – rubrik">Hämtning</h3><p class="t-text" data-slot="text" data-label="Dagen 6 – text">Du får en kort rapport om dagen: hur hunden ätit, vilat och lekt.</p></li>
      </ol>
    </div>
  </section>

  <section class="sec" id="frisor" aria-labelledby="frisor-rubrik">
    <div class="wrap split">
      <div>
        <p class="eyebrow" data-slot="text" data-label="Frisör – etikett">Hundfrisör</p>
        <h2 id="frisor-rubrik" data-slot="text" data-label="Frisör – rubrik">Bad, klipp och klor – även för hundar som inte går på dagis</h2>
        <p data-slot="text" data-label="Frisör – text">Frisören har öppet tisdag till torsdag. Dagishundar kan få pälsvården gjord under dagen, så hämtar du en ren hund på eftermiddagen.</p>
        <ul class="plain">
          <li data-slot="text" data-label="Frisör – punkt 1">Schampo och balsam anpassade för känslig hud</li>
          <li data-slot="text" data-label="Frisör – punkt 2">Lugnt tempo, gott om pauser för ovana hundar</li>
          <li data-slot="text" data-label="Frisör – punkt 3">Kloklipp utan tidsbokning varje fredag kl. 15–17</li>
        </ul>
      </div>
      <img class="split-img" data-slot="image" data-label="Frisör – bild" src="${tone(800, 1000, '#f1e2c6', '#3a281d', 'bild: hund i frisörbordet', 'arch')}" width="800" height="1000" loading="lazy" alt="Hund som blir torkad efter badet hos hundfrisören">
    </div>
  </section>

  <section class="sec tint" id="priser" aria-labelledby="priser-rubrik">
    <div class="wrap">
      <div class="sec-head">
        <p class="eyebrow" data-slot="text" data-label="Priser – etikett">Priser</p>
        <h2 id="priser-rubrik" data-slot="text" data-label="Priser – rubrik">Raka priser, inga startavgifter</h2>
      </div>
      <div class="prices">
        <table>
          <caption data-slot="text" data-label="Priser – rubrik dagis">Hunddagis</caption>
          <thead><tr><th scope="col">Abonnemang</th><th scope="col" class="pris">Pris</th></tr></thead>
          <tbody>
            <tr><th scope="row"><span data-slot="text" data-label="Dagis 1 – namn">Heltid</span><span class="sub" data-slot="text" data-label="Dagis 1 – detalj">5 dagar i veckan</span></th><td class="pris" data-slot="text" data-label="Dagis 1 – pris">3 900 kr/mån</td></tr>
            <tr><th scope="row"><span data-slot="text" data-label="Dagis 2 – namn">Deltid</span><span class="sub" data-slot="text" data-label="Dagis 2 – detalj">3 dagar i veckan, fasta dagar</span></th><td class="pris" data-slot="text" data-label="Dagis 2 – pris">2 800 kr/mån</td></tr>
            <tr><th scope="row"><span data-slot="text" data-label="Dagis 3 – namn">Deltid</span><span class="sub" data-slot="text" data-label="Dagis 3 – detalj">2 dagar i veckan, fasta dagar</span></th><td class="pris" data-slot="text" data-label="Dagis 3 – pris">2 000 kr/mån</td></tr>
            <tr><th scope="row"><span data-slot="text" data-label="Dagis 4 – namn">Enstaka dag</span><span class="sub" data-slot="text" data-label="Dagis 4 – detalj">När det finns plats, boka dagen innan</span></th><td class="pris" data-slot="text" data-label="Dagis 4 – pris">395 kr</td></tr>
          </tbody>
        </table>
        <table>
          <caption data-slot="text" data-label="Priser – rubrik frisör">Hundfrisör</caption>
          <thead><tr><th scope="col">Behandling</th><th scope="col" class="pris">Pris</th></tr></thead>
          <tbody>
            <tr><th scope="row"><span data-slot="text" data-label="Frisör 1 – namn">Bad och fön</span><span class="sub" data-slot="text" data-label="Frisör 1 – detalj">Inklusive utborstning</span></th><td class="pris" data-slot="text" data-label="Frisör 1 – pris">från 450 kr</td></tr>
            <tr><th scope="row"><span data-slot="text" data-label="Frisör 2 – namn">Bad och klipp</span><span class="sub" data-slot="text" data-label="Frisör 2 – detalj">Hel päls, efter ras eller önskemål</span></th><td class="pris" data-slot="text" data-label="Frisör 2 – pris">från 850 kr</td></tr>
            <tr><th scope="row"><span data-slot="text" data-label="Frisör 3 – namn">Trimning</span><span class="sub" data-slot="text" data-label="Frisör 3 – detalj">För strävhåriga raser</span></th><td class="pris" data-slot="text" data-label="Frisör 3 – pris">från 750 kr</td></tr>
            <tr><th scope="row"><span data-slot="text" data-label="Frisör 4 – namn">Kloklipp</span><span class="sub" data-slot="text" data-label="Frisör 4 – detalj">Gratis för dagishundar</span></th><td class="pris" data-slot="text" data-label="Frisör 4 – pris">150 kr</td></tr>
          </tbody>
        </table>
      </div>
      <p class="note" data-slot="text" data-label="Priser – fotnot">Alla priser inkl. moms. Frisörpriset beror på hundens storlek och pälsens skick – du får alltid ett pris innan vi börjar. Betala med kort, Swish eller faktura.</p>
    </div>
  </section>

  <section class="sec" id="krav" aria-labelledby="krav-rubrik">
    <div class="wrap req-grid">
      <div>
        <p class="eyebrow" data-slot="text" data-label="Krav – etikett">Innan första dagen</p>
        <h2 id="krav-rubrik" data-slot="text" data-label="Krav – rubrik">Det här behöver vi av dig</h2>
        <ul class="checks">
          <li>${check}<span><strong data-slot="text" data-label="Krav 1 – rubrik">Vaccinerad</strong><span class="c-text" data-slot="text" data-label="Krav 1 – text">Grundvaccinerad och med giltig vaccination mot valpsjuka och parvovirus. Ta med vaccinationsintyget.</span></span></li>
          <li>${check}<span><strong data-slot="text" data-label="Krav 2 – rubrik">Försäkrad</strong><span class="c-text" data-slot="text" data-label="Krav 2 – text">Hunden ska ha både veterinärvårds- och ansvarsförsäkring.</span></span></li>
          <li>${check}<span><strong data-slot="text" data-label="Krav 3 – rubrik">Provdag</strong><span class="c-text" data-slot="text" data-label="Krav 3 – text">Alla nya hundar börjar med en provdag, så att vi ser att hunden trivs i grupp.</span></span></li>
          <li>${check}<span><strong data-slot="text" data-label="Krav 4 – rubrik">Minst fyra månader</strong><span class="c-text" data-slot="text" data-label="Krav 4 – text">Hunden ska ha fyllt fyra månader. Löptikar och sjuka hundar stannar hemma tills de är friska.</span></span></li>
        </ul>
      </div>
      <div class="book dark" id="boka">
        <p class="eyebrow" data-slot="text" data-label="Boka – etikett">Nästa steg</p>
        <h2 data-slot="text" data-label="Boka – rubrik">Boka en provdag</h2>
        <p data-slot="text" data-label="Boka – text">En förmiddag kl. 09–13 där vi lär känna din hund och du ser hur vi har det. Provdagen kostar 250 kr och dras av från första månaden.</p>
        <div class="actions">
          <a class="btn btn-primary call-pre" data-tel data-slot="text" data-label="Boka – telefonknapp" href="#">070-174 06 33</a>
          <a class="btn btn-ghost" data-mail data-slot="text" data-label="Boka – e-post" href="#">hej@tassebo.se</a>
        </div>
        <small data-slot="text" data-label="Boka – svarstider">Vi svarar i telefon vardagar kl. 09–11 och 13–15. Mejl besvarar vi samma dag.</small>
      </div>
    </div>
  </section>

  <section class="sec tint" id="hitta" aria-labelledby="hitta-rubrik">
    <div class="wrap find-grid">
      <img class="map" data-slot="image" data-label="Hitta hit – bild eller karta" src="${tone(960, 720, '#e6d4b4', '#3a281d', 'bild: gården och rastgården', 'grid')}" width="960" height="720" loading="lazy" alt="Gården med rastgård och parkering">
      <div class="find">
        <p class="eyebrow" data-slot="text" data-label="Hitta hit – etikett">Hitta hit</p>
        <h2 id="hitta-rubrik" data-slot="text" data-label="Hitta hit – rubrik">Tolv minuter från Västerås centrum</h2>
        <p style="margin-top:16px"><a class="addr" data-map data-slot="text" data-label="Adress" href="#">Gårdsvägen 4, 725&nbsp;91 Västerås</a></p>
        <dl>
          <div><dt data-slot="text" data-label="Hitta hit 1 – rubrik">Inhägnad rastgård</dt><dd data-slot="text" data-label="Hitta hit 1 – text">Drygt 2 000 m² med 1,6 meter högt staket och dubbla grindar vid in- och utgång.</dd></div>
          <div><dt data-slot="text" data-label="Hitta hit 2 – rubrik">Parkering för lämning</dt><dd data-slot="text" data-label="Hitta hit 2 – text">Korttidsparkering direkt vid grinden. Kliv ur, så möter vi dig och hunden där.</dd></div>
          <div><dt data-slot="text" data-label="Hitta hit 3 – rubrik">Med buss</dt><dd data-slot="text" data-label="Hitta hit 3 – text">Hållplats Gårdsvägen ligger 300 meter bort. Gå till höger vid brevlådorna.</dd></div>
        </dl>
      </div>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <div class="foot">
      <div>
        <p class="brand">${paw}<span data-slot="text" data-label="Sidfot – företagsnamn">Tassebo</span></p>
        <p data-slot="text" data-label="Sidfot – kort beskrivning">Hunddagis och hundfrisör strax utanför Västerås.</p>
      </div>
      <div>
        <h2>Adress</h2>
        <p><a data-map data-slot="text" data-label="Sidfot – adress" href="#">Gårdsvägen 4, 725&nbsp;91 Västerås</a></p>
      </div>
      <div>
        <h2>Öppettider</h2>
        <p data-slot="text" data-multiline data-label="Sidfot – öppettider">Dagis mån–fre kl. 07–18
Frisör tis–tors kl. 09–16
Stängt röda dagar</p>
      </div>
      <div>
        <h2>Kontakt</h2>
        <p><a data-tel data-slot="text" data-label="Sidfot – telefon" href="#">070-174 06 33</a></p>
        <p><a data-mail data-slot="text" data-label="Sidfot – e-post" href="#">hej@tassebo.se</a></p>
      </div>
    </div>
    <div class="legal">
      <span data-slot="text" data-label="Sidfot – copyright">© 2026 Tassebo</span>
      <span data-slot="text" data-label="Sidfot – org.nr">Org.nr 556000-0000</span>
    </div>
  </div>
</footer>
${window.siteJs}
</body>
</html>`;

  window.TEMPLATES.push({
    id: 'hunddagis',
    name: 'Hunddagis & hundfrisör',
    category: 'Djur',
    html: html
  });
})();
