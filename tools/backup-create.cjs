// Säkerhetskopia av Templates kontodata: projekt, bildreservationer, bildreferenser,
// Auth-kontonas id/e-post/status och ALLA bildfiler (en databasbackup innehåller inte bilderna).
// Nyckeln läses bara ur miljövariabeln TEMPLATES_BACKUP_SECRET_KEY och skrivs aldrig ut.
// Skapar alltid en ny mapp utanför källkoden; en ofullständig körning lämnar bara en .partial-mapp.
const fs = require('node:fs'), path = require('node:path'), { createHash } = require('node:crypto');
const SOURCE = path.resolve(__dirname, '..');
const BUCKET = 'project-images', FORMAT = 'templates-backup-v1', MAX_FILE = 2 * 1024 * 1024;
const TABLES = { projects: ['owner_id', 'id'], project_images: ['owner_id', 'name'], project_image_refs: ['owner_id', 'project_id', 'image_name'] };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const IMAGE = /^[a-f0-9]{64}(-[a-f0-9]{32})?\.(png|jpeg|webp|gif)$/;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function rows(client, table, pageSize) {
  const out = [];
  for (let from = 0; ; from += pageSize) {
    let query = client.from(table).select('*');
    for (const column of TABLES[table]) query = query.order(column, { ascending: true });
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error?.code === '42501') throw new Error('Nyckeln saknar läsrätt till ' + table + '. Kör migreringen supabase/migrations/202610060001_backup_read.sql och kontrollera att det är den hemliga nyckeln.');
    if (error) throw new Error('Kunde inte läsa ' + table + ': ' + (error.code || error.message));
    out.push(...data);
    if (data.length < pageSize) return out;
  }
}
async function users(client, pageSize) {
  const out = [];
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: pageSize });
    if (error) throw new Error('Kunde inte läsa konton: ' + (error.code || error.message));
    out.push(...data.users.map(u => ({ id: u.id, email: u.email ?? null, email_confirmed_at: u.email_confirmed_at ?? null, created_at: u.created_at ?? null })));
    if (data.users.length < pageSize) return out;
  }
}
async function list(client, prefix, pageSize) {
  const out = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client.storage.from(BUCKET).list(prefix, { limit: pageSize, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error('Kunde inte lista bildlagringen: ' + (error.statusCode || error.message));
    out.push(...data);
    if (data.length < pageSize) return out;
  }
}

async function createBackup({ client, destination, now = new Date(), sourceHost = '', pageSize = 1000, log = () => {} }) {
  const root = path.resolve(destination), partial = root + '.partial';
  if (root === SOURCE || root.startsWith(SOURCE + path.sep)) throw new Error('Backupen får inte ligga i källkoden (den innehåller kunddata).');
  if (fs.existsSync(root) || fs.existsSync(partial)) throw new Error('Målmappen finns redan; inget skrivs över.');
  const db = {};
  for (const table of Object.keys(TABLES)) { db[table] = await rows(client, table, pageSize); log(table + ': ' + db[table].length); }
  db.users = await users(client, pageSize); log('konton: ' + db.users.length);

  const objects = [];
  for (const folder of await list(client, '', pageSize)) {
    if (!UUID.test(folder.name)) throw new Error('Okänd mapp i bildlagringen: ' + folder.name);
    for (const item of await list(client, folder.name, pageSize)) {
      if (!IMAGE.test(item.name)) throw new Error('Okänt filnamn i bildlagringen: ' + folder.name + '/' + item.name);
      objects.push(folder.name + '/' + item.name);
    }
  }
  const objectSet = new Set(objects), warnings = [];
  for (const ref of db.project_image_refs) if (!objectSet.has(ref.owner_id + '/' + ref.image_name)) throw new Error('Ett projekt använder en bild som saknas i lagringen: ' + ref.owner_id + '/' + ref.image_name);
  for (const image of db.project_images) if (image.state === 'active' && !objectSet.has(image.owner_id + '/' + image.name)) warnings.push('Reserverad bild utan uppladdad fil (påverkar inga sparade projekt): ' + image.owner_id + '/' + image.name);
  for (const object of objects) if (!db.project_images.some(i => i.owner_id + '/' + i.name === object)) warnings.push('Bildfil utan reservation: ' + object);

  fs.mkdirSync(partial, { recursive: true });
  const files = [];
  const write = (rel, bytes) => {
    const target = path.join(partial, ...rel.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes, { flag: 'wx' });
    files.push({ path: rel, bytes: bytes.length, sha256: hash(bytes) });
  };
  for (const object of objects) {
    const { data, error } = await client.storage.from(BUCKET).download(object);
    if (error) throw new Error('Kunde inte hämta ' + object + ': ' + (error.statusCode || error.message));
    const bytes = Buffer.from(await data.arrayBuffer());
    if (bytes.length > MAX_FILE) throw new Error('För stor bildfil: ' + object);
    // Filnamnets första 64 tecken är SHA-256 av innehållet; en avvikelse betyder skadad källa.
    if (hash(bytes) !== object.split('/')[1].slice(0, 64)) throw new Error('Bildfilen stämmer inte med sin innehållsnyckel: ' + object);
    write('storage/' + BUCKET + '/' + object, bytes);
  }
  log('bildfiler: ' + objects.length);
  for (const name of ['projects', 'project_images', 'project_image_refs', 'users']) write('db/' + name + '.json', Buffer.from(JSON.stringify(db[name], null, 1)));
  const manifest = {
    format: FORMAT, created: now.toISOString(), source: sourceHost,
    counts: { projects: db.projects.length, project_images: db.project_images.length, project_image_refs: db.project_image_refs.length, users: db.users.length, files: objects.length },
    migrations: fs.readdirSync(path.join(SOURCE, 'supabase/migrations')).sort().map(name => ({ name, sha256: hash(fs.readFileSync(path.join(SOURCE, 'supabase/migrations', name), 'utf8').replace(/\r\n/g, '\n')) })),
    files, warnings,
    notIncluded: ['Lösenord och sessioner för konton', 'Supabase-inställningar för Auth och Storage', 'Databasens schema (återskapas från migreringsfilerna ovan)'],
    sensitive: 'Innehåller kunders e-postadresser och projektinnehåll. Förvara krypterat och utanför Git.'
  };
  fs.writeFileSync(path.join(partial, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' });
  fs.renameSync(partial, root);
  return manifest;
}

async function main(argv = process.argv.slice(2), env = process.env, createClient = () => require('@supabase/supabase-js').createClient) {
  const [destination] = argv;
  if (!destination || argv.length !== 1) throw new Error('Använd: npm run backup:create -- NY_BACKUPMAPP (utanför källkoden)');
  const url = env.TEMPLATES_BACKUP_URL || '', key = env.TEMPLATES_BACKUP_SECRET_KEY || '';
  let host;
  try { const u = new URL(url); if (u.protocol !== 'https:' || u.username || u.password || u.pathname !== '/') throw 0; host = u.host; }
  catch { throw new Error('Sätt TEMPLATES_BACKUP_URL till projektets https-adress, t.ex. https://<projekt>.supabase.co'); }
  if (!key) throw new Error('Sätt TEMPLATES_BACKUP_SECRET_KEY i terminalen (hemlig nyckel; visas aldrig).');
  if (key.startsWith('sb_publishable_')) throw new Error('Den publika nyckeln räcker inte för backup. Använd den hemliga nyckeln och dela den aldrig.');
  const client = createClient()(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const manifest = await createBackup({ client, destination, sourceHost: host, log: line => console.log(line) });
  console.log('Backup klar: ' + manifest.counts.projects + ' projekt, ' + manifest.counts.files + ' bildfiler, ' + manifest.counts.users + ' konton.');
  if (manifest.warnings.length) console.log('Anmärkningar: ' + manifest.warnings.length + ' (se manifest.json).');
  console.log('Kontrollera den med: npm run backup:verify -- ' + destination);
  console.log('Innehåller kunddata och e-postadresser – förvara säkert.');
  return manifest;
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { createBackup, main, FORMAT };
