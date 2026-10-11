(function () {
  // Blomsterhandel – riktning: redaktionellt blomstermagasin. Varm papperston,
  // djup buteljgrön text, en dämpad vallmo-accent, stora Playfair-rubriker och
  // ett asymmetriskt bildkollage.
  const tone = window.tone;
  const C = {
    sand: '#e6d9c8', rose: '#ead2c6', sage: '#d3d8c9', ink: '#1f3a2e', poppy: '#8f3a2f'
  };

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ateljé Vallmo – blomsterhandel på Möllan, Malmö</title>
<meta name="description" content="Blomsterhandel och binderi på Möllevången i Malmö. Buketter, bröllop, begravning och blomsterabonnemang. Leverans i hela Malmö.">
<style>
${window.fontCss('playfair', 'inter')}
:root {
  --paper: #f5efe6;
  --paper-2: #ece3d6;
  --ink: #1f3a2e;
  --ink-soft: #4d6157;
  --line: rgb(31 58 46 / .18);
  --accent: #a8473a;
  --accent-dark: #8f3a2f;
  --r: 2px;
  --serif: 'Playfair Display', Georgia, 'Times New Roman', serif;
  --sans: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --gut: 24px;
}
*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; }
html { -webkit-text-size-adjust: 100%; }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
body { background: var(--paper); color: var(--ink); font-family: var(--sans); font-size: 17px; line-height: 1.6; }
img { display: block; max-width: 100%; height: auto; border-radius: var(--r); object-fit: cover; }
a { color: inherit; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: var(--r); }
h1, h2, h3, .serif-num { font-variant-numeric: lining-nums; }
h1, h2, h3 { font-family: var(--serif); font-weight: 400; line-height: 1.12; letter-spacing: -0.015em; text-wrap: balance; }
.wrap { max-width: 1200px; margin: 0 auto; padding: 0 var(--gut); }
.label { font-size: 13px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-soft); }
.num { font-variant-numeric: tabular-nums; }

.skip { position: absolute; left: 16px; top: -64px; background: var(--ink); color: var(--paper); padding: 12px 16px; z-index: 10; text-decoration: none; }
.skip:focus { top: 16px; }

/* Knappar */
.btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 24px; border-radius: var(--r);
  font: 700 16px/1.2 var(--sans); text-decoration: none; border: 1px solid var(--accent); background: var(--accent); color: #fbf7f1;
  transition: background-color .2s ease-out, border-color .2s ease-out; }
.btn:hover { background: var(--accent-dark); border-color: var(--accent-dark); }
.btn-tel::before { content: "Ring "; white-space: pre; }
.btn-ghost { background: transparent; color: var(--ink); border-color: var(--ink); }
.btn-ghost:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }

/* Sidhuvud */
.top { border-bottom: 1px solid var(--line); }
.top .wrap { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 72px; }
.brand { font-family: var(--serif); font-size: 24px; letter-spacing: -0.01em; text-decoration: none; }
.nav { display: none; gap: 8px; }
.nav a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 8px; font-size: 16px; text-decoration: none; color: var(--ink-soft); }
.nav a:hover { color: var(--ink); text-decoration: underline; text-underline-offset: 4px; }
.top .call { min-height: 44px; padding: 0 24px; font-size: 0; }
.top .call::before { content: "Ring"; font-size: 16px; }
.top-tel { display: none; text-decoration: none; font-weight: 700; min-height: 44px; align-items: center; }
.top-tel:hover { text-decoration: underline; text-underline-offset: 4px; }

/* Hero */
.hero { padding: 48px 0 64px; }
.hero-grid { display: grid; gap: 48px; }
.hero h1 { font-size: clamp(44px, 5.6vw + 16px, 92px); margin: 16px 0 24px; }
.hero h1 em { font-style: italic; }
.lead { font-size: 18px; max-width: 34em; color: var(--ink-soft); }
.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
.facts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--line); max-width: 480px; }
.facts .label { margin-bottom: 4px; }
.facts a { white-space: nowrap; }
@media (max-width: 359px) { .facts { grid-template-columns: 1fr; } }
.facts a { font-weight: 700; text-decoration: none; display: inline-flex; min-height: 44px; align-items: center; margin-top: -8px; }
.facts a:hover { text-decoration: underline; text-underline-offset: 4px; }
.pre { white-space: pre-line; font-variant-numeric: tabular-nums; }

