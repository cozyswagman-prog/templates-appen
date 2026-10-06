// Renderaren för Workers: appens oförändrade mallar + js/render.js, med typsnitten inbyggda i paketet
// (paketeras med esbuild: .woff2 som binary, .txt som text). Ger samma filer som tools/render-project.cjs.
import './worker-globals.mjs';
import '../templates/index.js';
import '../templates/restaurang.js';
import '../templates/salong.js';
import '../templates/byggfirma.js';
import '../templates/butik.js';
import '../templates/portfolio.js';
import '../templates/cafe.js';
import '../templates/gym.js';
import '../templates/konsult.js';
import '../templates/hemservice.js';
import '../js/render.js';
import inter400 from '../fonts/inter-400.woff2';
import inter700 from '../fonts/inter-700.woff2';
import lora400 from '../fonts/lora-400.woff2';
import lora700 from '../fonts/lora-700.woff2';
import outfit400 from '../fonts/outfit-400.woff2';
import outfit700 from '../fonts/outfit-700.woff2';
import playfair400 from '../fonts/playfair-400.woff2';
import playfair700 from '../fonts/playfair-700.woff2';
import license from '../fonts/LICENS.txt';

const FONTS = { 'inter-400.woff2': inter400, 'inter-700.woff2': inter700, 'lora-400.woff2': lora400, 'lora-700.woff2': lora700,
  'outfit-400.woff2': outfit400, 'outfit-700.woff2': outfit700, 'playfair-400.woff2': playfair400, 'playfair-700.woff2': playfair700 };

export function renderSite(project) {
  const result = globalThis.SiteRenderer.render(project);
  const files = new Map(result.files);
  for (const font of result.fontFiles) {
    if (!FONTS[font]) throw new Error('Okänt typsnitt: ' + font);
    files.set('fonts/' + font, FONTS[font]);
  }
  if (result.fontFiles.size) files.set('fonts/LICENS.txt', license);
  return files;
}
