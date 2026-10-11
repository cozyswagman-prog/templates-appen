(function () {
  const tone = window.tone;

  // Riktning: verkstadsgolv – asfaltsgrått och benvitt, signalgul accent (bara på mörk botten
  // eller som yta med mörk text), Inter 700, spärrade versaletiketter, monospace för siffror,
  // raka hörn och kraftiga linjer.
  const C = { asphalt: '#17191a', asphalt2: '#26292b', bone: '#f1eee6', bone2: '#e4e0d6', yellow: '#f2c12e' };

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Norrby Bilverkstad – service och reparationer på Hisingen</title>
<style>
${window.fontCss('inter')}
  :root {
    --asphalt: #17191a; --asphalt-2: #222527; --bone: #f1eee6; --bone-2: #e5e1d7; --ink: #17191a;
    --muted: #4c4f51; --muted-dark: #a9aba7; --rule-dark: #3a3e40; --rule-light: #bfbaae;
    --yellow: #f2c12e; --yellow-hover: #ffd34f; --r: 2px;
    --mono: ui-monospace, 'SF Mono', 'Cascadia Mono', Consolas, 'Liberation Mono', monospace;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 17px; line-height: 1.6;
    color: var(--ink); background: var(--bone); }
  img { display: block; max-width: 100%; height: auto; }
  a { color: inherit; }
  h1, h2, h3 { font-weight: 700; line-height: 1.1; letter-spacing: -0.02em; text-wrap: balance; }
  .wrap { max-width: 1200px; margin: 0 auto; padding: 0 16px; }
  .mono { font-family: var(--mono); font-variant-numeric: tabular-nums; letter-spacing: 0; }
  .label { display: block; font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
  .dark { background: var(--asphalt); color: var(--bone); }
  .dark .label { color: var(--yellow); }
  :focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }
  .dark :focus-visible, .site-footer :focus-visible { outline-color: var(--yellow); }

  .skip { position: absolute; left: 16px; top: -64px; background: var(--yellow); color: var(--ink); padding: 12px 16px;
    font-weight: 700; z-index: 10; text-decoration: none; border-radius: var(--r); }
  .skip:focus { top: 8px; }

  .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 12px 24px;
    border-radius: var(--r); font-weight: 700; font-size: 16px; text-decoration: none; border: 2px solid transparent;
    transition: background-color .15s ease-out, color .15s ease-out; }
  .btn-yellow { background: var(--yellow); color: var(--ink); border-color: var(--yellow); }
  .btn-yellow:hover { background: var(--yellow-hover); border-color: var(--yellow-hover); }
  .btn-line { border-color: var(--bone); color: var(--bone); }
  .btn-line:hover { background: var(--bone); color: var(--ink); }

  /* Sidhuvud */
  .site-header { background: var(--asphalt); color: var(--bone); border-bottom: 2px solid var(--rule-dark); }
  .site-header .wrap { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 72px; }
  .brand { display: flex; align-items: center; gap: 12px; text-decoration: none; }
  .mark { width: 24px; height: 24px; background: var(--yellow); flex: none; }
  .brand-text { display: flex; flex-direction: column; line-height: 1.05; }
  .brand-name { font-size: 18px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  .brand-sub { font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted-dark); }
  .nav-links { display: none; list-style: none; gap: 32px; font-size: 14px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .nav-links a { text-decoration: none; color: var(--muted-dark); display: inline-block; padding: 12px 0; }
  .nav-links a:hover { color: var(--bone); }
  .head-call { min-height: 44px; white-space: nowrap; padding: 8px 16px; font-family: var(--mono); font-size: 15px; }
  @media (max-width: 359px) {
    .head-call { padding: 8px 12px; font-size: 14px; }
    .site-header .brand { gap: 8px; }
    .site-header .mark { width: 16px; height: 16px; }
  }

  /* Hero */
  .hero { padding: 48px 0 0; }
  .hero-grid { display: grid; gap: 48px; }
  .hero h1 { font-size: clamp(42px, 7vw, 88px); line-height: 1.02; letter-spacing: -0.035em; margin: 16px 0 24px; max-width: 12ch; }
  .lead { font-size: 19px; color: var(--muted-dark); max-width: 44ch; }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
  .promise { background: var(--yellow); color: var(--ink); padding: 32px 24px; border-radius: var(--r); align-self: end; }
  .promise .label { color: var(--ink); }
  .promise-title { font-size: clamp(26px, 3vw, 34px); font-weight: 700; line-height: 1.15; letter-spacing: -0.02em; margin: 16px 0; }
  .promise p.body { font-size: 17px; }
  .facts { display: grid; margin-top: 64px; border-top: 2px solid var(--rule-dark); }
  .facts div { padding: 24px 0; border-bottom: 2px solid var(--rule-dark); }
  .facts dt { font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted-dark); }
  .facts dd { margin-top: 4px; font-size: 18px; }
  .facts a { text-decoration: none; color: var(--yellow); }
  .facts a:hover { text-decoration: underline; }

  .band img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }

  section { padding: 64px 0; }
  .sec-head { display: grid; gap: 16px; margin-bottom: 48px; }
  .sec-head h2, .h2 { font-size: clamp(32px, 4.4vw, 52px); max-width: 18ch; margin-top: 12px; }
  .sec-head p { color: var(--muted); max-width: 50ch; }
  .dark .sec-head p { color: var(--muted-dark); }

  /* Fastpris-tabell */
  .price-table { width: 100%; border-collapse: collapse; border-top: 2px solid var(--ink); border-bottom: 2px solid var(--ink); }
  .price-table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .price-table tr { display: grid; grid-template-columns: 1fr auto; column-gap: 16px; row-gap: 4px; padding: 24px 0; }
  .price-table tbody tr + tr { border-top: 1px solid var(--rule-light); }
  .price-table th[scope="row"] { text-align: left; font-size: 20px; line-height: 1.3; letter-spacing: -0.01em; }
  .price-table td.desc { grid-column: 1 / -1; grid-row: 2; color: var(--muted); max-width: 54ch; }
  .price-table td.price { text-align: right; white-space: nowrap; font-family: var(--mono); font-variant-numeric: tabular-nums;
    font-size: 18px; font-weight: 700; align-self: baseline; }
  .note { margin-top: 24px; font-size: 15px; color: var(--muted); max-width: 70ch; white-space: pre-line; }

  /* Så går det till */
  .steps { list-style: none; display: grid; border-top: 2px solid var(--rule-dark); }
  .steps li { display: grid; grid-template-columns: 56px 1fr; gap: 16px; align-content: start; padding: 32px 0; border-bottom: 2px solid var(--rule-dark); }
  .step-no { font-family: var(--mono); font-size: 28px; font-weight: 700; color: var(--yellow); line-height: 1.1; }
  .steps h3 { font-size: 22px; margin-bottom: 8px; }
  .steps p { color: var(--muted-dark); max-width: 42ch; }
  .plate { display: inline-flex; align-items: stretch; margin-top: 16px; border: 2px solid var(--bone); border-radius: var(--r);
    background: var(--bone); color: var(--ink); font-family: var(--mono); font-weight: 700; font-size: 18px; letter-spacing: 0.08em; }
  .plate b { background: #1d4fa0; color: #fff; font-size: 11px; padding: 4px 6px; display: flex; align-items: flex-end; letter-spacing: 0; }
  .plate span { padding: 4px 12px; }

  /* Märken */
  .brands { padding: 32px 0; border-bottom: 2px solid var(--ink); }
  .brands .wrap { display: grid; gap: 8px; }
  .brands .label { color: var(--muted); }
  .brand-line { font-size: 19px; font-weight: 700; letter-spacing: -0.01em; }
  .brand-note { color: var(--muted); font-size: 16px; margin-top: 8px; }

  /* Hämta, lämna, lånebil */
  .service-grid { display: grid; gap: 48px; }
  .service-img img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--r); }
  .svc { list-style: none; border-top: 2px solid var(--ink); margin-top: 32px; }
  .svc li { padding: 24px 0; border-bottom: 1px solid var(--rule-light); display: grid; gap: 8px; }
  .svc li:last-child { border-bottom: 2px solid var(--ink); }
  .svc-top { display: flex; flex-direction: column; align-items: flex-start; gap: 8px 16px; }
  .svc h3 { font-size: 20px; letter-spacing: -0.01em; }
  .svc .mono { font-size: 15px; font-weight: 700; background: var(--bone-2); padding: 4px 8px; border-radius: var(--r); }
  .svc p { color: var(--muted); max-width: 52ch; }

  /* Öppettider & hitta hit */
  .visit { background: var(--bone-2); border-top: 2px solid var(--ink); }
  .visit-grid { display: grid; gap: 48px; }
  .bigtel { display: inline-block; font-family: var(--mono); font-size: clamp(30px, 4.6vw, 52px); font-weight: 700;
    text-decoration: none; margin: 24px 0 8px; letter-spacing: -0.02em; border-bottom: 4px solid var(--ink); }
  .bigtel:hover { background: var(--yellow); }
  .visit .mail { display: inline-block; padding: 12px 0; font-weight: 700; }
  .hours { border-top: 2px solid var(--ink); }
  .hours div { display: flex; justify-content: space-between; gap: 16px; padding: 16px 0; border-bottom: 1px solid var(--rule-light); }
  .hours div:last-child { border-bottom: 2px solid var(--ink); }
  .hours dt { font-weight: 700; }
  .hours dd { font-family: var(--mono); font-variant-numeric: tabular-nums; text-align: right; }
  .hours-label { margin-bottom: 16px; color: var(--muted); }
  .find { margin-top: 32px; display: grid; gap: 16px; }
  .find dt { font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
  .find dd { white-space: pre-line; }
  .find a { font-weight: 700; }

  /* Sidfot */
  .site-footer { background: var(--asphalt); color: var(--muted-dark); padding: 64px 0 32px; font-size: 15px; }
  .foot-grid { display: grid; gap: 32px; }
  .site-footer .brand { color: var(--bone); margin-bottom: 16px; }
  .site-footer h2 { font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--yellow); margin-bottom: 12px; }
  .site-footer p { white-space: pre-line; }
  .site-footer a { color: var(--bone); display: inline-block; padding: 4px 0; }
  .legal { margin-top: 48px; padding-top: 24px; border-top: 2px solid var(--rule-dark); display: flex; flex-wrap: wrap;
    gap: 8px 24px; font-size: 14px; }

  @media (min-width: 640px) {
    .wrap { padding: 0 32px; }
    .facts { grid-template-columns: repeat(3, 1fr); }
    .facts div + div { padding-left: 24px; border-left: 2px solid var(--rule-dark); }
    .band img { aspect-ratio: 3 / 1; }
    .svc-top { flex-direction: row; justify-content: space-between; align-items: baseline; }
    .price-table tr { grid-template-columns: 200px 1fr 168px; column-gap: 32px; align-items: baseline; }
    .price-table td.desc { grid-column: auto; grid-row: auto; }
    .foot-grid { grid-template-columns: 1fr 1fr; }
    .promise { padding: 32px; }
  }
  @media (min-width: 900px) {
    .nav-links { display: flex; }
    .hero { padding: 96px 0 0; }
    .hero-grid { grid-template-columns: 7fr 5fr; gap: 64px; align-items: end; }
    section { padding: 96px 0; }
    .sec-head { grid-template-columns: 5fr 7fr; align-items: end; gap: 64px; }
    .sec-head p { padding-bottom: 8px; }
    .price-table tr { grid-template-columns: calc((100% - 64px) * 5 / 12 + 32px) 1fr 168px; }
    .steps { grid-template-columns: repeat(3, 1fr); border-top: 0; }
    .steps li { grid-template-columns: 1fr; gap: 24px; padding: 32px 32px 32px 0; border-top: 2px solid var(--rule-dark); border-bottom: 0; }
    .steps li + li { padding-left: 32px; border-left: 2px solid var(--rule-dark); }
    .step-no { font-size: 48px; }
    .brands .wrap { grid-template-columns: 5fr 7fr; gap: 64px; align-items: baseline; }
    .service-grid { grid-template-columns: 5fr 7fr; gap: 64px; align-items: start; }
    .service-img img { aspect-ratio: 4 / 5; }
    .visit-grid { grid-template-columns: 5fr 7fr; gap: 64px; }
    .foot-grid { grid-template-columns: 2fr 1fr 1fr 1fr; gap: 48px; }
  }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; scroll-behavior: auto !important; } }
  @media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