.collage { position: relative; padding-bottom: 32%; max-width: 600px; margin-left: auto; width: 100%; }
.collage .a { width: 80%; margin-left: auto; aspect-ratio: 4 / 5; }
.collage .b { position: absolute; left: 0; bottom: 0; width: 52%; aspect-ratio: 1; border: 12px solid var(--paper); border-radius: var(--r); }
.collage figcaption { margin: 16px 0 0 56%; font-size: 14px; color: var(--ink-soft); max-width: 28ch; }

/* Just nu */
.season { padding: 64px 0; border-top: 1px solid var(--line); }
.season-grid { display: grid; gap: 32px; }
.season img { width: 100%; aspect-ratio: 3 / 2; }
.season-grid .pic { order: 2; }
.season h2 { font-size: clamp(32px, 2.6vw + 16px, 52px); margin: 16px 0 24px; }
.dropcap { max-width: 34em; hyphens: auto; }
.dropcap::first-letter { font-family: var(--serif); float: left; font-size: 76px; line-height: .82; padding: 8px 12px 0 0; color: var(--accent); }
.note { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 15px; color: var(--ink-soft); max-width: 34em; }

/* Beställningar */
.orders { padding: 64px 0; background: var(--paper-2); }
.orders-grid { display: grid; gap: 48px; }
.orders h2 { font-size: clamp(32px, 2.6vw + 16px, 52px); margin: 16px 0 24px; }
.orders .intro p { color: var(--ink-soft); max-width: 30em; margin-bottom: 32px; }
.list { list-style: none; padding: 0; border-bottom: 1px solid var(--line); }
.list li { display: grid; grid-template-columns: 40px 1fr; gap: 4px 16px; padding: 24px 0; border-top: 1px solid var(--line); }
.list .n { font-family: var(--serif); font-size: 17px; color: var(--accent); padding-top: 4px; font-variant-numeric: lining-nums tabular-nums; }
.list li > * { min-width: 0; }
.list h3 { font-size: clamp(24px, 1vw + 20px, 28px); overflow-wrap: break-word; hyphens: auto; }
.list p { grid-column: 2; color: var(--ink-soft); max-width: 36em; }
.list .price { grid-column: 2; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }

