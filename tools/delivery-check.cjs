// Advisory review of a creation snapshot. No network calls or changes to the website.
const { DOMParser } = require('linkedom');
const { createRuntime, decodeProject } = require('./render-project.cjs');
const text = value => String(value || '').replace(/\s+/g, ' ').trim();
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Folded details and before/after panels are reachable content, unlike a hidden section.
const included = el => !el.closest('[data-section][hidden]');

function checkDelivery(input, files) {
  const runtime = createRuntime(), project = runtime.SiteRenderer.normalize(decodeProject(input));
  const template = runtime.TEMPLATES.find(t => t.id === project.templateId);
  const pages = runtime.SiteRenderer.pagesOf(template).map(page => {
    const doc = new DOMParser().parseFromString(page.html, 'text/html');
    const slots = [...doc.querySelectorAll('[data-slot]')];
    const originals = slots.map(el => text(el.textContent));
    // Match the renderer's precedence while retaining field numbers for useful advice.
    runtime.SiteKit.apply(doc, project, page.file);
    slots.forEach((el, i) => {
      const value = project.values[page.file]?.[i + 1];
      if (value != null && el.getAttribute('data-slot') !== 'image') el.textContent = value;
    });
    runtime.SiteKit.apply(doc, project, page.file);
    const empty = [], unchanged = [];
    function inspect(el, original, label) {
      if (!included(el)) return;
      const current = text(el.textContent);
      if (!current) empty.push(label);
      else if (current === original) unchanged.push(label);
    }
    slots.forEach((el, i) => {
      if (el.getAttribute('data-slot') !== 'image') inspect(el, originals[i], 'Ruta ' + (i + 1) + ' – ' + (el.getAttribute('data-label') || 'Text'));
    });
    doc.querySelectorAll('[data-content]').forEach(el => inspect(el, text(el.getAttribute('data-original')), el.getAttribute('data-caption') || 'Text i extra avsnitt'));

    const html = files.get(page.file);
    if (html === undefined) throw new Error('Sidan saknas inför leveranskontrollen.');
    const actual = new DOMParser().parseFromString(String(html), 'text/html');
    const visible = selector => [...actual.querySelectorAll(selector)].filter(included);
    const groups = [];
    const add = (id, title, advice, items) => { if (items.length) groups.push({ id, title, advice, items }); };
    const missing = [];
    if (visible('[data-business="name"]').some(el => !text(el.textContent))) missing.push('Företagsnamn i det gemensamma kontaktavsnittet');
    const contact = visible('[data-business="phone"], [data-business="email"]');
    if (contact.length && !contact.some(el => el.hasAttribute('href'))) missing.push('Giltigt telefonnummer eller e-post i det gemensamma kontaktavsnittet');
    add('business', 'Komplettera kontaktuppgifterna', 'Öppna Företag & funktioner i editorn. Kontrollera även uppgifterna i sidans övriga texter.', missing);
    add('empty', 'Fyll i eller dölj tomma texter', 'Öppna den angivna rutan eller Nya texter i editorn. Dölj hela avsnittet om det inte ska vara med.', empty);
    add('template-text', 'Gå igenom text som finns kvar från mallen', 'Texten är oförändrad från mallen. Den kan passa, men kontrollera särskilt namn, priser och öppettider. Detta är ett råd, inte ett konstaterat fel.', unchanged);
    const placeholders = visible('img').filter(el => /^data:image\/svg\+xml[,;]/.test(el.getAttribute('src') || ''));
    // Mallens exempelfoton (templates/exempelbilder.js) får användas, men visar inte kundens eget företag.
    const exampleSources = new Set(Object.values(runtime.EXEMPEL || {})), examples = [];
    slots.forEach((el, i) => {
      if (el.getAttribute('data-slot') !== 'image' || !included(el)) return;
      const value = project.values[page.file]?.[i + 1];
      if (exampleSources.has(value != null ? value : el.getAttribute('src'))) examples.push('Ruta ' + (i + 1) + ' – ' + (el.getAttribute('data-label') || 'Bild'));
    });
    doc.querySelectorAll('img[data-image-key]').forEach(el => { if (included(el) && exampleSources.has(el.getAttribute('src'))) examples.push(el.getAttribute('data-caption') || 'Bild i extra avsnitt'); });
    add('images', 'Byt kvarvarande exempelbilder', 'Välj egna bilder i bildrutorna eller under Nya bilder. Exempelfotona får användas, men egna bilder visar ert eget företag. Även bilder bakom Före/Efter-knappar kontrolleras.', [...placeholders.map(el => el.getAttribute('data-caption') || 'Exempelbild ' + ([...actual.querySelectorAll('img')].indexOf(el) + 1)), ...examples]);
    const inactive = visible('a[aria-disabled="true"]');
    add('links', 'Anslut knappar som saknar ett mål', 'Öppna Knappar & länkar eller Företag & funktioner. Ange en fungerande destination eller dölj avsnittet om det inte behövs.', inactive.map(el => text(el.textContent).slice(0, 120) || 'Knapp utan text'));
    const forms = visible('[data-enquiry]');
    add('forms', 'Anslut formuläret eller dölj det', 'Ange en formulärmottagare under Företag & funktioner, eller dölj förfrågningsavsnittet. En mottagaradress är inte bevis på att meddelanden kommer fram.', forms.filter(el => !el.getAttribute('data-endpoint')).map(() => 'Formuläret saknar mottagare'));
    const broken = visible('a[href]').filter(el => {
      const href = el.getAttribute('href');
      if (href.startsWith('#')) { const target = actual.getElementById(href.slice(1)); return !target || !included(target); }
      return /^[a-z0-9-]+\.html$/.test(href) && !files.has(href);
    });
    add('local-links', 'Rätta länkar till saknade sidor eller avsnitt', 'Välj ett befintligt mål under Knappar & länkar och kontrollera att avsnittet visas.', broken.map(el => text(el.textContent).slice(0, 120) || 'Länk utan text'));
    return { file: page.file, title: page.title, groups,
      externalLinks: visible('a[href]').filter(el => /^https?:/.test(el.getAttribute('href'))).length,
      connectedForms: forms.filter(el => !!el.getAttribute('data-endpoint')).length };
  });
  return { pages, findings: pages.reduce((n, page) => n + page.groups.length, 0) };
}