</style>
</head>
<body>
<a class="skip" href="#innehall">Hoppa till innehåll</a>

<header class="site-header">
  <div class="wrap">
    <a class="brand" href="#" aria-label="Till toppen">
      <span class="mark" aria-hidden="true"></span>
      <span class="brand-text">
        <span class="brand-name" data-slot="text" data-label="Företagsnamn – rad 1">Norrby</span>
        <span class="brand-sub" data-slot="text" data-label="Företagsnamn – rad 2">Bilverkstad</span>
      </span>
    </a>
    <nav aria-label="Huvudmeny">
      <ul class="nav-links">
        <li><a href="#priser">Priser</a></li>
        <li><a href="#sa-gar-det-till">Så går det till</a></li>
        <li><a href="#lanebil">Lånebil</a></li>
        <li><a href="#oppettider">Öppettider</a></li>
      </ul>
    </nav>
    <a class="btn btn-yellow head-call" data-tel data-slot="text" data-label="Sidhuvud – telefon" href="#">031-390 06 24</a>
  </div>
</header>

<main id="innehall">
  <section class="hero dark" aria-labelledby="hero-rubrik">
    <div class="wrap">
      <div class="hero-grid">
        <div>
          <span class="label" data-slot="text" data-label="Hero – liten etikett">Bilverkstad · Hisingen</span>
          <h1 id="hero-rubrik" data-slot="text" data-label="Hero – rubrik">Service och reparationer på Hisingen</h1>
          <p class="lead" data-slot="text" data-label="Hero – ingress">Alla bilmärken, även el och hybrid. Vi servar enligt tillverkarens program, så nybilsgarantin gäller.</p>
          <div class="actions">
            <a class="btn btn-yellow" href="#oppettider" data-slot="text" data-label="Hero – knapp">Boka verkstadstid</a>
            <a class="btn btn-line" href="#priser" data-slot="text" data-label="Hero – sekundär knapp">Se fasta priser</a>
          </div>
        </div>
        <div class="promise">
          <span class="label" data-slot="text" data-label="Löfte – etikett">Fast pris</span>
          <p class="promise-title" data-slot="text" data-label="Löfte – rubrik">Du får priset innan vi börjar skruva.</p>
          <p class="body" data-slot="text" data-label="Löfte – text">Hittar vi något mer ringer vi och frågar först. Inget extra arbete utan ditt ja.</p>
        </div>
      </div>
      <dl class="facts">
        <div>
          <dt>Ring</dt>
          <dd><a class="mono" data-tel data-slot="text" data-label="Telefon" href="#">031-390 06 24</a></dd>
        </div>
        <div>
          <dt>Öppet</dt>
          <dd class="mono" data-slot="text" data-label="Hero – öppettider">Mån–fre 07.00–17.00</dd>
        </div>
        <div>
          <dt>Adress</dt>
          <dd data-slot="text" data-label="Hero – adress">Norrbyvägen 8, Hisingen</dd>
        </div>
      </dl>
    </div>
  </section>

  <div class="band dark">
    <img data-slot="image" data-label="Helbreddsbild – verkstaden" src="${tone(1800, 772, C.asphalt2, C.yellow, 'bild: verkstadsgolvet med lyftar', 'grid')}" width="1800" height="772" alt="Verkstadsgolvet med två bilar på lyft">
  </div>

  <section id="priser" aria-labelledby="priser-rubrik">
    <div class="wrap">
      <div class="sec-head">
        <div>
          <span class="label" data-slot="text" data-label="Priser – etikett">Fasta priser</span>
          <h2 id="priser-rubrik" data-slot="text" data-label="Priser – rubrik">Det här kostar det</h2>
        </div>
        <p data-slot="text" data-label="Priser – ingress">Priserna gäller personbil och är inklusive moms. Säg ditt reg-nr när du ringer, så får du exakt pris för din bil.</p>
      </div>
      <table class="price-table">
        <thead><tr><th scope="col">Arbete</th><th scope="col">Det här ingår</th><th scope="col">Pris</th></tr></thead>
        <tbody>
          <tr>
            <th scope="row" data-slot="text" data-label="Pris 1 – arbete">Service</th>
            <td class="desc" data-slot="text" data-label="Pris 1 – beskrivning">Enligt tillverkarens serviceprogram, med olja och filter. Stämplas i serviceboken.</td>
            <td class="price" data-slot="text" data-label="Pris 1 – pris">från 2 495 kr</td>
          </tr>
          <tr>
            <th scope="row" data-slot="text" data-label="Pris 2 – arbete">Bromsar</th>
            <td class="desc" data-slot="text" data-label="Pris 2 – beskrivning">Byte av bromsklossar fram, klossar ingår. Skivorna mäts och vi säger till om de behöver bytas.</td>
            <td class="price" data-slot="text" data-label="Pris 2 – pris">från 1 895 kr</td>
          </tr>
          <tr>
            <th scope="row" data-slot="text" data-label="Pris 3 – arbete">Däckbyte</th>
            <td class="desc" data-slot="text" data-label="Pris 3 – beskrivning">Skifte av fyra hjul, kontroll av lufttryck och mönsterdjup.</td>
            <td class="price" data-slot="text" data-label="Pris 3 – pris">395 kr</td>
          </tr>
          <tr>
            <th scope="row" data-slot="text" data-label="Pris 4 – arbete">Däckhotell</th>
            <td class="desc" data-slot="text" data-label="Pris 4 – beskrivning">Tvätt och förvaring av fyra hjul en säsong. Däckbytet ingår.</td>
            <td class="price" data-slot="text" data-label="Pris 4 – pris">995 kr/säsong</td>
          </tr>
          <tr>
            <th scope="row" data-slot="text" data-label="Pris 5 – arbete">AC-service</th>
            <td class="desc" data-slot="text" data-label="Pris 5 – beskrivning">Tömning, läcktest och påfyllning av köldmedium.</td>
            <td class="price" data-slot="text" data-label="Pris 5 – pris">1 295 kr</td>
          </tr>
          <tr>
            <th scope="row" data-slot="text" data-label="Pris 6 – arbete">Felsökning</th>
            <td class="desc" data-slot="text" data-label="Pris 6 – beskrivning">Diagnos med testdator och provkörning. Dras av om vi sedan gör jobbet.</td>
            <td class="price" data-slot="text" data-label="Pris 6 – pris">695 kr</td>
          </tr>
        </tbody>
      </table>
      <p class="note" data-slot="text" data-multiline data-label="Priser – fotnot">Övriga reservdelar enligt offert. Betala med kort, Swish eller faktura.</p>
    </div>
  </section>

  <section class="dark" id="sa-gar-det-till" aria-labelledby="steg-rubrik">
    <div class="wrap">
      <div class="sec-head">
        <div>
          <span class="label" data-slot="text" data-label="Så går det till – etikett">Så går det till</span>
          <h2 id="steg-rubrik" data-slot="text" data-label="Så går det till – rubrik">Tre steg, inga överraskningar</h2>
        </div>
        <p data-slot="text" data-label="Så går det till – ingress">De flesta jobb är klara samma dag. Större reparationer bokar vi in när delarna har kommit.</p>
      </div>
      <ol class="steps">
        <li>
          <span class="step-no" aria-hidden="true">01</span>
          <div>
            <h3 data-slot="text" data-label="Steg 1 – rubrik">Ring med ditt reg-nr</h3>
            <p data-slot="text" data-label="Steg 1 – text">Berätta vad som är fel eller vilken service bilen ska ha. Du får ett fast pris och en tid direkt.</p>
            <span class="plate" aria-hidden="true"><b>S</b><span>ABC 123</span></span>
          </div>
        </li>
        <li>
          <span class="step-no" aria-hidden="true">02</span>
          <div>
            <h3 data-slot="text" data-label="Steg 2 – rubrik">Lämna bilen på morgonen</h3>
            <p data-slot="text" data-label="Steg 2 – text">Kom mellan kl. 07 och 09. Är du tidigare lägger du nyckeln i nyckelinkastet vid porten.</p>
          </div>
        </li>
        <li>
          <span class="step-no" aria-hidden="true">03</span>
          <div>
            <h3 data-slot="text" data-label="Steg 3 – rubrik">Hämta när vi sms:at</h3>
            <p data-slot="text" data-label="Steg 3 – text">Du betalar det pris vi kom överens om. Hittar vi något mer ringer vi innan vi gör det.</p>
          </div>
        </li>
      </ol>
    </div>
  </section>

  <div class="brands">
    <div class="wrap">
      <span class="label" data-slot="text" data-label="Märken – etikett">Märken vi jobbar med</span>
      <div>
        <p class="brand-line" data-slot="text" data-label="Märken – lista">Volvo · Volkswagen · Audi · Škoda · Toyota · Ford · Kia · Hyundai · Peugeot · Renault · BMW · Mercedes-Benz</p>
        <p class="brand-note" data-slot="text" data-label="Märken – notis">Har du ett annat märke? Ring och fråga, vi tar de flesta personbilar och lätta transportbilar.</p>
      </div>
    </div>
  </div>

  <section id="lanebil" aria-labelledby="lanebil-rubrik">
    <div class="wrap service-grid">
      <figure class="service-img">
        <img data-slot="image" data-label="Lånebil – bild" src="${tone(800, 1000, C.bone2, C.asphalt, 'bild: lånebilen på gården', 'hills')}" width="800" height="1000" alt="Verkstadens lånebil parkerad på gården" loading="lazy">
      </figure>
      <div>
        <span class="label" data-slot="text" data-label="Hämta/lämna – etikett">Hämta, lämna, låna</span>
        <h2 class="h2" id="lanebil-rubrik" data-slot="text" data-label="Hämta/lämna – rubrik">Du behöver inte stå utan bil</h2>
        <ul class="svc">
          <li>
            <div class="svc-top">
              <h3 data-slot="text" data-label="Tjänst 1 – rubrik">Vi hämtar och lämnar</h3>
              <span class="mono" data-slot="text" data-label="Tjänst 1 – pris">295 kr tur och retur</span>
            </div>
            <p data-slot="text" data-label="Tjänst 1 – text">Vi hämtar bilen hemma eller på jobbet på Hisingen och ställer tillbaka den när den är klar.</p>
          </li>
          <li>
            <div class="svc-top">
              <h3 data-slot="text" data-label="Tjänst 2 – rubrik">Lånebil</h3>
              <span class="mono" data-slot="text" data-label="Tjänst 2 – pris">0 kr vid service</span>
            </div>
            <p data-slot="text" data-label="Tjänst 2 – text">En liten bil med automatväxel. Boka den samtidigt som verkstadstiden, annars 250 kr per dag.</p>
          </li>
          <li>
            <div class="svc-top">
              <h3 data-slot="text" data-label="Tjänst 3 – rubrik">Vänta på plats</h3>
              <span class="mono" data-slot="text" data-label="Tjänst 3 – tid">cirka 30 min</span>
            </div>
            <p data-slot="text" data-label="Tjänst 3 – text">Däckbyte gör vi medan du väntar. Kaffe och wifi i kundrummet.</p>
          </li>
        </ul>
      </div>
    </div>
  </section>

  <section class="visit" id="oppettider" aria-labelledby="besok-rubrik">
    <div class="wrap visit-grid">
      <div>
        <span class="label" data-slot="text" data-label="Boka – etikett">Boka verkstadstid</span>
        <h2 class="h2" id="besok-rubrik" data-slot="text" data-label="Boka – rubrik">Ring, så får du en tid</h2>
        <a class="bigtel" data-tel data-slot="text" data-label="Boka – telefon" href="#">031-390 06 24</a>
        <br>
        <a class="mail" data-mail data-slot="text" data-label="E-post" href="#">verkstad@norrbybil.se</a>
      </div>
      <div>
        <h3 class="label hours-label" data-slot="text" data-label="Öppettider – rubrik">Öppettider</h3>
        <dl class="hours">
          <div><dt data-slot="text" data-label="Öppettider 1 – dagar">Måndag–fredag</dt><dd data-slot="text" data-label="Öppettider 1 – tid">07.00–17.00</dd></div>
          <div><dt data-slot="text" data-label="Öppettider 2 – dagar">Lunch</dt><dd data-slot="text" data-label="Öppettider 2 – tid">12.00–12.45</dd></div>
          <div><dt data-slot="text" data-label="Öppettider 3 – dagar">Lördag–söndag</dt><dd data-slot="text" data-label="Öppettider 3 – tid">Stängt</dd></div>
        </dl>
        <dl class="find">
          <div>
            <dt>Adress</dt>
            <dd><a data-map data-slot="text" data-label="Adress" href="#">Norrbyvägen 8, 417 05 Göteborg</a></dd>
          </div>
          <div>
            <dt>Hitta hit</dt>
            <dd data-slot="text" data-multiline data-label="Hitta hit – text">Kundparkering framför verkstaden. Buss till hållplatsen runt hörnet, tre minuters promenad.</dd>
          </div>
        </dl>
      </div>
    </div>
  </section>
