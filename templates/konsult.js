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
  :root { --navy: #0e2233; --paper: #fbfaf7; --ink: #1d2630; --dim: #5d6a77; --gold: #b08d44; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; background: var(--paper); color: var(--ink); line-height: 1.7; }
  .wrap { max-width: 1040px; margin: 0 auto; padding: 0 24px; }
  h1, h2 { font-family: 'Playfair Display', Georgia, serif; font-weight: 700; letter-spacing: 0; }

  nav .wrap { display: flex; align-items: center; justify-content: space-between; padding-top: 22px; padding-bottom: 22px; }
  .brand { font-family: 'Playfair Display', Georgia, serif; font-size: 21px; font-weight: 700; }
  .brand span { color: var(--gold); }
  nav small { color: var(--dim); letter-spacing: 1px; }

  .hero { background: var(--navy); color: #eef1f4; }
  .hero .wrap { padding-top: 90px; padding-bottom: 90px; }
  .hero .kicker { color: var(--gold); letter-spacing: 3px; text-transform: uppercase; font-size: 12px; font-weight: 600; }
  .hero h1 { font-size: 50px; line-height: 1.12; margin: 18px 0; max-width: 20ch; }
  .hero p { color: #aebac5; font-size: 18px; max-width: 54ch; margin-bottom: 30px; }
  .hero .cta { display: inline-block; background: var(--gold); color: #fff; text-decoration: none; font-weight: 600; padding: 14px 34px; border-radius: 4px; }

  section { padding: 76px 0; }
  .section-title { font-size: 32px; margin-bottom: 10px; }
  .section-sub { color: var(--dim); margin-bottom: 44px; max-width: 62ch; }

  .tjanster { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
  .tjanst { border-top: 3px solid var(--gold); padding-top: 20px; }
  .tjanst h3 { font-size: 19px; margin-bottom: 10px; }
  .tjanst p { color: var(--dim); font-size: 15px; }

  .siffror { background: #f1ede4; }
  .siffror .wrap { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; text-align: center; padding-top: 56px; padding-bottom: 56px; }
  .siffra .tal { font-family: 'Playfair Display', Georgia, serif; font-size: 48px; font-weight: 700; color: var(--navy); }
  .siffra .vad { color: var(--dim); font-size: 15px; margin-top: 4px; }

  .team-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
  .team-grid img { width: 100%; aspect-ratio: 4/5; object-fit: cover; margin-bottom: 14px; }
  .team-grid b { display: block; font-size: 16px; }
  .team-grid small { color: var(--dim); }

  .slut { background: var(--navy); color: #eef1f4; text-align: center; }
  .slut h2 { font-size: 34px; margin-bottom: 12px; }
  .slut p { color: #aebac5; max-width: 50ch; margin: 0 auto 28px; white-space: pre-line; }
  .slut .cta { display: inline-block; background: var(--gold); color: #fff; text-decoration: none; font-weight: 600; padding: 14px 36px; border-radius: 4px; }

  footer { text-align: center; padding: 24px; color: var(--dim); font-size: 13px; }

  @media (max-width: 760px) {
    .hero h1 { font-size: 34px; }
    .tjanster, .siffror .wrap, .team-grid { grid-template-columns: 1fr; }
    section { padding: 52px 0; }
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
