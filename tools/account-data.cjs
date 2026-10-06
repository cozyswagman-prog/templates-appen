// Offline operator tool. Reads a backup; never contacts services or deletes data.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const SOURCE = path.resolve(__dirname, '..');
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const IMAGE = /^[a-f0-9]{64}(?:-[a-f0-9]{32})?\.(png|jpeg|webp|gif)$/;
const PREFIX = 'templates-image:v1:';
const TABLES = ['users', 'projects', 'project_images', 'project_image_refs'];
const sha = b => createHash('sha256').update(b).digest('hex');
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const within = (root, target) => target === root || target.startsWith(root + path.sep);
const fail = message => { throw new Error(message); };

function noLinks(filename) {
  for (let p = path.resolve(filename); ; p = path.dirname(p)) {
    let stat;
    try { stat = fs.lstatSync(p); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (stat?.isSymbolicLink()) fail('Länkade sökvägar tillåts inte.');
    if (path.dirname(p) === p) break;
  }
}
function readRegular(filename) {
  noLinks(filename);
  const stat = fs.lstatSync(filename);
  if (!stat.isFile() || stat.size > 128 * 1024 * 1024) fail('Ogiltig eller för stor backupfil.');
  return fs.readFileSync(filename);
}
function allowedFile(rel) {
  if (TABLES.some(t => rel === 'db/' + t + '.json')) return true;
  const parts = typeof rel === 'string' ? rel.split('/') : [];
  return parts.length === 4 && parts[0] === 'storage' && parts[1] === 'project-images' && UUID.test(parts[2]) && IMAGE.test(parts[3]);
}
function walk(root, base = root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(e => {
    const full = path.join(root, e.name);
    if (e.isSymbolicLink()) fail('Länkade backupfiler tillåts inte.');
    return e.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}
function unique(rows, key) {
  const keys = rows.map(key);
  if (keys.length !== new Set(keys).size) fail('Dubbla identiteter i backupen.');
}

function loadBackup(directory) {
  const root = path.resolve(directory);
  const manifestBytes = readRegular(path.join(root, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.format !== 'templates-backup-v1' || !Array.isArray(manifest.files) || !Number.isFinite(Date.parse(manifest.created))) fail('Okänt backupformat eller datum.');
  const files = new Map();
  for (const f of manifest.files) {
    if (!f || !allowedFile(f.path) || files.has(f.path)) fail('Otillåten eller dubbel filsökväg i manifestet.');
    const bytes = readRegular(path.join(root, ...f.path.split('/')));
    if (bytes.length !== f.bytes || sha(bytes) !== f.sha256) fail('Backupens kontrollsumma stämmer inte.');
    if (f.path.startsWith('storage/') && sha(bytes) !== path.basename(f.path).slice(0, 64)) fail('Bildens innehållsnyckel stämmer inte.');
    files.set(f.path, bytes);
  }
  if (walk(root).some(f => f !== 'manifest.json' && !files.has(f))) fail('Oväntad fil i backupen.');
  const db = {};
  for (const table of TABLES) {
    if (!files.has('db/' + table + '.json')) fail('Backupen saknar en obligatorisk tabell.');
    db[table] = JSON.parse(files.get('db/' + table + '.json'));
    if (!Array.isArray(db[table]) || db[table].some(r => !r || typeof r !== 'object' || Array.isArray(r))) fail('Ogiltiga backuprader.');
  }
  unique(db.users, r => r.id);
  if (db.users.some(r => !UUID.test(r.id))) fail('Ogiltigt konto-id.');
  const owners = new Set(db.users.map(r => r.id));
  for (const table of TABLES.slice(1)) if (db[table].some(r => !owners.has(r.owner_id))) fail('Data saknar identifierad kontoägare.');
  unique(db.projects, r => JSON.stringify([r.owner_id, r.id]));
  unique(db.project_images, r => JSON.stringify([r.owner_id, r.name]));
  unique(db.project_image_refs, r => JSON.stringify([r.owner_id, r.project_id, r.image_name]));
  if (db.projects.some(r => typeof r.id !== 'string' || !r.id || !Number.isInteger(r.revision) || r.revision < 1 || !r.content || typeof r.content !== 'object' || Array.isArray(r.content))) fail('Ogiltigt projekt i backupen.');
  if (db.project_images.some(r => !IMAGE.test(r.name))) fail('Ogiltigt bildnamn.');
  for (const f of files.keys()) if (f.startsWith('storage/') && !owners.has(f.split('/')[2])) fail('Bildfil saknar identifierad kontoägare.');
  for (const ref of db.project_image_refs) {
    if (!db.projects.some(p => p.owner_id === ref.owner_id && p.id === ref.project_id) ||
        !db.project_images.some(i => i.owner_id === ref.owner_id && i.name === ref.image_name) ||
        !files.has('storage/project-images/' + ref.owner_id + '/' + ref.image_name)) fail('Ofullständig bildreferens i backupen.');
  }
  // Bytes are retained in memory: later reads cannot mix two backup generations.
  return { root, manifest, fingerprint: sha(manifestBytes), files, db };
}

function selectAccount(backup, ownerId) {
  if (!UUID.test(ownerId)) fail('Ange ett exakt konto-id, inte e-post eller sökmönster.');
  const user = backup.db.users.find(u => u.id === ownerId);
  if (!user) fail('Kontot finns inte i backupen.');
  const pick = (row, fields) => Object.fromEntries(fields.map(k => [k, row[k] ?? null]));
  const data = {
    account: pick(user, ['id', 'email', 'email_confirmed_at', 'created_at']),
    projects: backup.db.projects.filter(r => r.owner_id === ownerId).map(r => pick(r, ['owner_id', 'id', 'content', 'revision', 'updated_at'])),
    images: backup.db.project_images.filter(r => r.owner_id === ownerId).map(r => pick(r, ['owner_id', 'name', 'created_at', 'state', 'deleted_at'])),
    imageReferences: backup.db.project_image_refs.filter(r => r.owner_id === ownerId).map(r => pick(r, ['owner_id', 'project_id', 'image_name']))
  };
  const objects = [...backup.files.keys()].filter(k => k.startsWith('storage/project-images/' + ownerId + '/'));
  const portable = value => {
    if (typeof value === 'string' && value.startsWith(PREFIX)) {
      const name = value.slice(PREFIX.length), key = 'storage/project-images/' + ownerId + '/' + name;
      if (!IMAGE.test(name) || !backup.files.has(key) || !data.images.some(i => i.name === name)) fail('Projektets bild kan inte exporteras för denna ägare.');
      return 'data:image/' + name.split('.').pop() + ';base64,' + backup.files.get(key).toString('base64');
    }
    if (Array.isArray(value)) return value.map(portable);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, portable(v)]));
    return value;
  };
  return { data, objects, portableProjects: data.projects.map(p => ({ app: 'templates', version: 1, project: portable(p.content) })) };
}

function prepareAccountData({ backupDirectory, ownerId, destination }) {
  const target = path.resolve(destination), partial = target + '.partial';
  noLinks(target); noLinks(partial);
  // Reject Git worktrees and the canonical tree, including Windows case aliases.
  for (let p = target; ; p = path.dirname(p)) {
    if (fs.existsSync(path.join(p, '.git'))) fail('Kunddata får inte skrivas i Git-arbetskopior.');
    if (p === path.dirname(p)) break;
  }
  if (within(SOURCE.toLowerCase(), target.toLowerCase())) fail('Kunddata får inte skrivas i källkoden.');
  const source = path.resolve(backupDirectory);
  if (within(source.toLowerCase(), target.toLowerCase()) || within(target.toLowerCase(), source.toLowerCase()) || within(partial.toLowerCase(), source.toLowerCase())) fail('Exporten måste ligga separat från backupen.');
  if (fs.existsSync(target) || fs.existsSync(partial)) fail('Målmappen finns redan; inget skrivs över.');
  const backup = loadBackup(source), selected = selectAccount(backup, ownerId);
  const output = new Map([['account-data.json', json(selected.data)]]);
  selected.portableProjects.forEach((project, i) => output.set('projects/project-' + (i + 1) + '.projekt.json', json(project)));
  for (const name of selected.objects) output.set('images/' + path.basename(name), backup.files.get(name));
  const review = {
    mode: 'PREVIEW_ONLY_NO_EXECUTOR', ownerId, backupCreated: backup.manifest.created,
    projects: selected.data.projects.map(p => ({ id: p.id, revision: p.revision })),
    storageObjects: selected.objects.map(p => p.slice('storage/project-images/'.length)),
    imageReservations: selected.data.images.map(i => i.name),
    mustReviewBeforeDeletion: [
      'Verifiera begäran, identiteten och en ny aktuell inventering; backupen är bara en ögonblicksbild.',
      'Stoppa samtidiga kontoskrivningar och inventera aktiva sessioner.',
      'Inventera D1-sajter, alla publicerade och ofullständiga versioner, R2/D1-filer och domänkopplingar.',
      'Granska abonnemang och bevarandekrav i Stripe separat; detta verktyg flyttar inga pengar.',
      'Radera privata bildbytes genom Storage API, aldrig genom SQL mot storage.objects.',
      'Granska projekt, bildreferenser/reservationer och Auth-konto i beroendeordning.',
      'Hantera Formspree, support och backupgallring separat; förhindra återinförande vid restore.',
      'Godkänn exakt omfattning före verklig radering och verifiera frånvaro samt det andra kontots oförändrade data.'
    ],
    executionAllowed: false
  };
  output.set('deletion-preview.json', json(review));
  output.set('README.txt', Buffer.from('Kontoexport från en lokal säkerhetskopia.\nInnehåller endast det valda kontots data i denna backup och portabla projektfiler med bilder.\nInte ett fullständigt registerutdrag: D1/publicering, Stripe, Formspree, support, Auth-sessioner och senare ändringar ingår inte.\nRaderingsfilen är en förhandsvisning; ingen radering har utförts och verktyget saknar raderingsfunktion.\nInnehåller personuppgifter. Förvara skyddat utanför Git och dela endast efter identitetskontroll.\n'));
  const manifest = {
    format: 'templates-account-data-v1', created: new Date().toISOString(), backupCreated: backup.manifest.created,
    backupManifestSha256: backup.fingerprint, ownerId,
    scope: 'OFFLINE_SUPABASE_BACKUP_SUBSET_NOT_FULL_ACCOUNT_EXPORT',
    counts: { accounts: 1, projects: selected.data.projects.length, images: selected.objects.length },
    files: [...output].map(([name, bytes]) => ({ path: name, bytes: bytes.length, sha256: sha(bytes) })),
    deletionExecuted: false
  };
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.mkdirSync(partial); // Atomic refusal if another invocation reserved this destination.
  for (const [name, bytes] of output) {
    const dest = path.join(partial, ...name.split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, bytes, { flag: 'wx' });
    if (sha(fs.readFileSync(dest)) !== sha(bytes)) fail('Exportens återläsning stämmer inte.');
  }
  fs.writeFileSync(path.join(partial, 'manifest.json'), json(manifest), { flag: 'wx' });
  fs.renameSync(partial, target);
  return manifest;
}

function main(argv = process.argv.slice(2)) {
  if (argv.length !== 4 || argv[0] !== 'prepare') fail('Använd: node tools/account-data.cjs prepare BACKUPMAPP KONTO-ID NY_EXPORTMAPP');
  const result = prepareAccountData({ backupDirectory: argv[1], ownerId: argv[2], destination: argv[3] });
  console.log('PASS: lokal kontoexport, ' + result.counts.projects + ' projekt och ' + result.counts.images + ' bilder. Ingen radering utförd.');
  return result;
}
if (require.main === module) {
  try { main(); } catch { console.error('FAIL: kontoexporten slutfördes inte. Kontrollera argument, backupens integritet och en ny separat målmapp. Inga tjänster eller konton ändrades.'); process.exitCode = 1; }
}
module.exports = { prepareAccountData, loadBackup, selectAccount, main };
