(function () {
  const tone = window.tone;

  // Riktning: tryckt gårdsbutiksskylt på kraftpapper – havrebas, jordbrun text,
  // en tegelröd accent, Lora-rubriker, Inter-brödtext och mono-etiketter.
  const C = { oat: '#efe6d4', kraft: '#e2d3b5', ink: '#3a2a1d', brick: '#a63d26' };

  // Säsongskalender: 1 = i butiken, 2 = självplock, 0 = ingen säsong (jan–dec)
  const kal = [
    ['Sparris', 'maj–jun', [0,0,0,0,1,1,0,0,0,0,0,0]],
    ['Jordgubbar', 'jun–jul', [0,0,0,0,0,2,2,0,0,0,0,0]],
    ['Färskpotatis', 'jun–aug', [0,0,0,0,0,1,1,1,0,0,0,0]],
    ['Hallon', 'jul–sep', [0,0,0,0,0,0,2,2,2,0,0,0]],
    ['Tomater', 'jul–sep', [0,0,0,0,0,0,1,1,1,0,0,0]],
    ['Äpplen', 'aug–nov', [0,0,0,0,0,0,0,1,2,2,1,0]],
    ['Pumpor', 'sep–okt', [0,0,0,0,0,0,0,0,2,2,0,0]],
    ['Rotfrukter', 'aug–dec', [0,0,0,0,0,0,0,1,1,1,1,1]],
    ['Grönkål', 'okt–dec', [0,0,0,0,0,0,0,0,0,1,1,1]],
    ['Ägg', 'hela året', [1,1,1,1,1,1,1,1,1,1,1,1]]
  ];
  const man = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const mark = v => v === 2 ? '<span class="m m-sj" title="Självplock"></span>'
    : v === 1 ? '<span class="m m-bu" title="I butiken"></span>' : '';
  const kalRows = kal.map((r, i) => `
          <tr>
            <th scope="row" data-slot="text" data-label="Kalender rad ${i + 1} – produkt">${r[0]}</th>
            <td class="per" data-slot="text" data-label="Kalender rad ${i + 1} – period">${r[1]}</td>
            ${r[2].map((v, j) => `<td${j === 9 ? ' class="nu"' : ''}>${mark(v)}<span class="sr">${v === 2 ? 'självplock' : v === 1 ? 'i butiken' : ''}</span></td>`).join('')}
          </tr>`).join('');

  const varor = [
    ['Potatis, Asterix', 'Fast, rödskalig. Bra till ugn och mos.', '18'],
    ['Morötter', 'Tvättade, i lösvikt.', '22'],
    ['Rödbetor', 'Även polkabetor och gulbetor.', '20'],
    ['Gul lök', 'Torkad på gården.', '18'],
    ['Vitkål', 'Hela huvuden, ca 1–2 kg.', '15'],
    ['Äpplen, Ingrid Marie', 'Från egna träd. Även Aroma och Cox.', '35'],
    ['Pumpa, Hokkaido', 'Liten och söt, skalet går att äta.', '30'],
    ['Grönkål', 'Plockas samma morgon.', '60']
  ];
  const varorRows = varor.map((v, i) => `
        <li class="vara">
          <div class="vara-namn">
            <h3 data-slot="text" data-label="Vara ${i + 1} – namn">${v[0]}</h3>
            <p data-slot="text" data-label="Vara ${i + 1} – kort om">${v[1]}</p>
          </div>
          <p class="vara-pris"><span data-slot="text" data-label="Vara ${i + 1} – pris">${v[2]}</span><span class="enhet">kr/kg</span></p>
        </li>`).join('');

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lindängens gård – gårdsbutik och självplock utanför Staffanstorp</title>
<meta name="description" content="Gårdsbutik och självplock utanför Staffanstorp. Grönsaker, potatis, äpplen och ägg från egna fält.">
<style>
${window.fontCss('lora', 'inter')}
  :root {
    --oat: #efe6d4; --paper: #f7f1e4; --kraft: #e2d3b5; --kraft-2: #9c7b4d;
    --ink: #3a2a1d; --muted: #67503d; --line: #cdbb9b; --brick: #a63d26; --brick-d: #8a311d;
    --r: 4px;
    --serif: 'Lora', Georgia, 'Times New Roman', serif;
    --sans: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
    --mono: ui-monospace, 'SF Mono', Consolas, 'Liberation Mono', monospace;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
  body { background: var(--oat); color: var(--ink); font: 400 17px/1.6 var(--sans); }
  img { display: block; max-width: 100%; height: auto; }
  a { color: inherit; }
  h1, h2, h3 { font-family: var(--serif); font-weight: 700; line-height: 1.15; text-wrap: balance; letter-spacing: -0.01em; }
  h2 { font-size: clamp(28px, 4vw, 40px); }
  h3 { font-size: 20px; line-height: 1.25; }
  .wrap { max-width: 1160px; margin: 0 auto; padding: 0 24px; }
  .etikett { font: 500 13px/1.4 var(--mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .hoppa { position: absolute; left: 16px; top: -64px; background: var(--ink); color: var(--paper); padding: 12px 16px; border-radius: var(--r); z-index: 10; }
  .hoppa:focus { top: 16px; }
  :focus-visible { outline: 3px solid var(--brick); outline-offset: 3px; }
  .pre { white-space: pre-line; }
  .tab { font-variant-numeric: tabular-nums; }

  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 12px 24px;
    border-radius: var(--r); font: 600 16px/1.2 var(--sans); text-decoration: none; border: 2px solid var(--brick);
    background: var(--brick); color: #fff; transition: background-color .2s ease-out; }
  .btn:hover { background: var(--brick-d); border-color: var(--brick-d); }
  .btn-2 { background: transparent; color: var(--ink); border-color: var(--ink); }
  .btn-2:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }

  /* Sidhuvud */
  header { border-bottom: 1px solid var(--line); background: var(--oat); }
  header .wrap { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 72px; }
  .brand { font: 700 22px/1.1 var(--serif); text-decoration: none; display: flex; flex-direction: column; gap: 4px; }
  .brand small { font: 500 11px/1 var(--mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
  nav ul { list-style: none; display: flex; gap: 32px; }
  nav a { text-decoration: none; font-size: 16px; padding: 12px 0; display: inline-block; }
  nav a:hover { text-decoration: underline; text-underline-offset: 6px; text-decoration-thickness: 1px; }
  .ring { min-height: 44px; padding: 8px 16px; font-size: 15px; }
  .ring { white-space: nowrap; flex-shrink: 0; }
  .ring .nr { font-variant-numeric: tabular-nums; }

  /* Hero */
  .hero { padding: 48px 0 64px; }
  .hero-grid { display: grid; gap: 32px; }
  .hero h1 { font-size: clamp(36px, 6vw, 60px); line-height: 1.05; letter-spacing: -0.02em; margin: 16px 0 24px; max-width: 14ch; }
  .hero .ingress { font-size: 18px; max-width: 46ch; color: var(--ink); }
  .oppet { margin: 32px 0; display: grid; grid-template-columns: auto 1fr; border: 2px solid var(--ink); border-radius: var(--r); max-width: 480px; background: var(--paper); }
  .oppet .idag { background: var(--ink); color: var(--paper); padding: 12px 16px; font: 500 13px/1.3 var(--mono); letter-spacing: 0.08em; text-transform: uppercase; display: flex; align-items: center; }
  .oppet .tid { padding: 12px 16px; font: 700 20px/1.3 var(--serif); }
  .oppet .tid + .tid { grid-column: 1 / -1; border-top: 1px solid var(--line); font: 400 15px/1.5 var(--sans); color: var(--muted); }
  .knappar { display: flex; flex-wrap: wrap; gap: 12px; }
  .hero-bild { position: relative; }
  .hero-bild img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: var(--r); }
  .stampel { position: absolute; left: -16px; bottom: 32px; background: var(--brick); color: #fff; padding: 12px 16px; border-radius: var(--r);
    font: 500 13px/1.4 var(--mono); letter-spacing: 0.08em; text-transform: uppercase; transform: rotate(-3deg); }

  /* I butiken just nu – tavlan */
  .tavla { background: var(--ink); color: var(--paper); padding: 64px 0; }
  .tavla-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 16px; padding-bottom: 24px; border-bottom: 2px solid #6d5844; }
  .tavla .etikett { color: #d9c7a5; }
  .tavla h2 { margin-top: 8px; }
  .tavla-not { color: #d9c7a5; font-size: 16px; max-width: 40ch; }
  .varor { list-style: none; display: grid; column-gap: 64px; }
  .vara { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; padding: 16px 0; border-bottom: 1px dashed #6d5844; }
  .vara h3 { font-size: 20px; }
  .vara-namn p { color: #d9c7a5; font-size: 16px; margin-top: 4px; }
  .vara-pris { white-space: nowrap; font: 700 24px/1 var(--serif); font-variant-numeric: tabular-nums; }
  .vara-pris .enhet { font: 500 13px/1 var(--mono); letter-spacing: 0.04em; margin-left: 8px; color: #d9c7a5; }
  .tavla-fot { margin-top: 24px; font: 500 13px/1.5 var(--mono); letter-spacing: 0.06em; text-transform: uppercase; color: #d9c7a5; }

  /* Säsongskalender */
  .sektion { padding: 96px 0; }
  .sek-head { display: grid; gap: 16px; margin-bottom: 32px; max-width: 720px; }
  .sek-head p { color: var(--muted); }
  .legend { display: flex; flex-wrap: wrap; gap: 24px; margin-bottom: 16px; font-size: 15px; }
  .legend span { display: inline-flex; align-items: center; gap: 8px; }
  .kal-box { position: relative; overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid var(--line); border-radius: var(--r); background: var(--paper); }
  .kal { width: 100%; min-width: 680px; border-collapse: collapse; font-size: 15px; }
  .kal th, .kal td { border-bottom: 1px solid var(--line); text-align: center; padding: 0; height: 48px; }
  .kal thead th { font: 500 12px/1 var(--mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); height: 44px; }
  .kal thead th.nu { color: var(--brick); }
  .kal tbody tr:last-child th, .kal tbody tr:last-child td { border-bottom: 0; }
  .kal th[scope="row"] { text-align: left; padding: 0 16px; font: 700 16px/1.2 var(--serif); position: sticky; left: 0; background: var(--paper); border-right: 1px solid var(--line); min-width: 144px; white-space: nowrap; }
  .kal thead th:first-child { position: sticky; left: 0; background: var(--paper); border-right: 1px solid var(--line); }
  .kal td { width: 6%; }
  .kal td.nu { background: rgba(166, 61, 38, 0.07); }
  .kal .per { text-align: left; padding: 0 16px; border-right: 1px solid var(--line); color: var(--muted); white-space: nowrap; width: auto; font-variant-numeric: tabular-nums; }
  .m { display: inline-block; width: calc(100% - 4px); height: 16px; vertical-align: middle; }
  .m-bu { background: var(--kraft-2); }
  .m-sj { background: var(--ink); }
  .legend .m { width: 24px; }
  .svep { margin-top: 12px; font: 500 12px/1.4 var(--mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }

  /* Självplock */
  .sjalvplock { background: var(--kraft); }
  .split { display: grid; gap: 48px; align-items: start; }
  .split img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; border-radius: var(--r); }
  .stor { margin: 24px 0 8px; display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
  .stor-siffra { font: 700 clamp(48px, 7vw, 72px)/1 var(--serif); letter-spacing: -0.02em; }
  .stor-text { font: 500 13px/1.4 var(--mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
  .regler { list-style: none; counter-reset: r; margin-top: 32px; border-top: 1px solid var(--ink); }
  .regler li { counter-increment: r; display: grid; grid-template-columns: 48px 1fr; gap: 16px; padding: 16px 0; border-bottom: 1px solid #bfa985; }
  .regler li::before { content: counter(r, decimal-leading-zero); font: 500 14px/1.6 var(--mono); color: var(--brick); padding-top: 2px; }

  /* Öppettider och betalning */
  .info { display: grid; gap: 48px; }
  .tider { width: 100%; border-collapse: collapse; margin-top: 24px; font-variant-numeric: tabular-nums; }
  .tider th, .tider td { text-align: left; padding: 16px 0; border-bottom: 1px solid var(--line); font-weight: 400; vertical-align: top; }
  .tider td { text-align: right; font-weight: 600; }
  .tider tr:first-child th, .tider tr:first-child td { border-top: 1px solid var(--ink); }
  .liten { font-size: 16px; color: var(--muted); margin-top: 16px; }
  .betal { list-style: none; margin-top: 24px; border-top: 1px solid var(--ink); }
  .betal li { display: grid; grid-template-columns: 120px 1fr; gap: 16px; padding: 16px 0; border-bottom: 1px solid var(--line); }
  .betal li b { font: 700 18px/1.4 var(--serif); }

  /* Hitta hit */
  .hitta { border-top: 1px solid var(--line); }
  .hitta-grid { display: grid; gap: 48px; }
  .hitta img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--r); }
  .adress { display: inline-block; margin: 24px 0; font: 700 22px/1.3 var(--serif); text-decoration-thickness: 1px; text-underline-offset: 6px; }
  .vag { list-style: none; border-top: 1px solid var(--ink); }
  .vag li { padding: 16px 0; border-bottom: 1px solid var(--line); display: grid; gap: 4px; }
  .vag .etikett { color: var(--brick); }

  /* Sidfot */
  footer { background: var(--ink); color: var(--paper); padding: 64px 0 32px; font-size: 16px; }
  .fot { display: grid; gap: 32px; }
  .fot .brand { color: var(--paper); }
  .fot .brand small { color: #d9c7a5; }
  .fot h2 { font: 500 12px/1.4 var(--mono); letter-spacing: 0.1em; text-transform: uppercase; color: #d9c7a5; margin-bottom: 12px; }
  .fot p { line-height: 1.7; }
  .fot a { text-underline-offset: 4px; }
  .fot a[data-tel], .fot a[data-mail], .fot a[data-map] { display: inline-block; padding: 8px 0; }
  .fot-bas { margin-top: 48px; padding-top: 24px; border-top: 1px solid #6d5844; display: flex; flex-wrap: wrap; gap: 8px 24px; font: 500 12px/1.6 var(--mono); letter-spacing: 0.06em; text-transform: uppercase; color: #d9c7a5; }

  @media (max-width: 759px) {
    nav ul { display: none; }
    .ring .nr { display: none; }
    .betal li { grid-template-columns: 96px 1fr; }
    .kal th[scope="row"] { min-width: 120px; padding: 0 12px; }
    .sektion { padding: 64px 0; }
    .stampel { left: 12px; }
  }
  @media (min-width: 760px) {
    .hero { padding: 64px 0 96px; }
    .hero-grid { grid-template-columns: 7fr 5fr; gap: 64px; align-items: center; }
    .varor { grid-template-columns: 1fr 1fr; }
    .split { grid-template-columns: 5fr 6fr; gap: 64px; }
    .info { grid-template-columns: 1fr 1fr; gap: 64px; }
    .hitta-grid { grid-template-columns: 5fr 7fr; gap: 64px; align-items: start; }
    .fot { grid-template-columns: 1.4fr 1.3fr 1fr 1fr; gap: 48px; }
    .svep { display: none; }
  }
  @media (min-width: 760px) and (max-width: 1023px) {
    nav ul { gap: 24px; }
    nav li:nth-child(n+3) { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    * { transition: none !important; }
  }
</style>
</head>
<body>
<a class="hoppa" href="#innehall">Hoppa till innehåll</a>

<header>
  <div class="wrap">
    <a class="brand" href="#">
      <span data-slot="text" data-label="Gårdens namn (sidhuvud)">Lindängens gård</span>
      <small data-slot="text" data-label="Liten rad under namnet">Gårdsbutik · Staffanstorp</small>
    </a>
    <nav aria-label="Huvudmeny">
      <ul>
        <li><a href="#butiken">I butiken</a></li>
        <li><a href="#kalender">Säsong</a></li>
        <li><a href="#sjalvplock">Självplock</a></li>
        <li><a href="#hitta">Hitta hit</a></li>
      </ul>
    </nav>
    <a class="btn ring" data-tel href="#"><span class="ord">Ring</span> <span class="nr" data-slot="text" data-label="Telefon (sidhuvud)">040-628 04 63</span></a>
  </div>
</header>

<main id="innehall">
  <section class="hero">
    <div class="wrap hero-grid">
      <div>
        <p class="etikett" data-slot="text" data-label="Hero – liten etikett">Vecka 41 · Äpplen, pumpor och rotfrukter</p>
        <h1 data-slot="text" data-label="Hero – rubrik">Gårdsbutik och självplock utanför Staffanstorp</h1>
        <p class="ingress" data-slot="text" data-label="Hero – ingress">Grönsaker, potatis, frukt och ägg från våra egna fält, tio minuter från Malmö. Det mesta är skördat samma morgon.</p>
        <div class="oppet">
          <span class="idag" data-slot="text" data-label="Öppet-rad – etikett">Öppet i dag</span>
          <span class="tid" data-slot="text" data-label="Öppet-rad – tider i dag">kl. 10–18</span>
          <span class="tid" data-slot="text" data-label="Öppet-rad – övriga dagar">Mån–fre 10–18 · lör–sön 10–15</span>
        </div>
        <div class="knappar">
          <a class="btn" href="#hitta">Hitta till gården</a>
          <a class="btn btn-2" data-tel href="#"><span data-slot="text" data-label="Telefon (hero)">040-628 04 63</span></a>
        </div>
      </div>
      <div class="hero-bild">
        <img data-slot="image" data-label="Hero – bild" src="${tone(1000, 1000, C.kraft, C.ink, 'Bild: butiken eller lådorna med grönsaker', 'hills')}" width="1000" height="1000" alt="Gårdsbutiken med lådor av grönsaker">
        <p class="stampel" data-slot="text" data-label="Hero – stämpel på bilden">Swish &amp; kort</p>
      </div>
    </div>
  </section>

  <section class="tavla" id="butiken" aria-labelledby="butiken-rubrik">
    <div class="wrap">
      <div class="tavla-head">
        <div>
          <p class="etikett" data-slot="text" data-label="Tavlan – etikett">Vecka 41</p>
          <h2 id="butiken-rubrik" data-slot="text" data-label="Tavlan – rubrik">I butiken just nu</h2>
        </div>
        <p class="tavla-not" data-slot="text" data-label="Tavlan – kort text">Vi skriver om tavlan varje måndag. Priserna gäller lösvikt, väg själv på vågen vid kassan.</p>
      </div>
      <ul class="varor">${varorRows}
      </ul>
      <p class="tavla-fot" data-slot="text" data-label="Tavlan – rad längst ner">Ägg från egna höns: 55 kr för 12 st · Äppelmust 3 liter: 120 kr</p>
    </div>
  </section>

  <section class="sektion" id="kalender" aria-labelledby="kal-rubrik">
    <div class="wrap">
      <div class="sek-head">
        <p class="etikett" data-slot="text" data-label="Kalender – etikett">Säsongskalender</p>
        <h2 id="kal-rubrik" data-slot="text" data-label="Kalender – rubrik">Vad som växer när</h2>
        <p data-slot="text" data-label="Kalender – text">Vädret bestämmer, så tiderna kan flytta sig ett par veckor. Ring gärna innan om du kommer för något särskilt.</p>
      </div>
      <div class="legend" aria-hidden="true">
        <span><i class="m m-bu"></i> I butiken</span>
        <span><i class="m m-sj"></i> Självplock</span>
      </div>
      <div class="kal-box" role="region" aria-labelledby="kal-rubrik" tabindex="0">
        <table class="kal">
          <thead>
            <tr><th scope="col">Produkt</th><th scope="col" class="per">Period</th>${man.map((m, j) => `<th scope="col"${j === 9 ? ' class="nu"' : ''}>${m}</th>`).join('')}</tr>
          </thead>
          <tbody>${kalRows}
          </tbody>
        </table>
      </div>
      <p class="svep">Svep i tabellen för att se alla månader →</p>
    </div>
  </section>

  <section class="sektion sjalvplock" id="sjalvplock" aria-labelledby="sp-rubrik">
    <div class="wrap split">
      <img data-slot="image" data-label="Självplock – bild" src="${tone(960, 1200, '#d4c19c', C.ink, 'Bild: äppelodlingen', 'grid')}" width="960" height="1200" alt="Raderna i äppelodlingen" loading="lazy">
      <div>
        <p class="etikett" data-slot="text" data-label="Självplock – etikett">Självplock</p>
        <h2 id="sp-rubrik" data-slot="text" data-label="Självplock – rubrik">Plocka själv i odlingen</h2>
        <div class="stor">
          <span class="stor-siffra" data-slot="text" data-label="Självplock – pris">25 kr</span>
          <span class="stor-text" data-slot="text" data-label="Självplock – vad priset gäller">per kg äpplen just nu</span>
        </div>
        <p data-slot="text" data-label="Självplock – text">Jordgubbar i juni–juli, hallon i augusti, äpplen och pumpor på hösten. Vi visar vilka rader som är öppna för plock.</p>
        <ol class="regler">
          <li><span data-slot="text" data-label="Regel 1">Börja i butiken. Där får du korg eller låda och vet vilka rader som gäller.</span></li>
          <li><span data-slot="text" data-label="Regel 2">Plocka bara det du tänker köpa, och lämna omogna bär och frukter kvar.</span></li>
          <li><span data-slot="text" data-label="Regel 3">Hundar får gärna följa med i koppel, men inte in i odlingen.</span></li>
          <li><span data-slot="text" data-label="Regel 4">Väg och betala i butiken innan du åker. Egna korgar går bra.</span></li>
        </ol>
      </div>
    </div>
  </section>

  <section class="sektion" aria-labelledby="tider-rubrik">
    <div class="wrap info">
      <div>
        <p class="etikett" data-slot="text" data-label="Öppettider – etikett">Öppettider</p>
        <h2 id="tider-rubrik" data-slot="text" data-label="Öppettider – rubrik">När butiken är öppen</h2>
        <table class="tider">
          <tbody>
            <tr><th scope="row" data-slot="text" data-label="Öppettider rad 1 – dagar">Måndag–fredag</th><td data-slot="text" data-label="Öppettider rad 1 – tid">kl. 10–18</td></tr>
            <tr><th scope="row" data-slot="text" data-label="Öppettider rad 2 – dagar">Lördag–söndag</th><td data-slot="text" data-label="Öppettider rad 2 – tid">kl. 10–15</td></tr>
            <tr><th scope="row" data-slot="text" data-label="Öppettider rad 3 – dagar">Januari–april</th><td data-slot="text" data-label="Öppettider rad 3 – tid">endast lör kl. 10–14</td></tr>
          </tbody>
        </table>
        <p class="liten" data-slot="text" data-label="Öppettider – notis">Stängt midsommarafton, julafton och nyårsdagen.</p>
      </div>
      <div>
        <p class="etikett" data-slot="text" data-label="Betalning – etikett">Betalning</p>
        <h2 data-slot="text" data-label="Betalning – rubrik">Swish eller kort</h2>
        <ul class="betal">
          <li><b data-slot="text" data-label="Betalsätt 1 – namn">Swish</b><span data-slot="text" data-label="Betalsätt 1 – text">Numret står på skylten vid vågen. Även när butiken är obemannad.</span></li>
          <li><b data-slot="text" data-label="Betalsätt 2 – namn">Kort</b><span data-slot="text" data-label="Betalsätt 2 – text">Visa och Mastercard, även kontaktlöst, när någon av oss står i kassan.</span></li>
          <li><b data-slot="text" data-label="Betalsätt 3 – namn">Kontanter</b><span data-slot="text" data-label="Betalsätt 3 – text">Går bra, men vi har begränsat med växel.</span></li>
        </ul>
      </div>
    </div>
  </section>

  <section class="sektion hitta" id="hitta" aria-labelledby="hitta-rubrik">
    <div class="wrap hitta-grid">
      <div>
        <p class="etikett" data-slot="text" data-label="Hitta hit – etikett">Hitta hit</p>
        <h2 id="hitta-rubrik" data-slot="text" data-label="Hitta hit – rubrik">Tio minuter från Malmö</h2>
        <a class="adress" data-map data-slot="text" data-label="Adress" href="#">Lindängsvägen 14, 245 93 Staffanstorp</a>
        <ul class="vag">
          <li><span class="etikett" data-slot="text" data-label="Väg 1 – rubrik">Med bil</span><span data-slot="text" data-label="Väg 1 – text">Väg 11 mot Sjöbo, sväng vänster vid den röda skylten ”Gårdsbutik”. Parkering på gårdsplanen.</span></li>
          <li><span class="etikett" data-slot="text" data-label="Väg 2 – rubrik">Med buss</span><span data-slot="text" data-label="Väg 2 – text">Regionbuss från Malmö C till hållplats Lindängen, sedan fem minuter till fots.</span></li>
          <li><span class="etikett" data-slot="text" data-label="Väg 3 – rubrik">Med cykel</span><span data-slot="text" data-label="Väg 3 – text">Cykelbanan längs väg 11 går nästan ända fram. Cykelställ vid butiken.</span></li>
        </ul>
      </div>
      <img data-slot="image" data-label="Hitta hit – bild eller karta" src="${tone(1200, 900, C.kraft, C.ink, 'Bild: gårdsplanen eller en karta', 'sun')}" width="1200" height="900" alt="Gårdsplanen med parkering framför butiken" loading="lazy">
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <div class="fot">
      <div>
        <p class="brand"><span data-slot="text" data-label="Gårdens namn (sidfot)">Lindängens gård</span><small data-slot="text" data-label="Sidfot – liten rad">Gårdsbutik och självplock</small></p>
      </div>
      <div>
        <h2>Adress</h2>
        <p><a class="pre" data-map data-slot="text" data-multiline data-label="Adress (sidfot)" href="#">Lindängsvägen 14
245 93 Staffanstorp</a></p>
      </div>
      <div>
        <h2>Öppet</h2>
        <p class="pre tab" data-slot="text" data-multiline data-label="Öppettider (sidfot)">Mån–fre kl. 10–18
Lör–sön kl. 10–15
Jan–apr: lör kl. 10–14</p>
      </div>
      <div>
        <h2>Kontakt</h2>
        <p><a data-tel data-slot="text" data-label="Telefon (sidfot)" href="#">040-628 04 63</a></p>
        <p><a data-mail data-slot="text" data-label="E-post" href="#">hej@lindangensgard.se</a></p>
      </div>
    </div>
    <div class="fot-bas">
      <span data-slot="text" data-label="Sidfot – copyright">© 2026 Lindängens gård</span>
      <span data-slot="text" data-label="Organisationsnummer">Org.nr 556000-0000</span>
    </div>
  </div>
</footer>
${window.siteJs}
</body>
</html>`;

  window.TEMPLATES.push({
    id: 'gardsbutik',
    name: 'Gårdsbutik',
    category: 'Butik',
    html: html
  });
})();
