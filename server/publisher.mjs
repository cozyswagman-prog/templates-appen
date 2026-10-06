// Publicering av kundsajter: oföränderliga versioner + kontrollerad växling. Plattformsneutral kärna
// som körs både i Node (tester) och i Cloudflare Workers (R2 för filer, D1 för aktiv version).
//
//   bucket: put(key, bytes, { contentType, sha256 }), head(key) -> { size, sha256 } | null,
//           get(key) -> { bytes, size, sha256, contentType } | null
//   sites:  get(siteId), byHost(host) -> { siteId, host, active, revision } | null,
//           swap(siteId, expectedRevision, versionId) -> true | false  (atomisk jämför-och-byt)
//   render: (project) -> Map(filnamn -> Uint8Array | string)
//
// En version skrivs alltid under ett eget, nytt prefix och blir synlig först när pekaren växlas.
// Ett avbrutet jobb lämnar därför föregående sajt orörd, och två jobb kan aldrig blanda sina filer.

const FILE = /^(?:[a-z0-9-]+\.html|images\/bild-\d+\.(?:png|jpg|webp|gif)|fonts\/(?:[a-z0-9-]+\.woff2|LICENS\.txt))$/;
const MIME = { html: 'text/html; charset=utf-8', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', woff2: 'font/woff2', txt: 'text/plain; charset=utf-8', json: 'application/json' };
const TEMPLATES = ['restaurang', 'salong', 'byggfirma', 'butik', 'portfolio', 'cafe', 'gym', 'konsult', 'hemservice'];
const IMAGE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;
const MAX_PROJECT = 20 * 1024 * 1024, MAX_FILES = 200;
// Kundsidorna har inbäddat skript och inbäddad stil från mallarna; inget annat får laddas utifrån.
export const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self'; connect-src https://formspree.io; form-action https://formspree.io; frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY'
};
const encoder = new TextEncoder();
const fail = (code, message) => Object.assign(new Error(message), { code });
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
export const sha256 = async bytes => hex(await crypto.subtle.digest('SHA-256', bytes));
const mimeOf = name => MIME[name.split('.').pop()] || 'application/octet-stream';
const prefixOf = (siteId, versionId) => 'sites/' + siteId + '/v/' + versionId + '/';
const SITE_ID = /^[a-z0-9][a-z0-9-]{2,62}$/, VERSION_ID = /^[0-9a-f-]{36}$/;

// Samma grundregler som tools/render-project.cjs: känd mall, sidor med numrerade textfält,
// bilder bara som inbäddade PNG/JPEG/WebP/GIF. Webbläsaren får aldrig skicka in färdig HTML.
export function validateProject(project) {
  const text = JSON.stringify(project ?? null);
  if (encoder.encode(text).length > MAX_PROJECT) throw fail('invalid', 'Projektet är större än 20 MB.');
  if (!project || typeof project !== 'object' || !TEMPLATES.includes(project.templateId)) throw fail('invalid', 'Okänd mall.');
  if (typeof project.name !== 'string' || !project.name.trim() || project.name.length > 200) throw fail('invalid', 'Projektet saknar giltigt namn.');
  if (!project.values || typeof project.values !== 'object' || Array.isArray(project.values)) throw fail('invalid', 'Projektet saknar innehåll.');
  for (const [page, values] of Object.entries(project.values)) {
    if (!/^[a-z0-9-]+\.html$/.test(page) || !values || typeof values !== 'object' || Array.isArray(values)) throw fail('invalid', 'Ogiltig sida i projektet.');
    for (const [key, value] of Object.entries(values)) {
      if (!/^[1-9]\d*$/.test(key) || typeof value !== 'string') throw fail('invalid', 'Numrerade fält måste innehålla text.');
      if (value.startsWith('data:') && !IMAGE.test(value)) throw fail('invalid', 'Bildfältet har en otillåten bild.');
      if (value.startsWith('templates-image:')) throw fail('invalid', 'Projektets bilder måste hämtas innan publicering.');
    }
  }
  return project;
}

