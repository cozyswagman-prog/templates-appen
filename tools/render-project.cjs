// Local Node proof, not an HTTP endpoint or hosting integration.
// The VM loads only our fixed repository sources. It is NOT a sandbox for customer code.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { DOMParser, Event } = require('linkedom');
const ROOT = path.resolve(__dirname, '..');
const IDS = ['restaurang', 'salong', 'byggfirma', 'butik', 'portfolio', 'cafe', 'gym', 'konsult', 'hemservice'];
const MAX_BYTES = 20 * 1024 * 1024;

function decodeProject(input) {
  const serialized = typeof input === 'string' ? input : JSON.stringify(input);
  if (!serialized || Buffer.byteLength(serialized) > MAX_BYTES) throw new Error('Projektfilen är tom eller större än 20 MB.');
  const data = JSON.parse(serialized);
  function inspect(value, depth = 0) {
    if (depth > 20) throw new Error('Projektfilen är för djupt nästlad.');
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) throw new Error('Projektfält får inte vara listor.');
    for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Otillåten projektnyckel.');
      inspect(child, depth + 1);
    }
  }
  inspect(data);
  const wrapped = data && Object.hasOwn(data, 'app');
  if (wrapped && (data.app !== 'templates' || data.version !== 1)) throw new Error('Projektfilens formatversion stöds inte.');
  const project = wrapped ? data.project : data;
  if (!project || !IDS.includes(project.templateId) || !project.values || typeof project.values !== 'object') throw new Error('Ogiltigt projekt eller okänd mall.');
  if (project.name != null && typeof project.name !== 'string') throw new Error('Projektnamnet måste vara text.');
  if (project.site != null && typeof project.site !== 'object') throw new Error('Företagsinställningar måste vara ett objekt.');
  return project;
}

function createRuntime() {
  const scope = { DOMParser, Event, URL, TextEncoder, atob };
  scope.window = scope;
  vm.createContext(scope, { codeGeneration: { strings: false, wasm: false } });
  for (const filename of ['templates/exempelbilder.js', 'templates/index.js', ...IDS.map(id => 'templates/' + id + '.js'), 'js/render.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, filename), 'utf8'), scope, { filename, timeout: 5000 });
  }
  return scope;
}

function renderProject(input) {
  const project = decodeProject(input);
  const runtime = createRuntime();
  const normalized = runtime.SiteRenderer.normalize(project);
  const pages = runtime.SiteRenderer.pagesOf(runtime.TEMPLATES.find(t => t.id === project.templateId));
  const allowed = new Set(pages.map(p => p.file));
  for (const filename of Object.keys(normalized.values)) {
    if (!allowed.has(filename)) throw new Error('Projektet innehåller en okänd sida: ' + filename);
    if (!normalized.values[filename] || typeof normalized.values[filename] !== 'object') throw new Error('Sidans fält måste vara ett objekt.');
    for (const [key, value] of Object.entries(normalized.values[filename])) {
      if (!/^[1-9]\d*$/.test(key) || typeof value !== 'string') throw new Error('Numrerade fält måste innehålla text.');
    }
  }
  for (const page of pages) {
    const doc = new DOMParser().parseFromString(page.html, 'text/html');
    const slots = doc.querySelectorAll('[data-slot]');
    if (Object.keys(normalized.values[page.file] || {}).some(key => Number(key) > slots.length)) throw new Error('Projektet innehåller ett okänt fältnummer.');
    slots.forEach((el, i) => {
      const value = normalized.values[page.file]?.[i + 1];
      if (value == null || el.getAttribute('data-slot') !== 'image') return;
      if (/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml)[;,]/.test(value)) return;
      try { const url = new URL(value); if (url.protocol === 'https:' && !url.username && !url.password) return; } catch {}
      throw new Error('Bildfältet har en otillåten adress.');
    });
  }
  const result = runtime.SiteRenderer.render(normalized);
  const files = new Map([...result.files].map(([name, data]) => [name, typeof data === 'string' ? data : Buffer.from(data)]));
  for (const font of result.fontFiles) files.set('fonts/' + font, fs.readFileSync(path.join(ROOT, 'fonts', font)));
  if (result.fontFiles.size) files.set('fonts/LICENS.txt', fs.readFileSync(path.join(ROOT, 'fonts/LICENS.txt')));
  return files;
}

function writeNewDirectory(files, destination) {
  const root = path.resolve(destination);
  if (fs.existsSync(root)) throw new Error('Målmappen finns redan; inga befintliga filer skrivs över.');
  // Check the complete manifest before creating anything.
  for (const name of files.keys()) {
    if (!/^(?:[a-z0-9-]+\.html|images\/bild-\d+\.(?:png|jpg|webp|gif)|fonts\/(?:[a-z0-9-]+\.woff2|LICENS\.txt))$/.test(name)) throw new Error('Otillåten exportfil.');
  }
  fs.mkdirSync(root, { recursive: true });
  for (const [name, bytes] of files) {
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes, { flag: 'wx' });
  }
}

if (require.main === module) {
  try {
    const [source, destination] = process.argv.slice(2);
    if (!source || !destination || process.argv.length !== 4) throw new Error('Använd: npm run render -- projekt.projekt.json NY_UTMAPP');
    if (fs.statSync(source).size > MAX_BYTES) throw new Error('Projektfilen är större än 20 MB.');
    const files = renderProject(fs.readFileSync(source, 'utf8'));
    writeNewDirectory(files, destination);
    console.log('Lokalt renderade ' + files.size + ' filer. Ingen sajt har publicerats.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { renderProject, decodeProject, writeNewDirectory, createRuntime };
