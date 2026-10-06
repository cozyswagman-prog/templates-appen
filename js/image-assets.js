// Private immutable account images. Editors/files keep portable data URLs;
// only the cloud JSON contains references. No public or expiring image URLs.
(function (root) {
  const MAX_BYTES = 2 * 1024 * 1024, MAX_IMAGES = 100;
  const BUCKET = 'project-images', PREFIX = 'templates-image:v1:';
  const REF = /^templates-image:v1:([a-f0-9]{64}(?:-[a-f0-9]{32})?\.(?:png|jpeg|webp|gif))$/;
  const contentKey = name => name.replace(/-[a-f0-9]{32}(?=\.)/, '');
  const types = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };
  const failure = () => new Error('Bilden kunde inte hämtas eller sparas på kontot. Försök igen. Dina ändringar finns kvar; spara en projektfil för en egen kopia.');
  function parse(data, limit = MAX_BYTES) {
    if (typeof data !== 'string' || data.length > Math.ceil(limit / 3) * 4 + 40) throw new Error('Bilden är för stor. Använd en bild på högst 2 MB efter anpassning.');
    const match = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
    if (!match || match[2].length % 4) throw new Error('Välj en giltig PNG-, JPEG-, WebP- eller GIF-bild.');
    let raw;
    try { raw = atob(match[2]); } catch { throw new Error('Bilden kunde inte läsas.'); }
    const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
    if (!bytes.length || bytes.length > limit) throw new Error('Bilden är för stor. Använd en bild på högst 2 MB efter anpassning.');
    const ext = match[1] === 'jpg' ? 'jpeg' : match[1];
    const starts = signature => signature.every((value, i) => bytes[i] === value);
    const text = (start, end) => String.fromCharCode(...bytes.slice(start, end));
    const valid = ext === 'png' ? starts([137,80,78,71,13,10,26,10])
      : ext === 'jpeg' ? starts([255,216,255])
        : ext === 'gif' ? ['GIF87a','GIF89a'].includes(text(0,6))
          : text(0,4) === 'RIFF' && text(8,12) === 'WEBP';
    if (!valid) throw new Error('Bildens innehåll stämmer inte med filtypen. Välj en annan bild.');
    return { bytes, ext, mime: types[ext] };
  }
  function toData(bytes, mime) {
    let raw = '';
    for (let i = 0; i < bytes.length; i += 8192) raw += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return 'data:' + mime + ';base64,' + btoa(raw);
  }
  async function filename(image) {
    const hash = await root.crypto.subtle.digest('SHA-256', image.bytes);
    return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('') + '.' + image.ext;
  }
  function locations(content) {
    const result = [];
    const add = (object, key, imageField = false) => {
      const prefix = imageField ? /^(data:|templates-image:)/ : /^(data:image\/|templates-image:)/;
      if (typeof object?.[key] === 'string' && prefix.test(object[key])) result.push([object, key]);
    };
    for (const [key, value] of Object.entries(content.values || {})) {
      if (value && typeof value === 'object') for (const slot of Object.keys(value)) add(value, slot);
      else add(content.values, key); // legacy flat slots
    }
    for (const page of Object.values(content.site?.pages || {})) for (const image of Object.values(page?.images || {})) add(image, 'src', true);
    return result;
  }
  function create(client) {
    const storage = () => client.storage.from(BUCKET);
    async function download(name, owner, guard) {
      guard();
      const result = await storage().download(owner + '/' + name); guard();
      if (result.error || !result.data || result.data.size > MAX_BYTES) throw failure();
      const bytes = new Uint8Array(await result.data.arrayBuffer()); guard();
      const data = toData(bytes, types[name.split('.').pop()]);
      const parsed = parse(data);
      if (await filename(parsed) !== contentKey(name)) throw failure();
      guard();
      return data;
    }
    return {
      async pack(content, owner, guard) {
        const copy = JSON.parse(JSON.stringify(content)), pending = new Map();
        // Validate every image before the first reservation/upload.
        for (const [object, key] of locations(copy)) {
          const value = object[key];
          if (value.startsWith(PREFIX)) throw new Error('Projektets bilder måste hämtas innan det kan sparas. Öppna projektet igen.');
          const image = parse(value), name = await filename(image); guard();
          pending.set(name, image); object[key] = PREFIX + name;
        }
        if (pending.size > MAX_IMAGES) throw new Error('Kontot har plats för högst 100 olika uppladdade bilder.');
        const names = new Map();
        for (const [key, image] of pending) {
          // Always renew the server lease; a tab's old cache is not proof that
          // an unused object survived cleanup or still has the same generation.
          guard();
          const reserved = await client.rpc('reserve_project_image', { p_name: key, p_owner: owner }); guard();
          if (reserved.error?.code === 'PT413') throw new Error('Kontots 100 bildplatser är fulla. Befintliga bilder kan återanvändas. Spara som projektfil för att behålla dina ändringar.');
          if (reserved.error) throw failure();
          const name = reserved.data?.name;
          if (typeof name !== 'string' || !REF.test(PREFIX + name) || contentKey(name) !== key || typeof reserved.data.uploaded !== 'boolean') throw failure();
          names.set(key, name);
          if (reserved.data.uploaded) continue;
          const uploaded = await storage().upload(owner + '/' + name, image.bytes, { contentType: image.mime, upsert: false, cacheControl: '0' }); guard();
          // A retry, another tab or another project may already have uploaded it.
          // Verify the bytes rather than trusting an error code as proof of success.
          if (uploaded.error) await download(name, owner, guard);
          guard();
        }
        for (const [object, key] of locations(copy)) object[key] = PREFIX + names.get(object[key].slice(PREFIX.length));
        return copy;
      },
      async unpack(content, owner, guard) {
        const copy = JSON.parse(JSON.stringify(content)), loaded = new Map();
        for (const [object, key] of locations(copy)) {
          if (object[key].startsWith('data:')) continue; // existing inline projects remain readable
          const match = REF.exec(object[key]);
          if (!match) throw new Error('Projektet innehåller en ogiltig bildreferens.');
          const name = match[1];
          if (!loaded.has(name)) loaded.set(name, await download(name, owner, guard));
          guard(); object[key] = loaded.get(name);
        }
        return copy;
      }
    };
  }
  const api = { create, parse, filename, locations, toData, MAX_BYTES, MAX_IMAGES, PREFIX, BUCKET };
  root.ImageAssets = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
