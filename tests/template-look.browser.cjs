// "Titta på mallen" är bara visning: inget projektnamn, ingen Spara-knapp, inget sparbesked och inget sparat projekt.
// "Använd mallen" byter till vanlig redigering. Kör mot lokal filserver som de andra webbläsarproven (NODE_PATH stöds).
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'templates-template-look-browser-'));
const base = process.env.TEMPLATES_TEST_URL || 'http://127.0.0.1:8767/';
const checks = [], errors = [];
function check(name, value) { checks.push({ name, status: value ? 'PASS' : 'FAIL' }); assert.ok(value, name); }
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
      await page.goto(base, { waitUntil: 'networkidle' });
      const card = page.locator('.template-card').filter({ has: page.getByText('Byggfirma & Hantverk', { exact: true }) });
      await card.getByRole('button', { name: 'Titta på mallen', exact: true }).click();
      await page.locator('#view-editor:not([hidden])').waitFor();
      const name = page.locator('#project-name');
      check(width + ': mallens namn visas, inte ett projektnamn', await name.inputValue() === 'Byggfirma & Hantverk' && await name.getAttribute('readonly') !== null);
      check(width + ': Spara, Mer och sparbesked syns inte', !(await page.locator('#btn-save').isVisible()) && !(await page.locator('.editor-more').isVisible()) && !(await page.locator('#save-status').isVisible()) && !(await page.locator('#autosave-note').isVisible()));
      check(width + ': knappen heter Använd mallen', await page.locator('#btn-preview').textContent() === 'Använd mallen');
      check(width + ': mallen visas', await page.frameLocator('#preview-frame').locator('h1').first().isVisible());
      check(width + ': ingen vågrät rullning', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(output, 'titta-' + width + '.png') });
      await page.click('#btn-back');
      await page.locator('#view-gallery:not([hidden])').waitFor();
      check(width + ': att bara titta skapar inget sparat projekt', await page.locator('#no-projects').isVisible());
      await card.getByRole('button', { name: 'Titta på mallen', exact: true }).click();
      await page.locator('#view-editor:not([hidden])').waitFor();
      await page.click('#btn-preview');
      check(width + ': Använd mallen ger vanlig redigering med projektnamn och Spara', await name.inputValue() === 'Byggfirma & Hantverk – min sida' && await name.getAttribute('readonly') === null && await page.locator('#btn-save').isVisible() && await page.locator('#btn-preview').textContent() === 'Förhandsvisa');
      check(width + ': redigeringsrutorna syns', await page.locator('.slot-field').first().isVisible());
      await page.screenshot({ path: path.join(output, 'anvand-' + width + '.png') });
      await page.click('#btn-back');
      await page.locator('#view-gallery:not([hidden])').waitFor();
      await page.locator('.template-card').first().getByRole('button', { name: 'Använd denna', exact: true }).click();
      await page.locator('.slot-field').first().waitFor();
      check(width + ': Använd denna efter tittläget visar vanlig redigering', await page.locator('#btn-save').isVisible() && await name.getAttribute('readonly') === null && await name.inputValue() === 'Restaurang – min sida' && await page.locator('#btn-preview').textContent() === 'Förhandsvisa');
      await context.close();
    }
    check('Inga skriptfel', errors.length === 0);
  } finally {
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ checks, errors }, null, 2));
    console.log(JSON.stringify({ evidence: output, pass: checks.filter(c => c.status === 'PASS').length, fail: checks.filter(c => c.status === 'FAIL') }));
    await browser.close();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
