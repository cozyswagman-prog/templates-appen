// Register över alla templates. Varje template-fil pushar in sig själv här.
window.TEMPLATES = [];

// Självhostade typsnitt (OFL-licens, se fonts/LICENS.txt).
// Relativa sökvägar fungerar både i förhandsvisningen (srcdoc ärver appens
// bas-URL) och i den exporterade sajten (exporten packar med fonts/-mappen).
window.FONTS = {
  inter:    { name: 'Inter' },
  playfair: { name: 'Playfair Display' },
  outfit:   { name: 'Outfit' },
  lora:     { name: 'Lora' }
};

// fontCss('playfair','inter') → @font-face-regler för vikt 400 och 700
window.fontCss = function (...ids) {
  return ids.map(id => {
    const f = window.FONTS[id];
    return [400, 700].map(w =>
      `@font-face{font-family:'${f.name}';font-style:normal;font-weight:${w};` +
      `font-display:swap;src:url('fonts/${id}-${w}.woff2') format('woff2');}`
    ).join('\n');
  }).join('\n');
};

// Platshållarbild som inline-SVG (fungerar helt offline).
// ph(bredd, höjd, bakgrundsfärg, textfärg, etikett)
window.ph = function (w, h, bg, fg, label) {
  // Instruktionen finns i editorns etikett. Text inuti bilden beskärs när
  // samma bild visas med object-fit: cover på olika skärmstorlekar.
  const title = String(label || 'Exempelbild').replace(/[<>&"']/g, char =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<title>${title}</title>` +
    `<rect width="${w}" height="${h}" fill="${bg}"/>` +
    `<rect x="${w * 0.04}" y="${h * 0.07}" width="${w * 0.92}" height="${h * 0.86}" fill="none" stroke="${fg}" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="8 7"/>` +
    `<circle cx="${w / 2}" cy="${h / 2 - h * 0.08}" r="${Math.min(w, h) * 0.09}" fill="${fg}" fill-opacity="0.3"/>` +
    `<path d="M ${w / 2 - Math.min(w, h) * 0.18} ${h / 2 + h * 0.14} l ${Math.min(w, h) * 0.12} -${Math.min(w, h) * 0.12} l ${Math.min(w, h) * 0.08} ${Math.min(w, h) * 0.07} l ${Math.min(w, h) * 0.09} -${Math.min(w, h) * 0.09} l ${Math.min(w, h) * 0.07} ${Math.min(w, h) * 0.14} z" fill="${fg}" fill-opacity="0.3"/>` +
    `</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
};

// Lugnare platshållare för nyare templates: tonad yta i mallens palett med ett
// diskret motiv – ser avsiktlig ut även innan kunden bytt bild. Etiketten blir
// bara <title> (som i ph): synlig text beskärs av object-fit: cover.
// tone(bredd, höjd, bakgrund, motivfärg, etikett, motiv)
// motiv: 'arch' | 'sun' | 'hills' | 'grid' | 'circle' | 'none'
window.tone = function (w, h, bg, fg, label, motif) {
  const m = Math.min(w, h);
  const shapes = {
    arch: `<path d="M ${w * 0.3} ${h} V ${h * 0.48} a ${w * 0.2} ${w * 0.2} 0 0 1 ${w * 0.4} 0 V ${h} z" fill="${fg}" fill-opacity="0.13"/>`,
    sun: `<circle cx="${w * 0.66}" cy="${h * 0.42}" r="${m * 0.16}" fill="${fg}" fill-opacity="0.16"/>` +
         `<rect y="${h * 0.66}" width="${w}" height="${h * 0.34}" fill="${fg}" fill-opacity="0.1"/>`,
    hills: `<path d="M0 ${h * 0.72} C ${w * 0.25} ${h * 0.55}, ${w * 0.45} ${h * 0.6}, ${w * 0.6} ${h * 0.68} S ${w * 0.9} ${h * 0.58}, ${w} ${h * 0.62} V ${h} H 0 z" fill="${fg}" fill-opacity="0.12"/>` +
           `<path d="M0 ${h * 0.84} C ${w * 0.3} ${h * 0.74}, ${w * 0.6} ${h * 0.9}, ${w} ${h * 0.78} V ${h} H 0 z" fill="${fg}" fill-opacity="0.1"/>`,
    grid: Array.from({ length: 7 }, (_, i) =>
      `<line x1="${(w / 8) * (i + 1)}" y1="0" x2="${(w / 8) * (i + 1)}" y2="${h}" stroke="${fg}" stroke-opacity="0.08"/>`).join(''),
    circle: `<circle cx="${w / 2}" cy="${h / 2}" r="${m * 0.3}" fill="none" stroke="${fg}" stroke-opacity="0.18" stroke-width="${Math.max(2, m * 0.01)}"/>`,
    none: ''
  };
  const title = String(label || 'Exempelbild').replace(/[<>&"']/g, char =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<title>${title}</title>` +
    `<rect width="${w}" height="${h}" fill="${bg}"/>` +
    (shapes[motif] != null ? shapes[motif] : shapes.arch) +
    `</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
};

// Litet inline-skript för nyare templates: håller tel:-, mailto- och kartlänkar
// i synk med texten kunden skrivit (editorn byter bara textinnehållet).
// <a data-tel data-slot="text">08-123 45 67</a> → href="tel:+4681234567"
// <a data-mail data-slot="text">hej@exempel.se</a> → href="mailto:…"
// <a data-map data-slot="text">Storgatan 1, Ort</a> → kartlänk
window.siteJs = `<script>
document.querySelectorAll('a[data-tel]').forEach(function (a) {
  var n = a.textContent.replace(/[^0-9+]/g, '');
  if (n.charAt(0) === '0') n = '+46' + n.slice(1);
  a.href = 'tel:' + n;
});
document.querySelectorAll('a[data-mail]').forEach(function (a) { a.href = 'mailto:' + a.textContent.trim(); });
document.querySelectorAll('a[data-map]').forEach(function (a) {
  a.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a.textContent.trim());
});
</script>`;
