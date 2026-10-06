// Uses an existing Playwright installation (NODE_PATH is supported).
// Run against the local static server; all evidence is written outside the source tree.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { pathToFileURL } = require('node:url');
const { renderProject, writeNewDirectory } = require('../tools/render-project.cjs');
const { cases } = require('./fixtures/render-baseline.json');
const describe = require('./describe.cjs');
const canonical = require('./canonical.cjs');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'templates-foundation-browser-'));
const base = process.env.TEMPLATES_TEST_URL || 'http://127.0.0.1:8767/';
const checks = [], errors = [], expectedSecurityMessages = [];
function check(name, value) { checks.push({ name, status: value ? 'PASS' : 'FAIL' }); assert.ok(value, name); }
(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    let attacking = false;
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => { if (msg.type() === 'error') (attacking ? expectedSecurityMessages : errors).push(msg.text()); });
    await page.goto(base, { waitUntil: 'networkidle' });
    check('Correct app identity and nine rendered templates', await page.title() === 'Templates' && await page.locator('.template-card').count() === 9);
    check('All thumbnail frames forbid scripts', await page.locator('.thumb iframe').evaluateAll(es => es.every(e => e.getAttribute('sandbox') === 'allow-same-origin')));
    await page.locator('.template-card').first().getByRole('button', { name: 'Använd denna', exact: true }).click();
    await page.locator('.slot-field').first().waitFor();
    check('Preview forbids scripts, forms and popups', await page.locator('#preview-frame').getAttribute('sandbox') === 'allow-same-origin');
    const field = page.locator('.slot-field').filter({ has: page.getByText('Restaurangens namn', { exact: true }) }).locator('input');
    await field.fill('Mitt testföretag ÅÄÖ');
    await page.locator('#btn-preview').click();
    await page.locator('#btn-mobile').click();
    const frame = page.frameLocator('#preview-frame');
    check('Edited text reaches scriptless preview', await frame.locator('h1').textContent() === 'Mitt testföretag ÅÄÖ');
    await frame.getByRole('button', { name: 'Redigera ruta 3: Restaurangens namn', exact: true }).click();
    check('Badge focuses the associated field', await field.evaluate(el => el === document.activeElement));
    for (const width of [390, 412, 768, 1440]) {
      await page.setViewportSize({ width, height: width === 768 ? 1024 : 900 });
      check('Editor has no horizontal overflow at ' + width, await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
      if (width === 390 || width === 1440) await page.screenshot({ path: path.join(output, 'editor-' + width + '.png') });
    }

    // Inject after sanitization too, proving browser enforcement independently of sanitization.
    attacking = true;
    let escapedRequests = 0;
    await context.route('**/qa-preview-escape', route => { escapedRequests++; return route.abort(); });
    await page.evaluate(() => {
      window.__previewAttack = 0;
      localStorage.setItem('__previewCanary', 'unchanged');
      const doc = document.querySelector('#preview-frame').contentDocument;
      const code = "parent.__previewAttack++;parent.localStorage.setItem('__previewCanary','changed');fetch('/qa-preview-escape')";
      const script = doc.createElement('script'); script.textContent = code; doc.body.append(script);
      const button = doc.createElement('button'); button.id = 'attack-handler'; button.textContent = 'Attack probe'; button.setAttribute('onclick', code); doc.body.append(button);
      const nativeForm = doc.createElement('form'); nativeForm.method = 'POST'; nativeForm.action = '/qa-preview-escape'; doc.body.append(nativeForm);
      nativeForm.submit();
    });
    if (await page.locator('#btn-preview').innerText() === 'Förhandsvisa') await page.locator('#btn-preview').click();
    await frame.locator('#attack-handler').click();
    await page.waitForTimeout(150);
    check('Injected script and inline event cannot modify parent or storage', await page.evaluate(() => __previewAttack === 0 && localStorage.getItem('__previewCanary') === 'unchanged'));
    check('Native form and injected code cannot send requests', escapedRequests === 0);
    check('Browser reports enforced security restrictions', expectedSecurityMessages.some(m => /sandbox|Content Security Policy|script-src/i.test(m)));
    const sanitized = await page.evaluate(() => {
      const html = SiteRenderer.previewHtml('<html><head><base href="https://example.test/"><meta http-equiv="refresh" content="0;url=https://example.test/"></head><body onload="parent.bad=1"><script>parent.bad=1</script><iframe srcdoc="evil"></iframe><img onerror="parent.bad=1" src="data:image/png;base64,AA=="></body></html>');
      const d = new DOMParser().parseFromString(html, 'text/html');
      return { active: d.querySelectorAll('script,base,iframe,[onload],[onerror],meta[http-equiv=refresh]').length, policy: d.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content };
    });
    check('Preview strips executable and navigation markup before loading', sanitized.active === 0 && sanitized.policy.includes("script-src 'none'"));
    check('App had no ordinary runtime or console errors', errors.length === 0);
    await context.close();

    // Open actual files produced without a browser; compare Chrome's rendered DOM to the frozen baseline.
    const sites = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const site = await sites.newPage();
    const siteErrors = [];
    site.on('pageerror', e => siteErrors.push(e.message));
    for (const fixture of cases) {
      const folder = path.join(output, fixture.project.id);
      writeNewDirectory(renderProject(fixture.project), folder);
      for (const [file, expected] of Object.entries(fixture.expected)) {
        await site.goto(pathToFileURL(path.join(folder, file)).href);
        const snapshot = canonical(await site.evaluate(fn => (0, eval)('(' + fn + ')')(document), describe.toString()));
        const golden = canonical(expected);
        // Text includes legitimate runtime-generated status/calculator copy; structural data must match exactly.
        for (const key of ['title', 'links', 'images', 'sections', 'categories', 'styles']) assert.deepEqual(snapshot[key], golden[key], fixture.project.id + ' ' + file + ' ' + key);
        check('Server output renders correctly: ' + fixture.project.id + '/' + file, true);
        check('Server output images loaded: ' + fixture.project.id + '/' + file, await site.locator('img').evaluateAll(async es => (await Promise.all(es.map(async e => { e.loading = 'eager'; try { await e.decode(); return e.naturalWidth > 0; } catch { return false; } }))).every(Boolean)));
        if (fixture.project.id.endsWith('-edited')) check('Saved image focus is applied: ' + fixture.project.id + '/' + file, await site.locator('img').evaluateAll(es => es.every(e => getComputedStyle(e).objectPosition === '50% 0%')));
        if (fixture.project.id === 'fixture-restaurang-default') {
          await site.locator('[data-filter][data-value="dessert"]').click();
          check('Server-rendered filters work', await site.locator('[data-filter-item]:not([hidden])').count() > 0 && await site.locator('[data-filter-item][hidden]').count() > 0);
        }
        if (fixture.project.id === 'fixture-hemservice-edited') {
          await site.locator('[data-calc-service]').selectOption('home');
          await site.locator('[data-calc-area]').fill('100');
          check('Server-rendered price calculator uses saved rates', (await site.locator('[data-calc-output]').textContent()).includes('500 kr'));
        }
        if (fixture.project.id === 'fixture-konsult-default') {
          for (const width of [390, 412, 768, 1440]) {
            await site.setViewportSize({ width, height: 900 });
            check('Server output width ' + width, await site.evaluate(() => document.documentElement.scrollWidth === innerWidth));
            if (width === 390 || width === 1440) await site.screenshot({ path: path.join(output, 'server-konsult-' + width + '.png') });
          }
        }
      }
    }
    check('Server output runtime has no uncaught errors', siteErrors.length === 0);
    await sites.close();
  } finally {
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ checks, errors, expectedSecurityMessages }, null, 2));
    console.log(JSON.stringify({ evidence: output, pass: checks.filter(c => c.status === 'PASS').length, fail: checks.filter(c => c.status === 'FAIL') }));
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
