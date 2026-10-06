(function () {
  const ph = window.ph;

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gym</title>
<style>
${window.fontCss('outfit', 'inter')}
  /* Riktning: nordisk styrkestudio – grafitsvart bas, Outfit i versala, täta rubriker, Inter i brödtext,
     limegrönt som enda accent för handlingar och små markörer. Pillerknappar, 14 px kort. Bara vikterna 400/700. */
  :root {
    --bg: #16181d; --band: #1b1e24; --panel: #1f222a; --panel-hi: #242832; --line: #2e323c; --field: #6b7180;
    --text: #f2f3f5; --soft: #c9ced6; --dim: #a9afba; --lime: #c8f046; --lime-hi: #dcf87e;
  }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-size: 17px; background: var(--bg); color: var(--text); line-height: 1.6; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
  h1, h2, h3 { font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif; font-weight: 700; line-height: 1.1; letter-spacing: -.01em; text-wrap: balance; }

  .topbar { position: relative; z-index: 2; border-bottom: 1px solid var(--line); background: var(--bg); }
  .topbar .wrap { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 76px; }
  .logo { font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif; font-weight: 700; font-size: 21px; letter-spacing: .14em; text-transform: uppercase; line-height: 1.2; }
  .logo em { color: var(--lime); font-style: normal; }
  .topbar .cta-liten, .hero .cta {
    display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 22px; border-radius: 999px;
    background: var(--lime); color: var(--bg); font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif; font-weight: 700; font-size: 15px; letter-spacing: .02em;
    text-decoration: none; white-space: nowrap; transition: background-color .15s ease-out, transform .15s ease-out;
  }
  .topbar .cta-liten:hover, .hero .cta:hover { background: var(--lime-hi); }
  .hero .cta:active { transform: translateY(1px); }

  .hero { position: relative; min-height: clamp(540px, 84vh, 780px); display: flex; align-items: center; overflow: hidden; background: var(--bg); }
  .hero .bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .hero::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(22, 24, 29, .96) 0%, rgba(22, 24, 29, .86) 42%, rgba(22, 24, 29, .45) 100%), linear-gradient(0deg, rgba(22, 24, 29, .9) 0%, rgba(22, 24, 29, 0) 35%); }
  .hero .wrap { position: relative; z-index: 1; width: 100%; padding-top: 96px; padding-bottom: 96px; }
  .hero .kicker { display: flex; align-items: center; gap: 12px; color: var(--lime); font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; font-size: 14px; }
  .hero .kicker::before { content: ""; width: 32px; height: 3px; background: var(--lime); flex: none; }
  .hero h1 { font-size: clamp(46px, 8.4vw, 104px); line-height: .94; text-transform: uppercase; letter-spacing: -.015em; margin: 24px 0 28px; max-width: 11ch; }
  .hero p { color: var(--soft); font-size: clamp(18px, 1.6vw, 20px); line-height: 1.6; max-width: 44ch; margin-bottom: 40px; }
  .hero .cta { min-height: 56px; padding: 0 34px; font-size: 17px; }

  section { padding: 104px 0; }
  .section-title { font-size: clamp(34px, 4.6vw, 52px); text-transform: uppercase; letter-spacing: -.01em; margin-bottom: 16px; }
  .section-title span:first-child { color: var(--lime); margin-right: .1em; }
  .section-sub { color: var(--dim); font-size: 18px; margin-bottom: 48px; max-width: 56ch; }

  .pass-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .pass { display: flex; flex-direction: column; background: var(--panel); border-radius: 14px; overflow: hidden; }
  .pass img { display: block; width: 100%; height: auto; aspect-ratio: 4 / 3; object-fit: cover; }
  .pass .pbody { flex: 1; padding: 24px 24px 20px; }
  .pass h3 { font-size: 23px; margin-bottom: 8px; }
  .pass p { color: var(--dim); font-size: 16px; line-height: 1.6; }

  .prisrad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; align-items: stretch; }
  .pris { position: relative; display: flex; flex-direction: column; background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 36px 28px 28px; }
  .pris.populär { border: 2px solid var(--lime); background: var(--panel-hi); padding: 35px 27px 27px; }
  .pris.populär::before { content: "Populärast"; position: absolute; top: -14px; left: 26px; background: var(--lime); color: var(--bg); font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; line-height: 1; padding: 7px 14px; border-radius: 999px; }
  .pris h3 { font-size: 15px; color: var(--dim); letter-spacing: .14em; text-transform: uppercase; margin-bottom: 16px; }
  .pris .belopp { font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif; font-size: clamp(48px, 5vw, 60px); font-weight: 700; line-height: 1; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  .pris .belopp small { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-size: 16px; color: var(--dim); font-weight: 400; letter-spacing: 0; }
  .pris ul { flex: 1; list-style: none; padding: 20px 0 0; margin: 24px 0 0; border-top: 1px solid var(--line); color: var(--soft); font-size: 16px; line-height: 1.9; white-space: pre-line; }

  .kontakt { background: var(--lime); color: var(--bg); }
  .kontakt .wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
  .kontakt h2 { font-size: clamp(38px, 5vw, 60px); text-transform: uppercase; line-height: .98; letter-spacing: -.015em; }
  .kontakt p { font-size: 18px; line-height: 1.75; white-space: pre-line; margin-top: 24px; }
  .kontakt img { display: block; height: auto; aspect-ratio: 16 / 11; object-fit: cover; }
  .kontakt :focus-visible { outline-color: var(--bg); }

  footer { text-align: center; padding: 32px 24px; color: var(--dim); font-size: 14px; border-top: 1px solid var(--line); }

  /* SiteKit-delar i gymmets ton: samma typsnitt, accent, hörn och rytm som resten av sidan. */
  .kit-gym { --kit-accent: var(--lime); --kit-bg: var(--bg); --kit-ink: var(--text); --kit-line: var(--line); --kit-on: var(--bg); }
  .kit-gym .kit-section { padding: 104px 0; border-top: 0; }
  .kit-gym .kit-wrap { max-width: 1120px; }
  .kit-gym .kit-wrap > h2 { font-size: clamp(34px, 4.6vw, 52px); text-transform: uppercase; letter-spacing: -.01em; line-height: 1.1; margin-bottom: 40px; }
  .kit-gym .kit-section h3 { font-size: 23px; line-height: 1.2; margin: 20px 0 8px; }
  .kit-gym .kit-section p, .kit-gym .kit-detail p { max-width: 62ch; color: var(--soft); }
  .kit-gym .kit-section img { border-radius: 14px; }
  .kit-gym .kit-button, .kit-gym .kit-filter button, .kit-gym .kit-next, .kit-gym .kit-back, .kit-gym .kit-form button {
    min-height: 48px; padding: 0 24px; border-radius: 999px; font: 700 15px/1.3 'Outfit', 'Segoe UI', system-ui, sans-serif; letter-spacing: .02em;
    transition: background-color .15s ease-out, border-color .15s ease-out, color .15s ease-out;
  }
  .kit-gym .kit-button:not([aria-disabled=true]):hover, .kit-gym .kit-form button[type=submit]:hover { background: var(--lime-hi); border-color: var(--lime-hi); }
  /* Ej kopplade knappar: streckad kontur och dämpad text, så att de inte läses som en riktig handling. */
  .kit-gym .kit-button[aria-disabled=true] { background: transparent; color: var(--dim); border: 1px dashed var(--field); opacity: 1; cursor: not-allowed; }
  .kit-gym .kit-link-note, .kit-gym .kit-note { font: 400 14px/1.5 'Inter', 'Segoe UI', system-ui, sans-serif; color: var(--dim); }
  .kit-gym .pass > .kit-button { align-self: flex-start; margin: 4px 24px 12px; }
  .kit-gym .pass > .kit-link-note { margin: 0 24px 24px; }
  .kit-gym .pris > .kit-button { width: 100%; margin: 28px 0 0; }
  .kit-gym .pris > .kit-link-note { margin: 10px 0 0; text-align: center; }
  .kit-gym .kit-filter { gap: 8px; margin: 0 0 32px; }
  .kit-gym .kit-filter button { min-height: 44px; padding: 0 18px; font-size: 15px; background: transparent; color: var(--text); border: 1px solid var(--field); }
  .kit-gym .kit-filter button:hover { border-color: var(--text); }
  .kit-gym .kit-filter button[aria-pressed=true] { background: var(--lime); color: var(--bg); border-color: var(--lime); }

  /* Tränare: tonat band, och platshållarbilderna i sidans mörka palett (riktiga bilder påverkas inte). */
  .kit-gym [data-section="trainers"] { background: var(--band); }
  .kit-gym [data-section="trainers"] .kit-grid { gap: 32px; }

  /* Förfrågan: rubrik och ingress till vänster, formuläret till höger på stora skärmar. */
  .kit-gym [data-section="enquiry"] { background: var(--band); }
  .kit-gym .kit-form { max-width: 640px; }
  .kit-gym .kit-form legend { font: 700 20px/1.3 'Outfit', 'Segoe UI', system-ui, sans-serif; color: var(--text); margin: 40px 0 0; padding: 0; }
  .kit-gym .kit-form fieldset:first-of-type legend { margin-top: 0; }
  .kit-gym .kit-form label { font: 700 15px/1.5 'Inter', 'Segoe UI', system-ui, sans-serif; color: var(--text); margin: 16px 0; }
  .kit-gym .kit-form input, .kit-gym .kit-form textarea, .kit-gym .kit-form select {
    font: 400 16px/1.5 'Inter', 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); border: 1px solid var(--field); border-radius: 10px; padding: 12px 14px;
  }
  .kit-gym .kit-form input::placeholder, .kit-gym .kit-form textarea::placeholder { color: var(--dim); opacity: 1; }
  .kit-gym .kit-form input:focus-visible, .kit-gym .kit-form textarea:focus-visible, .kit-gym .kit-form select:focus-visible { border-color: var(--lime); outline-offset: 2px; }
  .kit-gym .kit-form .kit-actions { margin-top: 32px; }
  .kit-gym .kit-form [role=status] { font-size: 15px; color: var(--dim); margin: 8px 0 0; }
  .kit-gym .kit-progress { font: 700 13px/1.5 'Inter', 'Segoe UI', system-ui, sans-serif; color: var(--dim); }

  .kit-gym .kit-detail { border-bottom-color: var(--line); max-width: 820px; }
  .kit-gym .kit-detail summary { font: 700 19px/1.4 'Outfit', 'Segoe UI', system-ui, sans-serif; padding: 18px 0; }
  .kit-gym .kit-detail summary::marker { color: var(--lime); }
  .kit-gym .kit-detail p { margin-top: 0; }

  .kit-gym [data-section="contact"] { background: var(--panel); }
  .kit-gym .kit-contact h3 { font-size: 26px; margin-top: 0; }
  .kit-gym .kit-contact address { color: var(--soft); margin: 12px 0 4px; }
  .kit-gym [data-section="contact"] .kit-actions { margin-top: 0; gap: 12px; }
  .kit-gym [data-section="contact"] .kit-actions > .kit-link-note { flex-basis: 100%; margin: -4px 0 8px; }

  @media (min-width: 960px) {
    .kit-gym [data-section="enquiry"] .kit-wrap { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr); column-gap: 72px; align-items: start; }
    .kit-gym [data-section="enquiry"] .kit-wrap > h2 { grid-column: 1; grid-row: 1; margin-bottom: 16px; }
    .kit-gym [data-section="enquiry"] .kit-wrap > p { grid-column: 1; grid-row: 2; margin: 0; color: var(--dim); font-size: 18px; }
    .kit-gym [data-section="enquiry"] .kit-form { grid-column: 2; grid-row: 1 / span 3; max-width: none; }
    .kit-gym [data-section="faq"] .kit-wrap { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr); column-gap: 72px; align-items: start; }
    .kit-gym [data-section="faq"] .kit-wrap > h2 { grid-column: 1; grid-row: 1 / span 3; margin: 0; }
    .kit-gym [data-section="faq"] .kit-detail { grid-column: 2; max-width: none; }
    .kit-gym [data-section="faq"] .kit-detail:first-of-type { border-top: 1px solid var(--line); }
  }
  @media (max-width: 900px) {
    .pass-grid, .prisrad { gap: 16px; }
    .pass .pbody { padding: 20px 20px 16px; }
    .kit-gym .pass > .kit-button { margin: 4px 20px 12px; }
    .kit-gym .pass > .kit-link-note { margin: 0 20px 20px; }
    .pris, .pris.populär { padding-left: 22px; padding-right: 22px; }
    .kontakt .wrap { gap: 40px; }
    .hero { min-height: clamp(500px, 70vh, 680px); }
  }
  @media (min-width: 600px) and (max-width: 900px) {
    /* Surfplatta: passen som liggande kort i en spalt i stället för tre trånga. */
    .pass-grid { grid-template-columns: 1fr; gap: 20px; }
    .pass { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); grid-template-rows: auto auto 1fr; }
    .pass img { grid-column: 1; grid-row: 1 / span 3; height: 100%; aspect-ratio: auto; min-height: 220px; }
    .pass .pbody { grid-column: 2; padding: 24px 24px 12px; }
    .kit-gym .pass > .kit-button, .kit-gym .pass > .kit-link-note { grid-column: 2; justify-self: start; }
    .kit-gym .pass > .kit-link-note { align-self: start; }
  }
  @media (max-width: 760px) {
    body { font-size: 16px; }
    .topbar .wrap { min-height: 68px; }
    .logo { font-size: 18px; letter-spacing: .1em; }
    .topbar .cta-liten { padding: 0 18px; font-size: 14px; }
    .hero { min-height: 0; }
    .hero::after { background: linear-gradient(180deg, rgba(22, 24, 29, .82) 0%, rgba(22, 24, 29, .9) 100%); }
    .hero .wrap { padding-top: 72px; padding-bottom: 80px; }
    .hero h1 { margin: 20px 0; }
    .hero p { margin-bottom: 32px; }
    section, .kit-gym .kit-section { padding: 72px 0; }
    .section-sub { margin-bottom: 32px; }
    .kit-gym .kit-wrap { padding: 0 24px; }
    .kit-gym .kit-wrap > h2 { margin-bottom: 28px; }
    .kit-gym .kit-form button[type=submit] { flex: 1 1 100%; }
    .pass-grid, .prisrad, .kontakt .wrap { grid-template-columns: 1fr; }
    .pass-grid { gap: 24px; }
    .pass img { aspect-ratio: 16 / 10; }
    .prisrad { gap: 32px; }
    .kit-gym .kit-filter button { flex: 0 0 auto; padding: 0 16px; }
    .kit-gym [data-section="contact"] .kit-actions > .kit-button { flex: 1 1 100%; }
  }