</main>

<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <span class="brand">
          <span class="mark" aria-hidden="true"></span>
          <span class="brand-text">
            <span class="brand-name" data-slot="text" data-label="Sidfot – namn rad 1">Norrby</span>
            <span class="brand-sub" data-slot="text" data-label="Sidfot – namn rad 2">Bilverkstad</span>
          </span>
        </span>
        <p data-slot="text" data-label="Sidfot – kort beskrivning">Service, reparationer och däck för alla bilmärken på Hisingen.</p>
      </div>
      <div>
        <h2>Adress</h2>
        <p data-slot="text" data-multiline data-label="Sidfot – adress">Norrbyvägen 8
417 05 Göteborg</p>
      </div>
      <div>
        <h2>Öppet</h2>
        <p class="mono" data-slot="text" data-multiline data-label="Sidfot – öppettider">Mån–fre 07.00–17.00
Lör–sön stängt</p>
      </div>
      <div>
        <h2>Kontakt</h2>
        <a class="mono" data-tel data-slot="text" data-label="Sidfot – telefon" href="#">031-390 06 24</a><br>
        <a data-mail data-slot="text" data-label="Sidfot – e-post" href="#">verkstad@norrbybil.se</a>
      </div>
    </div>
    <div class="legal">
      <span data-slot="text" data-label="Sidfot – copyright">© 2026 Norrby Bilverkstad</span>
      <span data-slot="text" data-label="Sidfot – org.nr">Org.nr 556000-0000</span>
      <span data-slot="text" data-label="Sidfot – betalning">Kort, Swish och faktura</span>
    </div>
  </div>
</footer>
${window.siteJs}
</body>
</html>`;

  window.TEMPLATES.push({
    id: 'bilverkstad',
    name: 'Bilverkstad',
    category: 'Hantverk & service',
    html: html
  });
})();
