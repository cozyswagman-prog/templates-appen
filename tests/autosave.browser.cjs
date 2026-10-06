const { chromium } = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const base = process.env.TEMPLATES_TEST_URL || 'http://127.0.0.1:8767/';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'templates-autosave-browser-'));
const checks = [], errors = [], consoleErrors = [];
function check(name, value) { checks.push({ name, status: value ? 'PASS' : 'FAIL' }); assert.ok(value, name); }
async function saved(page) { await page.waitForFunction(() => document.getElementById('save-status').textContent === 'Sparat på den här enheten'); }
async function open(page, name) {
  await page.locator('.project-row').filter({ has: page.locator('.p-name', { hasText: name }) }).getByRole('button', { name: 'Öppna', exact: true }).click();
  await page.locator('#project-name').waitFor({ state: 'visible' });
}
(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true });
    context.on('page', page => { page.on('pageerror', error => errors.push(error.message)); page.on('dialog', dialog => dialog.accept()); page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); }); });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    check('Correct app with nine templates', await page.title() === 'Templates' && await page.locator('.template-card').count() === 9);
    await page.locator('.template-card').filter({ hasText: 'Café & Bageri' }).getByRole('button', { name: 'Använd denna' }).click();
    await page.locator('#project-name').fill('Automatiskt Café');
    await page.getByRole('button', { name: 'Meny', exact: true }).click();
    const menu = page.locator('.slot-field').filter({ has: page.getByText('Rubrik för menysidan', { exact: true }) }).locator('input');
    await menu.fill('Meny som sparas själv'); await saved(page);
    check('Typing saves automatically without clicking Spara', await page.evaluate(() => window.Storage.list()[0].name === 'Automatiskt Café' && window.Storage.list()[0].localRevision >= 1));
    check('Clean save clears recovery', await page.evaluate(() => sessionStorage.getItem('templates.recovery.v1:local') === null));
    await page.reload({ waitUntil: 'networkidle' }); await open(page, 'Automatiskt Café');
    await page.getByRole('button', { name: 'Meny', exact: true }).click();
    await menu.waitFor(); check('Autosaved page text survives reload', await menu.inputValue() === 'Meny som sparas själv');
    const original = await page.evaluate(() => window.Storage.list()[0].id);
    // Fill and reload in the same task, before the debounce can save.
    await Promise.all([page.waitForEvent('load'), page.evaluate(() => {
      const field = document.getElementById('project-name'); field.value = 'Sista osparade texten'; field.dispatchEvent(new Event('input', { bubbles: true })); location.reload();
    })]);
    await page.locator('#recovery-panel').waitFor();
    check('Reload before autosave offers tab recovery', (await page.locator('#recovery-description').innerText()).includes('Sista osparade texten'));
    await page.getByRole('button', { name: 'Öppna', exact: true }).click();
    check('Opening the saved version cannot silently replace its pending recovery', await page.locator('#view-gallery').isVisible() && await page.locator('#recovery-panel').isVisible());
    for (const width of [390, 412, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      check('Recovery panel fits ' + width, await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
      check('Recovery actions have 44px targets at ' + width, await page.locator('#recovery-panel button').evaluateAll(buttons => buttons.every(b => b.getBoundingClientRect().height >= 44)));
      if (width === 390 || width === 1440) await page.screenshot({ path: path.join(output, 'recovery-' + width + '.png') });
    }
    await page.locator('#recovery-open').click(); await saved(page);
    check('Recovery creates a new autosaved project and preserves the original', await page.evaluate(id => {
      const all = window.Storage.list(); return all.length === 2 && all.find(p => p.id === id).name === 'Automatiskt Café' && all.some(p => p.id !== id && p.name === 'Sista osparade texten – återställd');
    }, original));
    await page.locator('#btn-back').click();
    const second = await context.newPage(); await second.goto(base, { waitUntil: 'networkidle' });
    await open(page, 'Automatiskt Café'); await open(second, 'Automatiskt Café');
    await page.locator('#project-name').fill('Nyare från första fliken'); await saved(page);
    await second.locator('#project-name').fill('Äldre flik med nya ord');
    await second.locator('#save-status').filter({ hasText: 'annan flik' }).waitFor();
    check('Two local tabs cannot silently overwrite each other', await second.evaluate(id => window.Storage.get(id).name, original) === 'Nyare från första fliken');
    check('Conflict pauses autosave and retains recovery', (await second.locator('#autosave-note').innerText()).includes('pausat') && await second.evaluate(() => window.createDraftRecovery(() => sessionStorage).read('local').project.name === 'Äldre flik med nya ord'));
    const conflictNote = await second.locator('#autosave-note').innerText();
    check('Conflict points to the project file and the latest version instead of Spara', conflictNote.includes('Spara som projektfil') && conflictNote.includes('öppna sedan projektet på nytt') && !conflictNote.includes('Tryck Spara'));
    await second.locator('#btn-back').click(); await second.locator('#leave-discard').click();
    check('Explicit discard removes pending recovery and stops saving', await second.evaluate(() => sessionStorage.getItem('templates.recovery.v1:local') === null));
    // Two independent projects also share the same localStorage array, so lock globally.
    await page.locator('#btn-back').click();
    await Promise.all([page, second].map((tab, i) => tab.evaluate(async index => {
      await window.Accounts.store.save({ id: 'parallel-' + index, name: 'Parallel ' + index, templateId: 'cafe', values: {} });
    }, i)));
    check('Concurrent writes to different projects retain both records', await page.evaluate(() => !!window.Storage.get('parallel-0') && !!window.Storage.get('parallel-1')));
    await second.close(); await context.close();

    const quotaContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await quotaContext.addInitScript(() => {
      window.__denyProjectWrites = true;
      const nativeSet = Object.getPrototypeOf(localStorage).setItem;
      Object.getPrototypeOf(localStorage).setItem = function (key, value) {
        if (window.__denyProjectWrites && this === localStorage && key === 'templates.projects.v1') throw new DOMException('Synthetic quota exceeded', 'QuotaExceededError');
        return nativeSet.call(this, key, value);
      };
    });
    const quota = await quotaContext.newPage();
    quota.on('pageerror', e => errors.push(e.message)); quota.on('dialog', dialog => dialog.accept());
    quota.on('console', msg => { if (msg.type() === 'error' && !msg.text().startsWith('Kunde inte spara projekt:')) consoleErrors.push(msg.text()); });
    await quota.goto(base, { waitUntil: 'networkidle' });
    await quota.locator('.template-card').first().getByRole('button', { name: 'Använd denna' }).click();
    await quota.locator('#project-name').fill('Arbete vid full lagring');
    await quota.locator('#save-status').filter({ hasText: 'Kunde inte spara på enheten' }).waitFor();
    check('Quota failure is not reported as a successful save', await quota.evaluate(() => window.Storage.list().length === 0));
    await quota.reload({ waitUntil: 'networkidle' }); await quota.locator('#recovery-panel').waitFor();
    await quota.emulateMedia({ colorScheme: 'dark' });
    await quota.screenshot({ path: path.join(output, 'recovery-dark-390.png') });
    await quota.locator('#recovery-open').click();
    await quota.locator('#save-status').filter({ hasText: 'Kunde inte spara på enheten' }).waitFor();
    check('Failed save is recoverable after reload even when there is no saved project', await quota.locator('#project-name').inputValue() === 'Arbete vid full lagring – återställd');
    await quota.evaluate(() => { window.__denyProjectWrites = false; });
    await quota.locator('#btn-save').click(); await saved(quota);
    check('Manual retry resumes normal saving after storage becomes available', !(await quota.locator('#autosave-note').innerText()).includes('pausat'));
    await quota.locator('#project-name').fill('Sparar automatiskt igen'); await saved(quota);
    check('Autosave continues after manual recovery', await quota.evaluate(() => window.Storage.list()[0].name === 'Sparar automatiskt igen'));
    await quotaContext.close();
    check('No unexpected console errors (injected quota failures excluded)', consoleErrors.length === 0);
    check('No browser runtime exceptions', errors.length === 0);
  } finally {
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ checks, errors, consoleErrors }, null, 2));
    console.log(JSON.stringify({ evidence: output, pass: checks.filter(c => c.status === 'PASS').length, fail: checks.filter(c => c.status === 'FAIL') }));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
