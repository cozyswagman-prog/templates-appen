// Strukturell tillgänglighet i alla exporterade mallsidor: landmärken, länk förbi menyn, listor och rubriker.
// Den fulla axe-granskningen (WCAG 2.2 AA, fyra bredder) körs separat i testmiljo/tillganglighet-20261006.
const test = require('node:test');
const assert = require('node:assert/strict');
const { DOMParser } = require('linkedom');
const { renderProject } = require('../tools/render-project.cjs');

const IDS = ['restaurang', 'salong', 'byggfirma', 'butik', 'portfolio', 'cafe', 'gym', 'konsult', 'hemservice'];

test('Every exported page has one main landmark, a working skip link, real list items and no empty visible headings', () => {
  for (const templateId of IDS) for (const business of [{}, { name: 'Exempel AB', address: 'Linnégatan 23, 413 04 Göteborg' }]) {
    const files = renderProject({ id: 'a11y', templateId, name: 'Exempel', values: {}, site: { business } });
    for (const [file, html] of files) {
      if (!file.endsWith('.html')) continue;
      const where = templateId + '/' + file + (business.name ? ' (ifylld)' : '');
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const mains = doc.querySelectorAll('main');
      assert.equal(mains.length, 1, where + ': exactly one <main>');
      assert.equal(mains[0].id, 'innehall', where);
      const skip = doc.body.firstElementChild;
      assert.equal(skip.getAttribute('href'), '#innehall', where + ': skip link comes first');
      assert.equal(skip.textContent, 'Hoppa till innehållet', where);
      assert.ok(!mains[0].closest('footer') && !doc.querySelector('main footer'), where + ': footer stays outside main');
      for (const list of doc.querySelectorAll('ul, ol')) {
        const loose = [...list.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        assert.ok(!loose, where + ': list text is wrapped in <li>');
      }
      for (const heading of doc.querySelectorAll('h1, h2, h3, h4')) {
        if (heading.closest('[hidden]')) continue;
        assert.ok(heading.textContent.trim(), where + ': visible headings are not empty');
      }
    }
  }
});
