(function () {
  const ph = window.ph;

  // Gemensam stil och sidhuvud för alla tre sidorna
  const css = `
  :root { --green: #2f4a3a; --cream: #f7f3ec; --ink: #2b2b26; --warm: #c97b4a; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; background: var(--cream); color: var(--ink); line-height: 1.7; }
  .wrap { max-width: 980px; margin: 0 auto; padding: 0 24px; }
  h1, h2, h3 { font-weight: 400; }

  nav { background: var(--green); color: #f3ead9; }
  nav .wrap { display: flex; align-items: center; justify-content: space-between; padding-top: 16px; padding-bottom: 16px; }
  nav .brand { font-size: 20px; letter-spacing: 1px; }
  nav .links { display: flex; gap: 22px; font-family: system-ui, sans-serif; font-size: 14px; }
  nav a { color: #f3ead9; text-decoration: none; opacity: .85; }
  nav a:hover, nav a.here { opacity: 1; border-bottom: 2px solid var(--warm); padding-bottom: 2px; }

  section { padding: 64px 0; }
  .section-title { text-align: center; font-size: 32px; margin-bottom: 10px; }
  .section-sub { text-align: center; color: #6f6a58; font-style: italic; margin-bottom: 40px; }

  footer { background: var(--green); color: #cfc8b4; text-align: center; padding: 24px; font-family: system-ui, sans-serif; font-size: 13px; }

  @media (max-width: 720px) {
    nav .wrap { flex-direction: column; gap: 10px; }
    section { padding: 44px 0; }
  }`;

  function nav(active) {
    return `
<nav>
  <div class="wrap">
    <div class="brand" data-slot="text" data-label="Caféets namn i menyraden">Café Linnéa</div>
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
  .hero { position: relative; height: 440px; display: flex; align-items: center; justify-content: center; text-align: center; color: #fff; }
  .hero img.bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .hero::after { content: ""; position: absolute; inset: 0; background: rgba(32, 42, 35, .5); }
  .hero-inner { position: relative; z-index: 1; padding: 0 24px; }
  .hero-inner h1 { font-size: 48px; margin-bottom: 10px; }
  .hero-inner p { font-size: 19px; font-style: italic; }
  .tre { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center; }
  .tre img { width: 100%; height: 210px; object-fit: cover; border-radius: 10px; }
  .tre h3 { margin: 14px 0 6px; font-size: 20px; }
  .tre p { color: #6f6a58; font-size: 15px; font-family: system-ui, sans-serif; }
  @media (max-width: 720px) { .tre { grid-template-columns: 1fr; } .hero-inner h1 { font-size: 34px; } }
</style>
<div class="hero">
  <img class="bg" data-slot="image" data-label="Stor bild högst upp" src="${ph(1600, 900, '#39503f', '#f3ead9', 'Hero-bild · t.ex. fikabordet eller lokalen')}" alt="">
  <div class="hero-inner">
    <h1 data-slot="text" data-label="Caféets namn">Café Linnéa</h1>
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
<footer><span data-slot="text" data-label="Sidfotstext">© 2026 Café Linnéa · Följ oss gärna @cafelinnea</span></footer>
</body>
</html>`;

  // ---------- Sida 2: Meny ----------
  const meny = head('Meny') + nav('meny') + `
<style>
  .menylista { max-width: 620px; margin: 0 auto 48px; }
  .menylista h3 { font-size: 22px; color: var(--green); border-bottom: 2px solid var(--warm); padding-bottom: 8px; margin: 36px 0 18px; }
  .rad { display: flex; align-items: baseline; gap: 10px; padding: 9px 0; }
  .rad .dots { flex: 1; border-bottom: 1px dotted #b8b09a; }
  .rad .pris { font-family: system-ui, sans-serif; font-weight: 600; color: var(--warm); }
</style>
<section>
  <div class="wrap">
    <h2 class="section-title" data-slot="text" data-label="Rubrik för menysidan">Vår meny</h2>
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
<footer><span data-slot="text" data-label="Sidfotstext (menysidan)">© 2026 Café Linnéa</span></footer>
</body>
</html>`;

  // ---------- Sida 3: Kontakt ----------
  const kontakt = head('Kontakt') + nav('kontakt') + `
<style>
  .kgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; }
  .kgrid img { width: 100%; height: 340px; object-fit: cover; border-radius: 10px; }
  .kgrid h3 { font-size: 22px; color: var(--green); margin-bottom: 12px; }
  .kgrid p { white-space: pre-line; margin-bottom: 24px; }
  @media (max-width: 720px) { .kgrid { grid-template-columns: 1fr; } }
</style>
<section>
  <div class="wrap">
    <h2 class="section-title" data-slot="text" data-label="Rubrik för kontaktsidan">Hitta till oss</h2>
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
<footer><span data-slot="text" data-label="Sidfotstext (kontaktsidan)">© 2026 Café Linnéa</span></footer>
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