/* Leverans */
.delivery { padding: 64px 0; }
.delivery-grid { display: grid; gap: 48px; }
.delivery h2 { font-size: clamp(32px, 2.6vw + 16px, 52px); margin: 16px 0 24px; }
.delivery .intro { color: var(--ink-soft); max-width: 32em; }
.rates { margin-top: 32px; border-bottom: 1px solid var(--line); }
.rates div { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; padding: 12px 0; border-top: 1px solid var(--line); }
.rates dd { font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
.delivery img { width: 100%; aspect-ratio: 4 / 5; }

/* Hitta hit */
.find { padding: 0 0 64px; }
.find .wide { width: 100%; aspect-ratio: 16 / 9; }
.find-head { margin: 48px 0 32px; }
.find h2 { font-size: clamp(32px, 2.6vw + 16px, 52px); margin-top: 16px; max-width: 18em; }
.cols { display: grid; gap: 32px; }
.cols > div { border-top: 1px solid var(--ink); padding-top: 16px; }
.cols .label { margin-bottom: 12px; }
.cols p + p { margin-top: 12px; }
.cols .muted { color: var(--ink-soft); font-size: 16px; }
.cols a { display: inline-flex; align-items: center; min-height: 44px; text-underline-offset: 4px; }
.cols a[data-tel] { font-family: var(--serif); font-size: 28px; text-decoration: none; font-variant-numeric: lining-nums proportional-nums; }
.cols a[data-tel]:hover { text-decoration: underline; }

/* Sidfot */
.foot { background: var(--ink); color: #e9e1d3; padding: 64px 0 32px; font-size: 16px; }
.foot-grid { display: grid; gap: 32px; }
.foot .brand { font-size: 32px; color: #f5efe6; display: block; margin-bottom: 8px; }
.foot .label { color: #b9c2b4; margin-bottom: 8px; }
.foot a { display: inline-flex; align-items: center; min-height: 44px; text-underline-offset: 4px; }
.foot :focus-visible { outline-color: #f0c6bb; }
.legal { display: flex; flex-wrap: wrap; gap: 8px 24px; margin-top: 48px; padding-top: 16px; border-top: 1px solid rgb(233 225 211 / .2); font-size: 14px; color: #b9c2b4; }

@media (min-width: 760px) {
  :root { --gut: 32px; }
  .nav { display: flex; }
  .top .call { display: none; }
  .hero { padding: 64px 0 96px; }
  .season, .orders, .delivery { padding: 96px 0; }
  .find { padding-bottom: 96px; }
  .list li { grid-template-columns: 48px 1fr auto; align-items: baseline; }
  .list p { grid-column: 2; }
  .list .price { grid-column: 3; grid-row: 1; text-align: right; }
  .cols { grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .foot-grid { grid-template-columns: 2fr 1fr 1fr 1fr; }
  .delivery-grid { grid-template-columns: 7fr 5fr; align-items: end; }
}
@media (min-width: 1024px) {
  .top-tel { display: inline-flex; }
  .hero-grid { grid-template-columns: repeat(12, 1fr); gap: 24px; align-items: center; }
  .hero-text { grid-column: 1 / 7; }
  .collage { grid-column: 7 / 13; max-width: none; padding-bottom: 20%; }
  .collage .a { width: 78%; }
  .collage .b { width: 44%; }
  .collage figcaption { margin-left: 50%; }
  .season-grid { grid-template-columns: repeat(12, 1fr); gap: 24px; align-items: center; }
  .season-grid .pic { grid-column: 1 / 8; order: 0; }
  .season-grid .text { grid-column: 9 / 13; }
  .orders-grid { grid-template-columns: repeat(12, 1fr); gap: 24px; }
  .orders .intro { grid-column: 1 / 5; }
  .orders .list { grid-column: 6 / 13; }
  .delivery-grid { grid-template-columns: repeat(12, 1fr); gap: 24px; }
  .delivery .text { grid-column: 1 / 7; }
  .delivery .pic { grid-column: 8 / 13; }
  .find .wide { aspect-ratio: 21 / 8; }
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; } }
</style>
</head>
<body>
<a class="skip" href="#innehall">Hoppa till innehåll</a>

<header class="top">
  <div class="wrap">
    <a class="brand" href="#" data-slot="text" data-label="Butikens namn – sidhuvud">Ateljé Vallmo</a>
    <nav class="nav" aria-label="Huvudmeny">
      <a href="#just-nu">Just nu</a>
      <a href="#bestall">Beställ</a>
      <a href="#leverans">Leverans</a>
      <a href="#hitta-hit">Hitta hit</a>
    </nav>
    <a class="top-tel" data-tel data-slot="text" data-label="Telefon – sidhuvud (dator)" href="#">040-628 04 15</a>
    <a class="btn call" data-tel data-slot="text" data-label="Telefon – sidhuvud (mobil)" href="#">040-628 04 15</a>
  </div>
</header>

<main id="innehall">
  <section class="hero">
    <div class="wrap hero-grid">
      <div class="hero-text">
        <p class="label" data-slot="text" data-label="Hero – liten etikett">Blomsterhandel &amp; binderi · Malmö</p>
        <h1><span data-slot="text" data-label="Hero – rubrik">Snittblommor och binderi</span> <em data-slot="text" data-label="Hero – rubrik, kursivt slut">på Möllan</em></h1>
        <p class="lead" data-slot="text" data-label="Hero – ingress">Vi binder buketter av det som är bäst just nu – svenskodlat från maj till oktober, resten från odlare vi känner. Kom in och välj själv, eller beställ så står buketten klar när du kommer.</p>
        <div class="hero-actions">
          <a class="btn" href="#bestall" data-slot="text" data-label="Hero – knapp">Beställ en bukett</a>
          <a class="btn btn-ghost" href="#just-nu" data-slot="text" data-label="Hero – andra knappen">Se vad som finns nu</a>
        </div>
        <div class="facts">
          <div>
            <p class="label">Telefon</p>
            <a data-tel data-slot="text" data-label="Telefon – hero" href="#">040-628 04 15</a>
          </div>
          <div>
            <p class="label">Öppet</p>
            <p class="pre" data-slot="text" data-multiline data-label="Öppettider – hero">Tis–fre kl. 10–18
Lör kl. 10–15</p>
          </div>
        </div>
      </div>
      <figure class="collage">
        <img class="a" data-slot="image" data-label="Hero – stor bild" src="${tone(960, 1200, C.rose, C.poppy, 'bild: bukett i skyltfönstret', 'arch')}" width="960" height="1200" alt="En höstbukett i butikens skyltfönster">
        <img class="b" data-slot="image" data-label="Hero – liten bild" src="${tone(640, 640, C.sage, C.ink, 'bild: binderi', 'circle')}" width="640" height="640" alt="Händer som binder en bukett vid disken">
        <figcaption data-slot="text" data-label="Hero – bildtext">Veckans bukett: dahlior, rönnbär och havre.</figcaption>
      </figure>
    </div>
  </section>

  <section class="season" id="just-nu">
    <div class="wrap season-grid">
      <div class="pic">
        <img data-slot="image" data-label="Just nu – bild" src="${tone(1200, 800, C.sand, C.ink, 'bild: säsongens blommor i hinkar', 'sun')}" width="1200" height="800" alt="Säsongens blommor i hinkar på golvet i butiken" loading="lazy">
      </div>
      <div class="text">
        <p class="label" data-slot="text" data-label="Just nu – etikett">Just nu i butiken · oktober</p>
        <h2 data-slot="text" data-label="Just nu – rubrik">Dahlior, rönnbär och de sista rosorna från Skåne</h2>
        <p class="dropcap" data-slot="text" data-label="Just nu – text">Dahliasäsongen går mot sitt slut, så passa på medan de finns. Vi har också torkade hortensior, eukalyptus och havre som håller hela vintern, och de första amaryllislökarna har kommit in. Blomsterlökar för vårplantering säljer vi i lösvikt fram till första frosten.</p>
        <p class="note" data-slot="text" data-label="Just nu – liten notis">Utbudet ändras varje vecka. Ring gärna innan du kommer om du letar efter något särskilt.</p>
      </div>
    </div>
  </section>

  <section class="orders" id="bestall">
    <div class="wrap orders-grid">
      <div class="intro">
        <p class="label" data-slot="text" data-label="Beställ – etikett">Beställningar</p>
        <h2 data-slot="text" data-label="Beställ – rubrik">Till fest, sorg och vardag</h2>
        <p data-slot="text" data-label="Beställ – text">Ring eller kom förbi så pratar vi färger, stil och budget. Buketter går att beställa samma dag, bröllop och större uppdrag gärna två månader i förväg.</p>
        <a class="btn btn-tel" data-tel data-slot="text" data-label="Telefon – beställ" href="#">040-628 04 15</a>
      </div>
      <ol class="list">
        <li>
          <span class="n" aria-hidden="true">01</span>
          <h3 data-slot="text" data-label="Beställning 1 – namn">Buketter</h3>
          <p data-slot="text" data-label="Beställning 1 – text">Säsongens blommor bundna efter tillfälle och budget, med kort och vattenpåse.</p>
          <span class="price" data-slot="text" data-label="Beställning 1 – pris">från 395 kr</span>
        </li>
        <li>
          <span class="n" aria-hidden="true">02</span>
          <h3 data-slot="text" data-label="Beställning 2 – namn">Bröllop</h3>
          <p data-slot="text" data-label="Beställning 2 – text">Brudbukett, kransar, corsage och dekoration till vigsel och fest. Vi ses först och går igenom allt.</p>
          <span class="price" data-slot="text" data-label="Beställning 2 – pris">från 1 650 kr</span>
        </li>
        <li>
          <span class="n" aria-hidden="true">03</span>
          <h3 data-slot="text" data-label="Beställning 3 – namn">Begravning</h3>
          <p data-slot="text" data-label="Beställning 3 – text">Kransar, kistdekorationer och handbuketter. Vi levererar direkt till kyrkan eller kapellet.</p>
          <span class="price" data-slot="text" data-label="Beställning 3 – pris">från 850 kr</span>
        </li>
        <li>
          <span class="n" aria-hidden="true">04</span>
          <h3 data-slot="text" data-label="Beställning 4 – namn">Blomsterabonnemang</h3>
          <p data-slot="text" data-label="Beställning 4 – text">Färska blommor varje eller varannan vecka till hemmet, kontoret eller restaurangen.</p>
          <span class="price" data-slot="text" data-label="Beställning 4 – pris">från 395 kr/gång</span>
        </li>
      </ol>
    </div>
  </section>

  <section class="delivery" id="leverans">
    <div class="wrap delivery-grid">
      <div class="text">
        <p class="label" data-slot="text" data-label="Leverans – etikett">Leverans</p>
        <h2 data-slot="text" data-label="Leverans – rubrik">Vi cyklar ut blommor i hela Malmö</h2>
        <p class="intro" data-slot="text" data-label="Leverans – text">Beställ före kl. 12 så levererar vi samma dag, tisdag till lördag. Är ingen hemma ringer vi mottagaren och kommer tillbaka.</p>
        <dl class="rates">
          <div><dt data-slot="text" data-label="Leverans 1 – område">Innanför Inre ringvägen</dt><dd data-slot="text" data-label="Leverans 1 – pris">95 kr</dd></div>
          <div><dt data-slot="text" data-label="Leverans 2 – område">Övriga Malmö</dt><dd data-slot="text" data-label="Leverans 2 – pris">145 kr</dd></div>
          <div><dt data-slot="text" data-label="Leverans 3 – område">Lomma, Burlöv, Vellinge</dt><dd data-slot="text" data-label="Leverans 3 – pris">från 245 kr</dd></div>
          <div><dt data-slot="text" data-label="Leverans 4 – område">Kort med din hälsning</dt><dd data-slot="text" data-label="Leverans 4 – pris">Ingår</dd></div>
        </dl>
      </div>
      <div class="pic">
        <img data-slot="image" data-label="Leverans – bild" src="${tone(800, 1000, C.sage, C.ink, 'bild: lådcykeln utanför butiken', 'hills')}" width="800" height="1000" alt="Butikens lådcykel lastad med buketter" loading="lazy">
      </div>
    </div>
  </section>

  <section class="find" id="hitta-hit">
    <div class="wrap">
      <img class="wide" data-slot="image" data-label="Hitta hit – bred bild" src="${tone(1600, 610, C.sand, C.poppy, 'bild: butiken från gatan', 'grid')}" width="1600" height="610" alt="Butikens fasad och skyltfönster från gatan" loading="lazy">
      <div class="find-head">
        <p class="label" data-slot="text" data-label="Hitta hit – etikett">Hitta hit</p>
        <h2 data-slot="text" data-label="Hitta hit – rubrik">Två minuter från Möllevångstorget</h2>
      </div>
      <div class="cols">
        <div>
          <p class="label">Adress</p>
          <p><a data-map data-slot="text" data-label="Adress" href="#">Bergsgatan 31, 214 22 Malmö</a></p>
          <p class="muted" data-slot="text" data-label="Hitta hit – vägbeskrivning">Buss till Möllevångstorget, sedan två minuter till fots. Cykelställ utanför dörren.</p>
        </div>
        <div>
          <p class="label">Öppettider</p>
          <p class="pre" data-slot="text" data-multiline data-label="Öppettider">Mån stängt
Tis–fre kl. 10–18
Lör kl. 10–15
Sön stängt</p>
          <p class="muted" data-slot="text" data-label="Betalning">Kort, Swish och faktura för företag.</p>
        </div>
        <div>
          <p class="label">Kontakt</p>
          <p><a data-tel data-slot="text" data-label="Telefon – hitta hit" href="#">040-628 04 15</a></p>
          <p><a data-mail data-slot="text" data-label="E-post" href="#">hej@ateljevallmo.se</a></p>
        </div>
      </div>
    </div>
  </section>
</main>

<footer class="foot">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <span class="brand" data-slot="text" data-label="Butikens namn – sidfot">Ateljé Vallmo</span>
        <p data-slot="text" data-label="Sidfot – kort text">Blomsterhandel och binderi på Möllevången i Malmö.</p>
      </div>
      <div>
        <p class="label">Besök</p>
        <a data-map data-slot="text" data-label="Adress – sidfot" href="#">Bergsgatan 31, 214 22 Malmö</a>
      </div>
      <div>
        <p class="label">Öppet</p>
        <p class="pre" data-slot="text" data-multiline data-label="Öppettider – sidfot">Tis–fre kl. 10–18
Lör kl. 10–15</p>
      </div>
      <div>
        <p class="label">Kontakt</p>
        <a data-tel data-slot="text" data-label="Telefon – sidfot" href="#">040-628 04 15</a><br>
        <a data-mail data-slot="text" data-label="E-post – sidfot" href="#">hej@ateljevallmo.se</a>
      </div>
    </div>
    <div class="legal">
      <span data-slot="text" data-label="Sidfot – copyright">© 2026 Ateljé Vallmo</span>
      <span data-slot="text" data-label="Organisationsnummer">Org.nr 556000-0000</span>
    </div>
  </div>
</footer>
${window.siteJs}
</body>
</html>`;

  window.TEMPLATES.push({
    id: 'blommor',
    name: 'Blomsterhandel',
    category: 'Butik',
    html: html
  });
})();
