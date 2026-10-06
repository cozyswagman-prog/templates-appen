(function () {
  const ph = window.ph;

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Byggfirma</title>
<style>
${window.fontCss('outfit', 'inter')}
  /* Riktning: stabil svensk byggfirma – djup marinblå bas, varselgul som enda accent för handlingar,
     Outfit i rubriker och Inter i brödtext, raka linjer och 6 px hörn överallt, som en välskött bygg-skylt.
     Bara vikterna 400/700 finns och inga kursiver. */
  :root {
    --navy: #14233c; --navy-deep: #0d1626; --yellow: #f5b50a; --yellow-dark: #dd9f00;
    --grey: #f3f5f8; --ink: #1c2533; --muted: #4f5b6b; --line: #dbe1e8; --field: #7d8a9c; --on-dark: #c9d1dc;
    --radius: 6px; --head: 'Outfit', 'Inter', 'Segoe UI', system-ui, sans-serif; --body: 'Inter', 'Segoe UI', system-ui, sans-serif;
  }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: var(--body); font-size: 17px; color: var(--ink); background: #fff; line-height: 1.6; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
  h1, h2, h3 { font-family: var(--head); font-weight: 700; line-height: 1.15; letter-spacing: -.005em; word-spacing: .04em; color: inherit; text-wrap: balance; }

  .topbar { background: var(--navy); color: #fff; border-bottom: 1px solid rgba(255, 255, 255, .08); }
  .topbar .wrap { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px 24px; min-height: 72px; padding-top: 12px; padding-bottom: 12px; }
  .logo { font-family: var(--head); font-weight: 700; font-size: 22px; letter-spacing: .06em; line-height: 1.2; }
  .logo em { color: var(--yellow); font-style: normal; }
  .topbar .tel { font-weight: 700; font-size: 17px; color: var(--yellow); letter-spacing: .01em; font-variant-numeric: tabular-nums; }

  .hero { position: relative; min-height: clamp(520px, 76vh, 700px); display: flex; align-items: center; color: #fff; background: var(--navy-deep); overflow: hidden; }
  .hero .bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .hero::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(13, 22, 38, .94) 0%, rgba(13, 22, 38, .84) 42%, rgba(13, 22, 38, .4) 100%); }
  .hero .wrap { position: relative; z-index: 1; width: 100%; padding-top: 96px; padding-bottom: 96px; }
  .hero .wrap::before { content: ""; display: block; width: 56px; height: 6px; background: var(--yellow); border-radius: 2px; margin-bottom: 28px; }
  .hero h1 { font-size: clamp(40px, 5.4vw, 66px); line-height: 1.06; letter-spacing: -.015em; max-width: 15ch; }
  .hero p { margin: 24px 0 40px; font-size: clamp(18px, 1.6vw, 20px); line-height: 1.6; max-width: 46ch; color: rgba(255, 255, 255, .9); }
  .hero .cta, .quote .cta {
    display: inline-flex; align-items: center; justify-content: center; min-height: 56px; padding: 14px 32px;
    background: var(--yellow); color: var(--navy); font-weight: 700; font-size: 17px; line-height: 1.3; text-decoration: none;
    border-radius: var(--radius); transition: background-color .15s ease-out;
  }
  .hero .cta:hover, .quote .cta:hover { background: var(--yellow-dark); }

  section { padding: 96px 0; }
  .section-title { font-size: clamp(30px, 3.6vw, 42px); margin-bottom: 16px; }
  .section-title::after { content: ""; display: block; width: 48px; height: 5px; background: var(--yellow); margin-top: 16px; border-radius: 2px; }
  .section-sub { color: var(--muted); font-size: 18px; margin-bottom: 48px; max-width: 56ch; }
  /* Referenssektionen har ingen underrubrik – den tomma raden ska inte skapa ett hål. */
  .section-sub:has(+ .project-grid) { display: none; }
  .section-title + .section-sub + .project-grid { margin-top: 40px; }

  .services { background: var(--grey); }
  .service-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .service { --pad-y: 32px; --pad-x: 28px; position: relative; background: #fff; border: 1px solid var(--line); border-top: 4px solid var(--navy); border-radius: var(--radius); padding: var(--pad-y) var(--pad-x); }
  /* Den mörka ikonplattan ligger bakom ikonen; ikonerna är linjeikoner i samma vikt som ärver färgen. */
  .service::before { content: ""; position: absolute; top: var(--pad-y); left: var(--pad-x); width: 52px; height: 52px; border-radius: var(--radius); background: var(--navy); }
  .service .icon { position: relative; width: 52px; height: 52px; font-size: 24px; line-height: 1; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; color: #fff; }
  .service h3 { font-size: 22px; margin-bottom: 8px; color: var(--navy); }
  .service p { color: var(--muted); font-size: 16px; line-height: 1.6; }

  .project-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; align-items: start; }
  .project { margin: 0; background: #fff; border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
  .project img { width: 100%; height: auto; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
  .project figcaption { padding: 20px 24px 4px; font-family: var(--head); font-weight: 700; font-size: 19px; line-height: 1.3; color: var(--navy); background: #fff; }

  .quote { background: var(--navy); color: #fff; text-align: center; }
  .quote h2 { font-size: clamp(30px, 3.6vw, 42px); margin-bottom: 20px; }
  .quote h2::after { content: ""; display: block; width: 48px; height: 5px; background: var(--yellow); margin: 16px auto 0; border-radius: 2px; }
  .quote p { color: var(--on-dark); font-size: 18px; line-height: 1.7; max-width: 52ch; margin: 0 auto 36px; white-space: pre-line; }

  footer { background: var(--navy-deep); color: #a9b5c4; text-align: center; padding: 32px 24px; font-size: 14px; line-height: 1.6; }

  /* Gemensamma tillägg (SiteKit) i byggfirmans ton: samma typsnitt, gula handlingsknappar, 6 px hörn och samma bredd. */
  .kit-byggfirma { --kit-accent: var(--yellow); --kit-on: var(--navy); --kit-bg: var(--grey); --kit-ink: var(--ink); --kit-line: var(--line); }
  .kit-byggfirma .kit-section { padding: 96px 0; border-top: 0; }
  .kit-byggfirma .kit-wrap { max-width: 1120px; padding: 0 24px; }
  .kit-byggfirma .kit-wrap > h2 { font-family: var(--head); font-weight: 700; font-size: clamp(30px, 3.6vw, 42px); line-height: 1.15; letter-spacing: -.005em; word-spacing: .04em; color: var(--navy); margin-bottom: 40px; }
  .kit-byggfirma .kit-wrap > h2::after { content: ""; display: block; width: 48px; height: 5px; background: var(--yellow); margin-top: 16px; border-radius: 2px; }
  .kit-byggfirma .kit-section h3 { font-family: var(--head); font-weight: 700; color: var(--navy); }
  .kit-byggfirma .kit-section p, .kit-byggfirma .kit-detail p { max-width: 65ch; }
  .kit-byggfirma .kit-section img { border-radius: var(--radius); }

  .kit-byggfirma .kit-button, .kit-byggfirma .kit-form button, .kit-byggfirma .kit-compare button {
    font: 700 16px/1.3 var(--body); min-height: 48px; padding: 12px 24px; border-radius: var(--radius); border-width: 1px;
    transition: background-color .15s ease-out, border-color .15s ease-out, color .15s ease-out;
  }
  .kit-byggfirma .kit-button:not([aria-disabled=true]):hover, .kit-byggfirma .kit-form button[type=submit]:not(:disabled):hover, .kit-byggfirma .kit-form .kit-next:hover { background: var(--yellow-dark); border-color: var(--yellow-dark); }
  /* Sekundära knappar: kontur i marinblått. */
  .kit-byggfirma .kit-form .kit-back, .kit-byggfirma .kit-compare button[aria-pressed=false], .kit-byggfirma [data-section="contact"] .kit-button[data-action="directions"]:not([aria-disabled=true]) {
    background: transparent; color: var(--navy); border-color: var(--navy);
  }
  .kit-byggfirma .kit-form .kit-back:hover, .kit-byggfirma .kit-compare button[aria-pressed=false]:hover, .kit-byggfirma [data-section="contact"] .kit-button[data-action="directions"]:not([aria-disabled=true]):hover { background: #e6ebf1; border-color: var(--navy); }
  .kit-byggfirma .kit-compare button[aria-pressed=true] { background: var(--navy); color: #fff; border-color: var(--navy); }
  /* Ej kopplade knappar ska se inaktiva ut: streckad kant, ingen fyllning, dämpad text. */
  .kit-byggfirma .kit-button[aria-disabled=true], .kit-byggfirma .kit-form button:disabled { background: transparent; color: var(--muted); border: 1px dashed var(--field); opacity: 1; cursor: not-allowed; }

  .kit-byggfirma :focus-visible { outline: 3px solid var(--navy); outline-offset: 3px; }
  .kit-byggfirma .topbar :focus-visible, .kit-byggfirma .hero :focus-visible, .kit-byggfirma .quote :focus-visible, .kit-byggfirma footer :focus-visible { outline-color: #fff; }

  .kit-byggfirma .kit-detail summary { list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 16px; font: 700 17px/1.4 var(--body); color: var(--navy); }
  .kit-byggfirma .kit-detail summary::-webkit-details-marker { display: none; }
  .kit-byggfirma .kit-detail summary::after { content: ""; flex: none; width: 9px; height: 9px; margin-right: 4px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: translateY(-3px) rotate(45deg); transition: transform .2s ease-out; }
  .kit-byggfirma .kit-detail[open] summary::after { transform: translateY(2px) rotate(-135deg); }
  .kit-byggfirma .kit-detail p { color: var(--muted); font-size: 16px; margin: 0 0 16px; }
  .kit-byggfirma .project .kit-detail { padding: 0 24px 4px; border-bottom: 0; }
  .kit-byggfirma .project .kit-detail summary { font-size: 15px; }

  .kit-byggfirma .kit-note, .kit-byggfirma .kit-link-note, .kit-byggfirma .kit-compare figcaption, .kit-byggfirma .kit-form [role=status] { font: 400 14px/1.6 var(--body); color: var(--muted); }

  /* Före/efter: bild och berättelse sida vid sida. */
  .kit-byggfirma [data-section="transformation"] { background: var(--grey); }
  .kit-byggfirma [data-section="transformation"] .kit-grid { grid-template-columns: 7fr 5fr; gap: 56px; align-items: center; }
  .kit-byggfirma .kit-compare .kit-actions { margin: 0 0 16px; gap: 8px; }
  .kit-byggfirma [data-section="transformation"] .kit-grid > div:last-child p:first-child { font-size: 20px; line-height: 1.6; color: var(--ink); margin-top: 0; }
  .kit-byggfirma [data-section="transformation"] .kit-grid > div:last-child p + p { color: var(--muted); font-size: 16px; border-top: 1px solid var(--line); padding-top: 20px; margin-bottom: 0; }

  /* Förfrågan: rubrik och ingress till vänster, formuläret i en tydlig panel till höger. */
  .kit-byggfirma [data-section="enquiry"] { background: #fff; }
  .kit-byggfirma [data-section="enquiry"] .kit-wrap { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); column-gap: 64px; align-items: start; }
  .kit-byggfirma [data-section="enquiry"] .kit-wrap > h2, .kit-byggfirma [data-section="enquiry"] .kit-wrap > p { grid-column: 1; }
  .kit-byggfirma [data-section="enquiry"] .kit-wrap > p { font-size: 18px; color: var(--muted); margin-top: 0; }
  .kit-byggfirma [data-section="enquiry"] .kit-form { grid-column: 2; grid-row: 1 / span 3; max-width: none; background: var(--grey); border: 1px solid var(--line); border-radius: var(--radius); padding: 32px 36px; }
  .kit-byggfirma .kit-progress { font: 700 13px/1.5 var(--body); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin: 0 0 8px; }
  .kit-byggfirma .kit-form legend { font-family: var(--head); font-size: 24px; line-height: 1.25; color: var(--navy); margin: 0 0 8px; padding: 0; }
  .kit-byggfirma .kit-form label { font: 700 15px/1.4 var(--body); color: var(--ink); margin: 20px 0; }
  .kit-byggfirma .kit-form input, .kit-byggfirma .kit-form textarea, .kit-byggfirma .kit-form select { font: 400 16px/1.5 var(--body); min-height: 52px; padding: 12px 14px; background: #fff; color: var(--ink); border: 1px solid var(--field); border-radius: var(--radius); }
  .kit-byggfirma .kit-form input:focus-visible, .kit-byggfirma .kit-form textarea:focus-visible, .kit-byggfirma .kit-form select:focus-visible { border-color: var(--navy); outline-offset: 1px; }
  .kit-byggfirma .kit-form .kit-actions { margin: 24px 0 8px; gap: 12px; }
  .kit-byggfirma .kit-form [role=status] { margin: 8px 0 0; }

  .kit-byggfirma [data-section="faq"] { background: #fff; }
  /* Vanliga frågor i samma tvåspaltiga rytm som förfrågan: rubrik till vänster, frågorna till höger. */
  .kit-byggfirma [data-section="faq"] .kit-wrap { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); column-gap: 64px; align-items: start; }
  .kit-byggfirma [data-section="faq"] .kit-wrap > h2 { grid-column: 1; grid-row: 1 / span 3; }
  .kit-byggfirma [data-section="faq"] .kit-detail { grid-column: 2; padding: 4px 0; }
  .kit-byggfirma [data-section="faq"] .kit-wrap > h2 + .kit-detail { border-top: 1px solid var(--line); }
  .kit-byggfirma [data-section="faq"] .kit-detail summary { min-height: 64px; font-size: 18px; }

  /* Avslutande kontaktyta: uppgifter till vänster, handlingar staplade till höger. */
  .kit-byggfirma [data-section="contact"] { background: var(--grey); border-top: 1px solid var(--line); }
  .kit-byggfirma [data-section="contact"] .kit-grid { grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); column-gap: 64px; }
  .kit-byggfirma [data-section="contact"] .kit-contact h3 { font-size: 24px; margin: 0 0 12px; }
  .kit-byggfirma [data-section="contact"] address { font-size: 17px; line-height: 1.7; }
  .kit-byggfirma [data-section="contact"] .kit-contact p { font-size: 17px; margin: 12px 0 0; }
  .kit-byggfirma .kit-contact a:not(.kit-button) { display: inline-flex; align-items: center; min-height: 44px; color: var(--navy); font-weight: 700; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; }
  .kit-byggfirma [data-section="contact"] .kit-actions { flex-direction: column; align-items: stretch; max-width: 380px; margin: 0; gap: 12px; }
  .kit-byggfirma [data-section="contact"] .kit-actions > .kit-button { flex: none; }
  .kit-byggfirma [data-section="contact"] .kit-link-note { margin: -4px 0 4px; }
  /* Utan ifyllda kontaktuppgifter ska ingen tom kolumn stå kvar. */
  .kit-byggfirma [data-section="contact"] .kit-grid:has(.kit-contact h3:empty):has(.kit-contact address:empty) { grid-template-columns: 1fr; }
  .kit-byggfirma [data-section="contact"] .kit-contact:has(h3:empty):has(address:empty) { display: none; }

  @media (max-width: 960px) {
    .service { --pad-y: 28px; --pad-x: 22px; }
    .project-grid { gap: 16px; }
    .project figcaption { padding: 16px 18px 4px; font-size: 17px; min-height: calc(2 * 1.3em + 20px); }
    .kit-byggfirma .project .kit-detail { padding: 0 18px 4px; }
    .kit-byggfirma [data-section="enquiry"] .kit-wrap { grid-template-columns: 1fr; }
    .kit-byggfirma [data-section="enquiry"] .kit-form { grid-column: 1; grid-row: auto; margin-top: 16px; }
    .kit-byggfirma [data-section="transformation"] .kit-grid { gap: 36px; }
    .kit-byggfirma [data-section="faq"] .kit-wrap { grid-template-columns: 1fr; }
    .kit-byggfirma [data-section="faq"] .kit-wrap > h2 { grid-row: auto; }
    .kit-byggfirma [data-section="faq"] .kit-detail { grid-column: 1; }
    .kit-byggfirma [data-section="contact"] .kit-grid { column-gap: 36px; }
  }

  @media (max-width: 760px) {
    body { font-size: 16px; }
    .wrap, .kit-byggfirma .kit-wrap { padding: 0 20px; }
    .topbar .wrap { min-height: 60px; }
    .logo { font-size: 19px; }
    .topbar .tel { font-size: 16px; }
    .hero { min-height: 0; }
    .hero::after { background: linear-gradient(180deg, rgba(13, 22, 38, .78) 0%, rgba(13, 22, 38, .9) 100%); }
    .hero .wrap { padding-top: 72px; padding-bottom: 72px; }
    .hero .wrap::before { margin-bottom: 24px; }
    .hero p { margin: 20px 0 32px; }
    .hero .cta { width: 100%; max-width: 360px; }
    section, .kit-byggfirma .kit-section { padding: 64px 0; }
    .section-sub { font-size: 17px; margin-bottom: 32px; }
    .kit-byggfirma .kit-wrap > h2 { margin-bottom: 32px; }
    .service-grid, .project-grid { grid-template-columns: 1fr; gap: 16px; }
    .project figcaption { min-height: 0; }
    .service { display: grid; grid-template-columns: 52px 1fr; column-gap: 20px; --pad-y: 24px; --pad-x: 20px; }
    .service .icon { grid-row: span 2; margin-bottom: 0; }
    .service h3 { font-size: 20px; margin-bottom: 4px; }
    .section-title + .section-sub + .project-grid { margin-top: 32px; }
    .kit-byggfirma [data-section="transformation"] .kit-grid { grid-template-columns: 1fr; gap: 32px; }
    .kit-byggfirma [data-section="transformation"] .kit-grid > div:last-child p:first-child { font-size: 18px; }
    .kit-byggfirma [data-section="enquiry"] .kit-form { padding: 24px 20px; }
    .kit-byggfirma .kit-form .kit-actions > button { flex: 1 1 130px; }
    .kit-byggfirma [data-section="faq"] .kit-detail summary { font-size: 17px; }
    .kit-byggfirma [data-section="contact"] .kit-grid { grid-template-columns: 1fr; }
    .kit-byggfirma [data-section="contact"] .kit-actions { max-width: none; }
    .quote p { font-size: 17px; }
  }
</style>
</head>
<body>

<div class="topbar">
  <div class="wrap">
    <div class="logo" data-slot="text" data-label="Företagsnamn i toppen">NORDBYGG <em>AB</em></div>
    <div class="tel" data-slot="text" data-label="Telefonnummer i toppen">070-123 45 67</div>
  </div>
</div>

<div class="hero">
  <img class="bg" data-slot="image" data-label="Stor bild högst upp" src="${window.ex('bygg-hero', 1600, 900, '#2a3950', '#f5b50a', 'Hero-bild · t.ex. ett pågående bygge')}" alt="">
  <div class="wrap">
    <h1 data-slot="text" data-label="Stor rubrik">Hantverk som håller i generationer</h1>
    <p data-slot="text" data-label="Text under rubriken">Vi hjälper dig med allt från renovering till nybyggnation. Fast pris, tydlig tidsplan och alltid fackmannamässigt utfört.</p>
    <a class="cta" href="#offert" data-slot="text" data-label="Knapptext i hero">Begär offert</a>
  </div>
</div>

<section class="services">
  <div class="wrap">
    <h2 class="section-title" data-slot="text" data-label="Rubrik för tjänster">Våra tjänster</h2>
    <p class="section-sub" data-slot="text" data-label="Undertext för tjänster">Totalentreprenad eller enskilda uppdrag — vi anpassar oss efter ditt projekt.</p>
    <div class="service-grid">
      <div class="service"><div class="icon"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/></svg></div><h3 data-slot="text" data-label="Tjänst 1 – rubrik">Renovering</h3><p data-slot="text" data-label="Tjänst 1 – beskrivning">Kök, badrum och helrenoveringar med hög finish.</p></div>
      <div class="service"><div class="icon"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4.5 19.5 9.5"/><path d="M12 7l5 5"/><path d="M13.2 5.8 9 4l-1.5 1.5 3.2 3.2"/><path d="M14.5 10.5 5 20l-1-1 9.5-9.5"/></svg></div><h3 data-slot="text" data-label="Tjänst 2 – rubrik">Nybyggnation</h3><p data-slot="text" data-label="Tjänst 2 – beskrivning">Villor, garage och attefallshus från grund till nyckel.</p></div>
      <div class="service"><div class="icon"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V4l16 16H4z"/><path d="M8 16v-4.5l4.5 4.5H8z"/><path d="M4 8h2M4 12h2"/></svg></div><h3 data-slot="text" data-label="Tjänst 3 – rubrik">Projektledning</h3><p data-slot="text" data-label="Tjänst 3 – beskrivning">Vi samordnar alla hantverkare så du slipper.</p></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <h2 class="section-title" data-slot="text" data-label="Rubrik för referenser">Utvalda projekt</h2>
    <p class="section-sub">&nbsp;</p>
    <div class="project-grid">
      <figure class="project"><img data-slot="image" data-label="Projektbild 1" src="${window.ex('bygg-kitchen', 800, 600, '#d8dde5', '#14233c', 'Projektbild 1')}" alt=""><figcaption data-slot="text" data-label="Projekt 1 – bildtext">Villa Ekudden — totalrenovering</figcaption></figure>
      <figure class="project"><img data-slot="image" data-label="Projektbild 2" src="${window.ex('bygg-bath', 800, 600, '#d8dde5', '#14233c', 'Projektbild 2')}" alt=""><figcaption data-slot="text" data-label="Projekt 2 – bildtext">Badrum, Täby — 2025</figcaption></figure>
      <figure class="project"><img data-slot="image" data-label="Projektbild 3" src="${window.ex('bygg-small', 800, 600, '#d8dde5', '#14233c', 'Projektbild 3')}" alt=""><figcaption data-slot="text" data-label="Projekt 3 – bildtext">Attefallshus, Nacka</figcaption></figure>
    </div>
  </div>
</section>

<section class="quote" id="offert">
  <div class="wrap">
    <h2 data-slot="text" data-label="Rubrik för offert">Redo att starta ditt projekt?</h2>
    <p data-slot="text" data-multiline data-label="Kontaktuppgifter">Ring 070-123 45 67 eller mejla info@nordbygg.se
Vi återkommer med kostnadsfri offert inom 24 timmar.</p>
    <a class="cta" href="mailto:info@nordbygg.se" data-slot="text" data-label="Knapptext för offert">Kontakta oss</a>
  </div>
</section>

<footer><span data-slot="text" data-label="Sidfotstext">© 2026 Nordbygg AB · Org.nr 556677-8899 · Vi innehar F-skattsedel</span></footer>

</body>
</html>`;

  window.TEMPLATES.push({
    id: 'byggfirma',
    name: 'Byggfirma & Hantverk',
    category: 'Lokalt företag',
    html: html
  });
})();
