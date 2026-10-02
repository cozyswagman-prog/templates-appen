(function () {
  const ph = window.ph;

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Portfolio</title>
<style>
${window.fontCss('outfit')}
  :root { --bg: #101014; --card: #1a1a21; --text: #ececf1; --dim: #9a9aa6; --accent: #67e8aa; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.65; }
  .wrap { max-width: 1020px; margin: 0 auto; padding: 0 24px; }
  h1, h2 { font-weight: 800; letter-spacing: -.5px; }

  .hero { padding: 110px 0 80px; }
  .hero .hej { color: var(--accent); font-weight: 700; font-size: 15px; letter-spacing: 2px; text-transform: uppercase; }
  .hero h1 { font-size: 58px; line-height: 1.05; margin: 16px 0 20px; }
  .hero p { color: var(--dim); font-size: 19px; max-width: 52ch; }

  section { padding: 64px 0; }
  .section-title { font-size: 26px; margin-bottom: 36px; }
  .section-title span { color: var(--accent); }

  .work-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 26px; }
  .work { background: var(--card); border-radius: 14px; overflow: hidden; border: 1px solid #26262f; }
  .work img { width: 100%; height: 260px; object-fit: cover; display: block; }
  .work .wbody { padding: 18px 20px 22px; }
  .work b { font-size: 17px; display: block; margin-bottom: 4px; }
  .work small { color: var(--dim); }

  .om { display: grid; grid-template-columns: 220px 1fr; gap: 44px; align-items: center; }
  .om img { width: 220px; height: 220px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent); }
  .om p { color: var(--dim); font-size: 17px; }

  .kontakt { text-align: center; padding-bottom: 100px; }
  .kontakt h2 { font-size: 34px; margin-bottom: 14px; }
  .kontakt p { color: var(--dim); margin-bottom: 28px; }
  .kontakt a { display: inline-block; background: var(--accent); color: #0c2017; font-weight: 800; text-decoration: none; padding: 14px 36px; border-radius: 99px; }

  footer { border-top: 1px solid #26262f; text-align: center; padding: 24px; color: var(--dim); font-size: 13px; }

  @media (max-width: 720px) {
    .hero { padding: 64px 0 40px; }
    .hero h1 { font-size: 36px; }
    .work-grid { grid-template-columns: 1fr; }
    .om { grid-template-columns: 1fr; text-align: center; justify-items: center; }
    section { padding: 44px 0; }
  }
</style>
</head>
<body>

<div class="hero">
  <div class="wrap">
    <div class="hej" data-slot="text" data-label="Liten text högst upp">Hej, jag heter</div>
    <h1 data-slot="text" data-label="Ditt namn">Alex Nilsson</h1>
    <p data-slot="text" data-label="Presentation">Fotograf och formgivare i Göteborg. Jag hjälper varumärken att berätta sin historia i bild — från produktfoto till hela visuella identiteter.</p>
  </div>
</div>

<section>
  <div class="wrap">
    <h2 class="section-title"><span>/</span> <span data-slot="text" data-label="Rubrik för arbeten">Utvalda arbeten</span></h2>
    <div class="work-grid">
      <div class="work"><img data-slot="image" data-label="Arbete 1 – bild" src="${ph(800, 600, '#23232c', '#67e8aa', 'Arbete 1')}" alt=""><div class="wbody"><b data-slot="text" data-label="Arbete 1 – titel">Kampanj för Fjällbryggeriet</b><small data-slot="text" data-label="Arbete 1 – beskrivning">Produktfoto &amp; art direction</small></div></div>
      <div class="work"><img data-slot="image" data-label="Arbete 2 – bild" src="${ph(800, 600, '#23232c', '#67e8aa', 'Arbete 2')}" alt=""><div class="wbody"><b data-slot="text" data-label="Arbete 2 – titel">Identitet för Studio Norr</b><small data-slot="text" data-label="Arbete 2 – beskrivning">Logotyp, färger, typografi</small></div></div>
      <div class="work"><img data-slot="image" data-label="Arbete 3 – bild" src="${ph(800, 600, '#23232c', '#67e8aa', 'Arbete 3')}" alt=""><div class="wbody"><b data-slot="text" data-label="Arbete 3 – titel">Porträttserie "Hantverkarna"</b><small data-slot="text" data-label="Arbete 3 – beskrivning">Dokumentärt porträttfoto</small></div></div>
      <div class="work"><img data-slot="image" data-label="Arbete 4 – bild" src="${ph(800, 600, '#23232c', '#67e8aa', 'Arbete 4')}" alt=""><div class="wbody"><b data-slot="text" data-label="Arbete 4 – titel">Webb för Kajkanten</b><small data-slot="text" data-label="Arbete 4 – beskrivning">Design &amp; bildspråk</small></div></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="om">
      <img data-slot="image" data-label="Porträttbild" src="${ph(440, 440, '#23232c', '#67e8aa', 'Porträtt')}" alt="">
      <div>
        <h2 class="section-title"><span>/</span> <span data-slot="text" data-label="Rubrik för om mig">Om mig</span></h2>
        <p data-slot="text" data-label="Om mig-text">Efter tio år på byrå arbetar jag nu i egen regi. Jag tror på enkelhet, ärligt ljus och bilder som håller längre än en kampanjperiod. Kunder i urval: Fjällbryggeriet, Studio Norr, Kajkanten.</p>
      </div>
    </div>
  </div>
</section>

<section class="kontakt">
  <div class="wrap">
    <h2 data-slot="text" data-label="Rubrik för kontakt">Har du ett projekt på gång?</h2>
    <p data-slot="text" data-label="Kontakttext">Berätta gärna — jag svarar oftast samma dag.</p>
    <a href="mailto:hej@alexnilsson.se" data-slot="text" data-label="Knapptext">Mejla mig</a>
  </div>
</section>

<footer><span data-slot="text" data-label="Sidfotstext">© 2026 Alex Nilsson · Göteborg</span></footer>

</body>
</html>`;

  window.TEMPLATES.push({
    id: 'portfolio',
    name: 'Portfolio',
    category: 'Personlig',
    html: html
  });
})();
