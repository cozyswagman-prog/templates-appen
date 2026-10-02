// Register över alla templates. Varje template-fil pushar in sig själv här.
window.TEMPLATES = [];

// Platshållarbild som inline-SVG (fungerar helt offline).
// ph(bredd, höjd, bakgrundsfärg, textfärg, etikett)
window.ph = function (w, h, bg, fg, label) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect width="${w}" height="${h}" fill="${bg}"/>` +
    `<rect x="${w * 0.04}" y="${h * 0.07}" width="${w * 0.92}" height="${h * 0.86}" fill="none" stroke="${fg}" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="8 7"/>` +
    `<circle cx="${w / 2}" cy="${h / 2 - h * 0.08}" r="${Math.min(w, h) * 0.09}" fill="${fg}" fill-opacity="0.3"/>` +
    `<path d="M ${w / 2 - Math.min(w, h) * 0.18} ${h / 2 + h * 0.14} l ${Math.min(w, h) * 0.12} -${Math.min(w, h) * 0.12} l ${Math.min(w, h) * 0.08} ${Math.min(w, h) * 0.07} l ${Math.min(w, h) * 0.09} -${Math.min(w, h) * 0.09} l ${Math.min(w, h) * 0.07} ${Math.min(w, h) * 0.14} z" fill="${fg}" fill-opacity="0.3"/>` +
    `<text x="50%" y="${h / 2 + h * 0.28}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${Math.max(13, Math.min(w, h) * 0.07)}" fill="${fg}" fill-opacity="0.65">${label}</text>` +
    `</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
};
