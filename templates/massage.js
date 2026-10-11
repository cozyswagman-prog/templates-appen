(function () {
  // Massage & naprapati – riktning: långsam, lugn klinik med spa-värme. Sand/linne-bas,
  // nästan-svart varm text, en dämpad lera-accent, Lora + Inter, mycket luft och en smal
  // läsbar spalt varvad med helbreddsbild och en split-sektion.
  const tone = window.tone;

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kroppsrum – massage och naprapati i Linnéstaden, Göteborg</title>
<meta name="description" content="Massage och naprapati i Linnéstaden, Göteborg. Friskvårdsbidrag gäller. Boka tid på 031-390 06 57.">
<style>
${window.fontCss('lora', 'inter')}
  :root {
    --bg: #f3ede4;
    --bg-2: #ebe3d7;
    --ink: #2a2420;
    --ink-2: #625850;
    --line: #d8ccbc;
    --accent: #93543c;
    --accent-hover: #7f4732;
    --on-accent: #fbf7f1;
    --r: 6px;
    --wrap: 1160px;
    --col: 640px;
  }
  *, *::before, *::after { box-sizing: border-box; }
  * { margin: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 17px; line-height: 1.7;
    color: var(--ink); background: var(--bg); -webkit-font-smoothing: antialiased; }
  img { display: block; max-width: 100%; height: auto; }
  a { color: inherit; text-underline-offset: 4px; text-decoration-thickness: 1px; }
  h1, h2, h3 { font-family: 'Lora', Georgia, 'Times New Roman', serif; font-weight: 400; line-height: 1.18; letter-spacing: -0.01em; text-wrap: balance; }
  h1 { font-size: clamp(36px, 5.4vw, 60px); }
  h2 { font-size: clamp(28px, 3.6vw, 40px); }
  h3 { font-size: 22px; line-height: 1.3; }
  p { text-wrap: pretty; }
  .wrap { max-width: var(--wrap); margin: 0 auto; padding: 0 24px; }
  .col { max-width: calc(var(--col) + 48px); margin: 0 auto; padding: 0 24px; }
  .label { font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-2); margin-bottom: 16px; }
  .muted { color: var(--ink-2); }

  .skip { position: absolute; left: 16px; top: -64px; z-index: 10; background: var(--ink); color: var(--bg);
    padding: 12px 16px; border-radius: var(--r); text-decoration: none; }
  .skip:focus { top: 16px; }
  :focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }

  .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 12px 24px;
    border-radius: var(--r); font-size: 17px; font-weight: 600; text-decoration: none; line-height: 1.2;
    transition: background-color .2s ease-out; }
  .btn-primary { background: var(--accent); color: var(--on-accent); }
  .btn-primary:hover { background: var(--accent-hover); }
  .link { display: inline-flex; align-items: center; min-height: 48px; font-weight: 600; text-decoration: underline; font-variant-numeric: tabular-nums; }
  .link:hover { color: var(--accent); }

  /* Sidhuvud */
  .top-in { display: flex; align-items: center; gap: 16px; min-height: 80px; border-bottom: 1px solid var(--line); }
  .brand { font-family: 'Lora', Georgia, serif; font-size: 24px; letter-spacing: -0.01em; text-decoration: none; display: inline-flex; align-items: center; min-height: 44px; }
  .top nav { display: none; margin-left: auto; }
  .menu { display: flex; gap: 32px; list-style: none; padding: 0; }
  .menu a { display: inline-flex; align-items: center; min-height: 44px; font-size: 16px; text-decoration: none; }
  .menu a:hover { text-decoration: underline; }
  .top-call { margin-left: auto; display: inline-flex; align-items: center; min-height: 44px; padding: 8px 16px;
    border: 1px solid var(--ink); border-radius: var(--r); font-size: 16px; font-weight: 600; text-decoration: none;
    font-variant-numeric: tabular-nums; white-space: nowrap; }
  .top-call::before { content: "Ring\\00a0"; font-weight: 400; }
  .top-book { display: none; }

  /* Hero */
  .hero { padding: 64px 0; }
  .hero-in { max-width: 760px; }
  .hero-in { display: grid; }
  .hero h1 { margin-bottom: 24px; }
  .lead { font-size: 19px; color: var(--ink-2); max-width: 46ch; margin-bottom: 32px; }
  .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 24px; }
  .meta { display: flex; flex-wrap: wrap; gap: 12px 32px; margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--line);
    font-size: 16px; font-variant-numeric: tabular-nums; }
  .meta div { display: grid; gap: 4px; }
  .meta dt { font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-2); }
  .meta dd { margin: 0; }
  .meta .fv { color: var(--accent); font-weight: 600; }

  /* Helbreddsbild */
  .bleed img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }

  /* Sektioner */
  .sec { padding: 64px 0; }
  .sec h2 { margin-bottom: 24px; }
  .prose p + p { margin-top: 16px; }
  .tint { background: var(--bg-2); }

  /* Behandlingar */
  .fv-box { display: grid; gap: 4px; border: 1px solid var(--accent); border-radius: var(--r); padding: 16px 24px; margin: 32px 0 48px; }
  .fv-box strong { color: var(--accent); font-weight: 600; }
  .fv-box span { color: var(--ink-2); font-size: 16px; }
  .treat { list-style: none; padding: 0; border-top: 1px solid var(--line); }
  .treat li { padding: 24px 0; border-bottom: 1px solid var(--line); display: grid; gap: 4px; }
  .treat-row { display: grid; gap: 4px; }
  .treat h3 { font-size: 22px; }
  .price { font-variant-numeric: tabular-nums; white-space: nowrap; font-weight: 600; }
  .treat p { color: var(--ink-2); max-width: 52ch; }
  .small-note { margin-top: 24px; font-size: 16px; color: var(--ink-2); }

  /* Split – terapeuter */
  .split { display: grid; gap: 48px; }
  .split-img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; border-radius: var(--r); }
  .people { list-style: none; padding: 0; border-top: 1px solid var(--line); margin-top: 32px; }
  .person { display: grid; grid-template-columns: 64px 1fr; gap: 16px; padding: 32px 0; border-bottom: 1px solid var(--line); align-items: start; }
  .person img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; }
  .person h3 { margin-bottom: 4px; }
  .role { font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-2); margin-bottom: 8px; }
  .person p.muted { font-size: 16px; }

  /* FAQ */
  .faq { border-top: 1px solid var(--line); margin-top: 32px; }
  .faq details { border-bottom: 1px solid var(--line); }
  .faq summary { list-style: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 24px;
    min-height: 64px; padding: 16px 0; font-family: 'Lora', Georgia, serif; font-size: 20px; line-height: 1.35; }
  .faq summary::-webkit-details-marker { display: none; }
  .faq summary::after { content: ""; flex: none; width: 12px; height: 12px; border-right: 1.5px solid var(--ink); border-bottom: 1.5px solid var(--ink);
    transform: translateY(-3px) rotate(45deg); transition: transform .2s ease-out; }
  .faq details[open] summary::after { transform: translateY(3px) rotate(-135deg); }
  .faq summary:hover { color: var(--accent); }
  .faq details p { padding: 0 0 24px; color: var(--ink-2); max-width: 58ch; }

  /* Regler + tider */
  .two { display: grid; gap: 48px; }
  .rules { list-style: none; padding: 0; border-top: 1px solid var(--line); }
  .rules li { padding: 16px 0; border-bottom: 1px solid var(--line); color: var(--ink-2); }
  .hours { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; border-top: 1px solid var(--line); }
  .hours th, .hours td { text-align: left; padding: 16px 0; border-bottom: 1px solid var(--line); font-weight: 400; }
  .hours td { text-align: right; }
  .hours caption { text-align: left; }

  /* Boka */
  .book { text-align: left; }
  .book .phone { display: inline-flex; align-items: center; min-height: 48px; font-family: 'Lora', Georgia, serif; font-size: clamp(32px, 5vw, 44px);
    text-decoration: none; font-variant-numeric: tabular-nums; border-bottom: 1px solid var(--accent); line-height: 1.2; }
  .book .phone:hover { color: var(--accent); }
  .book-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 16px 32px; margin: 32px 0 48px; }
  .where { display: grid; gap: 4px; border-top: 1px solid var(--line); padding-top: 24px; }
  .where .addr { font-weight: 600; display: inline-flex; align-items: center; min-height: 44px; }

  /* Sidfot */
  footer { padding: 64px 0 32px; font-size: 16px; background: var(--ink); color: #ede5d9; }
  footer .muted, footer .legal { color: #c9bdae; }
  footer :focus-visible { outline-color: #ede5d9; }
  .foot { display: grid; gap: 32px; }
  .foot .brand { margin-bottom: 8px; }
  .foot h2 { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #c9bdae; margin-bottom: 8px; }
  .foot p { white-space: pre-line; font-variant-numeric: tabular-nums; }
  .foot a { display: inline-flex; align-items: center; min-height: 44px; margin: -8px 0; }
  .legal { display: flex; flex-wrap: wrap; gap: 8px 24px; margin-top: 48px; padding-top: 24px; border-top: 1px solid rgb(237 229 217 / .2); }

  @media (min-width: 560px) {
    .treat-row { display: flex; justify-content: space-between; align-items: baseline; gap: 24px; }
    .person { grid-template-columns: 96px 1fr; gap: 24px; }
    .person img { width: 96px; height: 96px; }
  }
  @media (min-width: 720px) {
    .bleed img { aspect-ratio: 16 / 7; }
    .two { grid-template-columns: 1fr 1fr; gap: 64px; }
    .foot { grid-template-columns: 1fr 1fr; }
    .split { grid-template-columns: 1fr 1fr; gap: 48px; align-items: start; }
  }
  @media (min-width: 720px) and (max-width: 959px) {
    .person { grid-template-columns: 64px 1fr; gap: 16px; }
    .person img { width: 64px; height: 64px; }
  }
  @media (min-width: 960px) {
    .hero { padding: 96px 0 128px; }
    .hero-in { max-width: none; grid-template-columns: 7fr 5fr; gap: 64px; align-items: end; }
    .hero h1 { margin-bottom: 0; font-size: clamp(48px, 5vw, 64px); }
    .hero-body .meta { margin-top: 32px; }
    .lead { margin-bottom: 24px; }
    .sec { padding: 128px 0; }
    .split { grid-template-columns: 5fr 6fr; gap: 96px; align-items: center; }
    .top nav { display: block; }
    .top-call { margin-left: 16px; border: 0; padding: 8px 0; }
    .top-book { display: inline-flex; min-height: 44px; padding: 8px 16px; font-size: 16px; }
    .foot { grid-template-columns: 1.4fr 1fr 1fr 1fr; }
  }
  @media (max-width: 359px) {
    .top-call::before { content: none; }
    .brand { font-size: 21px; }
  }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    * { transition: none !important; }
  }
</style>
</head>
<body>
<a class="skip" href="#innehall">Hoppa till innehåll</a>

<header class="top">
  <div class="wrap top-in">
    <a class="brand" href="#innehall" data-slot="text" data-label="Företagsnamn i menyn">Kroppsrum</a>
    <nav aria-label="Huvudmeny">
      <ul class="menu">
        <li><a href="#behandlingar">Behandlingar</a></li>
        <li><a href="#terapeuter">Terapeuter</a></li>
        <li><a href="#forsta-besoket">Första besöket</a></li>
        <li><a href="#boka">Hitta hit</a></li>
      </ul>
    </nav>
    <a class="top-call" data-tel data-slot="text" data-label="Telefon i menyn" href="#">031-390 06 57</a>
    <a class="btn btn-primary top-book" href="#boka">Boka tid</a>
  </div>
</header>

<main id="innehall">
  <section class="hero">
    <div class="wrap">
      <div class="hero-in">
        <div class="hero-head">
          <p class="label" data-slot="text" data-label="Hero – liten etikett">Massage &amp; naprapati · Göteborg</p>
          <h1 data-slot="text" data-label="Hero – rubrik">Massage och naprapati i Linnéstaden</h1>
        </div>
        <div class="hero-body">
        <p class="lead" data-slot="text" data-label="Hero – ingress">För dig med stel nacke, ont i ryggen eller bara behov av en timme utan telefon. Vi arbetar lugnt, lyssnar först och behandlar sedan.</p>
        <div class="actions">
          <a class="btn btn-primary" href="#boka" data-slot="text" data-label="Hero – knapp">Boka tid</a>
          <a class="link" data-tel data-slot="text" data-label="Hero – telefon" href="#">031-390 06 57</a>
        </div>
        <dl class="meta">
          <div><dt>Öppet</dt><dd data-slot="text" data-label="Hero – öppettider">Mån–fre kl. 08–19, lör kl. 10–15</dd></div>
          <div><dt>Betalning</dt><dd class="fv" data-slot="text" data-label="Hero – friskvård">Friskvårdsbidrag gäller</dd></div>
        </dl>
        </div>
      </div>
    </div>
  </section>

  <div class="bleed">
    <img data-slot="image" data-label="Helbreddsbild – behandlingsrummet" src="${tone(1600, 700, '#ddd1c0', '#5a4a3e', 'bild: behandlingsrummet i dagsljus', 'hills')}" width="1600" height="700" alt="Behandlingsrummet med britsen och dagsljus genom fönstret">
  </div>

  <section class="sec" aria-labelledby="om-rubrik">
    <div class="col prose">
      <p class="label" data-slot="text" data-label="Om – etikett">Så arbetar vi</p>
      <h2 id="om-rubrik" data-slot="text" data-label="Om – rubrik">Varje behandling börjar med ett samtal</h2>
      <p data-slot="text" data-label="Om – stycke 1">Vi frågar var det gör ont, hur länge det har hållit på och vad du vill kunna göra igen. Först därefter bestämmer vi tillsammans hur timmen ska användas.</p>
      <p class="muted" data-slot="text" data-label="Om – stycke 2">Du får alltid en kort plan med dig hem: vad vi gjorde, vad du själv kan göra mellan besöken och om det är värt att komma tillbaka.</p>
    </div>
  </section>

  <section class="sec tint" id="behandlingar" aria-labelledby="behandlingar-rubrik">
    <div class="col">
      <p class="label" data-slot="text" data-label="Behandlingar – etikett">Behandlingar och priser</p>
      <h2 id="behandlingar-rubrik" data-slot="text" data-label="Behandlingar – rubrik">Behandlingar</h2>
      <p class="fv-box"><strong data-slot="text" data-label="Friskvård – rubrik">Friskvårdsbidrag gäller</strong><span data-slot="text" data-label="Friskvård – text">Betala med friskvårdskort eller få ett kvitto att lämna till din arbetsgivare.</span></p>
      <ul class="treat">
        <li><div class="treat-row"><h3 data-slot="text" data-label="Behandling 1 – namn">Klassisk massage</h3><span class="price" data-slot="text" data-label="Behandling 1 – tid och pris">60 min · 795 kr</span></div><p data-slot="text" data-label="Behandling 1 – beskrivning">Hela ryggen, nacke och axlar eller hela kroppen. Fast men mjukt tryck.</p></li>
        <li><div class="treat-row"><h3 data-slot="text" data-label="Behandling 2 – namn">Kort massage</h3><span class="price" data-slot="text" data-label="Behandling 2 – tid och pris">30 min · 495 kr</span></div><p data-slot="text" data-label="Behandling 2 – beskrivning">Fokus på ett område, till exempel nacke och skuldror. Passar en lunchpaus.</p></li>
        <li><div class="treat-row"><h3 data-slot="text" data-label="Behandling 3 – namn">Djupvävnadsmassage</h3><span class="price" data-slot="text" data-label="Behandling 3 – tid och pris">60 min · 895 kr</span></div><p data-slot="text" data-label="Behandling 3 – beskrivning">Långsamt och djupt för långvariga spänningar i rygg, säte och ben.</p></li>
        <li><div class="treat-row"><h3 data-slot="text" data-label="Behandling 4 – namn">Naprapati, första besöket</h3><span class="price" data-slot="text" data-label="Behandling 4 – tid och pris">60 min · 950 kr</span></div><p data-slot="text" data-label="Behandling 4 – beskrivning">Undersökning, behandling och en plan för besvär i rygg, nacke eller leder.</p></li>
        <li><div class="treat-row"><h3 data-slot="text" data-label="Behandling 5 – namn">Naprapati, återbesök</h3><span class="price" data-slot="text" data-label="Behandling 5 – tid och pris">45 min · 750 kr</span></div><p data-slot="text" data-label="Behandling 5 – beskrivning">Uppföljning med behandling och genomgång av dina övningar.</p></li>
        <li><div class="treat-row"><h3 data-slot="text" data-label="Behandling 6 – namn">Gravidmassage</h3><span class="price" data-slot="text" data-label="Behandling 6 – tid och pris">60 min · 845 kr</span></div><p data-slot="text" data-label="Behandling 6 – beskrivning">I sidoläge med kuddar, från vecka 12. Lugnt tempo för ländrygg och höfter.</p></li>
      </ul>
      <p class="small-note" data-slot="text" data-label="Behandlingar – fotnot">Priserna gäller inkl. moms. Vi tar kort, Swish och friskvårdskort.</p>
    </div>
  </section>

  <section class="sec" id="terapeuter" aria-labelledby="terapeuter-rubrik">
    <div class="wrap split">
      <img class="split-img" data-slot="image" data-label="Terapeuter – stor bild" src="${tone(800, 1000, '#e2d7c7', '#5a4a3e', 'bild: händer under behandling', 'arch')}" width="800" height="1000" loading="lazy" alt="Terapeut som masserar en klients axel">
      <div>
        <p class="label" data-slot="text" data-label="Terapeuter – etikett">Terapeuter</p>
        <h2 id="terapeuter-rubrik" data-slot="text" data-label="Terapeuter – rubrik">Två terapeuter, samma lugna tempo</h2>
        <ul class="people">
          <li class="person">
            <img data-slot="image" data-label="Terapeut 1 – porträtt" src="${tone(300, 300, '#d8cab6', '#5a4a3e', 'porträtt', 'circle')}" width="300" height="300" loading="lazy" alt="Porträtt av Maria Holm">
            <div>
              <h3 data-slot="text" data-label="Terapeut 1 – namn">Maria Holm</h3>
              <p class="role" data-slot="text" data-label="Terapeut 1 – titel">Leg. naprapat</p>
              <p class="muted" data-slot="text" data-label="Terapeut 1 – text">Tar emot för rygg-, nack- och axelbesvär och gör alla naprapatbehandlingar. Gillar att förklara vad som händer i kroppen.</p>
            </div>
          </li>
          <li class="person">
            <img data-slot="image" data-label="Terapeut 2 – porträtt" src="${tone(300, 300, '#d8cab6', '#5a4a3e', 'porträtt', 'circle')}" width="300" height="300" loading="lazy" alt="Porträtt av Elias Berg">
            <div>
              <h3 data-slot="text" data-label="Terapeut 2 – namn">Elias Berg</h3>
              <p class="role" data-slot="text" data-label="Terapeut 2 – titel">Diplomerad massageterapeut</p>
              <p class="muted" data-slot="text" data-label="Terapeut 2 – text">Klassisk massage, djupvävnad och gravidmassage. Arbetar långsamt och frågar hellre en gång för mycket om trycket.</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>

  <section class="sec tint" id="forsta-besoket" aria-labelledby="faq-rubrik">
    <div class="col">
      <p class="label" data-slot="text" data-label="Första besöket – etikett">Inför första besöket</p>
      <h2 id="faq-rubrik" data-slot="text" data-label="Första besöket – rubrik">Bra att veta innan du kommer</h2>
      <div class="faq">
        <details open>
          <summary><span data-slot="text" data-label="Fråga 1">Hur går första besöket till?</span></summary>
          <p data-slot="text" data-label="Svar 1">Vi börjar med tio minuters samtal om dina besvär. Sedan behandlar vi, och avslutar med några minuter för frågor och råd.</p>
        </details>
        <details>
          <summary><span data-slot="text" data-label="Fråga 2">Vad ska jag ha på mig?</span></summary>
          <p data-slot="text" data-label="Svar 2">Det du känner dig bekväm i. Du klär av dig så mycket som behövs och täcks alltid av handduk och filt.</p>
        </details>
        <details>
          <summary><span data-slot="text" data-label="Fråga 3">Behöver jag remiss?</span></summary>
          <p data-slot="text" data-label="Svar 3">Nej. Du bokar direkt hos oss. Har du en skada eller en diagnos, berätta gärna det vid bokningen.</p>
        </details>
        <details>
          <summary><span data-slot="text" data-label="Fråga 4">Hur tidigt ska jag komma?</span></summary>
          <p data-slot="text" data-label="Svar 4">Fem minuter innan räcker. Det finns vatten och en stol i väntrummet om du är tidig.</p>
        </details>
      </div>
    </div>
  </section>

  <section class="sec" aria-labelledby="regler-rubrik">
    <div class="wrap two">
      <div>
        <p class="label" data-slot="text" data-label="Avbokning – etikett">Avbokning</p>
        <h2 id="regler-rubrik" data-slot="text" data-label="Avbokning – rubrik">Avbokningsregler</h2>
        <ul class="rules">
          <li data-slot="text" data-label="Avbokning – regel 1">Avboka senast 24 timmar innan, så debiteras du inget.</li>
          <li data-slot="text" data-label="Avbokning – regel 2">Vid senare avbokning eller uteblivet besök tar vi ut halva priset.</li>
          <li data-slot="text" data-label="Avbokning – regel 3">Är du sjuk samma dag? Ring oss, så hittar vi en ny tid utan kostnad.</li>
        </ul>
      </div>
      <div>
        <p class="label" data-slot="text" data-label="Öppettider – etikett">Öppettider</p>
        <h2 data-slot="text" data-label="Öppettider – rubrik">När vi har öppet</h2>
        <table class="hours">
          <tbody>
            <tr><th scope="row" data-slot="text" data-label="Öppettider 1 – dagar">Måndag–fredag</th><td data-slot="text" data-label="Öppettider 1 – tid">kl. 08–19</td></tr>
            <tr><th scope="row" data-slot="text" data-label="Öppettider 2 – dagar">Lördag</th><td data-slot="text" data-label="Öppettider 2 – tid">kl. 10–15</td></tr>
            <tr><th scope="row" data-slot="text" data-label="Öppettider 3 – dagar">Söndag</th><td data-slot="text" data-label="Öppettider 3 – tid">Stängt</td></tr>
            <tr><th scope="row" data-slot="text" data-label="Öppettider 4 – dagar">Röda dagar</th><td data-slot="text" data-label="Öppettider 4 – tid">Stängt</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <section class="sec tint" id="boka" aria-labelledby="boka-rubrik">
    <div class="col book">
      <p class="label" data-slot="text" data-label="Boka – etikett">Boka tid</p>
      <h2 id="boka-rubrik" data-slot="text" data-label="Boka – rubrik">Ring eller mejla, så hittar vi en tid</h2>
      <p class="muted" data-slot="text" data-label="Boka – text">Vi svarar i telefon mellan behandlingarna. Lämna gärna ett meddelande, så ringer vi upp samma dag.</p>
      <div class="book-actions">
        <a class="phone" data-tel data-slot="text" data-label="Boka – telefon" href="#">031-390 06 57</a>
        <a class="link" data-mail data-slot="text" data-label="Boka – e-post" href="#">boka@kroppsrum.se</a>
      </div>
      <div class="where">
        <a class="addr" data-map data-slot="text" data-label="Adress" href="#">Linnégatan 41, 413 08 Göteborg</a>
        <p class="muted" data-slot="text" data-label="Hitta hit – text">Två trappor upp, hiss finns. Spårvagn till Linnéplatsen, sedan tre minuters promenad. Cykelställ på gården.</p>
      </div>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <div class="foot">
      <div>
        <p class="brand" data-slot="text" data-label="Sidfot – företagsnamn">Kroppsrum</p>
        <p class="muted" data-slot="text" data-label="Sidfot – kort beskrivning">Massage och naprapati i Linnéstaden.</p>
      </div>
      <div>
        <h2>Adress</h2>
        <p><a data-map data-slot="text" data-label="Sidfot – adress" href="#">Linnégatan 41, 413&nbsp;08 Göteborg</a></p>
      </div>
      <div>
        <h2>Öppettider</h2>
        <p data-slot="text" data-multiline data-label="Sidfot – öppettider">Mån–fre kl. 08–19
Lör kl. 10–15
Sön stängt</p>
      </div>
      <div>
        <h2>Kontakt</h2>
        <p><a data-tel data-slot="text" data-label="Sidfot – telefon" href="#">031-390 06 57</a></p>
        <p><a data-mail data-slot="text" data-label="Sidfot – e-post" href="#">boka@kroppsrum.se</a></p>
      </div>
    </div>
    <div class="legal">
      <span data-slot="text" data-label="Sidfot – copyright">© 2026 Kroppsrum</span>
      <span data-slot="text" data-label="Sidfot – org.nr">Org.nr 556000-0000</span>
    </div>
  </div>
</footer>
${window.siteJs}
</body>
</html>`;

  window.TEMPLATES.push({
    id: 'massage',
    name: 'Massage & naprapati',
    category: 'Vård & hälsa',
    html: html
  });
})();
