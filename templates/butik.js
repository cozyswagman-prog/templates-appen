(function () {
  const ph = window.ph;

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Butik</title>
<style>
${window.fontCss('playfair', 'inter')}
  /* Riktning: lugn nordisk designbutik – varm ljus papperston och sandytor, Playfair Display (400) i rubriker,
     Inter i text och gränssnitt, djup salviagrön som enda accent för handlingar. Bara vikterna 400/700, inga kursiver.
     Samma innehållsbredd (1080 px) och samma hörnradie (4 px) överallt. */
  :root {
    --ink: #1f1c1a; --muted: #5f5852; --paper: #fbfaf7; --soft: #f2efe9; --line: #e2ddd5;
    --accent: #4b5a46; --accent-dark: #3f4d3b; --dark: #262220; --on-dark: #e9e4dc; --off: #6b635c; --off-line: #a39b91; --ui-line: #8c847b;
    --radius: 4px;
  }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-size: 17px; color: var(--ink); background: var(--paper); line-height: 1.65; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 0 24px; }
  h1, h2, h3 { font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; font-weight: 400; line-height: 1.15; letter-spacing: -.01em; text-wrap: balance; }

  nav { background: var(--paper); border-bottom: 1px solid var(--line); }
  nav .wrap { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px 24px; min-height: 68px; padding-top: 12px; padding-bottom: 12px; }
  .brand { font-weight: 700; font-size: 16px; letter-spacing: .2em; text-transform: uppercase; }
  nav small { color: var(--muted); font-size: 14px; }

  .hero { background: var(--soft); }
  .hero .wrap { display: grid; grid-template-columns: 1fr 1.15fr; gap: 64px; align-items: center; padding-top: 88px; padding-bottom: 88px; }
  .hero h1 { font-size: clamp(38px, 5.2vw, 64px); line-height: 1.08; letter-spacing: -.015em; margin-bottom: 24px; }
  .hero p { color: var(--muted); font-size: 19px; line-height: 1.6; max-width: 40ch; text-wrap: pretty; }
  .hero img { display: block; width: 100%; height: auto; aspect-ratio: 5 / 4; object-fit: cover; border-radius: var(--radius); }

  section { padding: 96px 0; }
  .section-title { font-size: clamp(30px, 3.6vw, 44px); margin-bottom: 32px; }

  .product-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 56px 32px; }
  .product { display: flex; flex-direction: column; min-width: 0; }
  .product img { display: block; width: 100%; height: auto; aspect-ratio: 4 / 5; object-fit: cover; background: var(--soft); border-radius: var(--radius); }
  .product .pbody { display: grid; grid-template-columns: 1fr auto; gap: 4px 16px; align-items: baseline; padding-top: 18px; }
  .product b { font-family: 'Playfair Display', Georgia, serif; font-weight: 400; font-size: clamp(18px, 1.8vw, 21px); line-height: 1.3; }
  .product .pris { grid-column: 2; grid-row: 1; font-weight: 700; font-size: 16px; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .product small { grid-column: 1 / -1; color: var(--muted); font-size: 15px; line-height: 1.5; }

  .about { background: var(--dark); color: var(--on-dark); text-align: center; }
  .about h2 { color: #fff; font-size: clamp(30px, 3.6vw, 44px); margin-bottom: 24px; }
  .about p { max-width: 56ch; margin: 0 auto; font-size: 18px; line-height: 1.75; text-wrap: pretty; }

  .contact .wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 32px 64px; align-items: start; }
  .contact .section-title { margin-bottom: 0; }
  .contact p { white-space: pre-line; font-size: 20px; line-height: 1.8; padding-left: 32px; border-left: 2px solid var(--accent); }

  footer { border-top: 1px solid var(--line); text-align: center; padding: 32px 24px; font-size: 14px; color: var(--muted); }

  /* SiteKit-delar i butikens ton: samma typsnitt, bredd, accent och hörnradie som resten av sidan. */
  .kit-butik { --kit-accent: var(--accent); --kit-bg: var(--paper); --kit-ink: var(--ink); --kit-line: var(--line); }
  .kit-butik .kit-section { padding: 96px 0; }
  .kit-butik .kit-wrap { max-width: 1080px; padding: 0 24px; }
  .kit-butik .kit-wrap > h2 { font-size: clamp(30px, 3.6vw, 44px); line-height: 1.15; margin-bottom: 32px; }
  .kit-butik .kit-section h3 { font-size: 28px; line-height: 1.25; margin: 8px 0 12px; }
  .kit-butik .kit-section p { max-width: 60ch; }
  .kit-butik .kit-section img { border-radius: var(--radius); }
  .kit-butik .kit-grid { gap: 32px 64px; align-items: center; }
  .kit-butik .kit-eyebrow { font: 700 12px/1.6 'Inter', system-ui, sans-serif; letter-spacing: .14em; color: var(--accent); }
  .kit-butik .kit-button, .kit-butik .kit-filter button, .kit-butik .kit-form button {
    font: 700 15px/1.4 'Inter', system-ui, sans-serif; border-radius: var(--radius); padding: 11px 22px; min-height: 46px;
    transition: background-color .15s ease-out, border-color .15s ease-out, color .15s ease-out;
  }
  .kit-butik .kit-button:not([aria-disabled=true]):hover { background: var(--accent-dark); border-color: var(--accent-dark); }
  /* Ej kopplade knappar: streckad kontur och dämpad text, så att de inte ser ut som en vanlig handling. */
  .kit-butik .kit-button[aria-disabled=true] { background: transparent; color: var(--off); border: 1px dashed var(--off-line); opacity: 1; cursor: not-allowed; }
  .kit-butik .kit-link-note { font: 13px/1.5 'Inter', system-ui, sans-serif; color: var(--muted); margin: 6px 0 0; }
  .kit-butik .kit-filter { gap: 8px; margin: 0 0 40px; }
  .kit-butik .kit-filter button { font-size: 14px; padding: 9px 18px; min-height: 44px; background: transparent; color: var(--ink); border-color: var(--ui-line); }
  .kit-butik .kit-filter button:hover { border-color: var(--ink); }
  .kit-butik .kit-filter button[aria-pressed=true] { background: var(--accent); border-color: var(--accent); color: #fff; }
  .kit-butik .kit-detail summary { font: 700 16px/1.5 'Inter', system-ui, sans-serif; }
  .kit-butik .kit-detail summary::marker { color: var(--accent); }
  .kit-butik .kit-detail p { font-size: 16px; color: var(--muted); margin-top: 0; }

  /* Produktkortens tillägg: detaljer och köpknapp linjerar längst ner i varje kort. */
  .kit-butik .kit-product .kit-inline { display: flex; flex-direction: column; padding: 0; margin-top: auto; padding-top: 16px; }
  .kit-butik .kit-product .kit-detail { border-top: 1px solid var(--line); padding: 0; margin-bottom: 16px; }
  .kit-butik .kit-product .kit-detail summary { font-size: 15px; min-height: 44px; padding: 10px 0; }
  .kit-butik .kit-product .kit-detail p { font-size: 15px; margin-bottom: 16px; }
  .kit-butik .kit-product .kit-button { width: 100%; }

  .kit-butik [data-section="collection"] { background: var(--soft); border-top: 0; }
  .kit-butik [data-section="faq"] .kit-detail { max-width: 760px; }
  .kit-butik [data-section="faq"] .kit-detail summary { font-size: 17px; }
  .kit-butik [data-section="contact"] { background: var(--soft); border-top: 0; }
  .kit-butik [data-section="contact"] .kit-contact { font-size: 18px; line-height: 1.7; }
  .kit-butik [data-section="contact"] .kit-contact h3 { margin-top: 0; }
  .kit-butik [data-section="contact"] .kit-actions { flex-direction: column; align-items: stretch; gap: 12px; max-width: 360px; margin: 0; }
  .kit-butik [data-section="contact"] .kit-actions > .kit-button { flex: 0 0 auto; }
  .kit-butik [data-section="contact"] .kit-actions .kit-link-note { margin: -6px 0 4px; }
  .kit-butik [data-section="contact"] .kit-button[data-action="directions"]:not([aria-disabled=true]) { background: transparent; color: var(--accent); }
  .kit-butik [data-section="contact"] .kit-button[data-action="directions"]:not([aria-disabled=true]):hover { background: var(--accent); color: #fff; }
  .kit-butik [data-section="contact"] .kit-note { font: 14px/1.6 'Inter', system-ui, sans-serif; color: var(--muted); }

  @media (max-width: 860px) {
    .hero .wrap { gap: 40px; }
    .product-grid { gap: 48px 20px; }
    .kit-butik .kit-grid { gap: 32px 40px; }
    .contact .wrap { grid-template-columns: 1fr; }
  }
  @media (max-width: 760px) {
    body { font-size: 16px; }
    .wrap, .kit-butik .kit-wrap { padding: 0 20px; }
    .hero .wrap { grid-template-columns: 1fr; gap: 32px; padding-top: 48px; padding-bottom: 56px; }
    .hero p { font-size: 17px; }
    .about { text-align: left; }
    .hero img { aspect-ratio: 4 / 3; }
    section, .kit-butik .kit-section { padding: 64px 0; }
    .contact p { font-size: 18px; padding-left: 20px; }
    .kit-butik [data-section="contact"] .kit-actions { max-width: none; }
    .kit-butik .kit-section h3 { font-size: 24px; }
  }
  @media (max-width: 700px) {
    .product-grid { grid-template-columns: repeat(2, 1fr); }
    .product img { aspect-ratio: 1 / 1; }
  }
  @media (max-width: 560px) {
    .product-grid { grid-template-columns: 1fr; gap: 48px; }
    .product img { aspect-ratio: 4 / 3; }
    .kit-butik .kit-filter button { flex: 1 1 auto; padding: 9px 12px; }
  }
</style>
</head>
<body>

<nav>
  <div class="wrap">
    <div class="brand" data-slot="text" data-label="Butikens namn i menyn">STUDIO FORM</div>
    <small data-slot="text" data-label="Liten text i menyn">Fri frakt över 499 kr</small>
  </div>
</nav>

<div class="hero">
  <div class="wrap">
    <div>
      <h1 data-slot="text" data-label="Stor rubrik">Noga utvalda ting för ditt hem</h1>
      <p data-slot="text" data-label="Text under rubriken">Vi handplockar keramik, textil och inredning från små nordiska producenter. Varje föremål har en historia.</p>
    </div>
    <img data-slot="image" data-label="Hero-bild" src="${ph(900, 700, '#e5e0db', '#44403c', 'Hero-bild · t.ex. en produktbild')}" alt="">
  </div>
</div>

<section>
  <div class="wrap">
    <h2 class="section-title" data-slot="text" data-label="Rubrik för produkter">Våra favoriter just nu</h2>
    <div class="product-grid">
      <div class="product">
        <img data-slot="image" data-label="Produktbild 1" src="${ph(700, 700, '#efece8', '#57534e', 'Produktbild 1')}" alt="">
        <div class="pbody"><b data-slot="text" data-label="Produkt 1 – namn">Vas Alva</b><small data-slot="text" data-label="Produkt 1 – beskrivning">Handdrejad stengodsvas, 18 cm</small><span class="pris" data-slot="text" data-label="Produkt 1 – pris">549 kr</span></div>
      </div>
      <div class="product">
        <img data-slot="image" data-label="Produktbild 2" src="${ph(700, 700, '#efece8', '#57534e', 'Produktbild 2')}" alt="">
        <div class="pbody"><b data-slot="text" data-label="Produkt 2 – namn">Pläd Fjäll</b><small data-slot="text" data-label="Produkt 2 – beskrivning">100 % ull, vävd i Sverige</small><span class="pris" data-slot="text" data-label="Produkt 2 – pris">895 kr</span></div>
      </div>
      <div class="product">
        <img data-slot="image" data-label="Produktbild 3" src="${ph(700, 700, '#efece8', '#57534e', 'Produktbild 3')}" alt="">
        <div class="pbody"><b data-slot="text" data-label="Produkt 3 – namn">Ljusstake Brand</b><small data-slot="text" data-label="Produkt 3 – beskrivning">Gjuten mässing, set om två</small><span class="pris" data-slot="text" data-label="Produkt 3 – pris">395 kr</span></div>
      </div>
      <div class="product">
        <img data-slot="image" data-label="Produktbild 4" src="${ph(700, 700, '#efece8', '#57534e', 'Produktbild 4')}" alt="">
        <div class="pbody"><b data-slot="text" data-label="Produkt 4 – namn">Mugg Rand</b><small data-slot="text" data-label="Produkt 4 – beskrivning">Keramik, 30 cl, flera färger</small><span class="pris" data-slot="text" data-label="Produkt 4 – pris">245 kr</span></div>
      </div>
      <div class="product">
        <img data-slot="image" data-label="Produktbild 5" src="${ph(700, 700, '#efece8', '#57534e', 'Produktbild 5')}" alt="">
        <div class="pbody"><b data-slot="text" data-label="Produkt 5 – namn">Bricka Ek</b><small data-slot="text" data-label="Produkt 5 – beskrivning">Massiv ek, 45 × 32 cm</small><span class="pris" data-slot="text" data-label="Produkt 5 – pris">465 kr</span></div>
      </div>
      <div class="product">
        <img data-slot="image" data-label="Produktbild 6" src="${ph(700, 700, '#efece8', '#57534e', 'Produktbild 6')}" alt="">
        <div class="pbody"><b data-slot="text" data-label="Produkt 6 – namn">Kudde Lin</b><small data-slot="text" data-label="Produkt 6 – beskrivning">Tvättat lin, 50 × 50 cm</small><span class="pris" data-slot="text" data-label="Produkt 6 – pris">349 kr</span></div>
      </div>
    </div>
  </div>
</section>

<section class="about">
  <div class="wrap">
    <h2 data-slot="text" data-label="Rubrik för om oss">Om Studio Form</h2>
    <p data-slot="text" data-label="Om oss-text">Vi startade 2019 med en enkel idé: vackra vardagsföremål ska vara tillverkade med omsorg, av människor som bryr sig. Välkommen in i vår butik på Södermalm eller handla direkt härifrån.</p>
  </div>
</section>

<section class="contact">
  <div class="wrap">
    <h2 class="section-title" data-slot="text" data-label="Rubrik för kontakt">Hitta till oss</h2>
    <p data-slot="text" data-multiline data-label="Kontaktuppgifter">Hornsgatan 82, 118 21 Stockholm
Ons–Fre 11–18 · Lör–Sön 11–16
hej@studioform.se</p>
  </div>
</section>

<footer><span data-slot="text" data-label="Sidfotstext">© 2026 Studio Form · Alla priser inkl. moms</span></footer>

</body>
</html>`;

  window.TEMPLATES.push({
    id: 'butik',
    name: 'Butik & Produkter',
    category: 'Butik',
    html: html
  });
})();
