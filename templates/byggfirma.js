(function () {
  const ph = window.ph;

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Byggfirma</title>
<style>
  :root { --navy: #14233c; --yellow: #f5b50a; --grey: #f2f4f7; --ink: #1c2533; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: var(--ink); background: #fff; line-height: 1.6; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 0 24px; }
  h1, h2, h3 { font-weight: 800; }

  .topbar { background: var(--navy); color: #fff; }
  .topbar .wrap { display: flex; align-items: center; justify-content: space-between; padding-top: 16px; padding-bottom: 16px; }
  .logo { font-weight: 800; font-size: 20px; letter-spacing: .5px; }
  .logo em { color: var(--yellow); font-style: normal; }
  .topbar .tel { font-weight: 700; color: var(--yellow); }

  .hero { position: relative; min-height: 480px; display: flex; align-items: center; color: #fff; }
  .hero .bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .hero::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(13,22,38,.88) 20%, rgba(13,22,38,.35)); }
  .hero .wrap { position: relative; z-index: 1; }
  .hero h1 { font-size: 46px; line-height: 1.1; max-width: 18ch; }
  .hero p { margin: 18px 0 26px; font-size: 18px; max-width: 48ch; opacity: .92; }
  .hero .cta { display: inline-block; background: var(--yellow); color: var(--navy); font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 6px; }

  section { padding: 72px 0; }
  .section-title { font-size: 32px; margin-bottom: 8px; }
  .section-title::after { content: ""; display: block; width: 56px; height: 5px; background: var(--yellow); margin-top: 10px; border-radius: 3px; }
  .section-sub { color: #5c6878; margin-bottom: 40px; max-width: 60ch; }

  .services { background: var(--grey); }
  .service-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
  .service { background: #fff; border-radius: 10px; padding: 26px; box-shadow: 0 2px 10px rgba(16,30,54,.07); }
  .service .icon { width: 46px; height: 46px; border-radius: 8px; background: var(--navy); color: var(--yellow); font-size: 22px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
  .service h3 { font-size: 18px; margin-bottom: 8px; }
  .service p { color: #5c6878; font-size: 15px; }

  .project-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
  .project { border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(16,30,54,.1); }
  .project img { width: 100%; height: 220px; object-fit: cover; display: block; }
  .project figcaption { padding: 14px 18px; font-weight: 700; background: #fff; }

  .quote { background: var(--navy); color: #fff; text-align: center; }
  .quote h2 { font-size: 30px; margin-bottom: 12px; }
  .quote p { opacity: .85; max-width: 52ch; margin: 0 auto 26px; white-space: pre-line; }
  .quote .cta { display: inline-block; background: var(--yellow); color: var(--navy); font-weight: 800; text-decoration: none; padding: 14px 36px; border-radius: 6px; }

  footer { background: #0d1626; color: #93a1b5; text-align: center; padding: 24px; font-size: 13px; }

  @media (max-width: 760px) {
    .hero h1 { font-size: 32px; }
    .service-grid, .project-grid { grid-template-columns: 1fr; }
    .topbar .wrap { flex-direction: column; gap: 6px; }
    section { padding: 52px 0; }
  }
</style>
</head>
<body>

<div class="topbar">
  <div class="wrap">
    <div class="logo" data-slot="text" data-label="Företagsnamn i toppen">NORDBYGG <em>AB</em></div>
    <div class="tel" data-slot="text" data-label="Telefonnummer i toppen">070-123 45 67</div>
  </div>
</div>

<div class="hero">
  <img class="bg" data-slot="image" data-label="Stor bild högst upp" src="${ph(1600, 900, '#2a3950', '#f5b50a', 'Hero-bild · t.ex. ett pågående bygge')}" alt="">
  <div class="wrap">
    <h1 data-slot="text" data-label="Stor rubrik">Hantverk som håller i generationer</h1>
    <p data-slot="text" data-label="Text under rubriken">Vi hjälper dig med allt från renovering till nybyggnation. Fast pris, tydlig tidsplan och alltid fackmannamässigt utfört.</p>
    <a class="cta" href="#offert" data-slot="text" data-label="Knapptext i hero">Begär offert</a>
  </div>
</div>

<section class="services">
  <div class="wrap">
    <h2 class="section-title" data-slot="text" data-label="Rubrik för tjänster">Våra tjänster</h2>
    <p class="section-sub" data-slot="text" data-label="Undertext för tjänster">Totalentreprenad eller enskilda uppdrag — vi anpassar oss efter ditt projekt.</p>
    <div class="service-grid">
      <div class="service"><div class="icon">🏠</div><h3 data-slot="text" data-label="Tjänst 1 – rubrik">Renovering</h3><p data-slot="text" data-label="Tjänst 1 – beskrivning">Kök, badrum och helrenoveringar med hög finish.</p></div>
      <div class="service"><div class="icon">🔨</div><h3 data-slot="text" data-label="Tjänst 2 – rubrik">Nybyggnation</h3><p data-slot="text" data-label="Tjänst 2 – beskrivning">Villor, garage och attefallshus från grund till nyckel.</p></div>
      <div class="service"><div class="icon">📐</div><h3 data-slot="text" data-label="Tjänst 3 – rubrik">Projektledning</h3><p data-slot="text" data-label="Tjänst 3 – beskrivning">Vi samordnar alla hantverkare så du slipper.</p></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <h2 class="section-title" data-slot="text" data-label="Rubrik för referenser">Utvalda projekt</h2>
    <p class="section-sub">&nbsp;</p>
    <div class="project-grid">
      <figure class="project"><img data-slot="image" data-label="Projektbild 1" src="${ph(800, 600, '#d8dde5', '#14233c', 'Projektbild 1')}" alt=""><figcaption data-slot="text" data-label="Projekt 1 – bildtext">Villa Ekudden — totalrenovering</figcaption></figure>
      <figure class="project"><img data-slot="image" data-label="Projektbild 2" src="${ph(800, 600, '#d8dde5', '#14233c', 'Projektbild 2')}" alt=""><figcaption data-slot="text" data-label="Projekt 2 – bildtext">Badrum, Täby — 2025</figcaption></figure>
      <figure class="project"><img data-slot="image" data-label="Projektbild 3" src="${ph(800, 600, '#d8dde5', '#14233c', 'Projektbild 3')}" alt=""><figcaption data-slot="text" data-label="Projekt 3 – bildtext">Attefallshus, Nacka</figcaption></figure>
    </div>
  </div>
</section>

<section class="quote" id="offert">
  <div class="wrap">
    <h2 data-slot="text" data-label="Rubrik för offert">Redo att starta ditt projekt?</h2>
    <p data-slot="text" data-multiline data-label="Kontaktuppgifter">Ring 070-123 45 67 eller mejla info@nordbygg.se
Vi återkommer med kostnadsfri offert inom 24 timmar.</p>
    <a class="cta" href="mailto:info@nordbygg.se" data-slot="text" data-label="Knapptext för offert">Kontakta oss</a>
  </div>
</section>

<footer><span data-slot="text" data-label="Sidfotstext">© 2026 Nordbygg AB · Org.nr 556677-8899 · Vi innehar F-skattsedel</span></footer>

</body>
</html>`;

  window.TEMPLATES.push({
    id: 'byggfirma',
    name: 'Byggfirma & Hantverk',
    category: 'Lokalt företag',
    html: html
  });
})();
