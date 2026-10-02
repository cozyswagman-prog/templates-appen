(function () {
  const ph = window.ph;

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Restaurang</title>
<style>
  :root { --red: #8c2f2f; --cream: #faf6ef; --dark: #26201a; --gold: #c9a35c; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; color: var(--dark); background: var(--cream); line-height: 1.6; }
  .wrap { max-width: 1060px; margin: 0 auto; padding: 0 24px; }
  h1, h2, h3 { font-weight: 400; letter-spacing: .5px; }

  header { position: relative; height: 520px; color: #fff; display: flex; align-items: center; justify-content: center; text-align: center; }
  header .bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  header::after { content: ""; position: absolute; inset: 0; background: rgba(30, 18, 12, .55); }
  .hero-inner { position: relative; z-index: 1; padding: 0 24px; }
  .hero-inner .kicker { font-family: system-ui, sans-serif; font-size: 13px; letter-spacing: 4px; text-transform: uppercase; color: var(--gold); }
  .hero-inner h1 { font-size: 56px; margin: 12px 0 10px; }
  .hero-inner p { font-size: 19px; font-style: italic; opacity: .9; }

  section { padding: 72px 0; }
  .section-title { text-align: center; font-size: 34px; margin-bottom: 8px; }
  .section-sub { text-align: center; color: #7a6a58; font-style: italic; margin-bottom: 44px; }
  .rule { width: 60px; height: 2px; background: var(--gold); margin: 14px auto 0; }

  .menu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 56px; max-width: 860px; margin: 0 auto; }
  .dish { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px dotted #cbbba2; padding-bottom: 12px; }
  .dish b { font-weight: 700; display: block; }
  .dish small { color: #7a6a58; }
  .dish .price { color: var(--red); font-weight: 700; white-space: nowrap; }

  .gallery { background: var(--dark); }
  .gallery .section-title, .gallery .section-sub { color: var(--cream); }
  .gallery-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .gallery-grid img { width: 100%; height: 240px; object-fit: cover; display: block; }

  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; max-width: 860px; margin: 0 auto; }
  .info-grid h3 { font-size: 22px; margin-bottom: 14px; color: var(--red); }
  .info-grid p { white-space: pre-line; }

  footer { background: var(--red); color: #f5e9db; text-align: center; padding: 28px 24px; font-family: system-ui, sans-serif; font-size: 14px; }

  @media (max-width: 720px) {
    header { height: 420px; }
    .hero-inner h1 { font-size: 38px; }
    .menu-grid, .info-grid { grid-template-columns: 1fr; }
    .gallery-grid { grid-template-columns: 1fr; }
    section { padding: 52px 0; }
  }
</style>
</head>
<body>

<header>
  <img class="bg" data-slot="image" data-label="Stor bild högst upp" src="${ph(1600, 900, '#4a3326', '#f5e9db', 'Hero-bild · t.ex. matsalen eller en signaturrätt')}" alt="">
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
      <img data-slot="image" data-label="Galleribild 1" src="${ph(800, 600, '#3a2d22', '#c9a35c', 'Galleribild 1')}" alt="">
      <img data-slot="image" data-label="Galleribild 2" src="${ph(800, 600, '#3a2d22', '#c9a35c', 'Galleribild 2')}" alt="">
      <img data-slot="image" data-label="Galleribild 3" src="${ph(800, 600, '#3a2d22', '#c9a35c', 'Galleribild 3')}" alt="">
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
