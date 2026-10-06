const fs = require('node:fs'), path = require('node:path'), { createHash } = require('node:crypto');
const JSZip = require('jszip');
const { verifyVersion } = require('./publication-version.cjs');

// Export the verified snapshot, never the current editor draft or a new render.
async function createVersionZip(directory, expectedIntegrity) {
  const manifest = verifyVersion(directory, { expectedIntegrity });
  const zip = new JSZip();
  for (const file of manifest.files.filter(item => item.path.startsWith('site/'))) {
    const bytes = fs.readFileSync(path.join(directory, file.path));
    if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error('Versionen har ändrats.');
    zip.file(file.path.slice(5), bytes, { createFolders: false });
  }
  zip.file('LASMIG.txt', [
    'DIN HEMSIDA – SPARAD GRANSKNINGSVERSION', '',
    'Version: ' + manifest.versionId,
    'Skapad: ' + manifest.createdAt, '',
    '1. Packa upp hela ZIP-filen i en egen mapp.',
    '2. Öppna index.html för att titta på hemsidan.',
    '3. Behåll alla filer och undermappar tillsammans vid leverans till webbhotellet.', '',
    'HTML, bilder och typsnitt är samma filer som i den sparade granskningsversionen.',
    'Senare ändringar i ditt utkast ingår inte. Skapa en ny version om du vill ha med dem.',
    'Nedladdningen publicerar ingenting. Formulär och andra externa tjänster behöver provas separat.',
    'Detta är hemsidan, inte en redigerbar säkerhetskopia. Använd Spara som fil i Templates för en projektfil.'
  ].join('\r\n'));
  const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return { bytes, filename: 'templates-version-' + manifest.versionId + '.zip' };
}
module.exports = { createVersionZip };
