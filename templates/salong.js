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
  :root { --rose: #b76e79; --blush: #f9f1ee; --ink: #322b2d; --sand: #e8dcd5; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; color: var(--ink); background: #fff; line-height: 1.65; }
  .wrap { max-width: 1020px; margin: 0 auto; padding: 0 24px; }
  h1, h2 { font-family: 'Playfair Display', Georgia, serif; font-weight: 400; letter-spacing: 1px; }

  nav { display: flex; justify-content: center; padding: 22px; font-size: 13px; letter-spacing: 3px; text-transform: uppercase; color: var(--rose); font-weight: 600; }

  .hero { display: grid; grid-template-columns: 1fr 1fr; min-height: 480px; background: var(--blush); }
  .hero-text { display: flex; flex-direction: column; justify-content: center; padding: 48px; }
  .hero-text h1 { font-size: 46px; line-height: 1.15; margin-bottom: 18px; }
  .hero-text p { color: #6d5f62; font-size: 17px; max-width: 40ch; }
  .hero-text .cta { margin-top: 28px; display: inline-block; width: fit-content; background: var(--rose); color: #fff; text-decoration: none; padding: 13px 34px; border-radius: 99px; font-size: 14px; letter-spacing: 1px; }
  .hero img { width: 100%; height: 100%; object-fit: cover; }

  section { padding: 76px 0; }
  .section-title { text-align: center; font-size: 30px; margin-bottom: 50px; text-transform: uppercase; letter-spacing: 4px; }

  .price-list { max-width: 560px; margin: 0 auto; }
  .price-row { display: flex; align-items: baseline; gap: 10px; padding: 13px 0; border-bottom: 1px solid var(--sand); }
  .price-row .dots { flex: 1; border-bottom: 1px dotted #c9b8b1; }
  .price-row .pris { color: var(--rose); font-weight: 600; }

  .team { background: var(--blush); }
  .team-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; text-align: center; }
  .team-grid img { width: 170px; height: 170px; border-radius: 50%; object-fit: cover; margin-bottom: 14px; }
  .team-grid b { display: block; font-size: 17px; font-weight: 600; }
  .team-grid small { color: #8a797c; }

  .contact { text-align: center; }
  .contact p { white-space: pre-line; color: #6d5f62; font-size: 17px; }

  footer { background: var(--ink); color: #cfc2c5; text-align: center; padding: 26px; font-size: 13px; letter-spacing: 1px; }

  @media (max-width: 720px) {
    .hero { grid-template-columns: 1fr; }
    .hero img { height: 280px; }
    .hero-text h1 { font-size: 34px; }
    .team-grid { grid-template-columns: 1fr; }
    section { padding: 54px 0; }
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
  <img data-slot="image" data-label="Hero-bild till höger" src="${ph(900, 1000, '#e3cdc7', '#b76e79', 'Bild på salongen eller en frisyr')}" alt="">
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
