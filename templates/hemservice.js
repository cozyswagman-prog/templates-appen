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
${window.fontCss('inter')}
  :root { --teal: #0e9488; --teal-dark: #0b7268; --mist: #f0f7f6; --ink: #17302d; --dim: #5b6f6c; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; background: #fff; color: var(--ink); line-height: 1.65; }
  .wrap { max-width: 1060px; margin: 0 auto; padding: 0 24px; }
  h1, h2, h3 { font-weight: 700; letter-spacing: -.4px; }

  nav .wrap { display: flex; align-items: center; justify-content: space-between; padding-top: 18px; padding-bottom: 18px; }
  .brand { font-weight: 700; font-size: 19px; color: var(--teal); }
  nav .tel { font-weight: 700; color: var(--ink); text-decoration: none; }

  .hero { background: var(--mist); }
  .hero .wrap { display: grid; grid-template-columns: 1.1fr 1fr; gap: 44px; align-items: center; padding-top: 64px; padding-bottom: 64px; }
  .hero h1 { font-size: 42px; line-height: 1.12; margin-bottom: 16px; }
  .hero > .wrap p.ingress { color: var(--dim); font-size: 17px; max-width: 46ch; margin-bottom: 22px; }
  .hero ul.usp { list-style: none; padding: 0; margin: 0 0 26px; display: flex; flex-direction: column; gap: 10px; }
  .hero ul.usp li { display: flex; gap: 10px; align-items: flex-start; font-weight: 500; }
  .hero .cta { display: inline-block; background: var(--teal); color: #fff; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; }
  .hero .cta:hover { background: var(--teal-dark); }
  .hero img { width: 100%; height: 400px; object-fit: cover; border-radius: 16px; }

  section { padding: 72px 0; }
  .section-title { font-size: 30px; text-align: center; margin-bottom: 10px; }
  .section-sub { color: var(--dim); text-align: center; margin-bottom: 44px; }

  .tjanstegrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
  .tkort { background: var(--mist); border-radius: 14px; padding: 24px 22px; }
  .tkort h3 { font-size: 17px; margin-bottom: 8px; }
  .tkort p { color: var(--dim); font-size: 14px; }

  .steg { background: var(--teal); color: #fff; }
  .steg .section-title { color: #fff; }
  .steg .section-sub { color: #c8e8e4; }
  .steggrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; text-align: center; }
  .stegruta .nr { width: 44px; height: 44px; border-radius: 50%; background: #fff; color: var(--teal); font-weight: 700; font-size: 19px; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
  .stegruta h3 { font-size: 18px; margin-bottom: 6px; }
  .stegruta p { color: #c8e8e4; font-size: 15px; }

  .kontakt { text-align: center; }
  .kontakt p { color: var(--dim); white-space: pre-line; font-size: 17px; margin-bottom: 26px; }
  .kontakt .cta { display: inline-block; background: var(--teal); color: #fff; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 10px; }

  footer { background: var(--mist); text-align: center; padding: 24px; color: var(--dim); font-size: 13px; }

  @media (max-width: 860px) { .tjanstegrid { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 720px) {
    .hero .wrap { grid-template-columns: 1fr; padding-top: 44px; padding-bottom: 44px; }
    .hero img { height: 260px; }
    .hero h1 { font-size: 32px; }
    .tjanstegrid, .steggrid { grid-template-columns: 1fr; }
    section { padding: 52px 0; }
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
