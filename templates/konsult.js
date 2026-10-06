(function () {
  const ph = window.ph;

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Konsultbyrå</title>
<style>
${window.fontCss('playfair', 'inter')}
  /* Riktning: diskret affärsjuridisk byrå – djup marinblå och varmt papper, Playfair-rubriker, Inter i brödtext,
     tunna linjer i stället för kort och mässing som enda accent för handlingar (ljus mässing på mörkt, mörk på ljust).
     Bara vikterna 400/700 finns och inga kursiver. */
  :root {
    --navy: #0e2233; --navy-2: #15304a; --paper: #fbfaf7; --stone: #f2eee6; --ink: #1d2630; --dim: #56626e;
    --line: #dcd5c6; --gold: #c9a55c; --gold-hover: #d8b973; --brass: #7d5f24; --brass-hover: #654c1b;
    --on-navy: #f2f4f6; --on-navy-dim: #c3ccd5; --radius: 6px;
  }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-size: 17px; background: var(--paper); color: var(--ink); line-height: 1.65; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 1060px; margin: 0 auto; padding: 0 24px; }
  h1, h2 { font-family: 'Playfair Display', Georgia, serif; font-weight: 700; line-height: 1.15; letter-spacing: -.01em; text-wrap: balance; }
  h3 { font-weight: 700; line-height: 1.3; }

  nav { background: var(--paper); border-bottom: 1px solid var(--line); }
  nav .wrap { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 76px; }
  .brand { font-family: 'Playfair Display', Georgia, serif; font-size: 23px; font-weight: 700; color: var(--navy); }
  .brand span { color: var(--brass); }
  nav small { color: var(--dim); font-size: 13px; letter-spacing: .08em; text-transform: uppercase; text-align: right; }

  .hero { background: var(--navy); background-image: linear-gradient(115deg, var(--navy) 55%, var(--navy-2) 100%); color: var(--on-navy); }
  .hero .wrap { padding-top: 120px; padding-bottom: 128px; }
  .hero .kicker { display: flex; align-items: center; gap: 14px; color: var(--gold); letter-spacing: .14em; text-transform: uppercase; font-size: 13px; font-weight: 700; }
  .hero .kicker::before { content: ""; width: 40px; height: 1px; background: var(--gold); flex: none; }
  .hero h1 { font-size: clamp(38px, 5.6vw, 64px); line-height: 1.08; letter-spacing: -.02em; margin: 24px 0; max-width: 17ch; }
  .hero p { color: var(--on-navy-dim); font-size: clamp(17px, 1.6vw, 20px); line-height: 1.6; max-width: 52ch; margin-bottom: 40px; }
  .cta { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; background: var(--gold); color: var(--navy); text-decoration: none; font-weight: 700; font-size: 16px; padding: 14px 32px; border-radius: var(--radius); transition: background-color .15s ease-out; }
  .cta:hover { background: var(--gold-hover); }
  .kit-konsult .hero :focus-visible, .kit-konsult .slut :focus-visible { outline-color: var(--gold); }

  section { padding: 96px 0; }
  .section-title { font-size: clamp(30px, 3.6vw, 40px); margin-bottom: 14px; }
  .section-sub { color: var(--dim); font-size: 18px; margin-bottom: 48px; max-width: 58ch; }

  .tjanster { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
  .tjanst { display: flex; flex-direction: column; border-top: 2px solid var(--brass); padding-top: 24px; min-width: 0; }
  .tjanst h3 { font-size: 20px; margin-bottom: 10px; color: var(--navy); }
  .tjanst p { color: var(--dim); font-size: 16px; margin-bottom: 16px; }

  .siffror { background: var(--stone); }
  .siffror .wrap { display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; padding-top: 64px; padding-bottom: 64px; }
  .siffra { padding: 8px 24px; }
  .siffra + .siffra { border-left: 1px solid var(--line); }
  .siffra .tal { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(44px, 5vw, 56px); line-height: 1.1; font-weight: 700; color: var(--navy); font-variant-numeric: lining-nums; }
  .siffra .vad { color: var(--dim); font-size: 15px; margin-top: 8px; }

  .team-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
  .team-grid > div { min-width: 0; }
  .team-grid img { display: block; width: 100%; height: auto; aspect-ratio: 4/5; object-fit: cover; margin-bottom: 18px; border-radius: var(--radius); }
  .team-grid b { display: block; font-size: 18px; color: var(--navy); }
  .team-grid small { display: block; color: var(--dim); font-size: 15px; margin-top: 2px; }

  .slut { background: var(--navy); color: var(--on-navy); text-align: center; padding: 112px 0; }
  .slut h2 { font-size: clamp(32px, 4.2vw, 46px); margin-bottom: 20px; }
  .slut p { color: var(--on-navy-dim); font-size: 18px; line-height: 1.8; max-width: 50ch; margin: 0 auto 40px; white-space: pre-line; }

  footer { text-align: center; padding: 32px 24px; color: var(--dim); font-size: 14px; border-top: 1px solid var(--line); }

  /* Gemensamma tillägg (SiteKit) i byråns ton: samma typsnitt, bredd, accent och hörnradie som resten av sidan. */
  .kit-konsult { --kit-accent: var(--brass); --kit-bg: var(--paper); --kit-ink: var(--ink); --kit-line: var(--line); --kit-on: #fff; }
  .kit-konsult .kit-section { padding: 96px 0; border-top: 0; }
  .kit-konsult .kit-wrap > h2 { font-size: clamp(30px, 3.6vw, 40px); margin-bottom: 32px; }
  .kit-konsult .kit-section h3 { font-size: 22px; color: var(--navy); }
  .kit-konsult .kit-section p, .kit-konsult .kit-detail p { max-width: 62ch; }
  .kit-konsult .kit-button, .kit-konsult .kit-next, .kit-konsult .kit-back, .kit-konsult .kit-form button {
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-size: 16px; border-radius: var(--radius); min-height: 48px; padding: 12px 24px; transition: background-color .15s ease-out, border-color .15s ease-out, color .15s ease-out;
  }
  .kit-konsult .kit-button:not([aria-disabled=true]):hover { background: var(--brass-hover); border-color: var(--brass-hover); }
  /* Ej kopplade knappar ska se inaktiva ut: ingen fyllning, streckad kant, dämpad text. */
  .kit-konsult .kit-button[aria-disabled=true] { background: transparent; color: var(--dim); border: 1px dashed #a39a87; opacity: 1; cursor: not-allowed; }
  .kit-konsult .kit-note, .kit-konsult .kit-link-note { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-size: 14px; color: var(--dim); }
  .kit-konsult .kit-detail summary { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-size: 16px; color: var(--navy); }
  .kit-konsult .kit-detail summary::marker { color: var(--brass); }

  /* Vägvisaren direkt under hero: tonad yta, tre tydliga val som sekundära knappar och en primär handling. */
  .kit-konsult [data-section="guide"] { background: var(--stone); padding: 72px 0; }
  .kit-konsult [data-section="guide"] .kit-wrap > h2 { font-size: clamp(26px, 3vw, 32px); margin-bottom: 24px; }
  .kit-konsult .kit-choice { gap: 16px; }
  .kit-konsult .kit-choice .kit-button { justify-content: space-between; gap: 16px; min-height: 64px; padding: 16px 20px; background: var(--paper); color: var(--navy); border: 1px solid var(--line); text-align: left; }
  .kit-konsult .kit-choice .kit-button::after { content: ""; flex: none; width: 8px; height: 8px; border-right: 2px solid var(--brass); border-bottom: 2px solid var(--brass); transform: rotate(45deg) translateY(-2px); }
  .kit-konsult .kit-choice .kit-button:hover { background: #fff; border-color: var(--brass); }
  .kit-konsult [data-section="guide"] .kit-choice + p { margin: 28px 0 16px; }

  .kit-konsult .tjanst .kit-detail { margin-top: auto; padding-top: 8px; border-top: 1px solid var(--line); }
  .kit-konsult .tjanst .kit-detail p { font-size: 15px; color: var(--dim); }

  /* Kunduppdraget: två spalter med mässingslinje, som ett diskret ärendeblad. */
  .kit-konsult [data-section="clientcase"] { background: var(--paper); border-top: 1px solid var(--line); }
  .kit-konsult [data-section="clientcase"] h3 { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(22px, 2.4vw, 26px); margin: 0 0 24px; }
  .kit-konsult [data-section="clientcase"] .kit-grid { gap: 40px; align-items: stretch; }
  .kit-konsult [data-section="clientcase"] .kit-grid > div { border-left: 2px solid var(--brass); padding-left: 24px; }
  .kit-konsult [data-section="clientcase"] .kit-grid p { margin: 0; font-size: 18px; }

  .kit-konsult [data-section="faq"] .kit-detail { max-width: 760px; }
  .kit-konsult [data-section="faq"] .kit-detail summary { font-size: 18px; }

  /* Avslutande kontaktyta. */
  .kit-konsult [data-section="contact"] { background: var(--stone); }
  .kit-konsult .kit-contact h3 { font-family: 'Playfair Display', Georgia, serif; margin-top: 0; }
  .kit-konsult [data-section="contact"] .kit-actions { margin-top: 0; gap: 12px; }
  .kit-konsult [data-section="contact"] .kit-actions > .kit-link-note { order: 9; flex-basis: 100%; margin: 4px 0 0; }
  .kit-konsult [data-section="contact"] .kit-actions > .kit-link-note ~ .kit-link-note { margin-top: -8px; }
  .kit-konsult [data-section="contact"] .kit-button[aria-disabled=true] { border-color: #978e7b; }

  @media (max-width: 860px) {
    .tjanster { gap: 28px; }
    .team-grid { gap: 20px; }
  }
  @media (max-width: 760px) {
    body { font-size: 16px; }
    nav .wrap { min-height: 68px; }
    .brand { font-size: 21px; }
    nav small { font-size: 12px; letter-spacing: .06em; }
    .hero .wrap { padding-top: 72px; padding-bottom: 80px; }
    .hero h1 { margin: 20px 0; max-width: none; }
    .hero p { margin-bottom: 32px; }
    .cta { width: 100%; }
    section, .slut, .kit-konsult .kit-section { padding: 64px 0; }
    .kit-konsult [data-section="guide"] { padding: 56px 0; }
    .section-sub { font-size: 17px; margin-bottom: 36px; }
    .tjanster, .team-grid { grid-template-columns: 1fr; gap: 40px; }
    .team-grid { max-width: 420px; }
    .siffror .wrap { padding-top: 48px; padding-bottom: 48px; }
    .siffra { padding: 4px 8px; }
    .siffra .tal { font-size: 36px; }
    .siffra .vad { font-size: 14px; line-height: 1.45; }
    .kit-konsult .kit-wrap { padding: 0 24px; }
    .kit-konsult .kit-choice { gap: 12px; }
    .kit-konsult [data-section="clientcase"] .kit-grid { gap: 24px; }
  }
</style>
</head>
<body>

<nav>
  <div class="wrap">
    <div class="brand" data-slot="text" data-label="Byråns namn i toppen">Vinter <span>&amp;</span> Sjö</div>
    <small data-slot="text" data-label="Liten text i toppen">Affärsjuridik · Stockholm</small>
  </div>
</nav>

<div class="hero">
  <div class="wrap">
    <div class="kicker" data-slot="text" data-label="Liten text ovanför rubriken">Rådgivning sedan 2009</div>
    <h1 data-slot="text" data-label="Stor rubrik">Trygga affärer börjar med rätt rådgivning</h1>
    <p data-slot="text" data-label="Text under rubriken">Vi hjälper ägarledda bolag med avtal, förhandling och bolagsfrågor — alltid med fast pris på första genomgången, så att du vet vad det kostar innan vi börjar.</p>
    <a class="cta" href="#kontakt" data-slot="text" data-label="Knapp i hero">Boka kostnadsfritt samtal</a>
  </div>
</div>

<section>
  <div class="wrap">
    <h2 class="section-title" data-slot="text" data-label="Rubrik för tjänster">Det här hjälper vi dig med</h2>
    <p class="section-sub" data-slot="text" data-label="Undertext för tjänster">Tre områden, en kontaktperson genom hela ärendet.</p>
    <div class="tjanster">
      <div class="tjanst"><h3 data-slot="text" data-label="Tjänst 1 – rubrik">Avtal &amp; förhandling</h3><p data-slot="text" data-label="Tjänst 1 – beskrivning">Kund- och leverantörsavtal, samarbetsavtal och villkor som håller när det blåser.</p></div>
      <div class="tjanst"><h3 data-slot="text" data-label="Tjänst 2 – rubrik">Bolag &amp; ägande</h3><p data-slot="text" data-label="Tjänst 2 – beskrivning">Aktieägaravtal, optionsprogram och generationsskiften utan överraskningar.</p></div>
      <div class="tjanst"><h3 data-slot="text" data-label="Tjänst 3 – rubrik">Tvist &amp; medling</h3><p data-slot="text" data-label="Tjänst 3 – beskrivning">Vi löser helst saker innan de når domstol — och företräder dig när de gör det.</p></div>
    </div>
  </div>
</section>

<div class="siffror">
  <div class="wrap">
    <div class="siffra"><div class="tal" data-slot="text" data-label="Siffra 1">15+</div><div class="vad" data-slot="text" data-label="Siffra 1 – förklaring">år i branschen</div></div>
    <div class="siffra"><div class="tal" data-slot="text" data-label="Siffra 2">400</div><div class="vad" data-slot="text" data-label="Siffra 2 – förklaring">genomförda uppdrag</div></div>
    <div class="siffra"><div class="tal" data-slot="text" data-label="Siffra 3">9,2</div><div class="vad" data-slot="text" data-label="Siffra 3 – förklaring">av 10 i kundbetyg</div></div>
  </div>
</div>

<section>
  <div class="wrap">
    <h2 class="section-title" data-slot="text" data-label="Rubrik för teamet">Vilka vi är</h2>
    <p class="section-sub" data-slot="text" data-label="Undertext för teamet">Litet team, stort engagemang.</p>
    <div class="team-grid">
      <div><img data-slot="image" data-label="Foto – person 1" src="${ph(480, 600, '#dcd5c6', '#0e2233', 'Foto 1')}" alt=""><b data-slot="text" data-label="Namn – person 1">Karin Vinter</b><small data-slot="text" data-label="Titel – person 1">Advokat, delägare</small></div>
      <div><img data-slot="image" data-label="Foto – person 2" src="${ph(480, 600, '#dcd5c6', '#0e2233', 'Foto 2')}" alt=""><b data-slot="text" data-label="Namn – person 2">Henrik Sjö</b><small data-slot="text" data-label="Titel – person 2">Advokat, delägare</small></div>
      <div><img data-slot="image" data-label="Foto – person 3" src="${ph(480, 600, '#dcd5c6', '#0e2233', 'Foto 3')}" alt=""><b data-slot="text" data-label="Namn – person 3">Amina Berg</b><small data-slot="text" data-label="Titel – person 3">Biträdande jurist</small></div>
    </div>
  </div>
</section>

<section class="slut" id="kontakt">
  <div class="wrap">
    <h2 data-slot="text" data-label="Rubrik för kontakt">Berätta om ditt ärende</h2>
    <p data-slot="text" data-multiline data-label="Kontaktuppgifter">Första samtalet kostar inget och tar 20 minuter.
08-765 43 21 · kontakt@vinterochsjo.se
Birger Jarlsgatan 15, 111 45 Stockholm</p>
    <a class="cta" href="mailto:kontakt@vinterochsjo.se" data-slot="text" data-label="Knapp för kontakt">Mejla oss</a>
  </div>
</section>

<footer><span data-slot="text" data-label="Sidfotstext">© 2026 Vinter &amp; Sjö Advokatbyrå AB</span></footer>

</body>
</html>`;

  window.TEMPLATES.push({
    id: 'konsult',
    name: 'Konsult & Byrå',
    category: 'B2B',
    html: html
  });
})();
