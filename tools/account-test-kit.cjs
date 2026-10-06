// Offline handoff only: never connects, installs, executes SQL or reads credentials.
const fs = require('node:fs'), path = require('node:path'), { createHash } = require('node:crypto');
const SOURCE = path.resolve(__dirname, '..');
const MIGRATIONS = ['202610030001_projects.sql', '202610040001_private_images.sql', '202610040002_image_lifecycle.sql', '202610060001_backup_read.sql'];
const GUIDES = ['account-test-runbook.md', 'accounts-local.md', 'private-images-local.md', 'image-lifecycle-local.md'];
const SOURCE_FILES = ['js/accounts.js', 'js/project-store.js', 'js/image-assets.js', 'js/image-policy.js', 'js/image-processing.js', 'js/autosave.js', 'vendor/supabase.js', 'package-lock.json'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const checks = [
  ['auth', 'Registrering och bekräftelse', 'Registrera två testkonton A och B med godkända testadresser. Öppna deras bekräftelselänkar i respektive webbläsare.', 'Båda kan logga in efter bekräftelse; inga riktiga kunduppgifter används.'],
  ['session', 'Session och utloggning', 'Prova omladdning, sessionens förnyelse/utgång, utloggning och byte mellan A och B.', 'Ingen föregående kunds projekt eller osparade kontokopia visas efter kontobyte.'],
  ['password', 'Glömt lösenord', 'Begär ett återställningsmejl och öppna länken i webbläsaren som startade flödet. Prova även fel eller utgången länk.', 'Rätt återlänk används; giltig återställning fungerar och fel ger begripligt besked.'],
  ['devices', 'Spara och öppna på annan enhet', 'Spara ett syntetiskt Café-projekt med alla tre sidor och en egen testbild. Öppna på annan enhet med samma konto.', 'Namn, samtliga texter, inställningar och bildbytes finns kvar.'],
  ['projects-isolation', 'Projekt hålls privata', 'Använd A:s och B:s vanliga behörigheter direkt mot Data API. Prova läsning, save/delete, förfalskad ägare och anonym begäran åt båda hållen.', 'Ingen kan läsa eller ändra den andres projekt. Noll rader vid nekad läsning är ett möjligt utfall; kontrollera att inga bytes läcker och att ägarens data är oförändrade.'],
  ['images-isolation', 'Bilder hålls privata', 'Prova listning, hämtning, reservation, uppladdning och radering av den andres testbild samt anonym hämtning.', 'Bilder och reservationer kan inte läsas eller ändras av fel konto. Ingen bredare Storage-policy ger åtkomst.'],
  ['revision', 'Två samtidiga redigeringar', 'Spara samma revision från två separata anslutningar och prova därefter radering med gammal revision.', 'Bara en av de konkurrerande sparningarna lyckas; en gammal revision ger konflikt utan att skriva över eller radera.'],
  ['network', 'Avbrott och osäkra svar', 'Bryt nätet under sparning och bildöverföring; prova också förlorat svar efter genomförd skrivning.', 'Ingen falsk sparbekräftelse. Text kan räddas till projektfil; återförsök skriver inte tyst över en senare revision.'],
  ['image-limits', 'Verkliga bildgränser', 'Prova filer över 2 MiB, felaktig MIME-typ, skadad bild, uppladdningsavbrott och parallella reservationer runt 100 bilder.', 'De avsedda gränserna gäller i verklig tjänst; avbrott orsakar inte otillåten åtkomst eller obegränsade reservationer. Dokumentera skillnaden mellan Storage-gränser och bildvalidering inför publicering.'],
  ['portable', 'Kopiering och flyttbar projektfil', 'Kopiera ett lokalt testprojekt till A. Exportera projektfil och ZIP, importera projektfilen i en ny lokal testprofil.', 'Originalet bevaras. Projektfilens bilder kan öppnas utan privat Storage-åtkomst och andra kontoprojekt skrivs inte över.'],
  ['backup', 'Återställ projekt och bildfiler', 'Skapa backup av syntetiska projekt OCH deras Storage-filer. Återställ i separat godkänd testmiljö och jämför innehåll, bildhashar och åtkomstregler.', 'Projekt kan öppnas och exporteras med alla bilder efter återställning; A/B-isoleringen gäller fortfarande. Databasbackup ensam är inte bevis för bildbackup.'],
  ['cleanup', 'Bildrensning och kontolivscykel', 'Börja med torrkörning. Planera ett särskilt godkänt prov av rensning, avbruten rensning, samtidig sparning och kontoradering med enbart testdata.', 'Refererade/nyligen reserverade bilder bevaras. Borttagning och återförsök är kontrollerade; kontoavslut hanterar även faktiska Storage-filer. Inget schemalagt jobb startas av paketet.'],
  ['mobile', 'Verklig mobil', 'Prova inloggning, återställningslänk, bildval, redigering, sparning och filräddning på riktig iPhone/Safari och Android.', 'Kritiska flöden fungerar på enheterna; emulerad bredd räknas inte som fysisk enhet.']
];

function readRegular(filename) {
  const stat = fs.lstatSync(filename);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2 * 1024 * 1024) throw new Error('Ogiltig eller för stor paketfil.');
  return fs.readFileSync(filename);
}
function contents() {
  const migrations = fs.readdirSync(path.join(SOURCE, 'supabase/migrations')).sort();
  if (JSON.stringify(migrations) !== JSON.stringify(MIGRATIONS)) throw new Error('Migrationslistan har ändrats. Uppdatera testpaketet innan det används.');
  const files = new Map();
  for (const name of MIGRATIONS) files.set('migrations/' + name, readRegular(path.join(SOURCE, 'supabase/migrations', name)));
  for (const name of GUIDES) files.set('guides/' + name, readRegular(path.join(SOURCE, 'docs', name)));
  files.set('START_HAR.md', Buffer.from('# Templates: startpaket för kontotest\n\nDetta är ett lokalt förberett paket. Ingen tjänst är ansluten och inga riktiga tjänstetester är godkända av paketet.\n\n1. Läs guides/account-test-runbook.md.\n2. Besluta om separat testprojekt, EU-region, kostnadsram och testadress innan anslutning.\n3. Kontrollera paketet med npm run accounts:check-kit -- PAKETMAPP från den kanoniska källkoden.\n4. Efter uttryckligt godkännande följs guiden och de tre migrationerna i manifestets ordning. SQL-filerna körs aldrig av det här verktyget.\n5. Kopiera acceptance-template.json till en separat resultatfil UTANFÖR paketet och dokumentera de verkliga proven. Lämna originalpaketet oförändrat.\n\nIngen lokal PASS betyder att mejl, kundisolering, Storage eller backup fungerar i drift. Förvara inte lösenord, tokens, nycklar eller kunddata i paketet eller resultatfilen.\n'));
  files.set('cloud-config.example.js', Buffer.from("// Example only. Copy into an isolated test checkout only after connection approval.\n// Only the approved project URL and PUBLIC sb_publishable_ key belong here.\nwindow.TEMPLATES_CLOUD = Object.freeze({ url: '', publishableKey: '' });\n"));
  files.set('acceptance-template.json', Buffer.from(JSON.stringify({ schema: 'templates-account-acceptance-v1',
    environment: { projectAlias: '', region: '', appOrigin: '', approvedBy: '', approvedAt: '' },
    serviceStatus: 'BLOCKED_NO_APPROVED_TEST_SERVICE',
    instructions: 'Använd PASS, FAIL eller BLOCKED efter ett riktigt prov; NOT_RUN betyder ännu inte utfört. Lägg aldrig hemligheter, kontomejl eller kundinnehåll i bevis. Spara resultatkopian utanför paketet.',
    checks: checks.map(([id, title, procedure, expected]) => ({ id, title, procedure, expected, status: 'NOT_RUN', checkedAt: null, evidence: '', actual: '' }))
  }, null, 2) + '\n'));
  return files;
}
function sourceFingerprint() {
  return SOURCE_FILES.map(file => ({ file, sha256: hash(readRegular(path.join(SOURCE, file))) }));
}
function createKit(destination) {
  const root = path.resolve(destination);
  const parent = fs.realpathSync(path.dirname(root));
  const canonical = fs.realpathSync(SOURCE);
  const target = path.join(parent, path.basename(root));
  const relative = path.relative(canonical, target);
  if (relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) throw new Error('Skapa testpaketet utanför källkoden.');
  if (fs.existsSync(target)) throw new Error('Målmappen finns redan. Inga filer skrivs över.');
  const files = contents(), fingerprint = sourceFingerprint();
  const manifest = { schema: 'templates-account-test-kit-v1', createdAt: new Date().toISOString(),
    status: 'LOCAL_FILES_ONLY', migrationOrder: MIGRATIONS.map(name => 'migrations/' + name), source: fingerprint,
    files: [...files].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: hash(bytes) })) };
  // Exclusive creation. On disk failure leave the partial folder for inspection, never delete it.
  fs.mkdirSync(target);
  fs.mkdirSync(path.join(target, 'migrations')); fs.mkdirSync(path.join(target, 'guides'));
  for (const [file, bytes] of files) fs.writeFileSync(path.join(target, file), bytes, { flag: 'wx' });
  fs.writeFileSync(path.join(target, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  return checkKit(target);
}
function checkKit(directory) {
  const root = path.resolve(directory), stat = fs.lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Testpaketet måste vara en vanlig mapp.');
  const manifest = JSON.parse(readRegular(path.join(root, 'manifest.json')));
  const expected = contents(), expectedNames = [...expected.keys()];
  if (manifest.schema !== 'templates-account-test-kit-v1' || manifest.status !== 'LOCAL_FILES_ONLY' || !Number.isFinite(Date.parse(manifest.createdAt)) ||
      JSON.stringify(manifest.migrationOrder) !== JSON.stringify(MIGRATIONS.map(n => 'migrations/' + n)) ||
      !Array.isArray(manifest.files) || JSON.stringify(manifest.files.map(f => f.file)) !== JSON.stringify(expectedNames) ||
      JSON.stringify(manifest.source) !== JSON.stringify(sourceFingerprint())) throw new Error('Testpaketet är ogiltigt eller stämmer inte med aktuell källkod. Skapa ett nytt paket.');
  const found = [];
  function walk(relative = '') {
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const name = relative ? relative + '/' + entry.name : entry.name;
      if (entry.isSymbolicLink()) throw new Error('Länkar tillåts inte i testpaketet.');
      if (entry.isDirectory()) {
        if (!['guides', 'migrations'].includes(name)) throw new Error('Oväntad mapp i testpaketet.');
        walk(name);
      } else { if (!['manifest.json', ...expectedNames].includes(name)) throw new Error('Oväntad fil i testpaketet.'); found.push(name); }
    }
  }
  walk();
  if (found.length !== expected.size + 1) throw new Error('Testpaketet saknar filer.');
  for (const item of manifest.files) {
    const bytes = readRegular(path.join(root, item.file));
    if (bytes.length !== item.bytes || hash(bytes) !== item.sha256 || !bytes.equals(expected.get(item.file))) throw new Error('En paketfil har ändrats eller källkoden har uppdaterats. Skapa ett nytt paket.');
  }
  return { status: 'LOCAL_FILES_VERIFIED', files: expected.size + 1, migrations: MIGRATIONS.length, liveTests: 'NOT_RUN', connected: false, approvedForRelease: false };
}
if (require.main === module) {
  try {
    const [command, directory, extra] = process.argv.slice(2);
    if (!directory || extra || !['create', 'check'].includes(command)) throw new Error('Använd: npm run accounts:prepare-kit -- NY_PAKETMAPP eller npm run accounts:check-kit -- PAKETMAPP');
    console.log(JSON.stringify(command === 'create' ? createKit(directory) : checkKit(directory)));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { createKit, checkKit };
