// Single-user loopback tool. Not a public API or hosting service.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { randomBytes, randomUUID } = require('node:crypto');
const { createVersion, verifyVersion } = require('./publication-version.cjs');
const { createVersionZip } = require('./version-zip.cjs');
const SOURCE = path.resolve(__dirname, '..'), MAX_BODY = 20 * 1024 * 1024;
const ID = /^[a-f0-9-]{36}$/;
const STATIC = /^(?:index\.html|manifest\.webmanifest|(?:js|templates|vendor)\/[a-z0-9-]+\.js|css\/app\.css|fonts\/(?:[a-z0-9-]+\.woff2|LICENS\.txt)|icons\/icon-(?:192|512)\.png)$/;
const mime = name => name.endsWith('.html') ? 'text/html; charset=utf-8' : name.endsWith('.js') ? 'text/javascript; charset=utf-8' : name.endsWith('.css') ? 'text/css; charset=utf-8' : name.endsWith('.woff2') ? 'font/woff2' : name.endsWith('.webp') ? 'image/webp' : name.endsWith('.png') ? 'image/png' : name.endsWith('.webmanifest') ? 'application/manifest+json' : 'text/plain; charset=utf-8';
function reply(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); }
function headers(res) { res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); }
function readBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    let total = 0, chunks = [], failed = false;
    req.on('data', chunk => {
      if (failed) return;
      total += chunk.length;
      if (total > limit) { failed = true; chunks = []; reject(Object.assign(new Error('Begäran är för stor.'), { status: 413 })); }
      else chunks.push(chunk);
    });
    req.on('end', () => { if (!failed) resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', reject); req.on('aborted', () => reject(new Error('Begäran avbröts.')));
  });
}
async function startLocalServer({ port = 8769, previewPort = 8770, root = path.join(os.homedir(), 'Templates-local-versions') } = {}) {
  root = path.resolve(root);
  fs.mkdirSync(root, { recursive: true });
  if (fs.lstatSync(root).isSymbolicLink()) throw new Error('Versionsmappen får inte vara en länk.');
  root = fs.realpathSync(root);
  const versions = new Map();
  for (const entry of fs.readdirSync(root)) {
    if (!ID.test(entry)) continue;
    try { const manifest = verifyVersion(path.join(root, entry)); versions.set(entry, manifest.integrity); } catch { /* Incomplete packages are never served. */ }
  }
  const token = randomBytes(32).toString('hex');
  let origin, previewOrigin, busy = false;
  const servePreview = http.createServer((req, res) => {
    headers(res);
    if (req.headers.host !== new URL(previewOrigin).host || req.method !== 'GET') return reply(res, 403, { error: 'Åtkomst nekad.' });
    const match = /^\/([a-f0-9-]{36})\/(preview\.html|site\/[a-zA-Z0-9/.-]+)$/.exec(req.url);
    if (!match || !versions.has(match[1])) return reply(res, 404, { error: 'Versionen hittades inte.' });
    try {
      const directory = path.join(root, match[1]), manifest = verifyVersion(directory, { expectedIntegrity: versions.get(match[1]) });
      if (!manifest.files.some(file => file.path === match[2])) return reply(res, 404, { error: 'Filen hittades inte.' });
      // A separate origin keeps standalone template scripts away from editor storage/API.
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; font-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'");
      res.setHeader('Content-Type', mime(match[2])); res.end(fs.readFileSync(path.join(directory, match[2])));
    } catch { reply(res, 409, { error: 'Versionens filer har ändrats eller saknas. Skapa en ny version.' }); }
  });
  const server = http.createServer(async (req, res) => {
    headers(res);
    if (req.headers.host !== new URL(origin).host) return reply(res, 403, { error: 'Åtkomst nekad.' });
    if (req.url.startsWith('/__local/')) {
      if ((req.headers.origin && req.headers.origin !== origin) ||
          (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin')) return reply(res, 403, { error: 'Åtkomst nekad.' });
      if (req.url === '/__local/session' && req.method === 'GET') return reply(res, 200, { token, previewOrigin });
      const download = /^\/__local\/versions\/([a-f0-9-]{36})\/download$/.exec(req.url);
      if (download && req.method === 'GET') {
        if (req.headers['x-templates-local'] !== token) return reply(res, 403, { error: 'Öppna nedladdningen från den lokala appen.' });
        if (busy) return reply(res, 409, { error: 'En versionsåtgärd pågår redan. Vänta och försök igen.' });
        const id = download[1];
        if (!versions.has(id)) return reply(res, 404, { error: 'Versionen finns inte längre tillgänglig. Uppdatera listan.' });
        busy = true;
        try {
          const archive = await createVersionZip(path.join(root, id), versions.get(id));
          if (res.destroyed) return;
          // Keep the single-job lock until delivery finishes or the connection closes.
          await new Promise(resolve => {
            res.once('finish', resolve); res.once('close', resolve);
            res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="' + archive.filename + '"', 'Content-Length': archive.bytes.length });
            res.end(archive.bytes);
          });
        } catch {
          if (!res.destroyed && !res.headersSent) reply(res, 409, { error: 'ZIP-filen kunde inte skapas. Versionens filer kan ha ändrats eller saknas. Uppdatera listan och skapa vid behov en ny granskningsversion.' });
        } finally { busy = false; }
        return;
      }
      const deletion = /^\/__local\/versions\/([a-f0-9-]{36})$/.exec(req.url);
      if (deletion && req.method === 'DELETE') {
        if (req.headers.origin !== origin || req.headers['x-templates-local'] !== token) return reply(res, 403, { error: 'Åtkomst nekad.' });
        if (req.headers['content-type'] !== 'application/json') return reply(res, 415, { error: 'Bekräftelsen måste skickas som JSON.' });
        if (Number(req.headers['content-length']) > 1024) return reply(res, 413, { error: 'Begäran är för stor.' });
        if (busy) return reply(res, 409, { error: 'En versionsåtgärd pågår redan. Vänta och försök igen.' });
        const id = deletion[1];
        if (!versions.has(id)) return reply(res, 404, { error: 'Versionen finns inte längre tillgänglig. Uppdatera listan.' });
        busy = true;
        try {
          const body = JSON.parse(await readBody(req, 1024));
          if (!body || body.confirm !== true || typeof body.versionId !== 'string' || Object.keys(body).some(key => !['confirm', 'versionId'].includes(key))) return reply(res, 400, { error: 'Bekräfta den valda versionen innan du tar bort den.' });
          const directory = path.resolve(root, id);
          // Validate the exact absolute target and its full manifest before the first unlink.
          if (path.dirname(directory) !== root || fs.lstatSync(root).isSymbolicLink() || fs.realpathSync(root) !== root) throw new Error('Invalid root');
          const manifest = verifyVersion(directory, { expectedIntegrity: versions.get(id) });
          if (manifest.versionId !== body.versionId) return reply(res, 409, { error: 'Versionen stämmer inte med bekräftelsen. Uppdatera listan.' });
          const directories = new Set();
          for (const item of manifest.files) {
            const target = path.resolve(directory, item.path);
            if (!target.startsWith(directory + path.sep)) throw new Error('Invalid file');
            let parent = path.dirname(target);
            while (parent !== directory) { directories.add(parent); parent = path.dirname(parent); }
          }
          if (req.aborted) throw new Error('Disconnected');
          // No recursive deletion: remove only the preverified files, then empty directories.
          for (const item of manifest.files) fs.unlinkSync(path.join(directory, item.path));
          for (const parent of [...directories].sort((a, b) => b.length - a.length)) fs.rmdirSync(parent);
          fs.unlinkSync(path.join(directory, 'manifest.json'));
          fs.rmdirSync(directory);
          versions.delete(id);
          return reply(res, 200, { deleted: true, versionId: body.versionId });
        } catch (error) {
          if (!res.destroyed) reply(res, error.status || 409, { error: 'Borttagningen kunde inte slutföras. Filer kan ha ändrats, saknas eller vara låsta. Uppdatera listan; en ofullständig kopia kan behöva kontrolleras manuellt.' });
        } finally { busy = false; }
        return;
      }
      if (req.url === '/__local/versions' && req.method === 'GET') {
        if (req.headers['x-templates-local'] !== token) return reply(res, 403, { error: 'Öppna listan från den lokala appen.' });
        if (busy) return reply(res, 409, { error: 'En versionsåtgärd pågår. Uppdatera listan när den är klar.' });
        try {
          const entries = fs.readdirSync(root).filter(name => ID.test(name)), items = [];
          for (const id of entries) {
            if (!versions.has(id)) continue;
            try {
              const manifest = verifyVersion(path.join(root, id), { expectedIntegrity: versions.get(id) });
              if (typeof manifest.createdAt !== 'string' || !Number.isFinite(Date.parse(manifest.createdAt))) continue;
              items.push({ versionId: manifest.versionId, name: manifest.projectName, templateId: manifest.templateId,
                createdAt: manifest.createdAt, published: false, previewUrl: previewOrigin + '/' + id + '/preview.html' });
            } catch { /* Damaged versions count toward capacity, but never get an opening link. */ }
          }
          items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.versionId.localeCompare(a.versionId));
          return reply(res, 200, { versions: items, used: entries.length, limit: 20, unavailable: entries.length - items.length });
        } catch { return reply(res, 503, { error: 'Versionsmappen kunde inte läsas. Kontrollera den lokala tjänsten och försök igen.' }); }
      }
      if (req.url !== '/__local/versions' || req.method !== 'POST') return reply(res, 404, { error: 'Okänd åtgärd.' });
      if (req.headers.origin !== origin || req.headers['x-templates-local'] !== token) return reply(res, 403, { error: 'Starta om granskningsflödet i den lokala appen.' });
      if (req.headers['content-type'] !== 'application/json') return reply(res, 415, { error: 'Projektet måste skickas som JSON.' });
      if (Number(req.headers['content-length']) > MAX_BODY) return reply(res, 413, { error: 'Projektet är större än 20 MB.' });
      if (busy) return reply(res, 409, { error: 'En version skapas redan. Vänta och försök igen.' });
      if (fs.readdirSync(root).filter(name => ID.test(name)).length >= 20) return reply(res, 409, { error: 'Gränsen på 20 lokala versioner är nådd. Inga tidigare versioner har ändrats.' });
      busy = true;
      try {
        const input = await readBody(req);
        if (req.aborted) throw new Error('Begäran avbröts.');
        const id = randomUUID(), result = await createVersion(input, path.join(root, id));
        versions.set(id, result.manifest.integrity);
        reply(res, 201, { previewUrl: previewOrigin + '/' + id + '/preview.html', versionId: result.manifest.versionId, published: false });
      } catch (error) {
        const message = error.code ? 'Versionen kunde inte sparas på datorn. Kontrollera utrymmet och försök igen.' : error.message;
        if (!res.destroyed) reply(res, error.status || 422, { error: message });
      } finally { busy = false; }
      return;
    }
    if (req.method !== 'GET') return reply(res, 405, { error: 'Metoden stöds inte.' });
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'; base-uri 'self'");
    const name = req.url === '/' ? 'index.html' : req.url.slice(1);
    if (!STATIC.test(name)) return reply(res, 404, { error: 'Filen hittades inte.' });
    try {
      const filename = path.join(SOURCE, name);
      if (fs.lstatSync(filename).isSymbolicLink()) throw new Error('linked');
      let bytes = fs.readFileSync(filename);
      if (name === 'index.html') bytes = bytes.toString('utf8').replace('</head>', '<script>window.__templatesLocal = true;</script></head>');
      res.setHeader('Content-Type', mime(name)); res.end(bytes);
    } catch { reply(res, 404, { error: 'Filen hittades inte.' }); }
  });
  server.requestTimeout = 45000; server.headersTimeout = 10000; server.timeout = 45000;
  servePreview.requestTimeout = 10000;
  const listen = (instance, value) => new Promise((resolve, reject) => {
    instance.once('error', reject); instance.listen(value, '127.0.0.1', () => { instance.removeListener('error', reject); resolve(); });
  });
  try {
    await listen(servePreview, previewPort); previewOrigin = 'http://127.0.0.1:' + servePreview.address().port;
    await listen(server, port); origin = 'http://127.0.0.1:' + server.address().port;
  } catch (error) { server.close(); servePreview.close(); throw error; }
  return { origin, previewOrigin, root, close: async () => {
    await Promise.all([server, servePreview].map(instance => new Promise(resolve => { instance.close(resolve); instance.closeAllConnections(); })));
  } };
}
if (require.main === module) startLocalServer().then(({ origin, root }) => {
  console.log('Templates lokalt: ' + origin + '\nVersioner sparas i: ' + root + '\nIngen sajt publiceras. Stoppa med Ctrl+C.');
}).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { startLocalServer };
