(function () {
  const ph = window.ph;

  const bock = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="flex-shrink:0; margin-top:3px;"><circle cx="10" cy="10" r="10" fill="#0e9488"/><path d="M6 10.5l2.5 2.5L14 7.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hemservice</title>
<style>
${window.fontCss('outfit', 'inter')}
  /* Riktning: fräsch skandinavisk hemservice – vit bas och sval mintdimma, Outfit-rubriker och Inter i brödtext,
     djup teal som enda accent för handlingar, mjuka 16 px-kort och 8 px-knappar. Bara vikterna 400/700, inga kursiver. */
  :root {
    --teal: #0d6b60; --teal-dark: #0a5249; --deep: #0f4a44; --deeper: #0b3a35; --on-deep: #d5ebe7;
    --mist: #eef6f4; --ink: #14302c; --dim: #4b615d; --line: #d3e3df; --field: #6b8c85;
    --radius: 8px; --radius-lg: 16px; --shadow: 0 1px 2px rgba(20, 48, 44, .05), 0 8px 24px rgba(20, 48, 44, .06);
  }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-size: 17px; background: #fff; color: var(--ink); line-height: 1.65; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 1060px; margin: 0 auto; padding: 0 24px; }
  h1, h2, h3 { font-family: 'Outfit', 'Inter', system-ui, sans-serif; font-weight: 700; line-height: 1.15; letter-spacing: -.01em; text-wrap: balance; }

  nav { background: #fff; border-bottom: 1px solid var(--line); }
  nav .wrap { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 72px; }
  .brand { font-family: 'Outfit', 'Inter', system-ui, sans-serif; font-weight: 700; font-size: 21px; letter-spacing: -.01em; color: var(--teal); }
  nav .tel { gap: 8px; padding: 0 16px; border: 1px solid var(--line); border-radius: 999px; font-weight: 700; font-size: 16px; color: var(--ink); text-decoration: none; white-space: nowrap; transition: border-color .15s ease-out, background-color .15s ease-out; }
  nav .tel::before { content: ""; width: 16px; height: 16px; flex-shrink: 0; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230d6b60' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z'/%3E%3C/svg%3E") center / contain no-repeat; }
  nav .tel:hover { border-color: var(--teal); background: var(--mist); }

  .hero { background: var(--mist); }
  .hero .wrap { display: grid; grid-template-columns: 1.05fr 1fr; gap: 64px; align-items: center; padding-top: 80px; padding-bottom: 88px; }
  .hero .wrap > *, .tjanstegrid > *, .steggrid > * { min-width: 0; }
  .hero h1 { font-size: clamp(36px, 5.2vw, 56px); line-height: 1.06; letter-spacing: -.02em; margin-bottom: 20px; }
  .hero > .wrap p.ingress { color: var(--dim); font-size: 19px; line-height: 1.6; max-width: 44ch; margin-bottom: 28px; }
  .hero ul.usp { list-style: none; padding: 0; margin: 0 0 36px; display: flex; flex-direction: column; gap: 12px; }
  .hero ul.usp li { display: flex; gap: 12px; align-items: flex-start; font-weight: 400; }
  .hero ul.usp svg circle { fill: var(--teal); }
  .cta { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 14px 28px; background: var(--teal); color: #fff; font-weight: 700; font-size: 17px; line-height: 1.3; text-decoration: none; text-align: center; border-radius: var(--radius); box-shadow: 0 1px 2px rgba(11, 58, 53, .12), 0 6px 16px rgba(13, 107, 96, .18); transition: background-color .15s ease-out; }
  .cta:hover { background: var(--teal-dark); }
  .hero img { display: block; width: 100%; height: auto; aspect-ratio: 43 / 38; object-fit: cover; border-radius: var(--radius-lg); box-shadow: var(--shadow); }

  section { padding: 96px 0; }
  .section-title { font-size: clamp(30px, 4vw, 40px); margin-bottom: 12px; }
  .section-sub { color: var(--dim); font-size: 18px; max-width: 52ch; margin-bottom: 48px; }

  .tjanstegrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
  .tkort { display: flex; flex-direction: column; background: #fff; border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 28px 24px 12px; transition: border-color .15s ease-out; }
  .tkort:hover { border-color: #a9c7c0; }
  .tkort h3 { font-size: 22px; margin-bottom: 8px; }
  .tkort p { color: var(--dim); font-size: 16px; line-height: 1.6; }

  .steg { background: var(--deep); color: #fff; }
  .steg .section-title { color: #fff; }
  .steg .section-sub { color: var(--on-deep); }
  .steggrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
  .stegruta { border-top: 1px solid rgba(213, 235, 231, .28); padding-top: 28px; }
  .stegruta .nr { width: 48px; height: 48px; border-radius: 50%; background: #fff; color: var(--teal); font-family: 'Outfit', 'Inter', system-ui, sans-serif; font-weight: 700; font-size: 21px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
  .stegruta h3 { font-size: 22px; margin-bottom: 8px; }
  .stegruta p { color: var(--on-deep); font-size: 16px; max-width: 34ch; }

  .kontakt { text-align: center; background: var(--mist); }
  .kontakt .section-title { margin-bottom: 16px; }
  .kontakt p { color: var(--ink); white-space: pre-line; font-size: 19px; line-height: 1.7; margin-bottom: 32px; }

  footer { background: var(--deeper); text-align: center; padding: 32px 24px; color: #cfe3df; font-size: 14px; }

  /* SiteKit-delarna i samma typsnitt, accent, hörn och rytm som resten av sidan. */
  .kit-hemservice { --kit-accent: var(--teal); --kit-bg: #fff; --kit-ink: var(--ink); --kit-line: var(--line); }
  .kit-hemservice .kit-section { padding: 96px 0; border-top: 0; }
  .kit-hemservice .kit-wrap > h2 { font-size: clamp(30px, 4vw, 40px); margin-bottom: 20px; }
  .kit-hemservice .kit-grid { gap: 56px; }
  .kit-hemservice .kit-section p { max-width: 62ch; }
  .kit-hemservice .kit-section img { border-radius: var(--radius-lg); }
  .kit-hemservice .kit-button, .kit-hemservice .kit-next, .kit-hemservice .kit-back, .kit-hemservice .kit-form button {
    min-height: 48px; padding: 12px 24px; border-radius: var(--radius); font: 700 16px/1.3 'Inter', system-ui, sans-serif; transition: background-color .15s ease-out, border-color .15s ease-out;
  }
  .kit-hemservice .kit-button:not([aria-disabled=true]):hover, .kit-hemservice .kit-next:hover, .kit-hemservice .kit-form button[type=submit]:not(:disabled):hover { background: var(--teal-dark); border-color: var(--teal-dark); }
  .kit-hemservice .kit-back { background: #fff; color: var(--teal); border-color: var(--field); }
  .kit-hemservice .kit-back:hover { background: var(--mist); }
  /* Ej kopplade knappar ska se inaktiva ut, inte som en vanlig handling. */
  .kit-hemservice .kit-button[aria-disabled=true], .kit-hemservice .kit-form button:disabled { background: transparent; color: var(--dim); border: 1px dashed var(--field); box-shadow: none; opacity: 1; cursor: not-allowed; }
  .kit-hemservice .kit-link-note, .kit-hemservice .kit-note { font: 400 14px/1.6 'Inter', system-ui, sans-serif; color: var(--dim); }
  .kit-hemservice .kit-eyebrow, .kit-hemservice .kit-progress { font: 700 13px/1.5 'Inter', system-ui, sans-serif; letter-spacing: .08em; text-transform: uppercase; color: var(--teal); }

  .kit-hemservice .kit-detail summary { display: flex; align-items: center; justify-content: space-between; gap: 16px; list-style: none; font: 700 17px/1.4 'Inter', system-ui, sans-serif; }
  .kit-hemservice .kit-detail summary::-webkit-details-marker { display: none; }
  .kit-hemservice .kit-detail summary::after { content: ""; width: 9px; height: 9px; flex-shrink: 0; margin-right: 4px; border-right: 2px solid var(--teal); border-bottom: 2px solid var(--teal); transform: translateY(-3px) rotate(45deg); transition: transform .15s ease-out; }
  .kit-hemservice .kit-detail[open] summary::after { transform: translateY(2px) rotate(-135deg); }
  .kit-hemservice .kit-detail p { color: var(--dim); margin-top: 0; }
  .kit-hemservice .tkort .kit-detail { margin-top: auto; padding: 0; border-bottom: 0; }
  .kit-hemservice .tkort .kit-detail summary { margin-top: 20px; border-top: 1px solid var(--line); font-size: 15px; color: var(--teal); }
  .kit-hemservice .tkort .kit-detail p { font-size: 15px; margin: 0 0 16px; }

  .kit-hemservice .kit-form label, .kit-hemservice .kit-calculator label { font: 700 15px/1.5 'Inter', system-ui, sans-serif; margin: 0 0 20px; }
  .kit-hemservice .kit-form input, .kit-hemservice .kit-form textarea, .kit-hemservice .kit-form select,
  .kit-hemservice .kit-calculator input, .kit-hemservice .kit-calculator select { font: 400 16px/1.5 'Inter', system-ui, sans-serif; background: #fff; border-color: var(--field); border-radius: var(--radius); }
  .kit-hemservice .kit-form :focus-visible, .kit-hemservice .kit-calculator :focus-visible { outline-offset: 2px; }

  /* Prisindikatorn som ett eget, tydligt kort. */
  .kit-hemservice [data-section="estimate"] { background: var(--mist); }
  .kit-hemservice .kit-calculator { margin-top: 28px; padding: 32px; background: #fff; border-radius: var(--radius-lg); box-shadow: var(--shadow); }
  .kit-hemservice .kit-price { font-family: 'Outfit', 'Inter', system-ui, sans-serif; display: block; font-size: clamp(24px, 3vw, 30px); line-height: 1.2; color: var(--teal); margin: 28px 0 4px; padding-top: 24px; border-top: 1px solid var(--line); }
  .kit-hemservice .kit-calculator .kit-note { margin: 0 0 20px; }
  .kit-hemservice .kit-calculator .kit-button { width: 100%; }
  .kit-hemservice [data-section="estimate"] .kit-grid { align-items: center; }

  /* Förfrågan i ett lugnt kort med tydliga steg. */
  .kit-hemservice [data-section="enquiry"] .kit-form { margin-top: 32px; padding: 36px; background: var(--mist); border-radius: var(--radius-lg); }
  .kit-hemservice .kit-form legend { font: 700 22px/1.25 'Outfit', 'Inter', system-ui, sans-serif; margin: 8px 0 20px; padding: 0; }
  .kit-hemservice .kit-form .kit-actions { margin: 8px 0 0; gap: 12px; }
  .kit-hemservice .kit-form [role=status] { margin: 16px 0 0; font-size: 15px; color: var(--dim); }
  .kit-hemservice .kit-form .kit-progress { margin: 0 0 4px; }

  .kit-hemservice [data-section="faq"] .kit-wrap > * { max-width: 760px; }
  .kit-hemservice [data-section="faq"] .kit-detail { border-bottom-color: var(--line); }

  /* Avslutningen blir en mörk, tydlig kontaktyta som leder ner i sidfoten. */
  .kit-hemservice [data-section="contact"] { background: var(--deep); color: #fff; }
  .kit-hemservice [data-section="contact"] .kit-contact address, .kit-hemservice [data-section="contact"] .kit-contact p { color: var(--on-deep); }
  .kit-hemservice [data-section="contact"] .kit-contact h3 { color: #fff; }
  .kit-hemservice [data-section="contact"] .kit-actions { align-items: center; }
  .kit-hemservice [data-section="contact"] .kit-button:not([aria-disabled=true]) { background: #fff; border-color: #fff; color: var(--deep); }
  .kit-hemservice [data-section="contact"] .kit-button:not([aria-disabled=true]):hover { background: var(--on-deep); border-color: var(--on-deep); }
  .kit-hemservice [data-section="contact"] .kit-button[aria-disabled=true] { color: var(--on-deep); border-color: #8db8b0; }
  .kit-hemservice [data-section="contact"] .kit-link-note, .kit-hemservice [data-section="contact"] .kit-note { color: var(--on-deep); }
  .kit-hemservice [data-section="contact"] .kit-link-note { flex-basis: 100%; margin: -4px 0 4px; }
  /* Utan ifyllda företagsuppgifter: dölj den tomma spalten så att knapparna inte hamnar ute till höger. */
  .kit-hemservice [data-section="contact"] .kit-grid:has(.kit-contact > h3:empty + address:empty) { grid-template-columns: 1fr; }
  .kit-hemservice [data-section="contact"] .kit-contact:has(> h3:empty + address:empty) { display: none; }
  .kit-hemservice [data-section="contact"] :focus-visible { outline-color: #fff; }

  @media (max-width: 900px) {
    .tjanstegrid { grid-template-columns: 1fr 1fr; }
    .hero .wrap { gap: 40px; }
  }
  @media (max-width: 720px) {
    body { font-size: 16px; }
    .wrap, .kit-hemservice .kit-wrap { padding: 0 20px; }
    nav .wrap { min-height: 64px; gap: 12px; }
    .brand { font-size: 18px; line-height: 1.2; }
    nav .tel { padding: 0 12px; font-size: 15px; }
    nav .tel::before { display: none; }
    .hero .wrap { grid-template-columns: 1fr; gap: 40px; padding-top: 48px; padding-bottom: 56px; }
    .hero > .wrap p.ingress { font-size: 17px; }
    .cta { width: 100%; }
    .tjanstegrid, .steggrid { grid-template-columns: 1fr; }
    .steggrid { gap: 28px; }
    section, .kit-hemservice .kit-section { padding: 64px 0; }
    .section-sub { margin-bottom: 32px; }
    .kontakt p { font-size: 17px; }
    .kit-hemservice .kit-grid { gap: 40px; }
    .kit-hemservice .kit-calculator, .kit-hemservice [data-section="enquiry"] .kit-form { padding: 24px 20px; }
    .kit-hemservice [data-section="contact"] .kit-contact p { margin-bottom: 0; }
  }
</style>
</head>
<body>

<nav>
  <div class="wrap">
    <div class="brand" data-slot="text" data-label="Företagsnamn i toppen">Rent &amp; Klart Hemservice</div>
    <a class="tel" href="tel:0701234567" data-slot="text" data-label="Telefonnummer i toppen">070-123 45 67</a>
  </div>
</nav>

<div class="hero">
  <div class="wrap">
    <div>
      <h1 data-slot="text" data-label="Stor rubrik">Kom hem till ett skinande rent hem</h1>
      <p class="ingress" data-slot="text" data-label="Text under rubriken">Hemstäd, flyttstäd och fönsterputs i hela kommunen. Samma städare varje gång, nöjd-kund-garanti och priser du ser innan du bokar.</p>
      <ul class="usp">
        <li>${bock}<span data-slot="text" data-label="Punkt 1">Fast pris — inga överraskningar på fakturan</span></li>
        <li>${bock}<span data-slot="text" data-label="Punkt 2">RUT-avdraget dras direkt, vi sköter pappren</span></li>
        <li>${bock}<span data-slot="text" data-label="Punkt 3">Försäkrade och bakgrundskontrollerade städare</span></li>
      </ul>
      <a class="cta" href="#kontakt" data-slot="text" data-label="Knapp i hero">Få prisförslag inom en timme</a>
    </div>
    <img data-slot="image" data-label="Hero-bild till höger" src="${ph(860, 760, '#d4e8e5', '#0e9488', 'Bild · t.ex. ett nystädat rum')}" alt="">
  </div>
</div>

<section>
  <div class="wrap">
    <h2 class="section-title" data-slot="text" data-label="Rubrik för tjänster">Våra tjänster</h2>
    <p class="section-sub" data-slot="text" data-label="Undertext för tjänster">Boka en gång eller återkommande — du bestämmer.</p>
    <div class="tjanstegrid">
      <div class="tkort"><h3 data-slot="text" data-label="Tjänst 1 – rubrik">Hemstäd</h3><p data-slot="text" data-label="Tjänst 1 – beskrivning">Veckovis eller varannan vecka. Från 349 kr/tim efter RUT.</p></div>
      <div class="tkort"><h3 data-slot="text" data-label="Tjänst 2 – rubrik">Flyttstäd</h3><p data-slot="text" data-label="Tjänst 2 – beskrivning">Godkänd av hyresvärdar och mäklare. Garanti vid besiktning.</p></div>
      <div class="tkort"><h3 data-slot="text" data-label="Tjänst 3 – rubrik">Fönsterputs</h3><p data-slot="text" data-label="Tjänst 3 – beskrivning">Kristallklara fönster, även höga och svåråtkomliga.</p></div>
      <div class="tkort"><h3 data-slot="text" data-label="Tjänst 4 – rubrik">Storstäd</h3><p data-slot="text" data-label="Tjänst 4 – beskrivning">Djuprengöring inför högtider, visning eller bara för känslan.</p></div>
    </div>
  </div>
</section>

<section class="steg">
  <div class="wrap">
    <h2 class="section-title" data-slot="text" data-label="Rubrik för stegen">Så enkelt är det</h2>
    <p class="section-sub" data-slot="text" data-label="Undertext för stegen">Från förfrågan till rent hem på tre steg.</p>
    <div class="steggrid">
      <div class="stegruta"><div class="nr">1</div><h3 data-slot="text" data-label="Steg 1 – rubrik">Berätta vad du behöver</h3><p data-slot="text" data-label="Steg 1 – text">Ring eller mejla — beskriv bostaden och vad som ska göras.</p></div>
      <div class="stegruta"><div class="nr">2</div><h3 data-slot="text" data-label="Steg 2 – rubrik">Få fast pris</h3><p data-slot="text" data-label="Steg 2 – text">Du får ett prisförslag inom en timme, utan förpliktelser.</p></div>
      <div class="stegruta"><div class="nr">3</div><h3 data-slot="text" data-label="Steg 3 – rubrik">Luta dig tillbaka</h3><p data-slot="text" data-label="Steg 3 – text">Vi kommer på utsatt tid — och städar tills du är nöjd.</p></div>
    </div>
  </div>
</section>

<section class="kontakt" id="kontakt">
  <div class="wrap">
    <h2 class="section-title" data-slot="text" data-label="Rubrik för kontakt">Boka eller fråga oss</h2>
    <p data-slot="text" data-multiline data-label="Kontaktuppgifter">070-123 45 67 · boka@rentochklart.se
Vardagar 07–18, lördagar 09–14</p>
    <a class="cta" href="mailto:boka@rentochklart.se" data-slot="text" data-label="Knapp för kontakt">Skicka förfrågan</a>
  </div>
</section>

<footer><span data-slot="text" data-label="Sidfotstext">© 2026 Rent &amp; Klart Hemservice AB · F-skatt och ansvarsförsäkring</span></footer>

</body>
</html>`;

  window.TEMPLATES.push({
    id: 'hemservice',
    name: 'Hemservice & Städ',
    category: 'Lokalt företag',
    html: html
  });
})();
