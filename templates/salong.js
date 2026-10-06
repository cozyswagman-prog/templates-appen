(function () {
  const ph = window.ph;

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Salong</title>
<style>
${window.fontCss('playfair', 'inter')}
  /* Riktning: lugn, exklusiv skönhetssalong – blush och varm vit, Playfair-rubriker, Inter i text och gränssnitt,
     djup rosé-plommon som enda accent för handlingar, pillerformade knappar och mycket luft.
     Bara vikterna 400/700 finns och inga kursiver. */
  :root {
    --rose: #b76e79; --blush: #f9f1ee; --ink: #322b2d; --sand: #e8dcd5;
    --accent: #8a4a58; --accent-dark: #6f3a46; --muted: #6b5a5e; --line: #ead9d4; --plum: #4a2a33; --on-dark: #f9f1ee;
  }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-size: 17px; color: var(--ink); background: #fff; line-height: 1.65; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 1060px; margin: 0 auto; padding: 0 24px; }
  h1, h2, h3 { font-family: 'Playfair Display', Georgia, serif; font-weight: 400; line-height: 1.15; letter-spacing: -.01em; text-wrap: balance; }
  :focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }

  nav { display: flex; align-items: center; justify-content: center; min-height: 68px; padding: 12px 24px; background: #fff; border-bottom: 1px solid var(--line); font-size: 14px; letter-spacing: .28em; text-transform: uppercase; color: var(--accent); font-weight: 700; text-align: center; }

  .hero { display: grid; grid-template-columns: 1fr 1fr; min-height: clamp(520px, 74vh, 700px); background: var(--blush); }
  .hero-text { display: flex; flex-direction: column; justify-content: center; align-items: flex-start; padding: 64px clamp(24px, 6vw, 96px); }
  .hero-text::before { content: ""; width: 48px; height: 2px; background: var(--rose); margin-bottom: 32px; }
  .hero-text h1 { font-size: clamp(40px, 5vw, 66px); line-height: 1.06; letter-spacing: -.02em; margin-bottom: 24px; max-width: 15ch; }
  .hero-text p { color: var(--muted); font-size: 18px; line-height: 1.6; max-width: 40ch; text-wrap: pretty; }
  .hero-text .cta { margin-top: 36px; display: inline-flex; align-items: center; justify-content: center; min-height: 52px; background: var(--accent); color: #fff; text-decoration: none; padding: 14px 36px; border-radius: 999px; font-size: 16px; font-weight: 700; letter-spacing: .02em; transition: background-color .15s ease-out; }
  .hero-text .cta:hover { background: var(--accent-dark); }
  .hero img { display: block; width: 100%; height: 100%; object-fit: cover; }

  section { padding: 104px 0; }
  .section-title { text-align: center; font-size: clamp(32px, 4vw, 46px); margin-bottom: 56px; }

  .price-list { max-width: 680px; margin: 0 auto; border-top: 1px solid var(--line); }
  .price-row { display: flex; flex-wrap: wrap; align-items: baseline; column-gap: 14px; padding: 24px 0; border-bottom: 1px solid var(--line); }
  .price-row > span:first-child { font-family: 'Playfair Display', Georgia, serif; font-size: 21px; line-height: 1.3; }
  .price-row .dots { flex: 1 1 24px; border-bottom: 1px dotted #cdb0aa; transform: translateY(-5px); }
  .price-row .pris { color: var(--accent); font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }

  .team { background: #fff; }
  .team-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; text-align: center; max-width: 900px; margin: 0 auto; }
  .team-grid img { display: block; width: 184px; height: 184px; margin: 0 auto 24px; border-radius: 50%; object-fit: cover; border: 6px solid var(--blush); }
  .team-grid b { display: block; font-family: 'Playfair Display', Georgia, serif; font-size: 23px; font-weight: 400; line-height: 1.3; }
  .team-grid small { display: block; margin-top: 6px; color: var(--muted); font-size: 13px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }

  .contact { background: var(--plum); color: var(--on-dark); text-align: center; }
  .contact .section-title { margin-bottom: 32px; }
  .contact p { white-space: pre-line; font-family: 'Playfair Display', Georgia, serif; font-size: clamp(19px, 2.2vw, 23px); line-height: 1.8; color: #ead7d9; max-width: 40ch; margin: 0 auto; }
  .contact :focus-visible { outline-color: var(--on-dark); }

  footer { background: var(--ink); color: #cfc2c5; text-align: center; padding: 28px 24px; font-size: 14px; letter-spacing: .04em; }

  /* SiteKit-tillägg i salongens ton: samma typsnitt, accent, rundade knappar och rytm. */
  .kit-salong { --kit-accent: var(--accent); --kit-bg: var(--blush); --kit-ink: var(--ink); --kit-line: var(--line); }
  .kit-salong .kit-section { padding: 104px 0; border-top: 0; }
  .kit-salong .kit-wrap { max-width: 1060px; padding: 0 24px; }
  .kit-salong .kit-wrap > h2 { text-align: center; font-size: clamp(32px, 4vw, 46px); line-height: 1.15; margin-bottom: 56px; }
  .kit-salong .kit-grid { gap: 56px; align-items: center; }
  .kit-salong .kit-section h3 { font-size: clamp(26px, 2.8vw, 32px); font-weight: 400; line-height: 1.2; margin: 0 0 16px; }
  .kit-salong .kit-section p, .kit-salong .kit-detail p { max-width: 60ch; color: var(--muted); }
  .kit-salong .kit-section img { border-radius: 12px; }
  .kit-salong .kit-button, .kit-salong .kit-compare button, .kit-salong .kit-filter button {
    font-family: 'Inter', system-ui, sans-serif; font-size: 15px; font-weight: 700; letter-spacing: .02em; border-radius: 999px; padding: 12px 26px; transition: background-color .15s ease-out, border-color .15s ease-out, color .15s ease-out;
  }
  .kit-salong .kit-button:not([aria-disabled=true]):hover { background: var(--accent-dark); border-color: var(--accent-dark); }
  /* Ej kopplade knappar: tydligt inaktiva, streckad kant och dämpad text. */
  .kit-salong .kit-button[aria-disabled=true] { background: transparent; color: var(--muted); border: 1px dashed #c9adad; opacity: 1; cursor: not-allowed; }
  .kit-salong .kit-note { font-family: 'Inter', system-ui, sans-serif; color: var(--muted); }
  .kit-salong .kit-link-note { font-family: 'Inter', system-ui, sans-serif; font-size: 13px; color: var(--muted); }
  .kit-salong .kit-compare .kit-actions { margin: 0 0 20px; gap: 8px; }
  .kit-salong .kit-compare button { background: transparent; color: var(--accent); border-color: #d7bcbc; }
  .kit-salong .kit-compare button[aria-pressed=true] { background: var(--accent); color: #fff; border-color: var(--accent); }
  .kit-salong .kit-compare figcaption { font-family: 'Inter', system-ui, sans-serif; color: var(--muted); margin-top: 12px; }
  .kit-salong .kit-detail { border-color: var(--line); }
  .kit-salong .kit-detail summary { font-family: 'Inter', system-ui, sans-serif; font-size: 17px; }
  .kit-salong .kit-detail summary::marker { color: var(--accent); }
  .kit-salong .kit-actions { gap: 12px; align-items: center; }
  .kit-salong .kit-actions > .kit-link-note { order: 10; flex-basis: 100%; margin: 0; }
  .kit-salong .kit-actions > .kit-link-note ~ .kit-link-note { margin-top: -8px; }

  /* Prislistan: namn och pris på första raden, tid under, bokningsknapp och hjälptext sist. */
  .kit-salong .price-list .price-row > small { flex-basis: 100%; font: 400 14px/1.5 'Inter', system-ui, sans-serif; color: var(--muted); margin-top: 4px; }
  .kit-salong .price-list .price-row > .kit-button { flex: 0 0 auto; margin-top: 16px; min-height: 44px; padding: 10px 22px; font-size: 14px; }
  .kit-salong .price-list .price-row > .kit-link-note { flex: 1 1 200px; margin: 16px 0 0 4px; }

  .kit-salong [data-section="inspiration"] { background: var(--blush); }
  .kit-salong [data-section="faq"] { background: var(--blush); }
  .kit-salong [data-section="faq"] .kit-detail { max-width: 760px; margin-left: auto; margin-right: auto; }
  .kit-salong [data-section="contact"] { background: #fff; }
  /* Utan ifyllda kontaktuppgifter: dölj den tomma spalten och centrera knapparna. */
  .kit-salong [data-section="contact"] .kit-grid:has(.kit-contact h3:empty):has(.kit-contact address:empty) { grid-template-columns: 1fr; justify-items: center; text-align: center; }
  .kit-salong [data-section="contact"] .kit-contact:has(h3:empty):has(address:empty) { display: none; }
  .kit-salong [data-section="contact"] .kit-grid:has(.kit-contact h3:empty):has(.kit-contact address:empty) .kit-actions { justify-content: center; }
  .kit-salong [data-section="contact"] .kit-grid:has(.kit-contact h3:empty):has(.kit-contact address:empty) .kit-note { max-width: none; }
  .kit-salong .kit-contact h3 { font-size: clamp(26px, 2.8vw, 32px); }
  .kit-salong .kit-contact address { color: var(--muted); }
  .kit-salong .kit-contact a:not(.kit-button) { text-decoration-color: var(--rose); }

  @media (max-width: 860px) {
    .hero { min-height: 0; }
    .hero-text { padding: 56px 32px; }
    .team-grid { gap: 24px; }
    .team-grid img { width: 148px; height: 148px; }
    .kit-salong .kit-grid { gap: 40px; }
  }
  @media (max-width: 720px) {
    body { font-size: 16px; }
    .wrap, .kit-salong .kit-wrap { padding: 0 20px; }
    nav { min-height: 60px; font-size: 13px; }
    .hero { grid-template-columns: 1fr; }
    .hero-text { padding: 48px 20px 56px; }
    .hero-text::before { margin-bottom: 24px; }
    .hero-text h1 { font-size: clamp(36px, 10vw, 44px); }
    .hero-text h1 { max-width: none; }
    .hero-text p { font-size: 17px; }
    .hero-text .cta { margin-top: 28px; }
    .hero img { height: auto; aspect-ratio: 4 / 3; }
    section, .kit-salong .kit-section { padding: 72px 0; }
    .section-title, .kit-salong .kit-wrap > h2 { margin-bottom: 40px; }
    .price-row { padding: 20px 0; }
    .price-row > span:first-child { font-size: 19px; }
    .kit-salong .price-list .price-row > .kit-link-note { flex-basis: 100%; margin: 8px 0 0; }
    .team-grid { grid-template-columns: 1fr; gap: 20px; text-align: left; max-width: 420px; }
    .team-grid > div { display: grid; grid-template-columns: 96px 1fr; column-gap: 20px; align-items: center; }
    .team-grid img { grid-row: 1 / 3; width: 96px; height: 96px; margin: 0; border-width: 4px; }
    .team-grid b { align-self: end; font-size: 21px; }
    .team-grid small { align-self: start; margin-top: 2px; }
  }
</style>
</head>
<body>

<nav><span data-slot="text" data-label="Namn i menyraden">SALONG BELLA</span></nav>

<div class="hero">
  <div class="hero-text">
    <h1 data-slot="text" data-label="Stor rubrik">Känn dig som din bästa version</h1>
    <p data-slot="text" data-label="Text under rubriken">Klippning, färg och styling i hjärtat av stan. Vi tar hand om dig från första konsultation till färdig look.</p>
    <a class="cta" href="#boka" data-slot="text" data-label="Knapptext">Boka tid</a>
  </div>
  <img data-slot="image" data-label="Hero-bild till höger" src="${window.ex('salong-hero', 900, 1000, '#e3cdc7', '#b76e79', 'Bild på salongen eller en frisyr')}" alt="">
</div>

<section>
  <div class="wrap">
    <h2 class="section-title" data-slot="text" data-label="Rubrik för prislistan">Behandlingar &amp; priser</h2>
    <div class="price-list">
      <div class="price-row"><span data-slot="text" data-label="Behandling 1">Klippning, kort hår</span><span class="dots"></span><span class="pris" data-slot="text" data-label="Pris 1">495 kr</span></div>
      <div class="price-row"><span data-slot="text" data-label="Behandling 2">Klippning, långt hår</span><span class="dots"></span><span class="pris" data-slot="text" data-label="Pris 2">595 kr</span></div>
      <div class="price-row"><span data-slot="text" data-label="Behandling 3">Färg &amp; slingor</span><span class="dots"></span><span class="pris" data-slot="text" data-label="Pris 3">från 1 295 kr</span></div>
      <div class="price-row"><span data-slot="text" data-label="Behandling 4">Styling &amp; uppsättning</span><span class="dots"></span><span class="pris" data-slot="text" data-label="Pris 4">695 kr</span></div>
    </div>
  </div>
</section>

<section class="team">
  <div class="wrap">
    <h2 class="section-title" data-slot="text" data-label="Rubrik för teamet">Vårt team</h2>
    <div class="team-grid">
      <div>
        <img data-slot="image" data-label="Foto – person 1" src="${ph(400, 400, '#d8c0ba', '#8a5560', 'Foto 1')}" alt="">
        <b data-slot="text" data-label="Namn – person 1">Sara Lindqvist</b>
        <small data-slot="text" data-label="Titel – person 1">Frisör &amp; ägare</small>
      </div>
      <div>
        <img data-slot="image" data-label="Foto – person 2" src="${ph(400, 400, '#d8c0ba', '#8a5560', 'Foto 2')}" alt="">
        <b data-slot="text" data-label="Namn – person 2">Elin Åberg</b>
        <small data-slot="text" data-label="Titel – person 2">Färgspecialist</small>
      </div>
      <div>
        <img data-slot="image" data-label="Foto – person 3" src="${ph(400, 400, '#d8c0ba', '#8a5560', 'Foto 3')}" alt="">
        <b data-slot="text" data-label="Namn – person 3">Jonas Berg</b>
        <small data-slot="text" data-label="Titel – person 3">Barberare</small>
      </div>
    </div>
  </div>
</section>

<section class="contact" id="boka">
  <div class="wrap">
    <h2 class="section-title" data-slot="text" data-label="Rubrik för kontakt">Boka din tid</h2>
    <p data-slot="text" data-multiline data-label="Kontaktuppgifter">Ring 08-98 76 54 eller boka online
Drottninggatan 44, 111 21 Stockholm
Tis–Fre 09–18 · Lör 10–15</p>
  </div>
</section>

<footer><span data-slot="text" data-label="Sidfotstext">© 2026 Salong Bella</span></footer>

</body>
</html>`;

  window.TEMPLATES.push({
    id: 'salong',
    name: 'Frisör & Salong',
    category: 'Lokalt företag',
    html: html
  });
})();
