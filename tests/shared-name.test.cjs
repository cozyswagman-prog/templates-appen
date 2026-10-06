const { test } = require('node:test'), assert = require('node:assert/strict');
const { DOMParser } = require('linkedom');
const { createRuntime, renderProject } = require('../tools/render-project.cjs');

const runtime = createRuntime();
const pages = runtime.SiteRenderer.pagesOf(runtime.TEMPLATES.find(t => t.id === 'cafe'));
const slot = (file, label) => {
  const els = [...new DOMParser().parseFromString(pages.find(p => p.file === file).html, 'text/html').querySelectorAll('[data-slot]')];
  return els.findIndex(el => el.getAttribute('data-label') === label) + 1;
};
const NAV = slot('index.html', 'Caféets namn i menyraden'), HERO = slot('index.html', 'Caféets namn');
const FOOT = { 'index.html': slot('index.html', 'Sidfotstext'), 'meny.html': slot('meny.html', 'Sidfotstext (menysidan)'), 'kontakt.html': slot('kontakt.html', 'Sidfotstext (kontaktsidan)') };
const project = () => ({ name: 'Namnprov', templateId: 'cafe', values: {} });
const sync = (p, name) => runtime.SiteKit.syncShared(p, pages, 'business-name', name);
const footer = (files, file) => /<footer><span>([^<]*)<\/span><\/footer>/.exec(files.get(file))[1];

test('Shared name reaches every footer and the hero name; existing numbering is unchanged', () => {
  assert.ok(NAV > 0 && HERO > NAV && Object.values(FOOT).every(n => n > 0));
  const p = project(), changed = sync(p, 'QA Café Göteborg');
  assert.equal(changed, 4);
  for (const file of Object.keys(FOOT)) assert.equal(p.values[file][NAV], 'QA Café Göteborg');
  assert.equal(p.values['index.html'][HERO], 'QA Café Göteborg');
  assert.equal(p.values['index.html'][FOOT['index.html']], '© 2026 QA Café Göteborg · Följ oss gärna @cafelinnea');
  assert.equal(p.values['meny.html'][FOOT['meny.html']], '© 2026 QA Café Göteborg');
  const files = renderProject(p);
  for (const file of Object.keys(FOOT)) {
    assert.match(footer(files, file), /^© 2026 QA Café Göteborg/);
    assert.doesNotMatch(files.get(file), /data-contains-shared|Café Linnéa</);
  }
});

test('Own text is kept, a later rename replaces the earlier name and special characters are literal', () => {
  const p = project();
  p.values['index.html'] = { [HERO]: 'QA Café – Hem ÅÄÖ', [FOOT['index.html']]: 'Egen sidfot utan namn' };
  assert.equal(sync(p, 'Café (A) & Co.'), 2);
  assert.equal(p.values['index.html'][HERO], 'QA Café – Hem ÅÄÖ');
  assert.equal(p.values['index.html'][FOOT['index.html']], 'Egen sidfot utan namn');
  assert.equal(p.values['kontakt.html'][FOOT['kontakt.html']], '© 2026 Café (A) & Co.');
  assert.equal(sync(p, 'Café B'), 2);
  assert.equal(p.values['meny.html'][FOOT['meny.html']], '© 2026 Café B');
  assert.equal(p.values['kontakt.html'][FOOT['kontakt.html']], '© 2026 Café B');
});

test('An empty or unchanged name only sets the shared fields, as before', () => {
  const p = project();
  assert.equal(sync(p, '   '), 0);
  assert.equal(p.values['meny.html'][NAV], '   ');
  assert.equal(p.values['meny.html'][FOOT['meny.html']], undefined);
  const q = project();
  assert.equal(sync(q, 'Café Linnéa'), 0);
  assert.equal(q.values['index.html'][HERO], undefined);
});

test('Export review warns when a renamed project still shows the template name, and not otherwise', () => {
  const review = p => [...runtime.SiteKit.review(p, pages)].filter(w => /mallens namn/.test(w));
  assert.equal(review(project()).length, 0);
  // The 2026-10-05 account test: name set on all pages, footers never edited.
  const stale = project();
  for (const file of Object.keys(FOOT)) stale.values[file] = { [NAV]: 'QA Café Göteborg' };
  stale.values['index.html'][HERO] = 'QA Café – Hem ÅÄÖ';
  const warnings = review(stale);
  assert.equal(warnings.length, 3);
  assert.ok(warnings.every(w => /Sidfotstext/.test(w) && /”Café Linnéa”/.test(w)));
  assert.match(runtime.SiteKit.review(stale, pages)[0], /mallens namn/, 'a wrong business name is listed before routine advice');
  sync(stale, 'QA Café Göteborg');
  assert.equal(review(stale).length, 0);
});
