(function () {
  const tone = window.tone;

  // Riktning: lugn kvartersklinik – kalkvit bas, granitgrå text, en dov salviagrön accent,
  // Outfit-rubriker + Inter, mycket luft och hårfina linjer.
  const C = { bg: '#f6f5f1', tint: '#e6e9e3', sage: '#4b6656', stone: '#dcdbd3', ink: '#23272a' };

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tandvården Kastanjen – tandläkare i Vasastan</title>
<style>
${window.fontCss('outfit', 'inter')}
  :root {
    --bg: #f6f5f1; --tint: #ecede7; --ink: #23272a; --muted: #565c59; --line: #d8d7cf;
    --accent: #4b6656; --accent-dark: #3c5345; --r: 4px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 17px; line-height: 1.6;
    color: var(--ink); background: var(--bg); }
  img { display: block; max-width: 100%; height: auto; }
  a { color: inherit; }
  h1, h2, h3 { font-family: 'Outfit', 'Inter', system-ui, sans-serif; font-weight: 400; line-height: 1.15;
    letter-spacing: -0.015em; text-wrap: balance; }
  .wrap { max-width: 1160px; margin: 0 auto; padding: 0 16px; }
  .num { font-variant-numeric: tabular-nums; }
  .label { display: block; font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: var(--r); }

  .skip { position: absolute; left: 16px; top: -64px; background: var(--ink); color: #fff; padding: 12px 16px;
    border-radius: var(--r); z-index: 10; text-decoration: none; }
  .skip:focus { top: 8px; }

  .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 12px 24px;
    border-radius: var(--r); font-weight: 700; font-size: 16px; text-decoration: none; border: 1px solid var(--accent);
    transition: background-color .2s ease-out, color .2s ease-out; }
  .btn-primary { background: var(--accent); color: #fff; }
  .btn-primary:hover { background: var(--accent-dark); border-color: var(--accent-dark); }
  .btn-ghost { background: transparent; color: var(--accent-dark); }
  .btn-ghost:hover { background: var(--tint); }

  /* Sidhuvud */
  .site-header { border-bottom: 1px solid var(--line); }
  .site-header .wrap { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 72px; }
  .brand { font-family: 'Outfit', 'Inter', sans-serif; font-size: 20px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.2;
    text-decoration: none; }
  .nav-links { display: none; list-style: none; gap: 32px; font-size: 15px; }
  .nav-links a { text-decoration: none; color: var(--muted); display: inline-block; padding: 12px 0; }
  .nav-links a:hover { color: var(--ink); }
  .head-call { min-height: 44px; padding: 8px 16px; font-size: 15px; white-space: nowrap; flex: none; }
  @media (max-width: 359px) { .site-header .brand { font-size: 18px; } }

  /* Hero */
  .hero { padding: 48px 0 64px; }
  .hero-grid { display: grid; gap: 48px; align-items: end; }
  .hero h1 { font-size: clamp(40px, 6vw, 68px); margin: 16px 0 24px; max-width: 13ch; }
  .lead { font-size: 19px; color: var(--muted); max-width: 46ch; }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
  .facts { display: grid; gap: 16px; margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--line); max-width: 560px; }
  .facts dt { font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
  .facts dd { font-size: 17px; margin-top: 4px; white-space: pre-line; }
  .facts a { text-decoration: none; font-weight: 700; }
  .facts a:hover { text-decoration: underline; }
  .hero-img img { width: 100%; aspect-ratio: 3 / 2; object-fit: cover; border-radius: var(--r); }
  .hero-img figcaption { font-size: 14px; color: var(--muted); margin-top: 12px; }

  section { padding: 64px 0; }
  .sec-head { display: grid; gap: 16px; margin-bottom: 48px; }
  .sec-head h2 { font-size: clamp(30px, 3.6vw, 44px); max-width: 18ch; margin-top: 16px; }
  .h2 { font-size: clamp(30px, 3.6vw, 44px); margin: 16px 0 32px; }
  .hours-label { margin-bottom: 16px; }
  .sec-head p { color: var(--muted); max-width: 52ch; }

  /* Pristabell */
  .prices { border-top: 1px solid var(--line); }
  .price-table { width: 100%; border-collapse: collapse; }
  .price-table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .price-table tr { display: grid; grid-template-columns: 1fr auto; column-gap: 16px; row-gap: 4px;
    padding: 24px 0; border-bottom: 1px solid var(--line); }
  .price-table th[scope="row"] { text-align: left; font-family: 'Outfit', 'Inter', sans-serif; font-weight: 400; font-size: 22px; line-height: 1.3; }
  .price-table td.desc { grid-column: 1 / -1; grid-row: 2; color: var(--muted); max-width: 52ch; }
  .price-table td.price { text-align: right; white-space: nowrap; font-weight: 700; font-variant-numeric: tabular-nums; align-self: baseline; }
  .note { margin-top: 24px; font-size: 15px; color: var(--muted); max-width: 64ch; white-space: pre-line; }

  /* Rädd för tandläkaren */
  .calm { background: var(--tint); }
  .narrow { max-width: 600px; }
  .calm h2 { font-size: clamp(30px, 3.6vw, 44px); margin: 16px 0 32px; }
  .calm p { margin-bottom: 24px; white-space: pre-line; }
  .calm p.big { font-family: 'Outfit', 'Inter', sans-serif; font-size: 22px; line-height: 1.45; }
  .calm ul { list-style: none; border-top: 1px solid var(--line); margin-top: 32px; }
  .calm li { padding: 16px 0; border-bottom: 1px solid var(--line); }

  /* Personal */
  .team { display: grid; gap: 32px; }
  .person { display: grid; grid-template-columns: 112px 1fr; gap: 16px; align-items: start; align-content: start; }
  .person img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; border-radius: var(--r); }
  .person h3 { font-size: 22px; }
  .person .role { color: var(--accent-dark); font-weight: 700; font-size: 15px; margin-top: 4px; }
  .person p.bio { color: var(--muted); margin-top: 8px; font-size: 16px; }

  /* Hitta hit */
  .find { border-top: 1px solid var(--line); }
  .find-grid { display: grid; gap: 48px; }
  .find-img img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--r); }
  .info { border-top: 1px solid var(--line); }
  .info div { display: grid; gap: 4px; padding: 16px 0; border-bottom: 1px solid var(--line); }
  .info dt { font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
  .info dd { white-space: pre-line; }
  .info a { font-weight: 700; }

  /* Boka & öppettider */
  .book { background: var(--ink); color: #eceae4; }
  .book .label { color: #a9c0b0; }
  .book-grid { display: grid; gap: 48px; }
  .book h2 { font-size: clamp(30px, 3.6vw, 44px); margin: 16px 0 24px; color: #fff; max-width: 16ch; }
  .book p { color: #c9cbc6; max-width: 46ch; white-space: pre-line; }
  .bigtel { display: inline-block; font-family: 'Outfit', 'Inter', sans-serif; font-size: clamp(34px, 5vw, 56px);
    letter-spacing: -0.01em; color: #fff; text-decoration: none; margin: 32px 0 8px; 
    border-bottom: 1px solid #5d6a62; padding-bottom: 4px; }
  .bigtel:hover { border-bottom-color: #fff; }
  .book .mail { display: inline-block; color: #fff; padding: 12px 0; }
  .book :focus-visible { outline-color: #fff; }
  .hours { border-top: 1px solid #454b4d; font-variant-numeric: tabular-nums; }
  .hours div { display: flex; justify-content: space-between; gap: 16px; padding: 16px 0; border-bottom: 1px solid #454b4d; }
  .hours dt { color: #c9cbc6; }
  .hours dd { color: #fff; text-align: right; }
  .hours-note { margin-top: 24px; font-size: 15px; }

  /* Sidfot */
  .site-footer { background: #1b1e20; color: #b9bcb7; padding: 64px 0 32px; font-size: 15px; }
  .foot-grid { display: grid; gap: 32px; }
  .site-footer .brand { color: #fff; display: block; margin-bottom: 8px; }
  .site-footer h2 { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: #8e948f; margin-bottom: 12px; }
  .site-footer p { white-space: pre-line; }
  .site-footer a { color: #fff; display: inline-block; padding: 4px 0; }
  .site-footer :focus-visible { outline-color: #fff; }
  .legal { margin-top: 48px; padding-top: 24px; border-top: 1px solid #343a3c; display: flex; flex-wrap: wrap;
    gap: 8px 24px; font-size: 14px; color: #8e948f; }

  @media (min-width: 640px) {
    .wrap { padding: 0 32px; }
    .facts { grid-template-columns: 1fr 1fr; gap: 24px; }
    .team { grid-template-columns: repeat(3, 1fr); gap: 32px; }
    .person { grid-template-columns: 1fr; }
    .price-table tr { grid-template-columns: 200px 1fr 136px; column-gap: 32px; align-items: baseline; }
    .price-table td.desc { grid-column: auto; grid-row: auto; }
    .foot-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (min-width: 900px) {
    .nav-links { display: flex; }
    .hero { padding: 64px 0 96px; }
    .hero-grid { grid-template-columns: 7fr 5fr; gap: 64px; }
    .hero-img img { aspect-ratio: 4 / 5; }
    .calm-grid { display: grid; grid-template-columns: 5fr 7fr; gap: 64px; align-items: start; }
    .calm h2 { margin-bottom: 0; }
    .price-table tr { grid-template-columns: calc((100% - 64px) * 5 / 12 + 32px) 1fr 136px; }
    .find-img img { aspect-ratio: 1 / 1; }
    section { padding: 96px 0; }
    .sec-head { grid-template-columns: 5fr 7fr; align-items: end; gap: 64px; }
    .sec-head p { padding-bottom: 8px; }
    .find-grid { grid-template-columns: 1fr 1fr; gap: 64px; align-items: start; }
    .book-grid { grid-template-columns: 7fr 5fr; gap: 96px; align-items: end; }
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
    <a class="brand" href="#" data-slot="text" data-label="Klinikens namn">Tandvården Kastanjen</a>
    <nav aria-label="Huvudmeny">
      <ul class="nav-links">
        <li><a href="#priser">Behandlingar &amp; priser</a></li>
        <li><a href="#personal">Personal</a></li>
        <li><a href="#hitta-hit">Hitta hit</a></li>
        <li><a href="#boka">Öppettider</a></li>
      </ul>
    </nav>
    <a class="btn btn-primary head-call" href="#boka" data-slot="text" data-label="Sidhuvud – knapp">Boka tid</a>
  </div>
</header>

<main id="innehall">
  <section class="hero" aria-labelledby="hero-rubrik">
    <div class="wrap hero-grid">
      <div>
        <span class="label" data-slot="text" data-label="Hero – liten etikett">Allmäntandvård · Vasastan</span>
        <h1 id="hero-rubrik" data-slot="text" data-label="Hero – rubrik">Tandvård mitt i Vasastan</h1>
        <p class="lead" data-slot="text" data-label="Hero – ingress">En liten klinik med två tandläkare och en tandhygienist. Vi tar god tid på oss, förklarar innan vi gör något och säger vad det kostar innan vi börjar.</p>
        <div class="actions">
          <a class="btn btn-primary" href="#boka" data-slot="text" data-label="Hero – knapp">Boka tid</a>
          <a class="btn btn-ghost" href="#priser" data-slot="text" data-label="Hero – sekundär knapp">Se priser</a>
        </div>
        <dl class="facts">
          <div>
            <dt>Ring oss</dt>
            <dd><a data-tel data-slot="text" data-label="Telefon" href="#">08-46 50 04 12</a></dd>
          </div>
          <div>
            <dt>Öppet</dt>
            <dd class="num" data-slot="text" data-multiline data-label="Hero – öppettider i korthet">Mån–tor kl. 07.30–17
Fre kl. 07.30–14</dd>
          </div>
        </dl>
      </div>
      <figure class="hero-img">
        <img data-slot="image" data-label="Hero – stående bild" src="${tone(800, 1000, C.tint, C.sage, 'bild: behandlingsrummet', 'arch')}" width="800" height="1000" alt="Ljust behandlingsrum med fönster mot gården">
        <figcaption data-slot="text" data-label="Hero – bildtext">Behandlingsrummet mot gården, en trappa upp.</figcaption>
      </figure>
    </div>
  </section>

  <section class="prices" id="priser" aria-labelledby="priser-rubrik">
    <div class="wrap">
      <div class="sec-head">
        <div>
          <span class="label" data-slot="text" data-label="Priser – etikett">Behandlingar &amp; priser</span>
          <h2 id="priser-rubrik" data-slot="text" data-label="Priser – rubrik">Vanliga besök och vad de kostar</h2>
        </div>
        <p data-slot="text" data-label="Priser – ingress">Du får alltid ett kostnadsförslag innan större behandlingar. Priserna är vad du betalar före det statliga tandvårdsstödet.</p>
      </div>
      <table class="price-table">
        <thead><tr><th scope="col">Behandling</th><th scope="col">Vad som ingår</th><th scope="col">Pris</th></tr></thead>
        <tbody>
          <tr>
            <th scope="row" data-slot="text" data-label="Pris 1 – behandling">Undersökning</th>
            <td class="desc" data-slot="text" data-label="Pris 1 – beskrivning">Hos tandläkare, med röntgen vid behov. Cirka 45 minuter.</td>
            <td class="price" data-slot="text" data-label="Pris 1 – pris">995 kr</td>
          </tr>
          <tr>
            <th scope="row" data-slot="text" data-label="Pris 2 – behandling">Tandhygienist</th>
            <td class="desc" data-slot="text" data-label="Pris 2 – beskrivning">Tandstensborttagning, polering och råd om hur du sköter tänderna hemma.</td>
            <td class="price" data-slot="text" data-label="Pris 2 – pris">850 kr</td>
          </tr>
          <tr>
            <th scope="row" data-slot="text" data-label="Pris 3 – behandling">Lagning</th>
            <td class="desc" data-slot="text" data-label="Pris 3 – beskrivning">Fyllning i tandfärgad komposit. Priset beror på hur stor lagningen är.</td>
            <td class="price" data-slot="text" data-label="Pris 3 – pris">från 1 150 kr</td>
          </tr>
          <tr>
            <th scope="row" data-slot="text" data-label="Pris 4 – behandling">Blekning</th>
            <td class="desc" data-slot="text" data-label="Pris 4 – beskrivning">Hemblekning med skenor gjorda efter dina tänder, gel och uppföljning.</td>
            <td class="price" data-slot="text" data-label="Pris 4 – pris">2 900 kr</td>
          </tr>
          <tr>
            <th scope="row" data-slot="text" data-label="Pris 5 – behandling">Akuttid</th>
            <td class="desc" data-slot="text" data-label="Pris 5 – beskrivning">Tid samma dag om du ringer före kl. 10. Vi tar hand om värken först.</td>
            <td class="price" data-slot="text" data-label="Pris 5 – pris">från 750 kr</td>
          </tr>
        </tbody>
      </table>
      <p class="note" data-slot="text" data-multiline data-label="Priser – fotnot">Barn och unga behandlas avgiftsfritt enligt regionens regler. Vi tar kort och Swish, och du kan dela upp större kostnader.</p>
    </div>
  </section>

  <section class="calm" aria-labelledby="radd-rubrik">
    <div class="wrap">
      <div class="calm-grid">
      <div>
        <span class="label" data-slot="text" data-label="Tandvårdsrädsla – etikett">Tandvårdsrädsla</span>
        <h2 id="radd-rubrik" data-slot="text" data-label="Tandvårdsrädsla – rubrik">Rädd för tandläkaren?</h2>
      </div>
      <div class="narrow">
        <p class="big" data-slot="text" data-label="Tandvårdsrädsla – ingress">Det är fler än du tror. Säg det när du bokar, så lägger vi första besöket på att bara prata.</p>
        <p data-slot="text" data-multiline data-label="Tandvårdsrädsla – text">Du bestämmer tempot. Vi berättar vad vi ska göra innan vi gör det, och du kan alltid räcka upp handen för att pausa.

Många som inte varit hos tandläkare på länge skäms över att komma tillbaka. Det behöver du inte. Vi har sett det mesta och vi börjar där du är.</p>
        <ul>
          <li data-slot="text" data-label="Tandvårdsrädsla – punkt 1">Längre första besök, utan behandling om du inte vill.</li>
          <li data-slot="text" data-label="Tandvårdsrädsla – punkt 2">Lugnande tablett eller lustgas efter överenskommelse.</li>
          <li data-slot="text" data-label="Tandvårdsrädsla – punkt 3">Samma tandläkare varje gång.</li>
        </ul>
      </div>
      </div>
    </div>
  </section>

  <section id="personal" aria-labelledby="personal-rubrik">
    <div class="wrap">
      <div class="sec-head">
        <div>
          <span class="label" data-slot="text" data-label="Personal – etikett">Personal</span>
          <h2 id="personal-rubrik" data-slot="text" data-label="Personal – rubrik">Tre personer du lär känna</h2>
        </div>
        <p data-slot="text" data-label="Personal – ingress">Vi är en liten klinik med samma ansikten år efter år. Du träffar oftast samma tandläkare varje gång.</p>
      </div>
      <div class="team">
        <article class="person">
          <img data-slot="image" data-label="Personal 1 – porträtt" src="${tone(600, 800, C.stone, C.ink, 'bild: porträtt', 'arch')}" width="600" height="800" alt="Porträtt av tandläkare Anna Lindqvist" loading="lazy">
          <div>
            <h3 data-slot="text" data-label="Personal 1 – namn">Anna Lindqvist</h3>
            <p class="role" data-slot="text" data-label="Personal 1 – roll">Leg. tandläkare</p>
            <p class="bio" data-slot="text" data-label="Personal 1 – kort text">Tar emot nya patienter och har särskilt ansvar för den som är tandvårdsrädd.</p>
          </div>
        </article>
        <article class="person">
          <img data-slot="image" data-label="Personal 2 – porträtt" src="${tone(600, 800, C.tint, C.sage, 'bild: porträtt', 'arch')}" width="600" height="800" alt="Porträtt av tandläkare Johan Berg" loading="lazy">
          <div>
            <h3 data-slot="text" data-label="Personal 2 – namn">Johan Berg</h3>
            <p class="role" data-slot="text" data-label="Personal 2 – roll">Leg. tandläkare</p>
            <p class="bio" data-slot="text" data-label="Personal 2 – kort text">Arbetar med lagningar, kronor och akuttider.</p>
          </div>
        </article>
        <article class="person">
          <img data-slot="image" data-label="Personal 3 – porträtt" src="${tone(600, 800, C.stone, C.ink, 'bild: porträtt', 'arch')}" width="600" height="800" alt="Porträtt av tandhygienist Sara Nyström" loading="lazy">
          <div>
            <h3 data-slot="text" data-label="Personal 3 – namn">Sara Nyström</h3>
            <p class="role" data-slot="text" data-label="Personal 3 – roll">Leg. tandhygienist</p>
            <p class="bio" data-slot="text" data-label="Personal 3 – kort text">Tandstensborttagning, tandköttsvård och blekning.</p>
          </div>
        </article>
      </div>
    </div>
  </section>

  <section class="find" id="hitta-hit" aria-labelledby="hitta-rubrik">
    <div class="wrap find-grid">
      <div>
        <span class="label" data-slot="text" data-label="Hitta hit – etikett">Hitta hit</span>
        <h2 class="h2" id="hitta-rubrik" data-slot="text" data-label="Hitta hit – rubrik">Fyra minuter från Odenplan</h2>
        <dl class="info">
          <div>
            <dt>Adress</dt>
            <dd><a data-map data-slot="text" data-label="Adress" href="#">Kastanjegatan 12, 113 25 Stockholm</a></dd>
          </div>
          <div>
            <dt>Tunnelbana &amp; buss</dt>
            <dd data-slot="text" data-multiline data-label="Hitta hit – kollektivtrafik">Odenplan, gröna linjen och pendeltåg. Gå ut mot Odengatan.
Buss 2, 4 och 40 stannar vid Odenplan.</dd>
          </div>
          <div>
            <dt>Parkering</dt>
            <dd data-slot="text" data-multiline data-label="Hitta hit – parkering">Gatuparkering med betalning på kvarteret. Närmaste parkeringshus ligger cirka 300 meter bort.</dd>
          </div>
          <div>
            <dt>Hiss &amp; tillgänglighet</dt>
            <dd data-slot="text" data-multiline data-label="Hitta hit – tillgänglighet">Entré utan trappsteg från gatan och hiss till kliniken, en trappa upp. Toaletten är anpassad för rullstol.</dd>
          </div>
        </dl>
      </div>
      <figure class="find-img">
        <img data-slot="image" data-label="Hitta hit – bild" src="${tone(960, 720, C.stone, C.ink, 'bild: entrén från gatan', 'grid')}" width="960" height="720" alt="Klinikens entré från gatan" loading="lazy">
      </figure>
    </div>
  </section>

  <section class="book" id="boka" aria-labelledby="boka-rubrik">
    <div class="wrap book-grid">
      <div>
        <span class="label" data-slot="text" data-label="Boka – etikett">Boka tid</span>
        <h2 id="boka-rubrik" data-slot="text" data-label="Boka – rubrik">Ring oss, så hittar vi en tid som passar</h2>
        <p data-slot="text" data-multiline data-label="Boka – text">Har du ont? Ring före kl. 10 så får du oftast komma samma dag.</p>
        <a class="bigtel" data-tel data-slot="text" data-label="Boka – telefon" href="#">08-46 50 04 12</a>
        <br>
        <a class="mail" data-mail data-slot="text" data-label="E-post" href="#">info@tandvardenkastanjen.se</a>
      </div>
      <div>
        <h3 class="label hours-label" data-slot="text" data-label="Öppettider – rubrik">Öppettider</h3>
        <dl class="hours">
          <div><dt data-slot="text" data-label="Öppettider 1 – dagar">Måndag–torsdag</dt><dd data-slot="text" data-label="Öppettider 1 – tid">07.30–17.00</dd></div>
          <div><dt data-slot="text" data-label="Öppettider 2 – dagar">Fredag</dt><dd data-slot="text" data-label="Öppettider 2 – tid">07.30–14.00</dd></div>
          <div><dt data-slot="text" data-label="Öppettider 3 – dagar">Lördag–söndag</dt><dd data-slot="text" data-label="Öppettider 3 – tid">Stängt</dd></div>
        </dl>
        <p class="hours-note" data-slot="text" data-label="Öppettider – notis">Telefonen är stängd kl. 12–13 för lunch.</p>
      </div>
    </div>
  </section>
</main>

<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <span class="brand" data-slot="text" data-label="Sidfot – namn">Tandvården Kastanjen</span>
        <p data-slot="text" data-label="Sidfot – kort beskrivning">Allmäntandvård för vuxna och barn i Vasastan.</p>
      </div>
      <div>
        <h2>Adress</h2>
        <p data-slot="text" data-multiline data-label="Sidfot – adress">Kastanjegatan 12
113 25 Stockholm</p>
      </div>
      <div>
        <h2>Öppet</h2>
        <p class="num" data-slot="text" data-multiline data-label="Sidfot – öppettider">Mån–tor 07.30–17
Fre 07.30–14
Lör–sön stängt</p>
      </div>
      <div>
        <h2>Kontakt</h2>
        <a data-tel data-slot="text" data-label="Sidfot – telefon" href="#">08-46 50 04 12</a><br>
        <a data-mail data-slot="text" data-label="Sidfot – e-post" href="#">info@tandvardenkastanjen.se</a>
      </div>
    </div>
    <div class="legal">
      <span data-slot="text" data-label="Sidfot – copyright">© 2026 Tandvården Kastanjen</span>
      <span data-slot="text" data-label="Sidfot – org.nr">Org.nr 556000-0000</span>
      <span data-slot="text" data-label="Sidfot – vårdgivare">Ansluten till Försäkringskassans tandvårdsstöd</span>
    </div>
  </div>
</footer>
${window.siteJs}
</body>
</html>`;

  window.TEMPLATES.push({
    id: 'tandvard',
    name: 'Tandvårdsklinik',
    category: 'Vård & hälsa',
    html: html
  });
})();
