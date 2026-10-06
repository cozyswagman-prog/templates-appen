(function () {
  const ph = window.ph;

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Restaurang</title>
<style>
${window.fontCss('playfair', 'inter')}
  /* Riktning: klassisk trattoria i kvällsljus – espressomörka ytor och varm gräddton, Playfair Display i rubriker,
     Inter i brödtext och gränssnitt, vinrött som enda accent för handlingar och guld bara som dekor.
     Bara vikterna 400/700 finns och inga kursiver. */
  :root {
    --red: #8c2f2f; --red-dark: #742626; --cream: #faf6ef; --paper: #fffdf9; --tint: #f3ebdf;
    --dark: #26201a; --deep: #1c1612; --ink: #26201a; --muted: #6b5c4c; --gold: #c9a35c; --gold-light: #d9b874;
    --gold-ink: #7a5c26; --line: #e6d8c5; --on-dark: #f5ecdf; --on-dark-muted: #cbbfae; --radius: 4px;
  }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Inter', system-ui, sans-serif; font-size: 17px; color: var(--ink); background: var(--cream); line-height: 1.65; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 1060px; margin: 0 auto; padding: 0 24px; }
  h1, h2, h3 { font-family: 'Playfair Display', Georgia, serif; font-weight: 400; line-height: 1.2; letter-spacing: -.005em; text-wrap: balance; }

  header { position: relative; min-height: clamp(540px, 80vh, 720px); color: #fff; display: flex; align-items: center; justify-content: center; text-align: center; background: var(--deep); overflow: hidden; }
  header .bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  header::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(24, 16, 11, .58) 0%, rgba(24, 16, 11, .64) 50%, rgba(24, 16, 11, .84) 100%); }
  .hero-inner { position: relative; z-index: 1; max-width: 860px; padding: 96px 24px; }
  .hero-inner .kicker { font-size: 13px; font-weight: 700; letter-spacing: .24em; text-transform: uppercase; color: var(--gold-light); display: inline-flex; align-items: center; gap: 16px; }
  .hero-inner .kicker::before, .hero-inner .kicker::after { content: ""; width: 32px; height: 1px; background: var(--gold); }
  .hero-inner h1 { font-size: clamp(48px, 8vw, 96px); line-height: 1.02; letter-spacing: -.015em; margin: 20px 0 16px; }
  .hero-inner p { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(20px, 2.4vw, 25px); line-height: 1.4; color: rgba(255, 255, 255, .9); }

  section { padding: 104px 0; }
  .section-title { text-align: center; font-size: clamp(32px, 4.4vw, 46px); margin-bottom: 14px; }
  .section-title::after, .kit-restaurang .kit-wrap > h2::after { content: ""; display: block; width: 48px; height: 2px; background: var(--gold); margin: 20px auto 0; }
  .section-sub { text-align: center; color: var(--muted); font-size: 18px; margin: 0 auto 44px; }
  .rule { width: 60px; height: 2px; background: var(--gold); margin: 14px auto 0; }

  .menu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 64px; max-width: 900px; margin: 0 auto; }
  .dish { display: flex; justify-content: space-between; align-items: baseline; gap: 20px; border-bottom: 1px dotted #c4b294; padding: 20px 0; }
  .dish b { font-family: 'Playfair Display', Georgia, serif; font-size: 21px; font-weight: 400; line-height: 1.3; display: block; margin-bottom: 4px; }
  .dish small { color: var(--muted); font-size: 15px; line-height: 1.5; display: block; }
  .dish .price { color: var(--ink); font-weight: 700; font-size: 17px; font-variant-numeric: tabular-nums; white-space: nowrap; }

  .gallery { background: var(--dark); }
  .gallery .section-title { color: var(--on-dark); }
  .gallery .section-sub { height: 0; overflow: hidden; margin-bottom: 48px; }
  .gallery-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .gallery-grid img { width: 100%; height: auto; aspect-ratio: 4 / 5; object-fit: cover; display: block; border-radius: var(--radius); }

  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; max-width: 900px; margin: 0 auto; }
  .info-grid > div { background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius); padding: 40px 44px; }
  .info-grid h3 { font-size: 28px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--line); }
  .info-grid p { white-space: pre-line; font-size: 18px; line-height: 1.8; font-variant-numeric: tabular-nums; }
  section:has(> .wrap > .info-grid) { background: var(--tint); }

  footer { background: var(--deep); color: var(--on-dark-muted); text-align: center; padding: 32px 24px; font-size: 14px; }

  /* Gemensamma tillägg (SiteKit) i trattorians ton: samma typsnitt, accent, hörnradie och rytm som resten av sidan. */
  .kit-restaurang { --kit-accent: var(--red); --kit-line: var(--line); --kit-ink: var(--ink); }
  .kit-restaurang .kit-section { padding: 104px 0; border-top: 0; }
  .kit-restaurang .kit-wrap > h2 { font-size: clamp(32px, 4.4vw, 46px); text-align: center; margin-bottom: 56px; }
  .kit-restaurang .kit-grid { gap: 64px; align-items: center; }
  .kit-restaurang .kit-section h3 { font-size: clamp(25px, 2.8vw, 32px); margin: 12px 0 16px; }
  .kit-restaurang .kit-section p, .kit-restaurang .kit-detail p { max-width: 60ch; margin: 0 0 16px; }
  .kit-restaurang .kit-section img { border-radius: var(--radius); }
  .kit-restaurang .kit-eyebrow { font-family: 'Inter', system-ui, sans-serif; font-size: 13px; letter-spacing: .16em; color: var(--gold-ink); }
  .kit-restaurang .kit-button, .kit-restaurang .kit-filter button, .kit-restaurang .kit-next, .kit-restaurang .kit-back, .kit-restaurang .kit-form button {
    font-family: 'Inter', system-ui, sans-serif; font-size: 15px; letter-spacing: .02em; border-radius: var(--radius); min-height: 48px; padding: 12px 26px;
    transition: background-color .15s ease-out, border-color .15s ease-out, color .15s ease-out;
  }
  .kit-restaurang .kit-button:not([aria-disabled=true]):hover, .kit-restaurang .kit-form button[type=submit]:hover { background: var(--red-dark); border-color: var(--red-dark); }
  /* Ej kopplade knappar ska se inaktiva ut: ingen fyllning, streckad kant, dämpad text. */
  .kit-restaurang .kit-button[aria-disabled=true] { background: transparent; color: var(--muted); border: 1px dashed #b5a48a; opacity: 1; }
  .kit-restaurang .kit-link-note { font-family: 'Inter', system-ui, sans-serif; color: var(--muted); }
  .kit-restaurang .kit-actions > .kit-link-note { order: 3; flex-basis: 100%; margin: 0; }

  /* Hero: bokning som primär handling, lunchen som sekundär konturknapp, notisen under båda. */
  .kit-restaurang .hero-inner .kit-actions { margin: 40px 0 0; gap: 12px; }
  .kit-restaurang .hero-inner .kit-button { min-width: 180px; }
  .kit-restaurang .hero-inner .kit-button:not([data-action]) { background: transparent; border-color: rgba(255, 255, 255, .75); color: #fff; }
  .kit-restaurang .hero-inner .kit-button:not([data-action]):hover { background: rgba(255, 255, 255, .12); border-color: #fff; }
  .kit-restaurang .hero-inner .kit-button[aria-disabled=true] { color: var(--on-dark-muted); border-color: rgba(245, 236, 223, .5); }
  .kit-restaurang .hero-inner .kit-link-note { margin-top: 4px; font-size: 14px; color: var(--on-dark-muted); }
  /* Är bokningen inte ansluten blir nästa fungerande knapp den vinröda huvudhandlingen. */
  .kit-restaurang .kit-button[data-action=booking][aria-disabled=true] ~ .kit-button:not([data-action]):not([aria-disabled=true]),
  .kit-restaurang .kit-button[data-action=booking][aria-disabled=true] ~ .kit-button[data-action=directions]:not([aria-disabled=true]),
  .kit-restaurang .kit-button[data-action=booking][aria-disabled=true] ~ .kit-button[data-action=directions][aria-disabled=true] ~ .kit-button[data-action=contact]:not([aria-disabled=true]) { background: var(--red); border-color: var(--red); color: #fff; }
  .kit-restaurang .kit-button[data-action=booking][aria-disabled=true] ~ .kit-button:not([data-action]):not([aria-disabled=true]):hover,
  .kit-restaurang .kit-button[data-action=booking][aria-disabled=true] ~ .kit-button[data-action=directions]:not([aria-disabled=true]):hover,
  .kit-restaurang .kit-button[data-action=booking][aria-disabled=true] ~ .kit-button[data-action=directions][aria-disabled=true] ~ .kit-button[data-action=contact]:not([aria-disabled=true]):hover { background: var(--red-dark); border-color: var(--red-dark); }
  .kit-restaurang header :focus-visible, .kit-restaurang .gallery :focus-visible { outline-color: var(--on-dark); }

  /* Menyfiltret centrerat över menyn, valt läge i espresso så att vinrött förblir handlingsfärgen. */
  .kit-restaurang .kit-filter { justify-content: center; margin: 0 auto 24px; gap: 8px; }
  .kit-restaurang .kit-filter button { min-height: 44px; padding: 10px 20px; font-weight: 700; color: var(--ink); border-color: #cdbca3; background: transparent; }
  .kit-restaurang .kit-filter button:hover { border-color: var(--ink); }
  .kit-restaurang .kit-filter button[aria-pressed=true] { background: var(--ink); border-color: var(--ink); color: var(--on-dark); }

  /* Dagens lunch på papper, frågorna i en smal läsvänlig spalt. */
  .kit-restaurang [data-section="lunch"] { background: var(--paper); }
  .kit-restaurang [data-section="faq"] .kit-wrap { max-width: 808px; }
  .kit-restaurang .kit-detail { border-bottom-color: var(--line); padding: 4px 0; }
  .kit-restaurang .kit-detail:first-of-type { border-top: 1px solid var(--line); }
  .kit-restaurang .kit-detail summary { font-family: 'Playfair Display', Georgia, serif; font-weight: 400; font-size: 21px; padding: 18px 0; }
  .kit-restaurang .kit-detail summary::marker { color: var(--red); }
  .kit-restaurang .kit-detail p { color: var(--muted); font-size: 17px; }

  /* Avslutningen: mörk kontaktyta i espresso som leder ner i sidfoten. */
  .kit-restaurang [data-section="contact"] { background: var(--dark); color: var(--on-dark); }
  .kit-restaurang [data-section="contact"] .kit-grid { align-items: start; }
  .kit-restaurang .kit-contact h3 { margin-top: 0; }
  .kit-restaurang .kit-contact address, .kit-restaurang .kit-contact p { font-size: 18px; line-height: 1.8; color: var(--on-dark); }
  .kit-restaurang [data-section="contact"] .kit-actions { margin-top: 8px; gap: 12px; }
  .kit-restaurang [data-section="contact"] .kit-button[data-action="directions"], .kit-restaurang [data-section="contact"] .kit-button[data-action="contact"] { background: transparent; border-color: rgba(245, 236, 223, .7); color: var(--on-dark); }
  .kit-restaurang [data-section="contact"] .kit-button[data-action="directions"]:not([aria-disabled=true]):hover, .kit-restaurang [data-section="contact"] .kit-button[data-action="contact"]:not([aria-disabled=true]):hover { background: rgba(245, 236, 223, .1); border-color: var(--on-dark); }
  .kit-restaurang [data-section="contact"] .kit-button[aria-disabled=true] { background: transparent; color: var(--on-dark-muted); border: 1px dashed rgba(245, 236, 223, .45); }
  .kit-restaurang [data-section="contact"] .kit-note, .kit-restaurang [data-section="contact"] .kit-link-note { color: var(--on-dark-muted); }
  .kit-restaurang [data-section="contact"] :focus-visible { outline-color: var(--on-dark); }
  /* Utan ifyllda kontaktuppgifter samlas knapparna i en centrerad spalt i stället för att lämna en tom vänsterhalva. */
  .kit-restaurang [data-section="contact"] .kit-grid:has(.kit-contact > h3:empty) { grid-template-columns: 1fr; text-align: center; }
  .kit-restaurang [data-section="contact"] .kit-grid:has(.kit-contact > h3:empty) .kit-contact { display: none; }
  .kit-restaurang [data-section="contact"] .kit-grid:has(.kit-contact > h3:empty) .kit-actions { justify-content: center; }
  .kit-restaurang [data-section="contact"] .kit-grid:has(.kit-contact > h3:empty) .kit-note { margin: 16px auto 0; }

  @media (max-width: 900px) {
    .kit-restaurang .kit-grid { gap: 40px; }
    .menu-grid { gap: 0 40px; }
    .info-grid > div { padding: 32px; }
  }
  @media (max-width: 720px) {
    body { font-size: 16px; }
    header { min-height: 0; }
    .hero-inner { padding: 88px 20px 80px; }
    .hero-inner .kicker { font-size: 12px; letter-spacing: .2em; gap: 12px; }
    .hero-inner .kicker::before, .hero-inner .kicker::after { width: 20px; }
    .kit-restaurang .hero-inner .kit-actions { flex-direction: column; align-items: stretch; max-width: 340px; margin-left: auto; margin-right: auto; }
    .kit-restaurang .hero-inner .kit-actions > .kit-button { flex: 0 0 auto; }
    .menu-grid, .info-grid { grid-template-columns: 1fr; }
    .dish { padding: 18px 0; }
    .dish b { font-size: 20px; }
    .gallery-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
    .gallery-grid img { aspect-ratio: 1 / 1; }
    .gallery-grid img:first-child { grid-column: 1 / -1; aspect-ratio: 4 / 3; }
    section, .kit-restaurang .kit-section { padding: 72px 0; }
    .kit-restaurang .kit-wrap { padding: 0 24px; }
    .section-sub { margin-bottom: 32px; }
    .kit-restaurang .kit-wrap > h2 { margin-bottom: 40px; }
    .info-grid > div { padding: 28px 24px; }
    .info-grid h3 { font-size: 25px; }
    .info-grid p, .kit-restaurang .kit-contact address, .kit-restaurang .kit-contact p { font-size: 17px; }
    .kit-restaurang .kit-detail summary { font-size: 19px; }
  }
</style>
</head>
<body>

<header>
  <img class="bg" data-slot="image" data-label="Stor bild högst upp" src="${window.ex('rest-hero', 1600, 900, '#4a3326', '#f5e9db', 'Hero-bild · t.ex. matsalen eller en signaturrätt')}" alt="">
  <div class="hero-inner">
    <div class="kicker" data-slot="text" data-label="Liten text ovanför namnet">Välkommen till</div>
    <h1 data-slot="text" data-label="Restaurangens namn">Trattoria Milano</h1>
    <p data-slot="text" data-label="Slogan under namnet">Äkta italienskt kök sedan 1998</p>
  </div>
</header>

<section>
  <div class="wrap">
    <h2 class="section-title" data-slot="text" data-label="Rubrik för menyn">Vår meny</h2>
    <p class="section-sub" data-slot="text" data-label="Undertext för menyn">Ett urval av våra favoriter</p>
    <div class="menu-grid">
      <div class="dish"><span><b data-slot="text" data-label="Rätt 1 – namn">Pasta Carbonara</b><small data-slot="text" data-label="Rätt 1 – beskrivning">Guanciale, pecorino, svartpeppar</small></span><span class="price" data-slot="text" data-label="Rätt 1 – pris">179 kr</span></div>
      <div class="dish"><span><b data-slot="text" data-label="Rätt 2 – namn">Pizza Margherita</b><small data-slot="text" data-label="Rätt 2 – beskrivning">San Marzano, mozzarella, basilika</small></span><span class="price" data-slot="text" data-label="Rätt 2 – pris">155 kr</span></div>
      <div class="dish"><span><b data-slot="text" data-label="Rätt 3 – namn">Saltimbocca</b><small data-slot="text" data-label="Rätt 3 – beskrivning">Kalv, salvia, prosciutto, vitvinssås</small></span><span class="price" data-slot="text" data-label="Rätt 3 – pris">245 kr</span></div>
      <div class="dish"><span><b data-slot="text" data-label="Rätt 4 – namn">Tiramisù</b><small data-slot="text" data-label="Rätt 4 – beskrivning">Husets klassiker med espresso</small></span><span class="price" data-slot="text" data-label="Rätt 4 – pris">95 kr</span></div>
    </div>
  </div>
</section>

<section class="gallery">
  <div class="wrap">
    <h2 class="section-title" data-slot="text" data-label="Rubrik för bildgalleriet">Smaka med ögonen</h2>
    <p class="section-sub">&nbsp;</p>
    <div class="gallery-grid">
      <img data-slot="image" data-label="Galleribild 1" src="${window.ex('rest-pasta', 800, 600, '#3a2d22', '#c9a35c', 'Galleribild 1')}" alt="">
      <img data-slot="image" data-label="Galleribild 2" src="${window.ex('rest-pizza', 800, 600, '#3a2d22', '#c9a35c', 'Galleribild 2')}" alt="">
      <img data-slot="image" data-label="Galleribild 3" src="${window.ex('rest-dessert', 800, 600, '#3a2d22', '#c9a35c', 'Galleribild 3')}" alt="">
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="info-grid">
      <div>
        <h3>Öppettider</h3>
        <p data-slot="text" data-multiline data-label="Öppettider">Mån–Tors: 11.00–22.00
Fre–Lör: 11.00–23.00
Söndag: 12.00–21.00</p>
      </div>
      <div>
        <h3>Hitta hit</h3>
        <p data-slot="text" data-multiline data-label="Adress och kontakt">Storgatan 12, 111 22 Stockholm
Telefon: 08-123 456 78
info@trattoriamilano.se</p>
      </div>
    </div>
  </div>
</section>

<footer>
  <span data-slot="text" data-label="Sidfotstext">© 2026 Trattoria Milano · Alla rättigheter förbehållna</span>
</footer>

</body>
</html>`;

  window.TEMPLATES.push({
    id: 'restaurang',
    name: 'Restaurang',
    category: 'Lokalt företag',
    html: html
  });
})();
