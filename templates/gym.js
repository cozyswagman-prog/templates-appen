(function () {
  const ph = window.ph;

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gym</title>
<style>
${window.fontCss('outfit')}
  :root { --bg: #16181d; --panel: #1f222a; --text: #f2f3f5; --dim: #9aa0ab; --lime: #c8f046; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 0 24px; }
  h1, h2, h3 { font-weight: 700; letter-spacing: -.5px; }

  .topbar .wrap { display: flex; align-items: center; justify-content: space-between; padding-top: 18px; padding-bottom: 18px; }
  .logo { font-weight: 700; font-size: 20px; letter-spacing: 2px; text-transform: uppercase; }
  .logo em { color: var(--lime); font-style: normal; }
  .topbar .cta-liten { color: var(--bg); background: var(--lime); text-decoration: none; font-weight: 700; font-size: 14px; padding: 9px 20px; border-radius: 99px; }

  .hero { position: relative; min-height: 500px; display: flex; align-items: center; }
  .hero .bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .45; }
  .hero .wrap { position: relative; z-index: 1; padding-top: 48px; padding-bottom: 48px; }
  .hero .kicker { color: var(--lime); font-weight: 700; letter-spacing: 3px; text-transform: uppercase; font-size: 13px; }
  .hero h1 { font-size: 58px; line-height: 1.02; text-transform: uppercase; margin: 14px 0 18px; max-width: 16ch; }
  .hero p { color: var(--dim); font-size: 18px; max-width: 46ch; margin-bottom: 28px; }
  .hero .cta { display: inline-block; background: var(--lime); color: var(--bg); font-weight: 700; text-decoration: none; padding: 15px 36px; border-radius: 99px; font-size: 16px; }

  section { padding: 72px 0; }
  .section-title { font-size: 32px; margin-bottom: 8px; }
  .section-title span { color: var(--lime); }
  .section-sub { color: var(--dim); margin-bottom: 40px; max-width: 60ch; }

  .pass-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .pass { background: var(--panel); border-radius: 14px; overflow: hidden; }
  .pass img { width: 100%; height: 200px; object-fit: cover; display: block; }
  .pass .pbody { padding: 18px 20px 22px; }
  .pass h3 { font-size: 19px; margin-bottom: 6px; }
  .pass p { color: var(--dim); font-size: 15px; }

  .prisrad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .pris { background: var(--panel); border: 1px solid #2b2f39; border-radius: 14px; padding: 28px 26px; text-align: center; }
  .pris.populär { border-color: var(--lime); position: relative; }
  .pris.populär::before { content: "Populärast"; position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--lime); color: var(--bg); font-size: 12px; font-weight: 700; padding: 3px 14px; border-radius: 99px; }
  .pris h3 { font-size: 17px; color: var(--dim); font-weight: 400; margin-bottom: 10px; }
  .pris .belopp { font-size: 40px; font-weight: 700; }
  .pris .belopp small { font-size: 15px; color: var(--dim); font-weight: 400; }
  .pris ul { list-style: none; padding: 0; margin: 18px 0 0; color: var(--dim); font-size: 15px; line-height: 2; white-space: pre-line; }

  .kontakt { background: var(--lime); color: var(--bg); }
  .kontakt .wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; }
  .kontakt h2 { font-size: 34px; }
  .kontakt p { font-weight: 500; white-space: pre-line; margin-top: 14px; }

  footer { text-align: center; padding: 26px; color: var(--dim); font-size: 13px; }

  @media (max-width: 760px) {
    .hero h1 { font-size: 38px; }
    .pass-grid, .prisrad, .kontakt .wrap { grid-template-columns: 1fr; }
    section { padding: 52px 0; }
  }
</style>
</head>
<body>

<div class="topbar">
  <div class="wrap">
    <div class="logo" data-slot="text" data-label="Gymmets namn i toppen">NORRSKEN <em>GYM</em></div>
    <a class="cta-liten" href="#medlemskap" data-slot="text" data-label="Liten knapp i toppen">Bli medlem</a>
  </div>
</div>

<div class="hero">
  <img class="bg" data-slot="image" data-label="Stor bild i bakgrunden" src="${ph(1600, 900, '#23262e', '#c8f046', 'Hero-bild · t.ex. gymgolvet eller ett pass')}" alt="">
  <div class="wrap">
    <div class="kicker" data-slot="text" data-label="Liten text ovanför rubriken">Öppet 05–23 alla dagar</div>
    <h1 data-slot="text" data-label="Stor rubrik">Starkare än igår</h1>
    <p data-slot="text" data-label="Text under rubriken">Fria vikter, moderna maskiner och gruppass som faktiskt är roliga. Första veckan är alltid gratis — kom in och känn efter.</p>
    <a class="cta" href="#medlemskap" data-slot="text" data-label="Stor knapp i hero">Prova gratis i 7 dagar</a>
  </div>
</div>

<section>
  <div class="wrap">
    <h2 class="section-title"><span>//</span> <span data-slot="text" data-label="Rubrik för passen">Veckans pass</span></h2>
    <p class="section-sub" data-slot="text" data-label="Undertext för passen">Alla nivåer är välkomna — instruktören anpassar.</p>
    <div class="pass-grid">
      <div class="pass"><img data-slot="image" data-label="Pass 1 – bild" src="${ph(700, 500, '#2b2f39', '#c8f046', 'Passbild 1')}" alt=""><div class="pbody"><h3 data-slot="text" data-label="Pass 1 – namn">Styrkelyft Bas</h3><p data-slot="text" data-label="Pass 1 – beskrivning">Mån &amp; Ons 18.00 · Teknik i knäböj, bänk och mark.</p></div></div>
      <div class="pass"><img data-slot="image" data-label="Pass 2 – bild" src="${ph(700, 500, '#2b2f39', '#c8f046', 'Passbild 2')}" alt=""><div class="pbody"><h3 data-slot="text" data-label="Pass 2 – namn">HIIT 30</h3><p data-slot="text" data-label="Pass 2 – beskrivning">Tis &amp; Tors 17.30 · Trettio svettiga minuter, klart.</p></div></div>
      <div class="pass"><img data-slot="image" data-label="Pass 3 – bild" src="${ph(700, 500, '#2b2f39', '#c8f046', 'Passbild 3')}" alt=""><div class="pbody"><h3 data-slot="text" data-label="Pass 3 – namn">Mobility &amp; Core</h3><p data-slot="text" data-label="Pass 3 – beskrivning">Lör 10.00 · Rörlighet och bål i lugnt tempo.</p></div></div>
    </div>
  </div>
</section>

<section id="medlemskap">
  <div class="wrap">
    <h2 class="section-title"><span>//</span> <span data-slot="text" data-label="Rubrik för medlemskap">Medlemskap</span></h2>
    <p class="section-sub" data-slot="text" data-label="Undertext för medlemskap">Ingen bindningstid. Pausa när du vill.</p>
    <div class="prisrad">
      <div class="pris"><h3 data-slot="text" data-label="Medlemskap 1 – namn">Dagtid</h3><div class="belopp"><span data-slot="text" data-label="Medlemskap 1 – pris">299</span><small> kr/mån</small></div><ul data-slot="text" data-multiline data-label="Medlemskap 1 – innehåll">Gym vardagar 05–15
Omklädning &amp; bastu</ul></div>
      <div class="pris populär"><h3 data-slot="text" data-label="Medlemskap 2 – namn">Allt-i-ett</h3><div class="belopp"><span data-slot="text" data-label="Medlemskap 2 – pris">449</span><small> kr/mån</small></div><ul data-slot="text" data-multiline data-label="Medlemskap 2 – innehåll">Gym alla tider
Alla gruppass
Gästa andra klubbar</ul></div>
      <div class="pris"><h3 data-slot="text" data-label="Medlemskap 3 – namn">Student</h3><div class="belopp"><span data-slot="text" data-label="Medlemskap 3 – pris">349</span><small> kr/mån</small></div><ul data-slot="text" data-multiline data-label="Medlemskap 3 – innehåll">Gym alla tider
Alla gruppass
Mot giltig studentlegitimation</ul></div>
    </div>
  </div>
</section>

<section class="kontakt">
  <div class="wrap">
    <div>
      <h2 data-slot="text" data-label="Rubrik för kontakt">Kom förbi idag</h2>
      <p data-slot="text" data-multiline data-label="Adress och kontakt">Verkstadsgatan 8, 972 34 Luleå
0920-123 45 · hej@norrskengym.se
Bemannat vardagar 10–19</p>
    </div>
    <img data-slot="image" data-label="Bild vid kontakt" src="${ph(800, 520, '#a8cc3a', '#16181d', 'Bild · t.ex. receptionen')}" alt="" style="width:100%; border-radius:14px;">
  </div>
</section>

<footer><span data-slot="text" data-label="Sidfotstext">© 2026 Norrsken Gym · En del av ditt starkare jag</span></footer>

</body>
</html>`;

  window.TEMPLATES.push({
    id: 'gym',
    name: 'Gym & Träning',
    category: 'Lokalt företag',
    html: html
  });
})();
