// Local, append-only publication packages. No upload, account or hosting operations.
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { decodeProject, writeNewDirectory } = require('./render-project.cjs');
const { preparePublication } = require('./prepare-publication.cjs');
const { checkDelivery, renderDeliveryCheck } = require('./delivery-check.cjs');
const MAX_FILE = 20 * 1024 * 1024, MAX_TOTAL = 64 * 1024 * 1024;
const HASH = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const FILE = /^(?:preview\.html|site\/(?:[a-z0-9-]+\.html|images\/bild-\d+\.webp|fonts\/(?:[a-z0-9-]+\.woff2|LICENS\.txt)))$/;
const hash = data => createHash('sha256').update(data).digest('hex');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function preview({ projectName, versionId, createdAt }, files, review) {
  const pages = [...files.keys()].filter(name => name.endsWith('.html'));
  const date = new Intl.DateTimeFormat('sv-SE', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Stockholm' }).format(new Date(createdAt));
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; frame-src 'self' file:; base-uri 'none'; form-action 'none'">
<title>Granska version – ${escape(projectName)}</title><style>
:root{color-scheme:light dark;font-family:system-ui,sans-serif;background:#f5f4ef;color:#183b32}*{box-sizing:border-box}body{margin:0}main{max-width:1120px;margin:auto;padding:24px}header,section{background:#fff;border:1px solid #c7d2cc;border-radius:16px;padding:24px;margin-bottom:20px}h1{font-size:clamp(1.6rem,4vw,2.5rem);line-height:1.15;margin:16px 0;overflow-wrap:anywhere}h2{font-size:1.25rem}p,li{line-height:1.6}code{overflow-wrap:anywhere;font-size:.85rem}.status{display:inline-block;background:#f8e9bc;color:#674800;padding:6px 12px;border-radius:30px;font-weight:700}summary{min-height:48px;display:flex;align-items:center;cursor:pointer;font-weight:600}nav{display:flex;flex-wrap:wrap;gap:12px}a{display:inline-flex;align-items:center;min-height:48px;padding:12px 16px;border-radius:8px;background:#185843;color:#fff;font-weight:600;text-underline-offset:3px}a:focus-visible,summary:focus-visible{outline:3px solid #b05d0b;outline-offset:4px}iframe{width:100%;height:680px;border:1px solid #9eafa5;border-radius:8px;background:#fff}.meta{color:#496157}ul{padding-left:22px}@media(max-width:480px){main{padding:12px}header,section{padding:18px}nav a{width:100%}iframe{height:600px}}@media(prefers-color-scheme:dark){:root{background:#14231e;color:#e9f2ed}header,section{background:#1c3028;border-color:#526c5f}.meta{color:#bdcec3}a{background:#b5ddc7;color:#183b32}a:focus-visible,summary:focus-visible{outline-color:#f2ca7c}}
.check-eyebrow{font-size:.75rem;font-weight:700;letter-spacing:.1em}.check-page{padding:20px 0;border-top:1px solid #9eafa5}.check-page h3{margin:0 0 12px}.check-group{border-bottom:1px solid #9eafa5}.check-group summary{gap:8px;justify-content:space-between;line-height:1.5;padding:10px 0}.check-group summary::before{content:'+';flex-shrink:0}.check-group[open] summary::before{content:'−'}.check-group summary span{margin-left:auto;flex-shrink:0}.check-group li{margin-bottom:8px;overflow-wrap:anywhere}.check-page>a{margin-top:12px}.check-manual{margin-top:20px;padding-top:8px;border-top:1px solid #9eafa5}h2,h3,summary{overflow-wrap:anywhere}
</style></head><body><main><header><span class="status">Inte publicerad</span>
<h1>${escape(projectName)}</h1><p>En sparad version av din hemsida. Ändringar i utkastet påverkar inte den här kopian.</p>
<p class="meta">Skapad ${escape(date)} (svensk tid)</p>
<nav aria-label="Öppna sidor">${pages.map(name => `<a href="site/${name}" target="_blank" rel="noopener">Öppna ${name === 'index.html' ? 'startsidan' : escape(name.replace('.html', ''))}</a>`).join('')}</nav></header>
${renderDeliveryCheck(review)}
<section><h2>Din sparade startsida</h2><p>Här ser du sidans utseende. Öppna sidorna ovan för att prova knappar och funktioner.</p>
<iframe title="Förhandsvisning av den sparade startsidan" src="site/index.html" sandbox="allow-same-origin" referrerpolicy="no-referrer"></iframe></section>
<section><h2>Om den sparade kopian</h2>
<p>Förhandsvisningen ovan har skript och formulär avstängda. Den lokala granskningstjänsten blockerar även formulärsändning på de separata sidorna. Nedladdade eller publicerade sidor kan kontakta anslutna tjänster.</p>
<p>Paketet är skapat lokalt och är inte uppladdat. Utkastet ingår inte.</p>
<details><summary>Tekniska uppgifter för leverans</summary><p>Versions-ID: <code>${escape(versionId)}</code>. Sidor, bilder och typsnitt finns i mappen <code>site</code>. Filkontrollen kördes när paketet skapades och behöver köras igen före leverans.</p></details></section></main></body></html>`;
}

function regularFile(filename, max) {
  const stat = fs.lstatSync(filename);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > max) throw new Error('Ogiltig, länkad eller för stor paketfil.');
  return fs.readFileSync(filename);
}

function verifyVersion(directory, { expectedIntegrity } = {}) {
  const root = path.resolve(directory), stat = fs.lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Paketmappen måste vara en vanlig mapp.');
  const manifest = JSON.parse(regularFile(path.join(root, 'manifest.json'), 131072).toString('utf8'));
  const { integrity, ...body } = manifest;
  if (manifest.schema !== 'templates-publication-v1' || !UUID.test(manifest.versionId) ||
      !HASH.test(integrity) || hash(JSON.stringify(body)) !== integrity ||
      (expectedIntegrity !== undefined && expectedIntegrity !== integrity)) throw new Error('Versionspaketets kontrollsumma stämmer inte.');
  if (manifest.published !== false || manifest.entrypoint !== 'site/index.html' ||
      typeof manifest.projectName !== 'string' || manifest.projectName.length > 200 ||
      !Array.isArray(manifest.files) || manifest.files.length < 2 || manifest.files.length > 256) throw new Error('Ogiltigt versionsmanifest.');
  const expected = new Map(), directories = new Set(['site']);
  let total = 0;
  for (const item of manifest.files) {
    if (!item || typeof item.path !== 'string' || !FILE.test(item.path) || expected.has(item.path) ||
        !Number.isInteger(item.bytes) || item.bytes < 0 || item.bytes > MAX_FILE || !HASH.test(item.sha256)) throw new Error('Otillåten eller dubblerad fil i versionsmanifestet.');
    expected.set(item.path, item); total += item.bytes;
    if (item.path.startsWith('site/images/')) directories.add('site/images');
    if (item.path.startsWith('site/fonts/')) directories.add('site/fonts');
  }
  if (total > MAX_TOTAL || !expected.has('site/index.html') || !expected.has('preview.html')) throw new Error('Versionspaketet saknar startsida eller översikt, eller är för stort.');
  const found = new Set();
  function visit(relative = '') {
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const name = relative ? relative + '/' + entry.name : entry.name;
      if (entry.isSymbolicLink()) throw new Error('Länkade filer eller mappar tillåts inte i versionspaketet.');
      if (entry.isDirectory()) {
        if (!directories.has(name)) throw new Error('Oväntad mapp i versionspaketet.');
        visit(name); continue;
      }
      if (name === 'manifest.json') continue;
      const item = expected.get(name);
      if (!item) throw new Error('Oväntad fil i versionspaketet.');
      const bytes = regularFile(path.join(root, name), MAX_FILE);
      if (bytes.length !== item.bytes || hash(bytes) !== item.sha256) throw new Error('Ändrad eller skadad paketfil: ' + name);
      found.add(name);
    }
  }
  visit();
  if (found.size !== expected.size) throw new Error('En eller flera filer saknas i versionspaketet.');
  return manifest;
}

async function createVersion(input, destination) {
  const root = path.resolve(destination);
  // Reject existing files, directories and dangling links before expensive image work.
  try { fs.lstatSync(root); throw new Error('Målmappen finns redan; skapa versionen i en ny mapp.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const project = decodeProject(input);
  const projectName = project.name?.trim() || 'Min hemsida';
  if (projectName.length > 200) throw new Error('Projektnamnet får vara högst 200 tecken.');
  // Decode to a private snapshot before the first await; later draft edits cannot leak in.
  const { files, imageReport } = await preparePublication(project);
  const body = { schema: 'templates-publication-v1', versionId: randomUUID(), createdAt: new Date().toISOString(),
    projectName, templateId: project.templateId, published: false, entrypoint: 'site/index.html', imageReport };
  const review = checkDelivery(project, files);
  const content = new Map([['preview.html', preview(body, files, review)], ...[...files].map(([name, bytes]) => ['site/' + name, bytes])]);
  body.files = [...content].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([name, value]) => {
    const bytes = Buffer.from(value);
    if (!FILE.test(name) || bytes.length > MAX_FILE) throw new Error('Otillåten eller för stor versionsfil.');
    return { path: name, bytes: bytes.length, sha256: hash(bytes) };
  });
  if (body.files.length > 256 || body.files.reduce((n, f) => n + f.bytes, 0) > MAX_TOTAL) throw new Error('Versionspaketet är för stort.');
  const manifest = { ...body, integrity: hash(JSON.stringify(body)) };
  // Exclusive directory reservation prevents two creators from overwriting each other.
  // A crash can leave an incomplete directory. Only a fully verified manifest is usable.
  fs.mkdirSync(root);
  writeNewDirectory(files, path.join(root, 'site'));
  fs.writeFileSync(path.join(root, 'preview.html'), content.get('preview.html'), { flag: 'wx' });
  fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  verifyVersion(root, { expectedIntegrity: manifest.integrity });
  return { directory: root, manifest };
}

if (require.main === module) {
  (async () => {
    const [command, first, second] = process.argv.slice(2);
    if (command === 'check' && first && !second) {
      const manifest = verifyVersion(first);
      console.log(JSON.stringify({ status: 'LOCAL_VERSION_VERIFIED', versionId: manifest.versionId, integrity: manifest.integrity, files: manifest.files.length, published: false }));
    } else if (command === 'create' && first && second && process.argv.length === 5) {
      const input = regularFile(first, MAX_FILE).toString('utf8');
      const { directory, manifest } = await createVersion(input, second);
      console.log(JSON.stringify({ status: 'LOCAL_VERSION_CREATED', directory, versionId: manifest.versionId, integrity: manifest.integrity, files: manifest.files.length, published: false }));
    } else throw new Error('Använd: npm run version:create -- PROJEKTFIL NY_PAKETMAPP eller npm run version:check -- PAKETMAPP');
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { createVersion, verifyVersion };

