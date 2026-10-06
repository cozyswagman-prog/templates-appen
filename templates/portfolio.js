(function () {
  const ph = window.ph;

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Portfolio</title>
<style>
${window.fontCss('outfit', 'inter')}
  /* Riktning: mörk, arbetsfokuserad portfolio – stora, tajta Outfit-rubriker, Inter i brödtext, grafitbas med en
     ljusare yta och mintgrönt som enda accent (handlingar och små markörer). Bara vikterna 400/700, inga kursiver. */
  :root {
    --bg: #101014; --surface: #17171e; --raise: #1f1f28; --text: #ececf1; --soft: #c4c4ce; --dim: #a3a3b0;
    --line: #2a2a34; --field: #6b6b7a; --accent: #67e8aa; --accent-hi: #8ff0c2; --on-accent: #0c2017;
    --radius: 12px; --measure: 1120px;
  }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-size: 17px; background: var(--bg); color: var(--text); line-height: 1.65; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: var(--measure); margin: 0 auto; padding: 0 32px; }
  h1, h2, h3 { font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif; font-weight: 700; line-height: 1.1; letter-spacing: -.02em; text-wrap: balance; }

  .hero { padding: clamp(96px, 13vw, 168px) 0 clamp(72px, 9vw, 120px); border-bottom: 1px solid var(--line); }
  .hero .hej { display: flex; align-items: center; gap: 12px; color: var(--dim); font-family: 'Outfit', system-ui, sans-serif; font-weight: 700; font-size: 14px; letter-spacing: .14em; text-transform: uppercase; }
  .hero .hej::before { content: ""; width: 32px; height: 2px; background: var(--accent); flex: none; }
  .hero h1 { font-size: clamp(48px, 13vw, 128px); line-height: .98; letter-spacing: -.035em; margin: 24px 0 32px; }
  .hero p { color: var(--soft); font-size: clamp(19px, 1.9vw, 23px); line-height: 1.55; max-width: 46ch; }

  section { padding: 96px 0; }
  .section-title { font-size: clamp(32px, 4.2vw, 48px); margin-bottom: 40px; }
  .section-title span:first-child { color: var(--accent); margin-right: .1em; }

  /* Arbeten: kantlösa, bildledda poster i ett asymmetriskt rutnät (7 + 5, 5 + 7). */
  .work-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); column-gap: 32px; row-gap: 64px; }
  .work, .kit-portfolio .work-grid > .work:first-child { grid-column: span 6; min-width: 0; }
  .kit-portfolio .work-grid > .work:nth-child(4n+1), .kit-portfolio .work-grid > .work:nth-child(4n+4) { grid-column: span 7; }
  .kit-portfolio .work-grid > .work:nth-child(4n+2), .kit-portfolio .work-grid > .work:nth-child(4n+3) { grid-column: span 5; }
  .work img, .kit-portfolio .work-grid > .work:first-child img { width: 100%; height: clamp(260px, 30vw, 420px); max-height: none; object-fit: cover; display: block; border-radius: var(--radius); background: var(--raise); }
  .work .wbody { padding: 20px 0 0; }
  .work b { font-family: 'Outfit', system-ui, sans-serif; font-size: 22px; line-height: 1.3; letter-spacing: -.01em; display: block; margin-bottom: 4px; }
  .work small { color: var(--dim); font-size: 15px; }

  section:has(> .wrap > .om) { border-top: 1px solid var(--line); }
  .om { display: grid; grid-template-columns: 300px 1fr; gap: 72px; align-items: center; }
  .om img { width: 100%; height: auto; aspect-ratio: 4 / 5; border-radius: var(--radius); object-fit: cover; display: block; background: var(--raise); }
  .om .section-title { margin-bottom: 24px; }
  .om p { color: var(--soft); font-size: 19px; line-height: 1.7; max-width: 58ch; }

  .kontakt { text-align: center; padding: 136px 0; }
  .kontakt h2 { font-size: clamp(38px, 6vw, 72px); line-height: 1.02; letter-spacing: -.03em; max-width: 16ch; margin: 0 auto 20px; }
  .kontakt p { color: var(--dim); font-size: 19px; margin-bottom: 40px; }
  .kontakt a { display: inline-flex; align-items: center; justify-content: center; min-height: 56px; background: var(--accent); color: var(--on-accent); font-family: 'Outfit', system-ui, sans-serif; font-weight: 700; font-size: 18px; text-decoration: none; padding: 14px 40px; border-radius: 999px; transition: background-color .15s ease-out; }
  .kontakt a:hover { background: var(--accent-hi); }

  footer { border-top: 1px solid var(--line); text-align: center; padding: 32px 24px; color: var(--dim); font-size: 14px; }

  /* SiteKit-delar i portfolions ton: samma typsnitt, bredd, accent och hörn. */
  .kit-portfolio { --kit-accent: var(--accent); --kit-bg: var(--surface); --kit-ink: var(--text); --kit-line: var(--line); --kit-on: var(--on-accent); }
  .kit-portfolio .kit-section { padding: 104px 0; border-top: 0; }
  .kit-portfolio .kit-wrap { max-width: var(--measure); padding: 0 32px; }
  .kit-portfolio .kit-wrap > h2 { font-size: clamp(32px, 4.2vw, 48px); line-height: 1.1; margin-bottom: 32px; }
  .kit-portfolio .kit-section p, .kit-portfolio .kit-detail p { max-width: 62ch; }
  .kit-portfolio .kit-button, .kit-portfolio .kit-filter button, .kit-portfolio .kit-next, .kit-portfolio .kit-back, .kit-portfolio .kit-form button {
    font-family: 'Outfit', system-ui, sans-serif; font-weight: 700; font-size: 16px; border-radius: 999px; padding: 10px 24px; transition: background-color .15s ease-out, border-color .15s ease-out, color .15s ease-out;
  }
  .kit-portfolio .kit-button:not([aria-disabled=true]):hover, .kit-portfolio .kit-form button[type=submit]:not(:disabled):hover { background: var(--accent-hi); border-color: var(--accent-hi); }
  /* Ej kopplade knappar: ingen fyllning och streckad kant – tydligt inaktiva. */
  .kit-portfolio .kit-button[aria-disabled=true], .kit-portfolio .kit-form button:disabled { background: transparent; color: var(--dim); border: 1px dashed var(--field); opacity: 1; cursor: not-allowed; }
  .kit-portfolio .kit-filter { gap: 8px; margin-bottom: 40px; }
  .kit-portfolio .kit-filter button { background: transparent; color: var(--text); border-color: var(--field); }
  .kit-portfolio .kit-filter button:hover { border-color: var(--text); }
  .kit-portfolio .kit-filter button[aria-pressed=true] { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .kit-portfolio .kit-inline { padding: 16px 0 0; }
  .kit-portfolio .kit-detail { padding: 0; }
  .kit-portfolio .kit-inline .kit-detail:first-child { border-top: 1px solid var(--line); }
  .kit-portfolio .kit-detail summary { display: flex; align-items: center; justify-content: space-between; gap: 16px; list-style: none; font-family: 'Outfit', system-ui, sans-serif; font-weight: 700; font-size: 17px; padding: 12px 0; }
  .kit-portfolio .kit-detail summary::-webkit-details-marker { display: none; }
  .kit-portfolio .kit-detail summary::after { content: "+"; flex: none; width: 28px; text-align: center; font-size: 22px; line-height: 1; color: var(--accent); transition: transform .15s ease-out; }
  .kit-portfolio .kit-detail[open] summary::after { transform: rotate(45deg); }
  .kit-portfolio .kit-detail p { color: var(--soft); margin: 0 0 20px; }
  .kit-portfolio .kit-inline .kit-detail summary { font-size: 16px; color: #d6d6de; }
  .kit-portfolio [data-section="faq"] { background: var(--surface); }
  .kit-portfolio [data-section="faq"] .kit-detail summary { font-size: 19px; padding: 20px 0; }
  .kit-portfolio [data-section="faq"] .kit-detail:first-of-type { border-top: 1px solid var(--line); }
  .kit-portfolio .kit-note, .kit-portfolio .kit-link-note, .kit-portfolio .kit-progress { font-family: 'Inter', system-ui, sans-serif; color: var(--dim); }
  .kit-portfolio .kit-note { font-size: 15px; }

  /* Förfrågan: rubrik och ingress till vänster, formuläret i en egen yta till höger på breda skärmar. */
  .kit-portfolio [data-section="enquiry"] { background: var(--surface); }
  .kit-portfolio [data-section="enquiry"] > .kit-wrap { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); column-gap: 64px; align-items: start; }
  .kit-portfolio [data-section="enquiry"] > .kit-wrap > h2, .kit-portfolio [data-section="enquiry"] > .kit-wrap > p { grid-column: 1; }
  .kit-portfolio [data-section="enquiry"] > .kit-wrap > p { color: var(--soft); font-size: 19px; margin: 0; }
  .kit-portfolio [data-section="enquiry"] .kit-form { grid-column: 2; grid-row: 1 / span 3; max-width: none; background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius); padding: 40px; }
  .kit-portfolio .kit-form fieldset + fieldset { margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--line); }
  .kit-portfolio .kit-form legend { font-family: 'Outfit', system-ui, sans-serif; font-size: 19px; margin: 0 0 8px; padding: 0; float: left; width: 100%; }
  .kit-portfolio .kit-form legend + * { clear: both; }
  .kit-portfolio .kit-form label { font-family: 'Inter', system-ui, sans-serif; font-weight: 700; font-size: 15px; color: #d6d6de; margin: 16px 0; }
  .kit-portfolio .kit-form input, .kit-portfolio .kit-form textarea, .kit-portfolio .kit-form select { font-family: 'Inter', system-ui, sans-serif; background: var(--raise); border-color: var(--field); border-radius: 8px; color: var(--text); }
  .kit-portfolio .kit-form input::placeholder, .kit-portfolio .kit-form textarea::placeholder { color: #8a8a96; opacity: 1; }
  .kit-portfolio .kit-form input:hover, .kit-portfolio .kit-form textarea:hover, .kit-portfolio .kit-form select:hover { border-color: #8a8a96; }
  .kit-portfolio .kit-form .kit-actions { margin: 28px 0 0; }
  .kit-portfolio .kit-form [role=status] { color: var(--dim); font-size: 15px; margin: 12px 0 0; }

  /* Kontaktavslutning: uppgifter till vänster, handlingar som en lodrät lista med förklaring under respektive knapp. */
  .kit-portfolio [data-section="contact"] { background: var(--bg); border-top: 1px solid var(--line); }
  /* Utan ifyllda kontaktuppgifter tas den tomma spalten bort så att handlingarna inte hänger till höger. */
  .kit-portfolio [data-section="contact"] .kit-grid:has(> .kit-contact > h3:empty) { grid-template-columns: 1fr; }
  .kit-portfolio .kit-contact:has(> h3:empty):has(> address:empty):not(:has(a:not(:empty))) { display: none; }
  .kit-portfolio .kit-contact h3 { font-size: 26px; margin: 0 0 12px; }
  .kit-portfolio .kit-contact address { color: var(--soft); }
  .kit-portfolio .kit-contact p { margin: 12px 0 0; line-height: 2; }
  .kit-portfolio [data-section="contact"] .kit-actions { flex-direction: column; align-items: stretch; gap: 12px; margin: 0; max-width: 360px; }
  .kit-portfolio [data-section="contact"] .kit-actions > .kit-button { flex: none; }
  .kit-portfolio [data-section="contact"] .kit-button[data-action="directions"]:not([aria-disabled=true]) { background: transparent; color: var(--text); border-color: var(--field); }
  .kit-portfolio [data-section="contact"] .kit-button[data-action="directions"]:not([aria-disabled=true]):hover { background: transparent; border-color: var(--accent); }
  .kit-portfolio [data-section="contact"] .kit-actions > .kit-link-note { margin: -4px 0 4px; padding-left: 24px; font-size: 14px; }
  .kit-portfolio [data-section="contact"] .kit-note { margin: 16px 0 0; }

  .kit-portfolio :focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }

  @media (max-width: 900px) {
    .work-grid { column-gap: 24px; row-gap: 48px; }
    .work, .kit-portfolio .work-grid > .work:nth-child(n) { grid-column: span 6; }
    .work img, .kit-portfolio .work-grid > .work:first-child img { height: auto; aspect-ratio: 4 / 3; }
    .om { grid-template-columns: 220px 1fr; gap: 48px; }
    .kit-portfolio [data-section="enquiry"] > .kit-wrap { display: block; }
    .kit-portfolio [data-section="enquiry"] > .kit-wrap > p { margin-bottom: 32px; max-width: 52ch; }
  }

  @media (max-width: 720px) {
    body { font-size: 16px; }
    .wrap, .kit-portfolio .kit-wrap { padding: 0 20px; }
    .hero { padding: 72px 0 56px; }
    .hero h1 { margin: 20px 0 24px; }
    section, .kit-portfolio .kit-section { padding: 72px 0; }
    .kontakt { padding: 88px 0; }
    .section-title, .kit-portfolio .kit-wrap > h2 { margin-bottom: 28px; }
    .work, .kit-portfolio .work-grid > .work:nth-child(n) { grid-column: 1 / -1; }
    .om { grid-template-columns: 1fr; gap: 32px; }
    .om img { max-width: 240px; }
    .om p, .kontakt p { font-size: 17px; }
    .kit-portfolio .kit-filter button { padding: 10px 16px; }
    .kit-portfolio [data-section="enquiry"] .kit-form { padding: 24px 20px; }
    .kit-portfolio [data-section="contact"] .kit-actions { max-width: none; }
  }
</style>
</head>
<body>

<div class="hero">
  <div class="wrap">
    <div class="hej" data-slot="text" data-label="Liten text högst upp">Hej, jag heter</div>
    <h1 data-slot="text" data-label="Ditt namn">Alex Nilsson</h1>
    <p data-slot="text" data-label="Presentation">Fotograf och formgivare i Göteborg. Jag hjälper varumärken att berätta sin historia i bild — från produktfoto till hela visuella identiteter.</p>
  </div>
</div>

<section>
  <div class="wrap">
    <h2 class="section-title"><span>/</span> <span data-slot="text" data-label="Rubrik för arbeten">Utvalda arbeten</span></h2>
    <div class="work-grid">
      <div class="work"><img data-slot="image" data-label="Arbete 1 – bild" src="${ph(800, 600, '#23232c', '#67e8aa', 'Arbete 1')}" alt=""><div class="wbody"><b data-slot="text" data-label="Arbete 1 – titel">Kampanj för Fjällbryggeriet</b><small data-slot="text" data-label="Arbete 1 – beskrivning">Produktfoto &amp; art direction</small></div></div>
      <div class="work"><img data-slot="image" data-label="Arbete 2 – bild" src="${ph(800, 600, '#23232c', '#67e8aa', 'Arbete 2')}" alt=""><div class="wbody"><b data-slot="text" data-label="Arbete 2 – titel">Identitet för Studio Norr</b><small data-slot="text" data-label="Arbete 2 – beskrivning">Logotyp, färger, typografi</small></div></div>
      <div class="work"><img data-slot="image" data-label="Arbete 3 – bild" src="${ph(800, 600, '#23232c', '#67e8aa', 'Arbete 3')}" alt=""><div class="wbody"><b data-slot="text" data-label="Arbete 3 – titel">Porträttserie "Hantverkarna"</b><small data-slot="text" data-label="Arbete 3 – beskrivning">Dokumentärt porträttfoto</small></div></div>
      <div class="work"><img data-slot="image" data-label="Arbete 4 – bild" src="${ph(800, 600, '#23232c', '#67e8aa', 'Arbete 4')}" alt=""><div class="wbody"><b data-slot="text" data-label="Arbete 4 – titel">Webb för Kajkanten</b><small data-slot="text" data-label="Arbete 4 – beskrivning">Design &amp; bildspråk</small></div></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="om">
      <img data-slot="image" data-label="Porträttbild" src="${ph(440, 440, '#23232c', '#67e8aa', 'Porträtt')}" alt="">
      <div>
        <h2 class="section-title"><span>/</span> <span data-slot="text" data-label="Rubrik för om mig">Om mig</span></h2>
        <p data-slot="text" data-label="Om mig-text">Efter tio år på byrå arbetar jag nu i egen regi. Jag tror på enkelhet, ärligt ljus och bilder som håller längre än en kampanjperiod. Kunder i urval: Fjällbryggeriet, Studio Norr, Kajkanten.</p>
      </div>
    </div>
  </div>
</section>

<section class="kontakt">
  <div class="wrap">
    <h2 data-slot="text" data-label="Rubrik för kontakt">Har du ett projekt på gång?</h2>
    <p data-slot="text" data-label="Kontakttext">Berätta gärna — jag svarar oftast samma dag.</p>
    <a href="mailto:hej@alexnilsson.se" data-slot="text" data-label="Knapptext">Mejla mig</a>
  </div>
</section>

<footer><span data-slot="text" data-label="Sidfotstext">© 2026 Alex Nilsson · Göteborg</span></footer>

</body>
</html>`;

  window.TEMPLATES.push({
    id: 'portfolio',
    name: 'Portfolio',
    category: 'Personlig',
    html: html
  });
})();
