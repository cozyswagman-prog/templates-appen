const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { DOMParser } = require('linkedom');
const { renderProject, createRuntime } = require('../tools/render-project.cjs');
const { checkDelivery, renderDeliveryCheck } = require('../tools/delivery-check.cjs');
const { createVersion, verifyVersion } = require('../tools/publication-version.cjs');
const { createVersionZip } = require('../tools/version-zip.cjs');
const JSZip = require('jszip');
const project = () => ({ name: 'Granskningsprov', templateId: 'cafe', values: {} });
const check = p => checkDelivery(p, renderProject(p));
const group = (report, file, id) => report.pages.find(p => p.file === file).groups.find(g => g.id === id);

test('All nine templates get page-specific advice without mutating their input or rendered files', () => {
  for (const templateId of ['restaurang','salong','byggfirma','butik','portfolio','cafe','gym','konsult','hemservice']) {
    const input = { ...project(), templateId }, before = JSON.stringify(input), files = renderProject(input), bytes = [...files].map(([n,v]) => [n, Buffer.from(v)]);
    const result = checkDelivery(input, files);
    assert.equal(result.pages.length, templateId === 'cafe' ? 3 : 1);
    assert.ok(result.pages.every(p => p.groups.some(g => g.id === 'template-text')));
    assert.ok(result.pages.some(p => p.groups.some(g => g.id === 'images')));
    assert.ok(result.findings > 0); assert.equal(JSON.stringify(input), before);
    for (const [name,value] of bytes) assert.deepEqual(Buffer.from(files.get(name)), value);
    assert.doesNotMatch(JSON.stringify(result), /Kundens omdöme|Omdömets avsändare/);
  }
});

test('Edited and blank numbered fields are distinguished from unchanged template text on each page', () => {
  const p = project(); p.values = { 'index.html': { 3: 'Vår nya rubrik', 4: '  ' }, 'meny.html': { 1: 'Vårt café' } };
  const result = check(p);
  assert.ok(group(result, 'index.html', 'empty').items.some(i => i.startsWith('Ruta 4 –')));
  assert.ok(!group(result, 'index.html', 'template-text').items.some(i => /^Ruta [34] –/.test(i)));
  assert.ok(!group(result, 'meny.html', 'template-text').items.some(i => i.startsWith('Ruta 1 –')));
  assert.ok(group(result, 'kontakt.html', 'template-text').items.some(i => i.startsWith('Ruta 1 –')));
  const legacy = { ...project(), values: { 3: 'Vår nya rubrik', 4: '' } };
  assert.ok(group(check(legacy), 'index.html', 'empty').items.some(i => i.startsWith('Ruta 4 –')));
});

test('Named field and link overrides match renderer precedence; hidden sections are not findings', () => {
  const p = { templateId: 'salong', values: {}, site: { pages: { 'index.html': { hidden: { contact: true, inspiration: true, faq: true }, content: { 'review.quote': '' } } } } };
  const result = check(p);
  assert.equal(group(result, 'index.html', 'business'), undefined);
  assert.doesNotMatch(JSON.stringify(result), /Förebild|Efterbild|Kundens omdöme/);
  // Before/after images are included when their section is visible, even though one panel is folded.
  p.site.pages['index.html'].hidden.inspiration = false;
  const images = group(check(p), 'index.html', 'images').items;
  assert.ok(images.includes('Förebild')); assert.ok(images.includes('Efterbild'));
  const runtime = createRuntime(), page = runtime.SiteRenderer.pagesOf(runtime.TEMPLATES.find(t => t.id === 'salong'))[0];
  const doc = new DOMParser().parseFromString(page.html, 'text/html'), el = doc.querySelector('[data-content]');
  const label = el.getAttribute('data-caption');
  p.site.pages['index.html'].content[el.getAttribute('data-content')] = 'Ny egen text';
  assert.ok(!group(check(p), 'index.html', 'template-text').items.includes(label));
});

test('Valid contact and form configuration removes missing warnings but always calls for real testing', () => {
  const p = project(); p.site = { business: { name: 'Testcafé', phone: '+4631123456', email: 'prov@example.test', address: 'Provadress', booking: 'https://example.test/boka', formEndpoint: 'https://formspree.io/f/Test123' } };
  const result = check(p);
  assert.ok(result.pages.every(page => !page.groups.some(g => g.id === 'business' || g.id === 'forms')));
  assert.ok(result.pages.some(p => p.externalLinks > 0)); assert.ok(result.pages.some(p => p.connectedForms > 0));
  const html = renderDeliveryCheck(result); assert.match(html, /Funktionen och mottagningen är inte provade/);
  assert.match(html, /kontaktar inga externa tjänster/); assert.match(html, /godkänner inte publicering/);
  p.site.business.phone = 'fel'; p.site.business.email = 'fel'; p.site.business.formEndpoint = 'https://example.test/wrong';
  const invalid = check(p); assert.ok(group(invalid, 'index.html', 'business')); assert.ok(group(invalid, 'kontakt.html', 'forms'));
});

test('Report escapes customer link labels and checks missing local targets without following them', () => {
  const p = project(); p.site = { links: { booking: { text: '<img src=x onerror=alert(1)>', url: '' } } };
  const files = renderProject(p);
  files.set('index.html', String(files.get('index.html')).replace('</body>', '<a href="#missing">Saknad del</a><a href="saknas.html">Saknad sida</a></body>'));
  const result = checkDelivery(p, files);
  assert.deepEqual(group(result, 'index.html', 'local-links').items, ['Saknad del', 'Saknad sida']);
  const html = renderDeliveryCheck(result); assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/); assert.doesNotMatch(html, /<img|<script|<form/);
  const empty = renderDeliveryCheck({ findings: 0, pages: [{ file: 'index.html', title: 'Hem', groups: [], externalLinks: 0, connectedForms: 0 }] });
  assert.match(empty, /manuella kontrollerna nedan återstår/); assert.doesNotMatch(empty, /Godkänd|Klar att publicera/);
});

test('Created review includes immutable advice, while website bytes and ZIP remain free of the report', async () => {
  const destination = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'templates-delivery-test-')), 'version');
  const p = project(), original = renderProject(p);
  const { manifest } = await createVersion(p, destination);
  const preview = fs.readFileSync(path.join(destination, 'preview.html'), 'utf8');
  assert.match(preview, /id="delivery-check"/); assert.match(preview, /Ruta 3/);
  p.values = { 'index.html': { 3: 'Senare ändring' } };
  assert.equal(fs.readFileSync(path.join(destination, 'preview.html'), 'utf8'), preview);
  assert.equal(verifyVersion(destination).integrity, manifest.integrity);
  const zip = await JSZip.loadAsync((await createVersionZip(destination, manifest.integrity)).bytes);
  for (const [name,bytes] of original) assert.deepEqual(await zip.file(name).async('nodebuffer'), Buffer.from(bytes));
  assert.equal(zip.file('preview.html'), null);
});