export function createPublisher({ bucket, sites, render, newId = () => crypto.randomUUID(), now = () => new Date().toISOString() }) {
  async function verify(prefix, files) {
    for (const f of files) {
      const head = await bucket.head(prefix + f.name);
      if (!head || head.size !== f.bytes || head.sha256 !== f.sha256) throw fail('incomplete', 'Versionen blev inte komplett: ' + f.name);
    }
  }
  async function readManifest(siteId, versionId) {
    if (!VERSION_ID.test(versionId || '')) return null;
    const object = await bucket.get(prefixOf(siteId, versionId) + 'manifest.json');
    if (!object) return null;
    const manifest = JSON.parse(new TextDecoder().decode(object.bytes));
    return manifest.siteId === siteId && manifest.versionId === versionId ? manifest : null;
  }
  return {
    // 1) rendera från validerat projekt, 2) skriv alla filer under nytt prefix, 3) kontrollera varje fil,
    // 4) skriv manifest, 5) växla pekaren med jämför-och-byt. Fel före steg 5 ändrar inte sajten.
    async publish(siteId, project, { expectedRevision } = {}) {
      const site = await sites.get(siteId);
      if (!site) throw fail('unknown-site', 'Sajten finns inte.');
      if (expectedRevision !== undefined && expectedRevision !== site.revision) throw fail('conflict', 'Sajten har publicerats i en annan flik. Ladda om och försök igen.');
      const output = render(validateProject(project));
      const names = [...output.keys()];
      if (!names.includes('index.html') || names.length > MAX_FILES || names.some(n => !FILE.test(n))) throw fail('invalid', 'Renderingen gav otillåtna filer.');
      const versionId = newId(), prefix = prefixOf(siteId, versionId), files = [];
      for (const name of names.sort()) {
        const data = output.get(name), bytes = typeof data === 'string' ? encoder.encode(data) : new Uint8Array(data);
        const hash = await sha256(bytes);
        await bucket.put(prefix + name, bytes, { contentType: mimeOf(name), sha256: hash });
        files.push({ name, bytes: bytes.length, sha256: hash });
      }
      await verify(prefix, files);
      const manifestBytes = encoder.encode(JSON.stringify({ format: 'templates-site-version-v1', siteId, versionId, created: now(), basedOnRevision: site.revision, files }));
      await bucket.put(prefix + 'manifest.json', manifestBytes, { contentType: MIME.json, sha256: await sha256(manifestBytes) });
      if (!await sites.swap(siteId, site.revision, versionId)) throw fail('conflict', 'En annan publicering hann före. Din version är sparad men inte aktiv; ladda om och försök igen.');
      return { versionId, previous: site.active, revision: site.revision + 1, files: files.length };
    },
    // Återställ till en tidigare, fortfarande komplett version.
    async rollback(siteId, versionId, { expectedRevision } = {}) {
      const site = await sites.get(siteId);
      if (!site) throw fail('unknown-site', 'Sajten finns inte.');
      const manifest = await readManifest(siteId, versionId);
      if (!manifest) throw fail('unknown-version', 'Versionen finns inte.');
      await verify(prefixOf(siteId, versionId), manifest.files);
      const revision = expectedRevision ?? site.revision;
      if (!await sites.swap(siteId, revision, versionId)) throw fail('conflict', 'Sajten ändrades under återställningen. Ladda om och försök igen.');
      return { versionId, previous: site.active, revision: revision + 1 };
    },
    // Besökare: värdnamn -> aktiv version -> fil. Versionen tas aldrig från adressen, så utkast och
    // inaktiva versioner kan inte nås. Bara filnamn som exporten själv skapar serveras.
    async serve(host, pathname, { ifNoneMatch } = {}) {
      const site = await sites.byHost(String(host || '').toLowerCase().split(':')[0]);
      const respond = (status, body, headers = {}) => ({ status, body, headers: { ...SECURITY_HEADERS, ...headers } });
      if (!site || !site.active) return respond(404, 'Sidan finns inte.', { 'Content-Type': MIME.txt, 'Cache-Control': 'no-store' });
      let name;
      try { name = decodeURIComponent(pathname || '/').replace(/^\/+/, ''); } catch { name = '\0'; }
      if (name === '') name = 'index.html';
      if (!FILE.test(name)) return respond(404, 'Sidan finns inte.', { 'Content-Type': MIME.txt, 'Cache-Control': 'no-store' });
      const object = await bucket.get(prefixOf(site.siteId, site.active) + name);
      if (!object) return respond(404, 'Sidan finns inte.', { 'Content-Type': MIME.txt, 'Cache-Control': 'no-store' });
      const etag = '"' + object.sha256 + '"';
      const common = { ETag: etag, 'Cache-Control': 'public, max-age=0, must-revalidate', 'X-Templates-Version': site.active };
      if (ifNoneMatch && ifNoneMatch.split(',').map(s => s.trim()).includes(etag)) return respond(304, null, common);
      return respond(200, object.bytes, { ...common, 'Content-Type': mimeOf(name) });
    },
    readManifest
  };
}

// Minneslagring med samma beteende som R2/D1-adaptrarna; används i tester och lokala prov.
export function memoryStores() {
  const objects = new Map(), siteRows = new Map();
  const bucket = {
    async put(key, bytes, { contentType, sha256: hash }) { objects.set(key, { bytes: new Uint8Array(bytes), size: bytes.length, sha256: hash, contentType }); },
    async head(key) { const o = objects.get(key); return o ? { size: o.size, sha256: o.sha256 } : null; },
    async get(key) { const o = objects.get(key); return o ? { ...o } : null; },
    keys: () => [...objects.keys()]
  };
  const sites = {
    async get(siteId) { const s = siteRows.get(siteId); return s ? { ...s } : null; },
    async byHost(host) { for (const s of siteRows.values()) if (s.host === host) return { ...s }; return null; },
    async swap(siteId, expectedRevision, versionId) {
      const s = siteRows.get(siteId);
      if (!s || s.revision !== expectedRevision) return false;
      s.active = versionId; s.revision++; return true;
    },
    create(siteId, host) { if (!SITE_ID.test(siteId)) throw fail('invalid', 'Ogiltigt sajt-id.'); siteRows.set(siteId, { siteId, host, active: null, revision: 0 }); }
  };
  return { bucket, sites };
}