</style>
</head>
<body>

<div class="topbar">
  <div class="wrap">
    <div class="logo" data-slot="text" data-label="Gymmets namn i toppen">NORRSKEN <em>GYM</em></div>
    <a class="cta-liten" href="#medlemskap" data-slot="text" data-label="Liten knapp i toppen">Bli medlem</a>
  </div>
</div>

<div class="hero">
  <img class="bg" data-slot="image" data-label="Stor bild i bakgrunden" src="${window.ex('gym-hero', 1600, 900, '#23262e', '#c8f046', 'Hero-bild · t.ex. gymgolvet eller ett pass')}" alt="">
  <div class="wrap">
    <div class="kicker" data-slot="text" data-label="Liten text ovanför rubriken">Öppet 05–23 alla dagar</div>
    <h1 data-slot="text" data-label="Stor rubrik">Starkare än igår</h1>
    <p data-slot="text" data-label="Text under rubriken">Fria vikter, moderna maskiner och gruppass som faktiskt är roliga. Första veckan är alltid gratis — kom in och känn efter.</p>
    <a class="cta" href="#medlemskap" data-slot="text" data-label="Stor knapp i hero">Prova gratis i 7 dagar</a>
  </div>
</div>

<section>
  <div class="wrap">
    <h2 class="section-title"><span>//</span> <span data-slot="text" data-label="Rubrik för passen">Veckans pass</span></h2>
    <p class="section-sub" data-slot="text" data-label="Undertext för passen">Alla nivåer är välkomna — instruktören anpassar.</p>
    <div class="pass-grid">
      <div class="pass"><img data-slot="image" data-label="Pass 1 – bild" src="${window.ex('gym-barbell', 700, 500, '#2b2f39', '#c8f046', 'Passbild 1')}" alt=""><div class="pbody"><h3 data-slot="text" data-label="Pass 1 – namn">Styrkelyft Bas</h3><p data-slot="text" data-label="Pass 1 – beskrivning">Mån &amp; Ons 18.00 · Teknik i knäböj, bänk och mark.</p></div></div>
      <div class="pass"><img data-slot="image" data-label="Pass 2 – bild" src="${window.ex('gym-kettle', 700, 500, '#2b2f39', '#c8f046', 'Passbild 2')}" alt=""><div class="pbody"><h3 data-slot="text" data-label="Pass 2 – namn">HIIT 30</h3><p data-slot="text" data-label="Pass 2 – beskrivning">Tis &amp; Tors 17.30 · Trettio svettiga minuter, klart.</p></div></div>
      <div class="pass"><img data-slot="image" data-label="Pass 3 – bild" src="${window.ex('gym-yoga', 700, 500, '#2b2f39', '#c8f046', 'Passbild 3')}" alt=""><div class="pbody"><h3 data-slot="text" data-label="Pass 3 – namn">Mobility &amp; Core</h3><p data-slot="text" data-label="Pass 3 – beskrivning">Lör 10.00 · Rörlighet och bål i lugnt tempo.</p></div></div>
    </div>
  </div>
