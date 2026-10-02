(function () {
  const ph = window.ph;

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Butik</title>
<style>
${window.fontCss('inter')}
  :root { --ink: #111114; --paper: #ffffff; --soft: #f5f5f4; --line: #e7e5e4; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; color: var(--ink); background: var(--paper); line-height: 1.6; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 0 24px; }
  h1, h2 { font-weight: 700; letter-spacing: -.5px; }

  nav { border-bottom: 1px solid var(--line); }
  nav .wrap { display: flex; align-items: center; justify-content: space-between; padding-top: 18px; padding-bottom: 18px; }
  .brand { font-weight: 800; font-size: 19px; letter-spacing: 2px; text-transform: uppercase; }
  nav small { color: #78716c; }

  .hero { background: var(--soft); }
  .hero .wrap { display: grid; grid-template-columns: 1.1fr 1fr; gap: 40px; align-items: center; padding-top: 64px; padding-bottom: 64px; }
  .hero h1 { font-size: 44px; line-height: 1.1; margin-bottom: 16px; }
  .hero p { color: #57534e; font-size: 17px; max-width: 44ch; }
  .hero img { width: 100%; height: 360px; object-fit: cover; border-radius: 14px; }

  section { padding: 72px 0; }
  .section-title { font-size: 28px; text-align: center; margin-bottom: 44px; }

  .product-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
  .product { border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
  .product img { width: 100%; height: 260px; object-fit: cover; display: block; background: var(--soft); }
  .product .pbody { padding: 16px 18px 20px; }
  .product b { display: block; font-size: 16px; }
  .product small { color: #78716c; display: block; margin: 4px 0 10px; }
  .product .pris { font-weight: 800; font-size: 17px; }

  .about { background: var(--ink); color: #e7e5e4; text-align: center; }
  .about h2 { color: #fff; margin-bottom: 16px; }
  .about p { max-width: 58ch; margin: 0 auto; opacity: .85; }

  .contact { text-align: center; }
  .contact p { white-space: pre-line; color: #57534e; font-size: 17px; }

  footer { border-top: 1px solid var(--line); text-align: center; padding: 24px; font-size: 13px; color: #78716c; }

  @media (max-width: 760px) {
    .hero .wrap { grid-template-columns: 1fr; padding-top: 44px; padding-bottom: 44px; }
    .hero h1 { font-size: 32px; }
    .product-grid { grid-template-columns: 1fr; }
    section { padding: 52px 0; }
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
