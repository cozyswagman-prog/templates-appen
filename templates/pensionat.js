(function () {
  const tone = window.tone;

  // Riktning: kustpensionat – vit och dimblågrå, nästan-svart blågrå text, en dov
  // sjöbodsröd accent, Playfair Display-rubriker, stora liggande bilder och mycket luft.
  const C = { mist: '#d3dce0', mist2: '#c3ced3', ink: '#1d272d' };

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pensionat Måsholmen – rum med frukost i Stockholms skärgård</title>
<meta name="description" content="Pensionat vid bryggan på Måsholmen i Stockholms skärgård. Fyra rum med frukost, middag på kvällarna. Öppet maj–september.">
<style>
${window.fontCss('playfair', 'inter')}
  :root {
    --white: #fbfbf9; --mist: #e8edef; --mist-2: #d3dce0;
    --ink: #1d272d; --muted: #4c5a63; --line: #d2dade;
    --red: #9a3324; --red-d: #7c281b;
    --r: 2px;
    --serif: 'Playfair Display', Georgia, 'Times New Roman', serif;
    --sans: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
  body { background: var(--white); color: var(--ink); font: 400 17px/1.65 var(--sans); font-variant-numeric: lining-nums; }
  img { display: block; max-width: 100%; height: auto; }
  a { color: inherit; }
  h1, h2, h3 { font-family: var(--serif); font-weight: 400; line-height: 1.15; text-wrap: balance; letter-spacing: -0.01em; }
  h2 { font-size: clamp(32px, 4.4vw, 48px); }
  h3 { font-size: 24px; line-height: 1.25; }
  .wrap { max-width: 1160px; margin: 0 auto; padding: 0 24px; }
  .etikett { font: 600 12px/1.4 var(--sans); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
  .hoppa { position: absolute; left: 16px; top: -64px; background: var(--ink); color: var(--white); padding: 12px 16px; border-radius: var(--r); z-index: 10; }
  .hoppa:focus { top: 16px; }
  :focus-visible { outline: 3px solid var(--red); outline-offset: 3px; }
  .pre { white-space: pre-line; }
  .tab { font-variant-numeric: lining-nums tabular-nums; }

  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 12px 24px;
    border-radius: var(--r); font: 600 16px/1.2 var(--sans); text-decoration: none; border: 1px solid var(--red);
    background: var(--red); color: #fff; transition: background-color .2s ease-out, color .2s ease-out; white-space: nowrap; }
  .btn:hover { background: var(--red-d); border-color: var(--red-d); }
  .btn-2 { background: transparent; color: var(--ink); border-color: var(--ink); }
  .btn-2:hover { background: var(--ink); color: var(--white); border-color: var(--ink); }
  .btn .nr { font-variant-numeric: lining-nums tabular-nums; font-weight: 400; }

  /* Sidhuvud */
  header { background: var(--white); border-bottom: 1px solid var(--line); }
  header .wrap { display: flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 80px; }
  .brand { font: 400 24px/1.1 var(--serif); text-decoration: none; letter-spacing: -0.01em; }
  nav ul { list-style: none; display: flex; gap: 32px; }
  nav a { text-decoration: none; font-size: 16px; display: inline-block; padding: 12px 0; }
  nav a:hover { text-decoration: underline; text-underline-offset: 6px; text-decoration-thickness: 1px; }
  .head-cta { display: flex; align-items: center; gap: 24px; }
  .head-tel { text-decoration: none; font-variant-numeric: lining-nums tabular-nums; padding: 12px 0; }
  .head-tel:hover { text-decoration: underline; text-underline-offset: 6px; }

  /* Hero */
  .hero { padding: 64px 0 0; }
  .hero-grid { display: grid; grid-template-columns: 24px minmax(0, 1fr) 24px; row-gap: 48px; }
  .hero-text { grid-column: 2; }
  .hero h1 { font-size: clamp(40px, 6.4vw, 76px); line-height: 1.04; letter-spacing: -0.02em; margin: 16px 0 24px; }
  .ingress { font-size: 19px; max-width: 44ch; color: var(--ink); }
  .knappar { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
  .hero-kontakt { margin-top: 24px; font-size: 16px; color: var(--muted); }
  .hero-kontakt span + span::before { content: "·"; margin: 0 8px; }
  .hero-bild { grid-column: 1 / -1; }
  .hero-bild img { width: 100%; aspect-ratio: 3 / 2; object-fit: cover; }

  /* Faktarad */
  .fakta { border-bottom: 1px solid var(--line); }
  .fakta ul { list-style: none; display: grid; grid-template-columns: 1fr 1fr; }
  .fakta li { padding: 24px 0; border-top: 1px solid var(--line); display: grid; gap: 4px; }
  .fakta li:nth-child(odd) { padding-right: 16px; }
  .fakta li:nth-child(even) { padding-left: 16px; border-left: 1px solid var(--line); }
  .fakta b { font: 400 22px/1.25 var(--serif); }

  /* Sektioner */
  .sektion { padding: 96px 0; }
  .sek-head { max-width: 640px; margin-bottom: 48px; display: grid; gap: 16px; }
  .sek-head p:not(.etikett) { color: var(--muted); font-size: 18px; }

  /* Rum */
  .rum-stor { display: grid; gap: 32px; padding-bottom: 48px; border-bottom: 1px solid var(--ink); }
  .rum-stor img { width: 100%; aspect-ratio: 3 / 2; object-fit: cover; border-radius: var(--r); }
  .rum-stor h3 { font-size: clamp(28px, 3.2vw, 36px); margin: 12px 0 16px; }
  .rum-stor p.text { color: var(--muted); }
  .detaljer { margin-top: 24px; border-top: 1px solid var(--line); }
  .detaljer div { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--line); font-size: 16px; }
  .detaljer dt { color: var(--muted); }
  .detaljer dd { text-align: right; font-variant-numeric: lining-nums tabular-nums; }
  .pris { font: 400 28px/1.2 var(--serif); }
  .pris-not { font-size: 15px; color: var(--muted); }
  .rum-stor .pris-rad { margin-top: 24px; display: grid; gap: 4px; }

  .rumlista { list-style: none; }
  .rum-rad { display: grid; grid-template-columns: 112px 1fr; gap: 16px 24px; padding: 32px 0; border-bottom: 1px solid var(--line); align-items: start; }
  .rum-rad img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--r); }
  .rum-rad h3 { margin: 4px 0 8px; }
  .mat .ingress { margin-top: 24px; }
  .rum-rad p.text { color: var(--muted); font-size: 16px; }
  .rum-rad .sangar { font-size: 16px; }
  .rum-rad .rad-pris { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px 16px; padding-top: 16px; border-top: 1px dashed var(--line); }
  .rum-not { margin-top: 32px; max-width: 65ch; color: var(--muted); font-size: 16px; }

  /* Helbreddsbild */
  .helbredd { margin: 0; background: var(--mist); }
  .helbredd img { width: 100%; aspect-ratio: 2 / 1; object-fit: cover; }
  .helbredd figcaption { max-width: 1160px; margin: 0 auto; padding: 16px 24px; font-size: 15px; color: var(--muted); }

  /* Hitta hit */
  .resa { display: grid; gap: 48px; }
  .stor-tid { font: 400 clamp(56px, 9vw, 112px)/1 var(--serif); letter-spacing: -0.03em; margin: 24px 0 16px; white-space: nowrap; }
  .stor-text { font-size: 18px; color: var(--muted); max-width: 32ch; }
  .steg { list-style: none; counter-reset: s; border-top: 1px solid var(--ink); }
  .steg li { counter-increment: s; display: grid; grid-template-columns: 48px 1fr; gap: 4px 16px; padding: 24px 0; border-bottom: 1px solid var(--line); }
  .steg li::before { content: counter(s); grid-row: span 2; font: 400 28px/1 var(--serif); color: var(--red); }
  .steg h3 { font-size: 20px; }
  .steg p { color: var(--muted); font-size: 16px; }
  .resa-not { margin-top: 24px; font-size: 15px; color: var(--muted); }

  /* Mat */
  .mat { background: var(--mist); }
  .mat-grid { display: grid; gap: 48px; align-items: center; }
  .mat-grid img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; border-radius: var(--r); }
  .meny { margin-top: 32px; border-top: 1px solid var(--ink); }
  .meny div { display: grid; grid-template-columns: 1fr auto; gap: 4px 16px; padding: 16px 0; border-bottom: 1px solid #c4ced3; }
  .meny dt { font: 400 22px/1.3 var(--serif); }
  .meny dd { font-variant-numeric: lining-nums tabular-nums; }
  .meny dd.mer { grid-column: 1 / -1; color: var(--muted); font-size: 16px; }

  /* Säsong och bokning */
  .sasong-grid { display: grid; gap: 64px; }
  .sasong-grid > * { min-width: 0; }
  .perioder { width: 100%; border-collapse: collapse; margin-top: 32px; font-variant-numeric: lining-nums tabular-nums; }
  .perioder th, .perioder td { text-align: left; font-weight: 400; padding: 16px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
  .perioder tr:first-child th, .perioder tr:first-child td { border-top: 1px solid var(--ink); }
  .perioder td { text-align: right; padding-left: 16px; }
  .perioder tr.stangt th, .perioder tr.stangt td { color: var(--muted); }
  .boka { border: 1px solid var(--ink); border-radius: var(--r); padding: 32px 24px; align-self: start; }
  .boka h2 { font-size: clamp(28px, 3.2vw, 36px); margin: 12px 0 16px; }
  .boka p.text { color: var(--muted); }
  .boka-tel { display: inline-block; margin: 24px 0 8px; font: 400 clamp(28px, 3.4vw, 36px)/1.2 var(--serif); text-decoration: none; font-variant-numeric: lining-nums tabular-nums; }
  .boka-tel:hover, .boka-mail:hover { text-decoration: underline; text-underline-offset: 6px; text-decoration-thickness: 1px; }
  .boka-mail { display: inline-block; padding: 8px 0; font-size: 17px; overflow-wrap: anywhere; }
  .boka .btn { margin-top: 24px; }
  .boka-not { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 15px; color: var(--muted); }

  /* Sidfot */
  footer { background: var(--ink); color: #e6ecee; padding: 64px 0 32px; font-size: 16px; }
  .fot { display: grid; gap: 32px; }
  .fot .brand { font-size: 28px; color: #fff; }
  .fot-slogan { margin-top: 12px; color: #a9b7be; max-width: 28ch; }
  .fot h2 { font: 600 12px/1.4 var(--sans); letter-spacing: 0.12em; text-transform: uppercase; color: #a9b7be; margin-bottom: 12px; }
  .fot p { line-height: 1.7; }
  .fot a { text-underline-offset: 4px; }
  .fot a[data-tel], .fot a[data-mail], .fot a[data-map] { display: inline-block; padding: 8px 0; }
  .fot-bas { margin-top: 48px; padding-top: 24px; border-top: 1px solid #3a4850; display: flex; flex-wrap: wrap; gap: 8px 24px; font-size: 14px; color: #a9b7be; }

  @media (max-width: 899px) {
    nav ul, .head-boka { display: none; }
    /* På mobil blir telefonlänken en "Ring"-knapp; numret ligger kvar i texten så tel-länken stämmer */
    .head-tel { display: inline-flex; align-items: center; min-height: 44px; padding: 8px 16px; border-radius: var(--r);
      background: var(--red); color: #fff; font-size: 0; }
    .head-tel::before { content: "Ring"; font: 600 15px/1.2 var(--sans); }
    .head-tel:hover { background: var(--red-d); text-decoration: none; }
  }
  @media (max-width: 359px) {
    .brand { font-size: 18px; }
    header .wrap { gap: 16px; }
  }
  @media (min-width: 760px) {
    .rum-rad { grid-template-columns: 216px 1fr; gap: 16px 32px; }
    .rum-rad .rad-pris { grid-column: 2; justify-content: flex-start; }
    .fakta ul { grid-template-columns: repeat(4, 1fr); }
    .fakta li { padding: 24px; border-top: 0; }
    .fakta li:nth-child(odd) { padding-right: 24px; }
    .fakta li:nth-child(even) { padding-left: 24px; }
    .fakta li + li { border-left: 1px solid var(--line); }
    .fakta li:first-child { padding-left: 0; }
    .mat-grid { grid-template-columns: 6fr 5fr; gap: 64px; }
    .resa { grid-template-columns: 5fr 6fr; gap: 64px; align-items: start; }
    .fot { grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 48px; }
    .boka { padding: 48px; }
  }
  @media (min-width: 1000px) {
    .hero { padding-top: 96px; }
    .hero-grid { grid-template-columns: minmax(24px, 1fr) minmax(0, 456px) 64px minmax(0, 592px) minmax(24px, 1fr); align-items: center; }
    .hero-text { grid-column: 2; grid-row: 1; padding-bottom: 96px; }
    .hero-bild { grid-column: 4 / -1; grid-row: 1; padding-bottom: 96px; }
    .hero-bild img { aspect-ratio: 3 / 2; border-radius: var(--r) 0 0 var(--r); }
    .rum-stor { grid-template-columns: 7fr 5fr; gap: 64px; align-items: center; }
    .rum-rad { grid-template-columns: 240px 1fr 240px; gap: 32px; }
    .rum-rad .rad-pris { grid-column: auto; flex-direction: column; align-items: flex-end; padding-top: 4px; border-top: 0; text-align: right; }
    .sasong-grid { grid-template-columns: 6fr 5fr; gap: 96px; }
    .sektion { padding: 128px 0; }
  }
  @media (max-width: 759px) {
    .sektion { padding: 64px 0; }
    .brand { font-size: 20px; white-space: nowrap; }
    .rum-rad { grid-template-columns: 96px 1fr; column-gap: 16px; row-gap: 0; }
    .rum-rad > div { display: contents; }
    .rum-rad img { grid-row: 1 / span 2; margin-bottom: 16px; }
    .rum-rad .etikett { grid-column: 2; align-self: end; }
    .rum-rad h3 { grid-column: 2; align-self: start; margin-bottom: 16px; }
    .rum-rad p.text, .rum-rad .sangar { grid-column: 1 / -1; }
    .rum-rad .sangar { margin-top: 8px; }
    .rum-rad .rad-pris { margin-top: 16px; }
  }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    * { transition: none !important; }
  }
</style>
</head>
<body>
<a class="hoppa" href="#innehall">Hoppa till innehåll</a>

<header>
  <div class="wrap">
    <a class="brand" href="#" data-slot="text" data-label="Pensionatets namn (sidhuvud)">Pensionat Måsholmen</a>
    <nav aria-label="Huvudmeny">
      <ul>
        <li><a href="#rum">Rummen</a></li>
        <li><a href="#hitta">Hitta hit</a></li>
        <li><a href="#mat">Frukost &amp; middag</a></li>
        <li><a href="#sasong">Säsong</a></li>
      </ul>
    </nav>
    <div class="head-cta">
      <a class="head-tel" data-tel data-slot="text" data-label="Telefon (sidhuvud)" href="#">08-46 50 04 81</a>
      <a class="btn head-boka" href="#boka">Boka rum</a>
    </div>
  </div>
</header>

<main id="innehall">
  <section class="hero">
    <div class="hero-grid">
      <div class="hero-text">
        <p class="etikett" data-slot="text" data-label="Hero – liten etikett">Stockholms skärgård · Säsong maj–sep</p>
        <h1 data-slot="text" data-label="Hero – rubrik">Pensionat vid bryggan på Måsholmen</h1>
        <p class="ingress" data-slot="text" data-label="Hero – ingress">Fyra rum i ett vitt trähus vid vattnet, frukost på verandan och vedeldad bastu på bryggan. Knappt två timmar med båt från Strömkajen.</p>
        <div class="knappar">
          <a class="btn" href="#boka">Boka rum</a>
          <a class="btn btn-2" data-tel href="#"><span>Ring oss</span><span class="nr" data-slot="text" data-label="Telefon (hero-knapp)">08-46 50 04 81</span></a>
        </div>
        <p class="hero-kontakt"><span data-slot="text" data-label="Hero – rad 1 under knapparna">Incheckning från kl.&nbsp;15</span><span data-slot="text" data-label="Hero – rad 2 under knapparna">Utcheckning kl.&nbsp;11</span></p>
      </div>
      <div class="hero-bild">
        <img data-slot="image" data-label="Hero – bild" src="${tone(1500, 1000, C.mist, C.ink, 'Bild: pensionatet sett från bryggan', 'sun')}" width="1500" height="1000" alt="Pensionatet sett från bryggan">
      </div>
    </div>
  </section>

  <section class="fakta" aria-label="Kort fakta">
    <div class="wrap">
      <ul>
        <li><span class="etikett" data-slot="text" data-label="Fakta 1 – etikett">Båt från Strömkajen</span><b data-slot="text" data-label="Fakta 1 – värde">ca 1 tim 50 min</b></li>
        <li><span class="etikett" data-slot="text" data-label="Fakta 2 – etikett">Rum</span><b data-slot="text" data-label="Fakta 2 – värde">4 rum, frukost ingår</b></li>
        <li><span class="etikett" data-slot="text" data-label="Fakta 3 – etikett">Säsong</span><b data-slot="text" data-label="Fakta 3 – värde">15 maj–15 sep</b></li>
        <li><span class="etikett" data-slot="text" data-label="Fakta 4 – etikett">Bastu</span><b data-slot="text" data-label="Fakta 4 – värde">Varje kväll kl. 18–21</b></li>
      </ul>
    </div>
  </section>

  <section class="sektion" id="rum" aria-labelledby="rum-rubrik">
    <div class="wrap">
      <div class="sek-head">
        <p class="etikett" data-slot="text" data-label="Rum – etikett">Rummen</p>
        <h2 id="rum-rubrik" data-slot="text" data-label="Rum – rubrik">Fyra rum, alla med frukost</h2>
        <p data-slot="text" data-label="Rum – ingress">Alla rum har egen toalett och dusch, bäddade sängar och handdukar. Ingen tv, men bra wifi i salongen.</p>
      </div>

      <article class="rum-stor">
        <img data-slot="image" data-label="Rum 1 – bild" src="${tone(1200, 800, C.mist, C.ink, 'Bild: rummet med fönster mot vattnet', 'arch')}" width="1200" height="800" alt="Dubbelrum med fönster mot vattnet" loading="lazy">
        <div>
          <p class="etikett" data-slot="text" data-label="Rum 1 – etikett">Rum 1 · Övervåningen</p>
          <h3 data-slot="text" data-label="Rum 1 – rumstyp">Dubbelrum med sjöutsikt</h3>
          <p class="text" data-slot="text" data-label="Rum 1 – beskrivning">Husets största rum, med två fönster rakt ut mot fjärden och en liten balkong där morgonsolen ligger på.</p>
          <dl class="detaljer">
            <div><dt>Sängar</dt><dd data-slot="text" data-label="Rum 1 – sängar">Dubbelsäng 180 cm</dd></div>
            <div><dt>Storlek</dt><dd data-slot="text" data-label="Rum 1 – storlek">22 m²</dd></div>
          </dl>
          <p class="pris-rad"><span class="pris tab" data-slot="text" data-label="Rum 1 – pris">2 250 kr</span><span class="pris-not" data-slot="text" data-label="Rum 1 – prisinfo">per natt för två, inkl. frukost</span></p>
        </div>
      </article>

      <ul class="rumlista">
        <li class="rum-rad">
          <img data-slot="image" data-label="Rum 2 – bild" src="${tone(800, 600, C.mist2, C.ink, 'Bild: rum 2', 'circle')}" width="800" height="600" alt="Dubbelrum mot trädgården" loading="lazy">
          <div>
            <p class="etikett" data-slot="text" data-label="Rum 2 – etikett">Rum 2 · Övervåningen</p>
            <h3 data-slot="text" data-label="Rum 2 – rumstyp">Dubbelrum mot trädgården</h3>
            <p class="text" data-slot="text" data-label="Rum 2 – beskrivning">Lugnt rum under takfoten med utsikt över äppelträden och klipporna bakom huset.</p>
            <p class="sangar" data-slot="text" data-label="Rum 2 – sängar">Två enkelsängar, kan ställas ihop</p>
          </div>
          <p class="rad-pris"><span class="pris tab" data-slot="text" data-label="Rum 2 – pris">1 850 kr</span><span class="pris-not" data-slot="text" data-label="Rum 2 – prisinfo">per natt, inkl. frukost</span></p>
        </li>
        <li class="rum-rad">
          <img data-slot="image" data-label="Rum 3 – bild" src="${tone(800, 600, C.mist2, C.ink, 'Bild: rum 3', 'grid')}" width="800" height="600" alt="Familjerum på bottenvåningen" loading="lazy">
          <div>
            <p class="etikett" data-slot="text" data-label="Rum 3 – etikett">Rum 3 · Bottenvåningen</p>
            <h3 data-slot="text" data-label="Rum 3 – rumstyp">Familjerum</h3>
            <p class="text" data-slot="text" data-label="Rum 3 – beskrivning">Egen ingång från verandan, nära till bryggan. Passar en familj eller två vänner som vill ha plats.</p>
            <p class="sangar" data-slot="text" data-label="Rum 3 – sängar">Dubbelsäng 160 cm och våningssäng</p>
          </div>
          <p class="rad-pris"><span class="pris tab" data-slot="text" data-label="Rum 3 – pris">2 450 kr</span><span class="pris-not" data-slot="text" data-label="Rum 3 – prisinfo">per natt för fyra, inkl. frukost</span></p>
        </li>
        <li class="rum-rad">
          <img data-slot="image" data-label="Rum 4 – bild" src="${tone(800, 600, C.mist2, C.ink, 'Bild: sjöboden', 'sun')}" width="800" height="600" alt="Den röda sjöboden vid bryggan" loading="lazy">
          <div>
            <p class="etikett" data-slot="text" data-label="Rum 4 – etikett">Rum 4 · Vid bryggan</p>
            <h3 data-slot="text" data-label="Rum 4 – rumstyp">Sjöboden</h3>
            <p class="text" data-slot="text" data-label="Rum 4 – beskrivning">En ombyggd sjöbod för två, några steg från vattnet. Toalett och dusch i huvudbyggnaden.</p>
            <p class="sangar" data-slot="text" data-label="Rum 4 – sängar">Dubbelsäng 140 cm</p>
          </div>
          <p class="rad-pris"><span class="pris tab" data-slot="text" data-label="Rum 4 – pris">1 450 kr</span><span class="pris-not" data-slot="text" data-label="Rum 4 – prisinfo">per natt, inkl. frukost</span></p>
        </li>
      </ul>
      <p class="rum-not" data-slot="text" data-label="Rum – villkor">Minst två nätter fredag–lördag i juli. Barn under tre år bor gratis i föräldrarnas säng, barnsäng finns att låna.</p>
    </div>
  </section>

  <figure class="helbredd">
    <img data-slot="image" data-label="Helbreddsbild" src="${tone(2000, 1000, C.mist2, C.ink, 'Bild: bryggan och bastun i kvällsljus', 'hills')}" width="2000" height="1000" alt="Bryggan och bastun i kvällsljus" loading="lazy">
    <figcaption data-slot="text" data-label="Helbreddsbild – bildtext">Bastun på bryggan eldas varje kväll. Badstegen går rakt ner i fjärden.</figcaption>
  </figure>

  <section class="sektion" id="hitta" aria-labelledby="hitta-rubrik">
    <div class="wrap resa">
      <div>
        <p class="etikett" data-slot="text" data-label="Hitta hit – etikett">Så tar du dig hit</p>
        <h2 id="hitta-rubrik" data-slot="text" data-label="Hitta hit – rubrik">Båt från Strömkajen</h2>
        <p class="stor-tid" data-slot="text" data-label="Hitta hit – restid">1 tim 50</p>
        <p class="stor-text" data-slot="text" data-label="Hitta hit – vad restiden gäller">minuter med skärgårdsbåten från centrala Stockholm till vår brygga.</p>
      </div>
      <div>
        <ol class="steg">
          <li><h3 data-slot="text" data-label="Steg 1 – rubrik">Ta båten från Strömkajen</h3><p data-slot="text" data-label="Steg 1 – text">Skärgårdsbåtarna går från Strömkajen vid Grand Hôtel. Köp biljett ombord eller i båtbolagets app.</p></li>
          <li><h3 data-slot="text" data-label="Steg 2 – rubrik">Kliv av vid Måsholmens brygga</h3><p data-slot="text" data-label="Steg 2 – text">Vi möter båten med en kärra för bagaget. Berätta när du bokar vilken avgång du tar.</p></li>
          <li><h3 data-slot="text" data-label="Steg 3 – rubrik">Kommer du med bil?</h3><p data-slot="text" data-label="Steg 3 – text">Parkera i hamnen på fastlandet och ta båten därifrån, ca 30 minuter. Långtidsparkering finns vid kajen.</p></li>
        </ol>
        <p class="resa-not" data-slot="text" data-label="Hitta hit – notis">Tidtabellen finns hos båtbolaget som trafikerar skärgården. Båtarna går tätare från midsommar till mitten av augusti.</p>
      </div>
    </div>
  </section>

  <section class="sektion mat" id="mat" aria-labelledby="mat-rubrik">
    <div class="wrap mat-grid">
      <div>
        <p class="etikett" data-slot="text" data-label="Mat – etikett">Frukost &amp; middag</p>
        <h2 id="mat-rubrik" data-slot="text" data-label="Mat – rubrik">Frukost på verandan, middag vid sjön</h2>
        <p class="ingress" data-slot="text" data-label="Mat – ingress">Vi lagar mest fisk från skärgården och grönsaker från gårdar på Värmdö. Brödet bakar vi själva varje morgon.</p>
        <dl class="meny">
          <div><dt data-slot="text" data-label="Måltid 1 – namn">Frukost</dt><dd data-slot="text" data-label="Måltid 1 – pris">ingår</dd><dd class="mer" data-slot="text" data-label="Måltid 1 – info">Kl. 08–10 i glasverandan. Gröt, ägg, eget bröd och rökt fisk.</dd></div>
          <div><dt data-slot="text" data-label="Måltid 2 – namn">Middag, tre rätter</dt><dd data-slot="text" data-label="Måltid 2 – pris">595 kr</dd><dd class="mer" data-slot="text" data-label="Måltid 2 – info">Serveras kl. 19. Beställ senast kl. 12 samma dag.</dd></div>
          <div><dt data-slot="text" data-label="Måltid 3 – namn">Fika på bryggan</dt><dd data-slot="text" data-label="Måltid 3 – pris">från 45 kr</dd><dd class="mer" data-slot="text" data-label="Måltid 3 – info">Kl. 14–17. Även för dagsbesökare som kommer med båt.</dd></div>
        </dl>
      </div>
      <img data-slot="image" data-label="Mat – bild" src="${tone(960, 1200, C.mist2, C.ink, 'Bild: frukostbordet på verandan', 'circle')}" width="960" height="1200" alt="Frukostbordet på verandan" loading="lazy">
    </div>
  </section>

  <section class="sektion" id="sasong" aria-labelledby="sasong-rubrik">
    <div class="wrap sasong-grid">
      <div>
        <p class="etikett" data-slot="text" data-label="Säsong – etikett">Säsong</p>
        <h2 id="sasong-rubrik" data-slot="text" data-label="Säsong – rubrik">Öppet från maj till september</h2>
        <table class="perioder">
          <tbody>
            <tr><th scope="row" data-slot="text" data-label="Period 1 – datum">15 maj–midsommar</th><td data-slot="text" data-label="Period 1 – öppet">fre–sön</td></tr>
            <tr><th scope="row" data-slot="text" data-label="Period 2 – datum">Midsommar–15 augusti</th><td data-slot="text" data-label="Period 2 – öppet">alla dagar</td></tr>
            <tr><th scope="row" data-slot="text" data-label="Period 3 – datum">16 augusti–15 september</th><td data-slot="text" data-label="Period 3 – öppet">fre–sön</td></tr>
            <tr class="stangt"><th scope="row" data-slot="text" data-label="Period 4 – datum">Oktober–april</th><td data-slot="text" data-label="Period 4 – öppet">stängt</td></tr>
          </tbody>
        </table>
        <p class="rum-not" data-slot="text" data-label="Säsong – notis">Utanför säsong tar vi emot grupper på minst tio personer. Hör av dig per mejl.</p>
      </div>
      <div class="boka" id="boka">
        <p class="etikett" data-slot="text" data-label="Bokning – etikett">Bokning</p>
        <h2 data-slot="text" data-label="Bokning – rubrik">Boka rum</h2>
        <p class="text" data-slot="text" data-label="Bokning – text">Ring eller mejla, så svarar vi samma dag. Säg gärna vilken båt du tänker ta.</p>
        <a class="boka-tel" data-tel data-slot="text" data-label="Telefon (bokning)" href="#">08-46 50 04 81</a>
        <br>
        <a class="boka-mail" data-mail data-slot="text" data-label="E-post (bokning)" href="#">bokning@pensionatmasholmen.se</a>
        <p class="boka-not" data-slot="text" data-label="Bokning – avbokningsregler">Fri avbokning fram till sju dagar före ankomst. Vi tar Swish och kort på plats.</p>
      </div>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <div class="fot">
      <div>
        <p class="brand" data-slot="text" data-label="Pensionatets namn (sidfot)">Pensionat Måsholmen</p>
        <p class="fot-slogan" data-slot="text" data-label="Sidfot – kort text">Rum med frukost vid bryggan i Stockholms skärgård.</p>
      </div>
      <div>
        <h2>Adress</h2>
        <p><a class="pre" data-map data-slot="text" data-multiline data-label="Adress (sidfot)" href="#">Måsholmens brygga
Stockholms skärgård</a></p>
      </div>
      <div>
        <h2>Öppet</h2>
        <p class="pre tab" data-slot="text" data-multiline data-label="Öppettider (sidfot)">15 maj–15 september
Incheckning från kl. 15
Utcheckning kl. 11</p>
      </div>
      <div>
        <h2>Kontakt</h2>
        <p><a data-tel data-slot="text" data-label="Telefon (sidfot)" href="#">08-46 50 04 81</a></p>
        <p><a data-mail data-slot="text" data-label="E-post (sidfot)" href="#">bokning@pensionatmasholmen.se</a></p>
      </div>
    </div>
    <div class="fot-bas">
      <span data-slot="text" data-label="Sidfot – copyright">© 2026 Pensionat Måsholmen</span>
      <span data-slot="text" data-label="Organisationsnummer">Org.nr 556000-0000</span>
    </div>
  </div>
</footer>
${window.siteJs}
</body>
</html>`;

  window.TEMPLATES.push({
    id: 'pensionat',
    name: 'Pensionat & B&B',
    category: 'Hotell & boende',
    html: html
  });
})();
