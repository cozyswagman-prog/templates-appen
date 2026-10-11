(function () {
  // Fastighetsmäklare – riktning: skandinavisk broschyr. Kall vit och varm sten,
  // nästan-svart text, en mörk mossgrön accent, Lora-rubriker med Inter och
  // stora liggande bilder.
  const tone = window.tone;
  const C = {
    stone: '#ddd6cb', cool: '#dcdedb', moss: '#cfd5c6', ink: '#1c1d1b', acc: '#3c4a32'
  };

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mäklarhuset Ekbacken – fastighetsmäklare i Bromma</title>
<meta name="description" content="Fastighetsmäklare i Bromma. Villor, radhus och bostadsrätter. Boka en kostnadsfri värdering.">
<style>
${window.fontCss('lora', 'inter')}
:root {
  --white: #f7f7f5;
  --stone: #ebe6de;
  --ink: #1c1d1b;
  --muted: #565853;
  --line: rgb(28 29 27 / .14);
  --accent: #3c4a32;
  --accent-dark: #2b3624;
  --r: 4px;
  --serif: 'Lora', Georgia, 'Times New Roman', serif;
  --sans: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --gut: 24px;
}
*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; }
html { -webkit-text-size-adjust: 100%; }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
body { background: var(--white); color: var(--ink); font-family: var(--sans); font-size: 17px; line-height: 1.6; }
img { display: block; max-width: 100%; height: auto; object-fit: cover; border-radius: var(--r); }
a { color: inherit; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: var(--r); }
h1, h2, h3 { font-family: var(--serif); font-weight: 400; line-height: 1.15; letter-spacing: -0.01em; text-wrap: balance; font-variant-numeric: lining-nums; }
h2 { font-size: clamp(32px, 2.4vw + 18px, 48px); }
.wrap { max-width: 1200px; margin: 0 auto; padding: 0 var(--gut); }
.label { font-size: 13px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
.pre { white-space: pre-line; }
.num { font-variant-numeric: tabular-nums; }
.skip { position: absolute; left: 16px; top: -64px; background: var(--ink); color: var(--white); padding: 12px 16px; z-index: 10; text-decoration: none; }
.skip:focus { top: 16px; }

.btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 24px; border-radius: var(--r);
  background: var(--accent); color: #fff; border: 1px solid var(--accent); font: 700 16px/1.2 var(--sans); text-decoration: none;
  transition: background-color .2s ease-out, border-color .2s ease-out; }
.btn:hover { background: var(--accent-dark); border-color: var(--accent-dark); }
.link { display: inline-flex; align-items: center; min-height: 48px; font-weight: 700; text-underline-offset: 6px; text-decoration-thickness: 1px; }
.link::after { content: "→"; display: inline-block; margin-left: 8px; transition: transform .2s ease-out; }
.link:hover::after { transform: translateX(4px); }

/* Sidhuvud */
.top { background: var(--white); border-bottom: 1px solid var(--line); }
.top .wrap { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 72px; }
.brand { font-family: var(--serif); font-size: 21px; line-height: 1.15; text-decoration: none; }
.nav { display: none; align-items: center; gap: 8px; }
.nav a:not(.btn) { display: inline-flex; align-items: center; min-height: 44px; padding: 0 8px; text-decoration: none; font-size: 16px; color: var(--muted); }
.nav a:not(.btn):hover { color: var(--ink); text-decoration: underline; text-underline-offset: 6px; }
.nav .btn { display: none; margin-left: 16px; min-height: 44px; }
.call { flex: none; min-height: 44px; font-size: 0; padding: 0 24px; }
.call::before { content: "Ring"; font-size: 16px; }

/* Hero */
.hero { padding: 48px 0 0; }
.hero-grid { display: grid; gap: 32px; }
.hero h1 { font-size: clamp(48px, 6.4vw + 16px, 112px); line-height: 1.02; letter-spacing: -0.02em; margin-top: 16px; }
.lead { font-size: 18px; color: var(--muted); max-width: 32em; }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 24px; margin-top: 32px; }
.reach { display: grid; grid-template-columns: auto 1fr; gap: 4px 24px; margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 16px; }
.reach dt { color: var(--muted); }
.reach a { font-weight: 700; text-decoration: none; display: inline-flex; min-height: 44px; align-items: center; margin: -12px 0; }
.reach a:hover { text-decoration: underline; text-underline-offset: 4px; }
.hero-img { margin-top: 48px; }
.hero-img img { width: 100%; aspect-ratio: 4 / 3; border-radius: 0; }

