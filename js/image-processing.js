// Free client-side decoding and re-encoding. No image is sent to an external codec.
(function (root) {
  const policy = root.ImagePolicy, assets = root.ImageAssets, INPUT_MAX = 12 * 1024 * 1024;
  async function prepare(data) {
    const parsed = assets.parse(data, INPUT_MAX), info = policy.inspect(parsed.bytes, parsed.ext);
    if (info.width * info.height > policy.MAX_PIXELS) throw new Error('Bilden har för hög upplösning. Välj en bild på högst 40 megapixel.');
    if (!root.createImageBitmap) throw new Error('Din webbläsare kan inte anpassa bilden. Uppdatera webbläsaren och försök igen.');
    let bitmap;
    try { bitmap = await root.createImageBitmap(new Blob([parsed.bytes], { type: parsed.mime }), { imageOrientation: 'from-image' }); }
    catch { throw new Error('Bilden kunde inte läsas. Välj en annan bild.'); }
    try {
      if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > policy.MAX_PIXELS) throw new Error('Bilden har för hög upplösning.');
      // Already canonical: avoid repeated lossy compression and keep content hashes stable.
      if (info.clean && Math.max(info.width, info.height) <= policy.MAX_SIDE && parsed.bytes.length <= policy.MAX_BYTES) return assets.toData(parsed.bytes, parsed.mime);
      let scale = Math.min(1, policy.MAX_SIDE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas'), mime = parsed.ext === 'jpeg' ? 'image/jpeg' : 'image/png';
      for (let attempt = 0; attempt < 10; attempt++) {
        canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const ctx = canvas.getContext('2d', { colorSpace: 'srgb' });
        if (!ctx) throw new Error('Bilden kunde inte anpassas i webbläsaren.');
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, 0.85));
        if (!blob) throw new Error('Bilden kunde inte anpassas i webbläsaren.');
        if (blob.size <= policy.MAX_BYTES) {
          const ext = mime === 'image/png' ? 'png' : 'jpeg';
          const bytes = policy.stripMetadata(new Uint8Array(await blob.arrayBuffer()), ext);
          policy.validate(bytes, ext);
          return assets.toData(bytes, mime);
        }
        scale *= 0.8;
      }
      throw new Error('Bilden är fortfarande större än 1,9 MB. Välj en mindre bild.');
    } finally { bitmap.close(); }
  }
  async function file(file) {
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('Välj en PNG-, JPEG-, WebP- eller GIF-bild.');
    if (file.size > INPUT_MAX) throw new Error('Välj en bild som är mindre än 12 MB.');
    return prepare(assets.toData(new Uint8Array(await file.arrayBuffer()), file.type));
  }
  async function project(input, guard = () => {}) {
    const copy = JSON.parse(JSON.stringify(input)), prepared = new Map(); let changed = 0;
    for (const [object, key] of assets.locations(copy)) {
      guard(); const old = object[key];
      if (!old.startsWith('data:')) throw new Error('Öppna projektet igen så att bilderna kan hämtas.');
      if (!prepared.has(old)) prepared.set(old, await prepare(old));
      guard(); object[key] = prepared.get(old); if (object[key] !== old) changed++;
    }
    return { project: copy, changed };
  }
  root.ImageProcessing = { prepare, file, project };
})(window);