</section>

<section id="medlemskap">
  <div class="wrap">
    <h2 class="section-title"><span>//</span> <span data-slot="text" data-label="Rubrik för medlemskap">Medlemskap</span></h2>
    <p class="section-sub" data-slot="text" data-label="Undertext för medlemskap">Ingen bindningstid. Pausa när du vill.</p>
    <div class="prisrad">
      <div class="pris"><h3 data-slot="text" data-label="Medlemskap 1 – namn">Dagtid</h3><div class="belopp"><span data-slot="text" data-label="Medlemskap 1 – pris">299</span><small> kr/mån</small></div><ul data-slot="text" data-multiline data-label="Medlemskap 1 – innehåll">Gym vardagar 05–15
Omklädning &amp; bastu</ul></div>
      <div class="pris populär"><h3 data-slot="text" data-label="Medlemskap 2 – namn">Allt-i-ett</h3><div class="belopp"><span data-slot="text" data-label="Medlemskap 2 – pris">449</span><small> kr/mån</small></div><ul data-slot="text" data-multiline data-label="Medlemskap 2 – innehåll">Gym alla tider
Alla gruppass
Gästa andra klubbar</ul></div>
      <div class="pris"><h3 data-slot="text" data-label="Medlemskap 3 – namn">Student</h3><div class="belopp"><span data-slot="text" data-label="Medlemskap 3 – pris">349</span><small> kr/mån</small></div><ul data-slot="text" data-multiline data-label="Medlemskap 3 – innehåll">Gym alla tider
Alla gruppass
Mot giltig studentlegitimation</ul></div>
    </div>
  </div>
</section>

<section class="kontakt">
  <div class="wrap">
    <div>
      <h2 data-slot="text" data-label="Rubrik för kontakt">Kom förbi idag</h2>
      <p data-slot="text" data-multiline data-label="Adress och kontakt">Verkstadsgatan 8, 972 34 Luleå
0920-123 45 · hej@norrskengym.se
Bemannat vardagar 10–19</p>
    </div>
    <img data-slot="image" data-label="Bild vid kontakt" src="${window.ex('gym-contact', 800, 520, '#a8cc3a', '#16181d', 'Bild · t.ex. receptionen')}" alt="" style="width:100%; border-radius:14px;">
  </div>
</section>

<footer><span data-slot="text" data-label="Sidfotstext">© 2026 Norrsken Gym · En del av ditt starkare jag</span></footer>

</body>
</html>`;

  window.TEMPLATES.push({
    id: 'gym',
    name: 'Gym & Träning',
    category: 'Lokalt företag',
    html: html
  });
})();
