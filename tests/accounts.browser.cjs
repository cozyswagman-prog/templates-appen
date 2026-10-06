// Browser/SDK contract tests with an intercepted, synthetic provider.
// No accounts/emails/network writes to Supabase. Actual SQL isolation is tested separately.
const { chromium } = require('playwright');
const JSZip = require('jszip');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const base = process.env.TEMPLATES_TEST_URL || 'http://127.0.0.1:8767/';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'templates-accounts-browser-'));
const checks = [], errors = [], requests = [];
const users = {
  'anna@example.test': { id: '11111111-1111-4111-8111-111111111111', email: 'anna@example.test', aud: 'authenticated', role: 'authenticated' },
  'bo@example.test': { id: '22222222-2222-4222-8222-222222222222', email: 'bo@example.test', aud: 'authenticated', role: 'authenticated' }
};
const rows = new Map();
const imageFiles = new Map(), reservations = new Set();
const imageGenerations = new Map();
const expiresAt = Math.floor(Date.now()/1000) + 3600;
let failure = false, delay = null, uploadFailure = false, downloadFailure = false, quotaFull = false;
const token = user => [ { alg: 'HS256', typ: 'JWT' }, { sub: user.id, exp: expiresAt, role: 'authenticated' } ].map(x => Buffer.from(JSON.stringify(x)).toString('base64url')).join('.') + '.synthetic-test-only';
const session = user => ({ access_token: token(user), refresh_token: 'synthetic-' + user.id, token_type: 'bearer', expires_in: 3600, user });
function check(name, value) { checks.push({ name, status: value ? 'PASS' : 'FAIL' }); assert.ok(value, name); }
async function provider(route) {
  const req = route.request(), url = new URL(req.url());
  const body = req.headers()['content-type']?.includes('application/json') ? req.postDataJSON() : null;
  requests.push({ path: url.pathname, method: req.method() });
  const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
  const current = Object.values(users).find(user => req.headers().authorization === 'Bearer ' + token(user));
  if (url.pathname === '/auth/v1/signup') return reply({ ...users['anna@example.test'], identities: [] });
  if (url.pathname === '/auth/v1/recover') return reply({});
  if (url.pathname === '/auth/v1/token') {
    const user = url.searchParams.get('grant_type') === 'pkce' ? users['anna@example.test'] : users[body.email];
    return user && (body.password === 'Test-password-123!' || body.auth_code) ? reply(session(user)) : reply({ msg: 'Invalid login credentials' }, 400);
  }
  if (url.pathname === '/auth/v1/logout') return reply({});
  if (url.pathname === '/auth/v1/user') return reply(current || users['anna@example.test']);
  if (!current) return reply({ code: '42501' }, 401);
  if (failure) return reply({ message: 'Synthetic outage' }, 503);
  if (url.pathname.endsWith('/rpc/reserve_project_image')) {
    if (body.p_owner !== current.id) return reply({ code: '42501' }, 403);
    if (quotaFull) return reply({ code: 'PT413' },413);
    const generation = imageGenerations.get(current.id + '/' + body.p_name) || 'a'.repeat(32);
    const name = body.p_name.replace('.', '-' + generation + '.');
    const object = current.id + '/' + name;
    reservations.add(object); return reply({ name, uploaded: imageFiles.has(object) });
  }
  if (url.pathname.startsWith('/storage/v1/object/')) {
    const object = decodeURIComponent(url.pathname.replace(/^\/storage\/v1\/object\/(?:authenticated\/)?project-images\//, ''));
    if (!object.startsWith(current.id + '/') || !reservations.has(object)) return reply({ message: 'Forbidden' },403);
    if (req.method() === 'POST') {
      if (uploadFailure) return reply({ message: 'Synthetic upload outage' },503);
      if (imageFiles.has(object)) return reply({ statusCode: '409', message: 'Already exists' },409);
      imageFiles.set(object, { body: req.postDataBuffer(), contentType: req.headers()['content-type'] });
      return reply({ Key: 'project-images/' + object });
    }
    if (req.method() === 'GET' && imageFiles.has(object) && !downloadFailure) return route.fulfill({ status:200, ...imageFiles.get(object) });
    return reply({ message: 'Missing image' },404);
  }
  if (url.pathname.endsWith('/rpc/save_project')) {
    if (delay) await delay;
    const key = current.id + ':' + body.p_id, previous = rows.get(key);
    if (body.p_owner !== current.id) return reply({ code: '42501' }, 403);
    if ((previous ? previous.revision : 0) !== body.p_revision) return reply({ code: 'PT409' }, 409);
    const row = { id: body.p_id, content: body.p_content, revision: body.p_revision + 1, updated_at: new Date().toISOString() };
    rows.set(key, row); return reply([row]);
  }
  if (url.pathname.endsWith('/rpc/delete_project')) {
    const key = current.id + ':' + body.p_id;
    if (body.p_owner !== current.id || rows.get(key)?.revision !== body.p_revision) return reply({ code: 'PT409' }, 409);
    rows.delete(key); return reply(null);
  }
  if (url.pathname === '/rest/v1/projects') {
    const id = url.searchParams.get('id');
    if (id) { const row = rows.get(current.id + ':' + id.slice(3)); return reply(row ? [row] : []); }
    return reply([...rows.entries()].filter(([key]) => key.startsWith(current.id + ':')).map(([, row]) => ({ id: row.id, revision: row.revision, updated_at: row.updated_at, name: row.content.name, template_id: row.content.templateId })));
  }
  throw new Error('Unexpected provider endpoint ' + url);
}
async function login(page, email) {
  await page.getByRole('button', { name: 'Logga in', exact: true }).click();
  await page.locator('#account-email').fill(email);
  await page.locator('#account-password').fill('Test-password-123!');
  await page.locator('#account-submit').click();
  await page.getByText('Inloggad som ' + email, { exact: true }).waitFor();
}
async function save(page, text = 'Sparat på ditt konto') {
  await page.locator('#btn-save').click();
  await page.waitForFunction(expected => document.querySelector('#save-status').textContent === expected, text);
}
(async () => {
  const browser = await chromium.launch();
  try {
    const defaultContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const local = await defaultContext.newPage();
    await local.goto(base, { waitUntil: 'networkidle' });
    check('Unconfigured app honestly shows local storage and hides authentication', (await local.locator('#account-status').innerText()).includes('inte ansluten') && !(await local.locator('#account-controls').isVisible()));
    await local.screenshot({ path: path.join(output, 'local-390.png') });
    await defaultContext.close();
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true });
    await context.route('**/js/cloud-config.js', route => route.fulfill({ contentType: 'text/javascript', body: "window.TEMPLATES_CLOUD={url:'https://templates-auth.test',publishableKey:'sb_publishable_SYNTHETIC_TEST_ONLY'}" }));
    await context.route('https://templates-auth.test/**', provider);
    context.on('page', page => { page.on('pageerror', error => errors.push(error.message)); page.on('dialog', dialog => dialog.accept()); });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator('.template-card').filter({ hasText: 'Café & Bageri' }).getByRole('button', { name: 'Använd denna' }).click();
    await page.locator('#project-name').fill('Lokalt Café ÅÄÖ');
    await page.locator('.slot-field input[type=file]').first().setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8z8AAAAASUVORK5CYII=', 'base64') });
    await save(page, 'Sparat på den här enheten');
    await page.locator('#btn-back').click();
    await page.getByRole('button', { name: 'Skapa konto', exact: true }).click();
    await page.locator('#account-email').fill('anna@example.test');
    await page.locator('#account-password').fill('Test-password-123!');
    await page.locator('#account-submit').click();
    await page.getByText(/Om adressen kan användas/).waitFor();
    check('Signup confirmation does not pretend to be a signed-in account', !(await page.locator('#account-signed-in').isVisible()));
    await page.getByRole('button', { name: 'Glömt lösenord?' }).click();
    await page.locator('#account-submit').click();
    await page.getByText(/Om adressen kan användas/).waitFor();
    check('Reset request uses provider recovery endpoint', requests.some(r => r.path === '/auth/v1/recover'));
    await page.locator('#account-cancel').click();
    await login(page, 'anna@example.test');
    await page.locator('#no-projects').waitFor();
    check('Login shows an empty account, does not silently upload local projects', rows.size === 0);
    await page.locator('#account-local').click();
    await page.getByRole('button', { name: 'Kopiera till mitt konto' }).click();
    await page.getByRole('button', { name: 'Kopierat till kontot' }).waitFor();
    check('Account JSON stores private image references separately from binary bytes', JSON.stringify([...rows.values()]).includes('templates-image:v1:') && !JSON.stringify([...rows.values()]).includes('data:image/') && imageFiles.size === 1);
    check('Explicit copy retains original local project', await page.evaluate(() => window.Storage.list().length === 1));
    await page.locator('#account-cloud').click();
    await page.getByRole('button', { name: 'Öppna', exact: true }).click();
    await page.locator('#project-name').fill('Café på kontot');
    await page.getByRole('button', { name: 'Meny', exact: true }).click();
    await page.getByText('Rubrik för menysidan', { exact: true }).waitFor();
    await page.locator('.slot-field input:not([type=file])').first().fill('Meny i molnprojekt');
    await save(page);
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Öppna', exact: true }).click();
    await page.locator('#project-name').waitFor({ state: 'visible' });
    check('Reload restores account project name', await page.locator('#project-name').inputValue() === 'Café på kontot');
    await page.locator('.slot-field').first().waitFor();
    check('Image survives account copy/save/reload', await page.frameLocator('#preview-frame').locator('img').first().evaluate(img => img.src.startsWith('data:image/png')));
    await page.getByRole('button', { name: 'Meny', exact: true }).click();
    await page.getByText('Rubrik för menysidan', { exact: true }).waitFor();
    check('Multi-page text survives cloud round trip', await page.locator('.slot-field input:not([type=file])').first().inputValue() === 'Meny i molnprojekt');
    const second = await context.newPage();
    await second.goto(base, { waitUntil: 'networkidle' });
    await second.getByRole('button', { name: 'Öppna', exact: true }).click();
    await page.locator('#project-name').fill('Version från flik ett'); await save(page);
    await second.locator('#project-name').fill('Osparat från flik två');
    await second.locator('#btn-save').click();
    await second.getByText(/Projektet har ändrats i en annan flik/).first().waitFor();
    check('Stale tab retains unsaved text instead of overwriting newer server version', await second.locator('#project-name').inputValue() === 'Osparat från flik två' && [...rows.values()][0].content.name === 'Version från flik ett');
    await second.locator('.editor-more summary').click();
    const downloadPromise = second.waitForEvent('download');
    await second.locator('#btn-project-file').click();
    const download = await downloadPromise; const projectFile = path.join(output, 'conflict.projekt.json'); await download.saveAs(projectFile);
    check('Conflict recovery file contains newest unsaved work', JSON.parse(fs.readFileSync(projectFile)).project.name === 'Osparat från flik två');
    check('Downloaded project file embeds private images for offline use', JSON.stringify(JSON.parse(fs.readFileSync(projectFile)).project).includes('data:image/png;base64,') && !fs.readFileSync(projectFile,'utf8').includes('templates-image:v1:'));
    await second.locator('#btn-back').click(); await second.locator('#leave-discard').click();
    await second.getByRole('button', { name: 'Öppna', exact: true }).click();
    await second.locator('#project-name').waitFor({ state: 'visible' });
    failure = true;
    await second.locator('#project-name').fill('Spara efter avbrott'); await second.locator('#btn-save').click();
    await second.locator('#save-status').filter({ hasText: /Kunde inte nå ditt konto|Bilden kunde inte/ }).waitFor();
    check('Network failure never claims saved or writes cloud drafts to localStorage', await second.evaluate(() => window.Storage.list()[0].name === 'Lokalt Café ÅÄÖ'));
    failure = false; await save(second);
    let finish; delay = new Promise(resolve => { finish = resolve; });
    await second.locator('#project-name').fill('På väg att sparas');
    await second.locator('#btn-save').click();
    await second.locator('#project-name').fill('Ändrat under sparande');
    finish(); delay = null;
    await second.locator('#save-status').filter({ hasText: 'Osparade ändringar' }).waitFor();
    check('Editing during save is not incorrectly marked saved', await second.locator('#project-name').inputValue() === 'Ändrat under sparande');
    await second.waitForFunction(() => document.getElementById('save-status').textContent === 'Sparat på ditt konto');
    check('A trailing autosave includes edits made during a pending request', [...rows.values()][0].content.name === 'Ändrat under sparande');
    await second.locator('#project-name').fill('Behåll vid utloggning');
    await page.locator('#btn-back').click();
    await page.locator('#account-signout').click();
    await second.locator('#session-dialog').waitFor();
    check('Cross-tab logout stops editing and clears private editor DOM', await second.locator('#slot-fields').innerText() === '' && !(await second.locator('#view-editor').isVisible()));
    check('Logout clears private tab recovery before another account can use it', await second.evaluate(id => sessionStorage.getItem('templates.recovery.v1:cloud:' + id) === null, users['anna@example.test'].id));
    const backupPromise = second.waitForEvent('download'); await second.locator('#session-backup').click();
    const backup = await backupPromise; await backup.saveAs(path.join(output, 'session.projekt.json'));
    check('Session change provides an explicit backup for unsaved work', JSON.parse(fs.readFileSync(path.join(output, 'session.projekt.json'))).project.name === 'Behåll vid utloggning');
    await second.locator('#session-leave').click();
    await second.close();
    await login(page, 'bo@example.test');
    await page.locator('#no-projects').waitFor();
    check('Second account does not display first account projects', await page.locator('.project-row').count() === 0);
    for (const width of [390, 412, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      check('Account controls fit at ' + width, await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
      check('Account touch targets meet 44px at ' + width, await page.locator('#account-signed-in button').evaluateAll(buttons => buttons.every(b => b.getBoundingClientRect().height >= 44 && b.getBoundingClientRect().width >= 44)));
      await page.screenshot({ path: path.join(output, 'account-' + width + '.png') });
    }
    await page.screenshot({ path: path.join(output, 'account-1440.png') });
    await page.locator('#account-signout').click();
    await page.getByRole('button', { name: 'Skapa konto', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.screenshot({ path: path.join(output, 'signup-dark-390.png') });
    check('Authentication form fits mobile dark mode', await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
    await page.locator('#account-cancel').click();
    // Synthetic PKCE callback exercises the official SDK's recovery event without email.
    await page.evaluate(() => localStorage.setItem('sb-templates-auth-auth-token-code-verifier', JSON.stringify('synthetic-verifier/recovery')));
    await page.goto(base + '?code=synthetic-recovery', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Spara nytt lösenord' }).waitFor();
    await page.locator('#account-password').fill('New-test-password-456!');
    await page.locator('#account-submit').click();
    await page.getByText('Ditt lösenord har uppdaterats.', { exact: true }).waitFor();
    check('PKCE recovery callback leads to password update via SDK', requests.some(r => r.path === '/auth/v1/user' && r.method === 'PUT'));
    await page.locator('#import-file').setInputFiles(projectFile);
    await page.waitForFunction(() => document.querySelectorAll('.project-row').length === 2);
    check('Cloud import creates a fresh copy without reusing the exported revision', [...rows.values()].filter(row => row.content.name === 'Osparat från flik två' && row.revision === 1).length === 1);
    const importedRow = page.locator('.project-row').filter({ hasText: 'Osparat från flik två' });
    await importedRow.getByRole('button', { name: 'Ta bort', exact: true }).click();
    await importedRow.getByRole('button', { name: 'Säker? Ta bort', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.project-row').length === 1);
    check('Cloud deletion requires confirmation and removes only chosen copy', [...rows.values()].every(row => row.content.name !== 'Osparat från flik två'));
    const previousCloud = [...rows.values()][0].content.name;
    await page.getByRole('button', { name: 'Öppna', exact: true }).click();
    await page.locator('#project-name').waitFor({ state: 'visible' });
    failure = true;
    await page.locator('#project-name').fill('Osparat molnarbete efter avbrott');
    await page.locator('#save-status').filter({ hasText: /Kunde inte nå ditt konto|Bilden kunde inte/ }).waitFor();
    const failedCalls = requests.filter(r => r.path.includes('/rpc/')).length;
    // Observe longer than the debounce to prove errors do not cause a retry loop.
    await page.waitForTimeout(1800);
    check('Failed autosave pauses instead of repeatedly writing to the server', requests.filter(r => r.path.includes('/rpc/')).length === failedCalls);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#recovery-panel').waitFor();
    check('Cloud recovery is available only within the current authenticated account', (await page.locator('#recovery-description').innerText()).includes('Osparat molnarbete'));
    failure = false;
    await page.locator('#recovery-open').click();
    await page.waitForFunction(() => document.getElementById('save-status').textContent === 'Sparat på ditt konto');
    check('Cloud recovery autosaves a new copy without overwriting the previous server version', [...rows.values()].some(r => r.content.name === previousCloud) && [...rows.values()].some(r => r.content.name === 'Osparat molnarbete efter avbrott – återställd'));
    const imageInput = page.locator('.slot-field input[type=file]').first();
    const previousImage = await page.frameLocator('#preview-frame').locator('img').first().getAttribute('src');
    await imageInput.setInputFiles({ name:'unsafe.svg', mimeType:'image/svg+xml', buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>') });
    await page.getByText('Välj en PNG-, JPEG-, WebP- eller GIF-bild.',{exact:true}).waitFor();
    check('Unsupported image leaves preview and save controls intact', await page.frameLocator('#preview-frame').locator('img').first().getAttribute('src') === previousImage && await page.locator('#btn-save').isEnabled());
    await imageInput.setInputFiles({ name:'fake.png', mimeType:'image/png', buffer:Buffer.from('this is not a PNG') });
    await page.getByText('Bildens innehåll stämmer inte med filtypen. Välj en annan bild.',{exact:true}).waitFor();
    check('Fake MIME type is rejected before replacing the image', await page.frameLocator('#preview-frame').locator('img').first().getAttribute('src') === previousImage);
    const changeImage = async color => {
      const data = await page.evaluate(color => { const c=document.createElement('canvas');c.width=c.height=4;const g=c.getContext('2d');g.fillStyle=color;g.fillRect(0,0,4,4);return c.toDataURL('image/png'); },color);
      await imageInput.setInputFiles({ name:'replacement.png',mimeType:'image/png',buffer:Buffer.from(data.split(',')[1],'base64') });
      await page.waitForFunction(() => !document.getElementById('btn-save').disabled);
      return data;
    };
    const beforeUploadFailure = JSON.stringify([...rows]); uploadFailure = true;
    const newImage = await changeImage('#aa8800'); await page.locator('#btn-save').click();
    await page.locator('#save-status').filter({hasText:'Bilden kunde inte'}).waitFor();
    check('Failed binary upload does not commit project or lose the new preview', JSON.stringify([...rows]) === beforeUploadFailure && await page.frameLocator('#preview-frame').locator('img').first().getAttribute('src') === newImage);
    await page.screenshot({ path:path.join(output,'image-error-dark-390.png') });
    uploadFailure = false; await save(page);
    check('Manual retry saves image after upload outage', JSON.stringify([...rows]) !== beforeUploadFailure);
    quotaFull = true; await changeImage('#2255aa'); await page.locator('#btn-save').click();
    await page.locator('#save-status').filter({hasText:'100 bildplatser'}).waitFor();
    check('Quota failure provides an actionable message and retains editable work', await page.locator('#btn-save').isEnabled() && await page.locator('#view-editor').isVisible());
    quotaFull = false; await save(page);
    const recoveredName = await page.locator('#project-name').inputValue();
    await page.locator('#btn-back').click(); downloadFailure = true;
    const recoveredRow = page.locator('.project-row').filter({hasText:recoveredName});
    await recoveredRow.getByRole('button',{name:'Öppna',exact:true}).click();
    await page.getByText(/Bilden kunde inte hämtas eller sparas/).waitFor();
    check('Missing private image keeps gallery open instead of exposing a partial editable project', await page.locator('#view-gallery').isVisible());
    downloadFailure = false;
    await recoveredRow.getByRole('button',{name:'Öppna',exact:true}).click();
    await page.locator('#project-name').waitFor({state:'visible'});
    if (!await page.locator('#btn-export').isVisible()) await page.locator('.editor-more summary').click();
    await page.locator('#btn-export').click();
    const zipPromise = page.waitForEvent('download'); await page.locator('#confirm-export').click();
    const zipDownload = await zipPromise, zipPath = path.join(output,'private-images.zip'); await zipDownload.saveAs(zipPath);
    const zip = await JSZip.loadAsync(fs.readFileSync(zipPath));
    const html = await zip.file('index.html').async('string');
    check('ZIP from restored cloud project embeds local image files without private references', Object.keys(zip.files).some(name=>/^images\/.+\.png$/.test(name)) && !html.includes('templates-image:') && !html.includes('templates-auth.test'));
    // Model a completed cleanup of the replaced (gold) image, never a referenced image.
    const oldPath = [...imageFiles].find(([,file])=>file.body.equals(Buffer.from(newImage.split(',')[1],'base64')))[0];
    const oldName = oldPath.split('/')[1];
    check('Replaced image has no remaining saved project references', !JSON.stringify([...rows.values()]).includes(oldName));
    imageFiles.delete(oldPath); reservations.delete(oldPath);
    const contentKey = oldName.replace(/-[a-f0-9]{32}(?=\.)/,'');
    imageGenerations.set(users['anna@example.test'].id + '/' + contentKey, 'b'.repeat(32));
    await changeImage('#aa8800'); await save(page);
    const newPath = users['anna@example.test'].id + '/' + contentKey.replace('.', '-' + 'b'.repeat(32) + '.');
    check('Same open tab reuploads a cleaned-up image under its new server generation', !imageFiles.has(oldPath) && imageFiles.has(newPath) && JSON.stringify([...rows.values()]).includes(newPath.split('/')[1]));
    await page.reload({waitUntil:'networkidle'});
    await page.locator('.project-row').filter({hasText:recoveredName}).getByRole('button',{name:'Öppna',exact:true}).click();
    await page.locator('#project-name').waitFor({state:'visible'});
    check('New generation restores identical pixels after reload', await page.frameLocator('#preview-frame').locator('img').first().getAttribute('src') === newImage);
    await page.screenshot({path:path.join(output,'image-generation-restored-390.png')});
    check('No browser runtime exceptions', errors.length === 0);
    await context.close();
  } finally {
    if (errors.length || !checks.some(c => c.name === 'No browser runtime exceptions')) {
      for (const context of browser.contexts()) for (const [i, page] of context.pages().entries()) {
        await page.screenshot({ path: path.join(output, 'failure-' + i + '.png') }).catch(() => {});
        fs.writeFileSync(path.join(output, 'failure-' + i + '.txt'), await page.locator('body').innerText().catch(() => 'closed'));
      }
    }
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ checks, errors, requests, provider: 'Synthetic intercepted API; not hosted Supabase proof' }, null, 2));
    console.log(JSON.stringify({ evidence: output, pass: checks.filter(c => c.status === 'PASS').length, fail: checks.filter(c => c.status === 'FAIL') }));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
