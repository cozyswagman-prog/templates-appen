(function () {
  const ph = window.ph;

  // Gemensam stil och sidhuvud för alla tre sidorna.
  // Riktning: skandinaviskt hantverksbageri – varm papperston, Lora-rubriker, Inter i brödtext och gränssnitt,
  // djup skogsgrön bas och terrakotta som enda accent (bara för handlingar). Bara vikterna 400/700 finns, inga kursiver.
  const css = `
${window.fontCss('lora', 'inter')}
  :root {
    --green: #2f4a3a; --green-deep: #22372b; --cream: #f7f3ec; --paper: #fdfaf4; --ink: #26261f; --muted: #5c5747;
    --warm: #a2572f; --warm-dark: #8c4b27; --warm-light: #e0a272; --line: #e3dbca; --on-dark: #f3ead9;
  }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Inter', system-ui, sans-serif; font-size: 17px; background: var(--cream); color: var(--ink); line-height: 1.65; -webkit-font-smoothing: antialiased; }
  h1, h2, h3 { font-family: 'Lora', Georgia, 'Times New Roman', serif; font-weight: 400; line-height: 1.2; letter-spacing: -.01em; text-wrap: balance; }
  .wrap { max-width: 1060px; margin: 0 auto; padding: 0 24px; }

  nav { background: var(--green); color: var(--on-dark); }
  nav .wrap { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 72px; }
  nav .brand { font-family: 'Lora', Georgia, serif; font-size: 22px; letter-spacing: .01em; }
  nav .links { display: flex; gap: 28px; font-size: 15px; }
  nav a { color: var(--on-dark); text-decoration: none; opacity: .8; border-bottom: 2px solid transparent; transition: opacity .15s ease-out, border-color .15s ease-out; }
  nav a:hover { opacity: 1; }
  nav a.here { opacity: 1; border-bottom-color: var(--warm-light); }

  section { padding: 96px 0; }
  .section-title { text-align: center; font-size: clamp(30px, 4vw, 42px); margin-bottom: 14px; }
  .section-sub { text-align: center; color: var(--muted); font-size: 18px; max-width: 40ch; margin: 0 auto 48px; }

  footer { background: var(--green-deep); color: #d9d1bd; text-align: center; padding: 28px 24px; font-size: 14px; }

  /* Gemensamma tillägg (SiteKit) i caféets ton: samma typsnitt, accent, hörn och rytm som resten av sidan. */
  .kit-cafe { --kit-accent: var(--warm); --kit-line: var(--line); }
  .kit-cafe .kit-section { padding: 96px 0; }
  .kit-cafe .kit-wrap > h2 { font-size: clamp(30px, 4vw, 42px); margin-bottom: 32px; }
  .kit-cafe .kit-section h3 { font-size: clamp(22px, 2.4vw, 26px); }
  .kit-cafe .kit-section p, .kit-cafe .kit-detail p { max-width: 62ch; }
  .kit-cafe .kit-section img { border-radius: 8px; }
  .kit-cafe .kit-eyebrow { font-family: 'Inter', system-ui, sans-serif; color: var(--warm); }
  .kit-cafe .kit-button, .kit-cafe .kit-filter button, .kit-cafe .kit-next, .kit-cafe .kit-back, .kit-cafe .kit-form button {
    font-family: 'Inter', system-ui, sans-serif; border-radius: 6px; padding: 12px 22px; transition: background-color .15s ease-out, border-color .15s ease-out;
  }
  .kit-cafe .kit-button:not([aria-disabled=true]):hover, .kit-cafe .kit-form button[type=submit]:hover { background: var(--warm-dark); border-color: var(--warm-dark); }
  /* Ej kopplade knappar ska se inaktiva ut, inte som en vanlig handling. */
  .kit-cafe .kit-button[aria-disabled=true] { background: transparent; color: var(--muted); border-color: #cfc5ae; opacity: 1; }
  .kit-cafe [data-section="contact"] .kit-button[aria-disabled=true] { color: #e6ddca; border-color: rgba(243, 234, 217, .45); }
  .kit-cafe .kit-filter { justify-content: center; margin-bottom: 44px; }
  .kit-cafe .kit-filter button { border-radius: 999px; }
  .kit-cafe .kit-detail summary { font-family: 'Inter', system-ui, sans-serif; font-size: 17px; }
  .kit-cafe .kit-detail summary::marker { color: var(--warm); }
  .kit-cafe .kit-note, .kit-cafe .kit-link-note, .kit-cafe .kit-progress, .kit-cafe .kit-form label, .kit-cafe .kit-form input, .kit-cafe .kit-form textarea, .kit-cafe .kit-form select { font-family: 'Inter', system-ui, sans-serif; }
  .kit-cafe .kit-form input, .kit-cafe .kit-form textarea, .kit-cafe .kit-form select { background: var(--paper); border-radius: 6px; }
  .kit-cafe [data-section="weekly"] { background: var(--paper); border-top: 0; }
  /* Avslutningen blir en mörk, tydlig kontaktyta som leder ner i sidfoten. */
  .kit-cafe [data-section="contact"] { background: var(--green); color: var(--on-dark); border-top: 0; }
  .kit-cafe [data-section="contact"] .kit-note, .kit-cafe [data-section="contact"] .kit-link-note { color: #e6ddca; }
  .kit-cafe [data-section="contact"] :focus-visible { outline-color: var(--on-dark); }

  @media (max-width: 720px) {
    body { font-size: 16px; }
    nav .wrap { flex-direction: column; gap: 2px; min-height: 0; padding-top: 12px; padding-bottom: 6px; }
    nav .links { gap: 24px; }
    section, .kit-cafe .kit-section { padding: 64px 0; }
    .section-sub { margin-bottom: 36px; }
  }`;

  function nav(active) {
    return `
<nav>
  <div class="wrap">
    <div class="brand" data-slot="text" data-label="Caféets namn i menyraden" data-shared="business-name">Café Linnéa</div>
    <div class="links">
      <a href="index.html" class="${active === 'hem' ? 'here' : ''}">Hem</a>
      <a href="meny.html" class="${active === 'meny' ? 'here' : ''}">Meny</a>
      <a href="kontakt.html" class="${active === 'kontakt' ? 'here' : ''}">Kontakt</a>
    </div>
  </div>
</nav>`;
  }

  const head = (titel) => `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titel}</title>
<style>${css}</style>
</head>
<body>`;

  // ---------- Sida 1: Hem ----------
  const hem = head('Café') + nav('hem') + `
<style>
  .hero { position: relative; min-height: clamp(480px, 74vh, 660px); display: flex; align-items: center; justify-content: center; text-align: center; color: #fff; overflow: hidden; background: var(--green-deep); }
  .hero img.bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .hero::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(20, 30, 24, .35) 0%, rgba(20, 30, 24, .55) 55%, rgba(20, 30, 24, .78) 100%); }
  .hero-inner { position: relative; z-index: 1; max-width: 820px; padding: 80px 24px; }
  .hero-inner h1 { font-size: clamp(44px, 7vw, 78px); line-height: 1.04; letter-spacing: -.02em; margin-bottom: 18px; }
  .hero-inner p { font-family: 'Lora', Georgia, serif; font-size: clamp(19px, 2.2vw, 23px); line-height: 1.45; color: rgba(255, 255, 255, .92); max-width: 34ch; margin: 0 auto; }
  .hero .kit-actions { margin-top: 36px; gap: 12px; }
  .kit-cafe .hero .kit-button:nth-child(2) { background: transparent; border-color: rgba(255, 255, 255, .8); color: #fff; }
  .kit-cafe .hero .kit-button:nth-child(2):hover { background: rgba(255, 255, 255, .14); border-color: #fff; }
  .kit-cafe .hero :focus-visible { outline-color: var(--on-dark); }
  .tre { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
  .tre > div { background: var(--paper); border-radius: 10px; overflow: hidden; box-shadow: 0 1px 2px rgba(38, 38, 31, .05), 0 10px 28px rgba(38, 38, 31, .07); }
  .tre img { display: block; width: 100%; height: auto; aspect-ratio: 4 / 3; object-fit: cover; }
  .tre h3 { margin: 22px 24px 8px; font-size: 23px; }
  .tre p { margin: 0 24px 26px; color: var(--muted); font-size: 16px; line-height: 1.6; }
  @media (max-width: 900px) { .tre { gap: 18px; } .tre h3 { margin: 18px 18px 6px; font-size: 21px; } .tre p { margin: 0 18px 22px; font-size: 15px; } }
  @media (max-width: 680px) { .tre { grid-template-columns: 1fr; max-width: 520px; margin: 0 auto; gap: 24px; } }
</style>
<div class="hero">
  <img class="bg" data-slot="image" data-label="Stor bild högst upp" src="${ph(1600, 900, '#39503f', '#f3ead9', 'Hero-bild · t.ex. fikabordet eller lokalen')}" alt="">
  <div class="hero-inner">
    <h1 data-slot="text" data-label="Caféets namn" data-contains-shared="business-name">Café Linnéa</h1>
    <p data-slot="text" data-label="Slogan">Surdegsbageri &amp; kafferosteri på hörnet</p>
  </div>
</div>
<section>
  <div class="wrap">
    <h2 class="section-title" data-slot="text" data-label="Rubrik mitt på sidan">Bakat i gryningen, serverat med kärlek</h2>
    <p class="section-sub" data-slot="text" data-label="Undertext">Allt görs för hand i vårt eget bageri</p>
    <div class="tre">
      <div><img data-slot="image" data-label="Bild 1 av tre" src="${ph(700, 520, '#e3dccd', '#2f4a3a', 'Bild 1')}" alt=""><h3 data-slot="text" data-label="Ruta 1 – rubrik">Surdegsbröd</h3><p data-slot="text" data-label="Ruta 1 – text">Bakas varje morgon på svenskt kulturmjöl.</p></div>
      <div><img data-slot="image" data-label="Bild 2 av tre" src="${ph(700, 520, '#e3dccd', '#2f4a3a', 'Bild 2')}" alt=""><h3 data-slot="text" data-label="Ruta 2 – rubrik">Eget rosteri</h3><p data-slot="text" data-label="Ruta 2 – text">Vi rostar bönorna själva, ljusrostat och spännande.</p></div>
      <div><img data-slot="image" data-label="Bild 3 av tre" src="${ph(700, 520, '#e3dccd', '#2f4a3a', 'Bild 3')}" alt=""><h3 data-slot="text" data-label="Ruta 3 – rubrik">Fika klassikerna</h3><p data-slot="text" data-label="Ruta 3 – text">Kanelbullar, kardemumma och morotskaka.</p></div>
    </div>
  </div>
</section>
<footer><span data-slot="text" data-label="Sidfotstext" data-contains-shared="business-name">© 2026 Café Linnéa · Följ oss gärna @cafelinnea</span></footer>
</body>
</html>`;

  // ---------- Sida 2: Meny ----------
  const meny = head('Meny') + nav('meny') + `
<style>
  .menylista { max-width: 660px; margin: 8px auto 0; }
  .menylista h3 { font-size: 26px; color: var(--green); border-bottom: 1px solid var(--line); padding-bottom: 12px; margin: 48px 0 6px; }
  .menylista h3:first-child { margin-top: 0; }
  .rad { display: flex; align-items: baseline; gap: 12px; padding: 16px 0; border-bottom: 1px solid var(--line); }
  .rad > span:first-child { font-family: 'Lora', Georgia, serif; font-size: 19px; }
  .rad .dots { flex: 1; border-bottom: 1px dotted #c3b9a2; transform: translateY(-5px); }
  .rad .pris { font-weight: 700; color: var(--warm); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .rad small { color: var(--muted); font-size: 14px; margin-top: 2px; }
</style>
<section>
  <div class="wrap">
    <h1 class="section-title" data-slot="text" data-label="Rubrik för menysidan">Vår meny</h1>
    <p class="section-sub" data-slot="text" data-label="Undertext för menysidan">Allt bakas och bryggs här i huset</p>
    <div class="menylista">
      <h3 data-slot="text" data-label="Kategori 1 – rubrik">Kaffe &amp; dryck</h3>
      <div class="rad"><span data-slot="text" data-label="Dryck 1">Bryggkaffe (påtår ingår)</span><span class="dots"></span><span class="pris" data-slot="text" data-label="Dryck 1 – pris">38 kr</span></div>
      <div class="rad"><span data-slot="text" data-label="Dryck 2">Cappuccino</span><span class="dots"></span><span class="pris" data-slot="text" data-label="Dryck 2 – pris">49 kr</span></div>
      <div class="rad"><span data-slot="text" data-label="Dryck 3">Te från Göteborgs Tehus</span><span class="dots"></span><span class="pris" data-slot="text" data-label="Dryck 3 – pris">42 kr</span></div>
      <h3 data-slot="text" data-label="Kategori 2 – rubrik">Fika</h3>
      <div class="rad"><span data-slot="text" data-label="Fika 1">Kanelbulle</span><span class="dots"></span><span class="pris" data-slot="text" data-label="Fika 1 – pris">42 kr</span></div>
      <div class="rad"><span data-slot="text" data-label="Fika 2">Morotskaka med citronfrosting</span><span class="dots"></span><span class="pris" data-slot="text" data-label="Fika 2 – pris">52 kr</span></div>
      <div class="rad"><span data-slot="text" data-label="Fika 3">Dagens surdegsmacka</span><span class="dots"></span><span class="pris" data-slot="text" data-label="Fika 3 – pris">79 kr</span></div>
    </div>
  </div>
</section>
<footer><span data-slot="text" data-label="Sidfotstext (menysidan)" data-contains-shared="business-name">© 2026 Café Linnéa</span></footer>
</body>
</html>`;

  // ---------- Sida 3: Kontakt ----------
  const kontakt = head('Kontakt') + nav('kontakt') + `
<style>
  .kgrid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 56px; align-items: center; }
  .kgrid img { display: block; width: 100%; height: auto; aspect-ratio: 5 / 4; object-fit: cover; border-radius: 10px; }
  .kgrid h3 { font-size: 26px; color: var(--green); margin-bottom: 10px; }
  .kgrid p { white-space: pre-line; margin-bottom: 32px; font-size: 18px; line-height: 1.7; }
  .kgrid p:last-child { margin-bottom: 0; }
  @media (max-width: 860px) { .kgrid { grid-template-columns: 1fr; gap: 36px; } .kgrid img { aspect-ratio: 16 / 10; } }
</style>
<section>
  <div class="wrap">
    <h1 class="section-title" data-slot="text" data-label="Rubrik för kontaktsidan">Hitta till oss</h1>
    <p class="section-sub" data-slot="text" data-label="Undertext för kontaktsidan">Vi ses över en kopp</p>
    <div class="kgrid">
      <img data-slot="image" data-label="Bild på kontaktsidan" src="${ph(800, 640, '#e3dccd', '#2f4a3a', 'Bild · t.ex. entrén eller lokalen')}" alt="">
      <div>
        <h3>Öppettider</h3>
        <p data-slot="text" data-multiline data-label="Öppettider">Mån–Fre: 07.30–17.00
Lör–Sön: 09.00–16.00</p>
        <h3>Adress &amp; kontakt</h3>
        <p data-slot="text" data-multiline data-label="Adress och kontakt">Linnégatan 23, 413 04 Göteborg
031-12 34 56
hej@cafelinnea.se</p>
      </div>
    </div>
  </div>
</section>
<footer><span data-slot="text" data-label="Sidfotstext (kontaktsidan)" data-contains-shared="business-name">© 2026 Café Linnéa</span></footer>
</body>
</html>`;

  window.TEMPLATES.push({
    id: 'cafe',
    name: 'Café & Bageri',
    category: 'Lokalt företag',
    pages: [
      { file: 'index.html', title: 'Hem', html: hem },
      { file: 'meny.html', title: 'Meny', html: meny },
      { file: 'kontakt.html', title: 'Kontakt', html: kontakt }
    ]
  });
})();