function renderDeliveryCheck(report) {
  return `<section id="delivery-check" aria-labelledby="delivery-title"><p class="check-eyebrow">HJÄLP INFÖR LEVERANS</p>
<h2 id="delivery-title">Kontrollera din hemsida</h2>
<p>${report.findings ? escape(report.findings) + ' kontrollpunkter att gå igenom på ' + report.pages.length + (report.pages.length === 1 ? ' sida.' : ' sidor.') : 'Inga automatiska anmärkningar hittades. De manuella kontrollerna nedan återstår.'}</p>
<p class="meta">Kontrollen gäller den här sparade versionen. Den godkänner inte publicering och kontaktar inga externa tjänster.</p>
<p>Rätta innehållet i utkastet och skapa sedan en ny granskningsversion. Den här kopian ändras inte.</p>
${report.pages.map(page => `<article class="check-page"><h3>${escape(page.title)}</h3>
${page.groups.length ? page.groups.map(group => `<details class="check-group"><summary>${escape(group.title)} <span>(${group.items.length})</span></summary><p>${escape(group.advice)}</p><ul>${group.items.map(item => `<li>${escape(item)}</li>`).join('')}</ul></details>`).join('') : '<p>Inga automatiska anmärkningar på den här sidan.</p>'}
<p class="meta">${page.externalLinks} externa länkar och ${page.connectedForms} formulär med mottagare. Funktionen och mottagningen är inte provade.</p>
<a href="site/${escape(page.file)}" target="_blank" rel="noopener">Öppna ${escape(page.title)} för granskning</a></article>`).join('')}
<div class="check-manual"><h3>Det här behöver du kontrollera själv</h3><ul>
<li>Läs namn, priser, öppettider och kontaktuppgifter. Kontrollera att du får använda bilderna och eventuella kundomdömen.</li>
<li>Titta på varje sida i mobil och dator. Prova menyer, filter och knappar.</li>
<li>Prova externa länkar. Bokningar, köp och formulär behöver ett riktigt test med rätt mottagare innan de erbjuds till kunder.</li>
</ul><p>Den lokala granskningen blockerar formulärsändning och anslutningar från sidans skript. Nedladdade eller publicerade sidor kan kontakta anslutna tjänster. Inga testmeddelanden skickas av kontrollen.</p>
<p>Automatiken hittar inte alla fel. En ifylld uppgift eller länk kan fortfarande vara felaktig.</p></div></section>`;
}
module.exports = { checkDelivery, renderDeliveryCheck };