/* Till salu */
.sale { padding: 64px 0; }
.sec-head { display: grid; gap: 16px; margin-bottom: 48px; }
.sec-head h2 { margin-top: 12px; }
.sec-head p:not(.label) { color: var(--muted); max-width: 30em; }
.obj .area { margin: 24px 0 8px; }
.obj h3 { font-size: 28px; }
.obj .desc { color: var(--muted); margin-top: 12px; max-width: 32em; }
.obj img { width: 100%; aspect-ratio: 3 / 2; }
.facts { margin-top: 24px; border-bottom: 1px solid var(--line); font-size: 16px; }
.facts div { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; padding: 8px 0; border-top: 1px solid var(--line); }
.facts dt { color: var(--muted); }
.facts dd { text-align: right; font-variant-numeric: tabular-nums; }
.facts .price dd { font-weight: 700; }
.obj-big { display: grid; gap: 0; }
.obj-row { display: grid; gap: 48px; margin-top: 64px; }

/* Process */
.process { background: var(--stone); padding: 64px 0; }
.process-grid { display: grid; gap: 48px; }
.process .intro p:not(.label) { color: var(--muted); margin-top: 24px; max-width: 26em; }
.process h2 { margin-top: 12px; }
.steps { list-style: none; padding: 0; counter-reset: step; }
.steps li { position: relative; display: grid; grid-template-columns: 48px 1fr; gap: 0 16px; padding-bottom: 32px; counter-increment: step; }
.steps li::before { content: counter(step); display: grid; place-items: center; width: 40px; height: 40px; border: 1px solid var(--ink); border-radius: 50%;
  font-family: var(--serif); font-size: 18px; font-variant-numeric: lining-nums; background: var(--stone); position: relative; z-index: 1; }
.steps li::after { content: ""; position: absolute; left: 20px; top: 40px; bottom: 0; border-left: 1px solid rgb(28 29 27 / .3); }
.steps li:last-child { padding-bottom: 0; }
.steps li:last-child::after { display: none; }
.steps .when { font-size: 13px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--accent); padding-top: 8px; }
.steps h3 { font-size: 24px; margin: 4px 0 8px; }
.steps p { color: var(--muted); max-width: 34em; }
.steps > li > * { grid-column: 2; }

/* Mäklare */
.agents { padding: 64px 0; }
.agents-grid { display: grid; gap: 48px; }
.agents h2 { margin-top: 12px; }
.agents .intro p:not(.label) { color: var(--muted); margin-top: 24px; max-width: 26em; }
.people { display: grid; gap: 48px; }
.person img { width: 100%; aspect-ratio: 4 / 5; }
.person h3 { font-size: 24px; margin-top: 16px; }
.person .role { color: var(--muted); font-size: 16px; }
.person .direct { margin-top: 12px; border-top: 1px solid var(--line); padding-top: 8px; font-size: 16px; }
.person .direct a { display: flex; align-items: center; min-height: 44px; text-underline-offset: 4px; }

