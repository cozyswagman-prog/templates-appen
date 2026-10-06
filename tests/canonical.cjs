// CSSOM and HTML parsers serialize equivalent object-position declarations differently.
module.exports = function canonical(snapshot) {
  const copy = structuredClone(snapshot);
  copy.images = copy.images.map(([src, alt, style]) => [src, alt, style == null ? null : style.split(';').map(s => s.trim()).filter(Boolean).map(s => s.replace(/\s*:\s*/, ':').replace(/^object-position:top$/, 'object-position:center top')).sort().join(';')]);
  return copy;
};