/* Arvode */
.fee { background: var(--stone); padding: 64px 0; }
.fee-grid { display: grid; gap: 48px; }
.fee h2 { margin-top: 12px; }
.big { font-family: var(--serif); font-size: clamp(80px, 8vw + 32px, 144px); line-height: 1; letter-spacing: -0.03em; margin-top: 32px; font-variant-numeric: lining-nums; }
.big-cap { color: var(--muted); margin-top: 8px; }
.fee-table { border-bottom: 1px solid var(--line); }
.fee-table div { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; padding: 16px 0; border-top: 1px solid var(--line); }
.fee-table dd { font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.fee .note { color: var(--muted); font-size: 15px; margin-top: 16px; max-width: 36em; }

/* Kontor */
.office { padding: 64px 0; }
.office-img img { width: 100%; aspect-ratio: 4 / 3; border-radius: 0; }
.office-grid { display: grid; gap: 48px; margin-top: 48px; }
.office h2 { margin-top: 12px; }
.office .intro p:not(.label) { color: var(--muted); margin-top: 16px; max-width: 30em; }
.bigtel { display: inline-flex; align-items: center; min-height: 48px; margin-top: 24px; font-family: var(--serif); font-size: clamp(28px, 2vw + 18px, 40px);
  font-variant-numeric: lining-nums proportional-nums; text-decoration: none; color: var(--accent); }
.bigtel:hover { text-decoration: underline; text-underline-offset: 6px; text-decoration-thickness: 1px; }
.office .mail { display: inline-flex; align-items: center; min-height: 44px; text-underline-offset: 4px; }
.info { display: grid; gap: 32px; }
.info > div { border-top: 1px solid var(--ink); padding-top: 16px; }
.info .label { margin-bottom: 12px; }
.info a { display: inline-flex; align-items: center; min-height: 44px; margin-top: -8px; text-underline-offset: 4px; }
.info .muted { color: var(--muted); font-size: 16px; margin-top: 8px; }

/* Sidfot */
.foot { background: var(--ink); color: #d9d4cb; padding: 64px 0 32px; font-size: 16px; }
.foot-grid { display: grid; gap: 32px; }
.foot .brand { color: #f7f7f5; font-size: 28px; display: block; margin-bottom: 8px; }
.foot .label { color: #a9a59d; margin-bottom: 8px; }
.foot a { display: inline-flex; align-items: center; min-height: 44px; text-underline-offset: 4px; }
.foot :focus-visible { outline-color: #c8d3bb; }
.legal { display: flex; flex-wrap: wrap; gap: 8px 24px; margin-top: 48px; padding-top: 16px; border-top: 1px solid rgb(217 212 203 / .2); font-size: 14px; color: #a9a59d; }

@media (min-width: 760px) {
  :root { --gut: 32px; }
  .nav { display: flex; }
  .call { display: none; }
  .hero { padding-top: 64px; }
  .hero-img img, .office-img img { aspect-ratio: 16 / 7; }
  .sale, .process, .agents, .fee { padding: 96px 0; }
  .office { padding: 96px 0; }
  .sec-head { grid-template-columns: 1fr 1fr; align-items: end; }
  .obj-row { grid-template-columns: 1fr 1fr; gap: 32px; }
  .people { grid-template-columns: 1fr 1fr; gap: 24px; }
  .info { grid-template-columns: 1fr 1fr; gap: 24px; }
  .foot-grid { grid-template-columns: 2fr 1fr 1fr 1fr; gap: 24px; }
}
@media (min-width: 1024px) {
  .nav .btn { display: inline-flex; }
  .hero-grid { grid-template-columns: repeat(12, 1fr); gap: 24px; align-items: end; }
  .hero-text { grid-column: 1 / 8; }
  .hero-side { grid-column: 8 / 13; }
  .hero-img { margin-top: 64px; }
  .obj-big { grid-template-columns: repeat(12, 1fr); gap: 24px; align-items: end; }
  .obj-big .pic { grid-column: 1 / 9; }
  .obj-big .txt { grid-column: 9 / 13; }
  .obj-big .area { margin-top: 0; }
  .obj-big h3 { font-size: 32px; }
  .process-grid, .agents-grid, .fee-grid, .office-grid { grid-template-columns: repeat(12, 1fr); gap: 24px; }
  .process .intro, .agents .intro, .fee .intro { grid-column: 1 / 5; }
  .steps { grid-column: 6 / 13; }
  .people { grid-column: 6 / 13; }
  .people .person:nth-child(2) { margin-top: 96px; }
  .fee-body { grid-column: 6 / 13; align-self: end; }
  .office .intro { grid-column: 1 / 6; }
  .info { grid-column: 7 / 13; }
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; } }
</style>
</head>
<body>
<a class="skip" href="#innehall">Hoppa till innehåll</a>

<header class="top">
  <div class="wrap">
    <a class="brand" href="#" data-slot="text" data-label="Företagsnamn – sidhuvud">Mäklarhuset Ekbacken</a>
    <nav class="nav" aria-label="Huvudmeny">
      <a href="#till-salu">Till salu</a>
      <a href="#sa-saljer-vi">Så säljer vi</a>
      <a href="#maklare">Mäklare</a>
      <a href="#kontor">Kontor</a>
      <a class="btn" href="#kontor" data-slot="text" data-label="Sidhuvud – knapp">Boka värdering</a>
    </nav>
    <a class="btn call" data-tel data-slot="text" data-label="Telefon – sidhuvud (mobil)" href="#">08-46 50 04 37</a>
  </div>
</header>

<main id="innehall">
  <section class="hero">
    <div class="wrap hero-grid">
      <div class="hero-text">
        <p class="label" data-slot="text" data-label="Hero – liten etikett">Fastighetsmäklare · Bromma</p>
        <h1 data-slot="text" data-label="Hero – rubrik">Mäklare i&nbsp;Bromma</h1>
      </div>
      <div class="hero-side">
        <p class="lead" data-slot="text" data-label="Hero – ingress">Vi säljer villor, radhus och bostadsrätter från Ålsten till Riksby. Värderingen är kostnadsfri och tar ungefär 45 minuter hemma hos dig.</p>
        <div class="actions">
          <a class="btn" href="#kontor" data-slot="text" data-label="Hero – knapp">Boka värdering</a>
          <a class="link" href="#till-salu" data-slot="text" data-label="Hero – länk">Se bostäder till salu</a>
        </div>
        <dl class="reach">
          <dt>Telefon</dt>
          <dd><a data-tel data-slot="text" data-label="Telefon – hero" href="#">08-46 50 04 37</a></dd>
          <dt>Kontoret</dt>
          <dd data-slot="text" data-label="Öppettider – hero">Mån–fre kl. 09–17</dd>
        </dl>
      </div>
    </div>
    <div class="wrap hero-img">
      <img data-slot="image" data-label="Hero – stor liggande bild" src="${tone(1600, 700, C.stone, C.acc, 'bild: villagata i bromma', 'hills')}" width="1600" height="700" alt="Villagata med äldre trähus och trädgårdar i Bromma">
    </div>
  </section>

  <section class="sale" id="till-salu">
    <div class="wrap">
      <div class="sec-head">
        <div>
          <p class="label" data-slot="text" data-label="Till salu – etikett">Till salu</p>
          <h2 data-slot="text" data-label="Till salu – rubrik">Bostäder just nu</h2>
        </div>
        <p data-slot="text" data-label="Till salu – text">Fler objekt kommer ut varje vecka. Ring oss om du vill veta vad som är på väg innan det syns på Hemnet.</p>
      </div>

      <article class="obj obj-big">
        <div class="pic">
          <img data-slot="image" data-label="Objekt 1 – bild" src="${tone(1200, 800, C.moss, C.acc, 'bild: objekt 1, fasad mot trädgården', 'arch')}" width="1200" height="800" alt="Funkisvilla med trädgård i söderläge" loading="lazy">
        </div>
        <div class="txt">
          <p class="label area" data-slot="text" data-label="Objekt 1 – område">Höglandet · Villa</p>
          <h3 data-slot="text" data-label="Objekt 1 – adress">Ekbacksvägen 22</h3>
          <p class="desc" data-slot="text" data-label="Objekt 1 – kort text">Funkisvilla med trädgård i söderläge och plats för två bilar.</p>
          <dl class="facts">
            <div><dt>Rum</dt><dd data-slot="text" data-label="Objekt 1 – rum">6 rum och kök</dd></div>
            <div><dt>Boarea</dt><dd data-slot="text" data-label="Objekt 1 – boarea">164 m²</dd></div>
            <div><dt>Avgift</dt><dd data-slot="text" data-label="Objekt 1 – avgift">Ingen (äganderätt)</dd></div>
            <div class="price"><dt>Utgångspris</dt><dd data-slot="text" data-label="Objekt 1 – utgångspris">13 950 000 kr</dd></div>
            <div><dt>Visning</dt><dd data-slot="text" data-label="Objekt 1 – visning">Sön kl. 13.00–14.00</dd></div>
          </dl>
        </div>
      </article>

      <div class="obj-row">
        <article class="obj">
          <img data-slot="image" data-label="Objekt 2 – bild" src="${tone(900, 600, C.cool, C.ink, 'bild: objekt 2, vardagsrum', 'sun')}" width="900" height="600" alt="Ljust vardagsrum med balkongdörr" loading="lazy">
          <p class="label area" data-slot="text" data-label="Objekt 2 – område">Riksby · Bostadsrätt</p>
          <h3 data-slot="text" data-label="Objekt 2 – adress">Riksbyvägen 41, 3 tr</h3>
          <dl class="facts">
            <div><dt>Rum</dt><dd data-slot="text" data-label="Objekt 2 – rum">3 rum och kök</dd></div>
            <div><dt>Boarea</dt><dd data-slot="text" data-label="Objekt 2 – boarea">74 m²</dd></div>
            <div><dt>Avgift</dt><dd data-slot="text" data-label="Objekt 2 – avgift">4 312 kr/mån</dd></div>
            <div class="price"><dt>Utgångspris</dt><dd data-slot="text" data-label="Objekt 2 – utgångspris">4 250 000 kr</dd></div>
            <div><dt>Visning</dt><dd data-slot="text" data-label="Objekt 2 – visning">Lör kl. 11.00–11.45</dd></div>
          </dl>
        </article>
        <article class="obj">
          <img data-slot="image" data-label="Objekt 3 – bild" src="${tone(900, 600, C.stone, C.acc, 'bild: objekt 3, radhus från gatan', 'grid')}" width="900" height="600" alt="Radhuslänga i tegel med förträdgårdar" loading="lazy">
          <p class="label area" data-slot="text" data-label="Objekt 3 – område">Ålsten · Radhus</p>
          <h3 data-slot="text" data-label="Objekt 3 – adress">Klövervägen 9</h3>
          <dl class="facts">
            <div><dt>Rum</dt><dd data-slot="text" data-label="Objekt 3 – rum">5 rum och kök</dd></div>
            <div><dt>Boarea</dt><dd data-slot="text" data-label="Objekt 3 – boarea">126 m²</dd></div>
            <div><dt>Avgift</dt><dd data-slot="text" data-label="Objekt 3 – avgift">5 108 kr/mån</dd></div>
            <div class="price"><dt>Utgångspris</dt><dd data-slot="text" data-label="Objekt 3 – utgångspris">7 495 000 kr</dd></div>
            <div><dt>Visning</dt><dd data-slot="text" data-label="Objekt 3 – visning">Sön kl. 15.00–15.45</dd></div>
          </dl>
        </article>
      </div>
    </div>
  </section>

  <section class="process" id="sa-saljer-vi">
    <div class="wrap process-grid">
      <div class="intro">
        <p class="label" data-slot="text" data-label="Process – etikett">Så går det till</p>
        <h2 data-slot="text" data-label="Process – rubrik">Så säljer vi din bostad</h2>
        <p data-slot="text" data-label="Process – text">Fem steg från första samtalet till tillträdet. Du har samma mäklare hela vägen och vet alltid vad som händer härnäst.</p>
      </div>
      <ol class="steps">
        <li>
          <p class="when" data-slot="text" data-label="Steg 1 – tid">Vecka 1</p>
          <h3 data-slot="text" data-label="Steg 1 – rubrik">Värdering</h3>
          <p data-slot="text" data-label="Steg 1 – text">Vi går igenom bostaden tillsammans, pratar om läget på marknaden och lämnar ett skriftligt värde. Kostnadsfritt.</p>
        </li>
        <li>
          <p class="when" data-slot="text" data-label="Steg 2 – tid">Vecka 1–2</p>
          <h3 data-slot="text" data-label="Steg 2 – rubrik">Förberedelser</h3>
          <p data-slot="text" data-label="Steg 2 – text">Fotograf, planritning och vid behov stylist. Vi skriver beskrivningen och hämtar in alla handlingar från föreningen.</p>
        </li>
        <li>
          <p class="when" data-slot="text" data-label="Steg 3 – tid">Vecka 2</p>
          <h3 data-slot="text" data-label="Steg 3 – rubrik">Annonsering</h3>
          <p data-slot="text" data-label="Steg 3 – text">Bostaden publiceras på Hemnet och i våra kanaler, och vi kontaktar spekulanter som letar i området.</p>
        </li>
        <li>
          <p class="when" data-slot="text" data-label="Steg 4 – tid">Vecka 2–4</p>
          <h3 data-slot="text" data-label="Steg 4 – rubrik">Visning och budgivning</h3>
          <p data-slot="text" data-label="Steg 4 – text">Vi håller i visningarna och ringer upp alla intressenter. Budgivningen sker öppet och du får besked efter varje bud.</p>
        </li>
        <li>
          <p class="when" data-slot="text" data-label="Steg 5 – tid">1–3 månader</p>
          <h3 data-slot="text" data-label="Steg 5 – rubrik">Kontrakt och tillträde</h3>
          <p data-slot="text" data-label="Steg 5 – text">Vi skriver kontrakt, tar hand om handpenningen och finns med på tillträdesdagen.</p>
        </li>
      </ol>
    </div>
  </section>

  <section class="agents" id="maklare">
    <div class="wrap agents-grid">
      <div class="intro">
        <p class="label" data-slot="text" data-label="Mäklare – etikett">Mäklarna</p>
        <h2 data-slot="text" data-label="Mäklare – rubrik">Ring oss direkt</h2>
        <p data-slot="text" data-label="Mäklare – text">Två registrerade fastighetsmäklare med kontor vid Brommaplan. Du når oss på direktnumret även kvällar under budgivning.</p>
      </div>
      <div class="people">
        <figure class="person">
          <img data-slot="image" data-label="Mäklare 1 – porträtt" src="${tone(800, 1000, C.cool, C.ink, 'bild: porträtt, mäklare 1', 'circle')}" width="800" height="1000" alt="Porträtt av mäklaren Anna Lindqvist" loading="lazy">
          <figcaption>
            <h3 data-slot="text" data-label="Mäklare 1 – namn">Anna Lindqvist</h3>
            <p class="role" data-slot="text" data-label="Mäklare 1 – titel">Reg. fastighetsmäklare, delägare</p>
            <div class="direct">
              <a data-tel data-slot="text" data-label="Mäklare 1 – direktnummer" href="#">08-46 50 04 38</a>
              <a data-mail data-slot="text" data-label="Mäklare 1 – e-post" href="#">anna@ekbacken.se</a>
            </div>
          </figcaption>
        </figure>
        <figure class="person">
          <img data-slot="image" data-label="Mäklare 2 – porträtt" src="${tone(800, 1000, C.stone, C.acc, 'bild: porträtt, mäklare 2', 'circle')}" width="800" height="1000" alt="Porträtt av mäklaren Johan Berg" loading="lazy">
          <figcaption>
            <h3 data-slot="text" data-label="Mäklare 2 – namn">Johan Berg</h3>
            <p class="role" data-slot="text" data-label="Mäklare 2 – titel">Reg. fastighetsmäklare</p>
            <div class="direct">
              <a data-tel data-slot="text" data-label="Mäklare 2 – direktnummer" href="#">08-46 50 04 39</a>
              <a data-mail data-slot="text" data-label="Mäklare 2 – e-post" href="#">johan@ekbacken.se</a>
            </div>
          </figcaption>
        </figure>
      </div>
    </div>
  </section>

  <section class="fee" id="arvode">
    <div class="wrap fee-grid">
      <div class="intro">
        <p class="label" data-slot="text" data-label="Arvode – etikett">Arvode</p>
        <h2 data-slot="text" data-label="Arvode – rubrik">Vad kostar det att sälja?</h2>
        <p class="big" data-slot="text" data-label="Arvode – stor siffra">1,5 %</p>
        <p class="big-cap" data-slot="text" data-label="Arvode – under siffran">av slutpriset, inklusive moms</p>
      </div>
      <div class="fee-body">
        <dl class="fee-table">
          <div><dt data-slot="text" data-label="Arvode rad 1 – vad">Rörligt arvode</dt><dd data-slot="text" data-label="Arvode rad 1 – pris">1,5 % av slutpriset</dd></div>
          <div><dt data-slot="text" data-label="Arvode rad 2 – vad">Lägsta arvode</dt><dd data-slot="text" data-label="Arvode rad 2 – pris">45 000 kr</dd></div>
          <div><dt data-slot="text" data-label="Arvode rad 3 – vad">Foto, planritning och Hemnet</dt><dd data-slot="text" data-label="Arvode rad 3 – pris">Ingår</dd></div>
          <div><dt data-slot="text" data-label="Arvode rad 4 – vad">Om bostaden inte blir såld</dt><dd data-slot="text" data-label="Arvode rad 4 – pris">0 kr</dd></div>
        </dl>
        <p class="note" data-slot="text" data-label="Arvode – liten text">Priserna är exempel. Efter värderingen får du alltid ett skriftligt förslag med fast pris eller procent – du väljer.</p>
      </div>
    </div>
  </section>

  <section class="office" id="kontor">
    <div class="wrap office-img">
      <img data-slot="image" data-label="Kontor – stor liggande bild" src="${tone(1600, 700, C.moss, C.acc, 'bild: kontoret vid brommaplan', 'arch')}" width="1600" height="700" alt="Mäklarkontorets skyltfönster vid Brommaplan" loading="lazy">
    </div>
    <div class="wrap office-grid">
      <div class="intro">
        <p class="label" data-slot="text" data-label="Kontor – etikett">Kontor &amp; värdering</p>
        <h2 data-slot="text" data-label="Kontor – rubrik">Boka värdering eller kom förbi</h2>
        <p data-slot="text" data-label="Kontor – text">Ring så bokar vi en tid hemma hos dig, ofta samma vecka. Du är också välkommen in på kontoret för en första pratstund.</p>
        <a class="bigtel" data-tel data-slot="text" data-label="Telefon – kontor" href="#">08-46 50 04 37</a><br>
        <a class="mail" data-mail data-slot="text" data-label="E-post – kontor" href="#">info@ekbacken.se</a>
      </div>
      <div class="info">
        <div>
          <p class="label">Besöksadress</p>
          <a data-map data-slot="text" data-label="Adress" href="#">Brommaplan 12, 168 76 Bromma</a>
          <p class="muted" data-slot="text" data-label="Hitta hit – text">T-bana till Brommaplan, sedan två minuter till fots. Besöksparkering på gården bakom huset.</p>
        </div>
        <div>
          <p class="label">Öppettider</p>
          <p class="pre num" data-slot="text" data-multiline data-label="Öppettider">Mån–fre kl. 09–17
Lör–sön visningar enligt annons</p>
        </div>
      </div>
    </div>
  </section>
</main>

<footer class="foot">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <span class="brand" data-slot="text" data-label="Företagsnamn – sidfot">Mäklarhuset Ekbacken</span>
        <p data-slot="text" data-label="Sidfot – kort text">Fastighetsmäklare för villor, radhus och bostadsrätter i Bromma.</p>
      </div>
      <div>
        <p class="label">Kontor</p>
        <a data-map data-slot="text" data-label="Adress – sidfot" href="#">Brommaplan 12, 168 76 Bromma</a>
      </div>
      <div>
        <p class="label">Öppet</p>
        <p class="pre num" data-slot="text" data-multiline data-label="Öppettider – sidfot">Mån–fre kl. 09–17</p>
      </div>
      <div>
        <p class="label">Kontakt</p>
        <a data-tel data-slot="text" data-label="Telefon – sidfot" href="#">08-46 50 04 37</a><br>
        <a data-mail data-slot="text" data-label="E-post – sidfot" href="#">info@ekbacken.se</a>
      </div>
    </div>
    <div class="legal">
      <span data-slot="text" data-label="Sidfot – copyright">© 2026 Mäklarhuset Ekbacken</span>
      <span data-slot="text" data-label="Organisationsnummer">Org.nr 556000-0000</span>
      <span data-slot="text" data-label="Sidfot – rad (t.ex. mäklarnas FMI-registrering)">Värdering och försäljning i Bromma med omnejd</span>
    </div>
  </div>
</footer>
${window.siteJs}
</body>
</html>`;

  window.TEMPLATES.push({
    id: 'maklare',
    name: 'Fastighetsmäklare',
    category: 'Tjänster',
    html: html
  });
})();
