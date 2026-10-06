// Hämtar ett projekt för publicering med KUNDENS egen inloggning (aldrig en hemlig nyckel):
// Supabase Auth bekräftar token, RLS begränsar projektraden och de privata bilderna till ägaren.
// Varje bild kontrolleras mot sin innehållsnyckel (SHA-256) och bäddas in som data-URL.
const PREFIX = 'templates-image:v1:';
const NAME = /^[a-f0-9]{64}(-[a-f0-9]{32})?\.(png|jpeg|webp|gif)$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const PROJECT_ID = /^[a-zA-Z0-9_-]{1,100}$/;
const MAX_IMAGE = 2 * 1024 * 1024, MAX_IMAGES = 100;
const fail = (code, message) => Object.assign(new Error(message), { code });
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const base64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };

export function createAccountSource({ url, publishableKey, fetch: request = (...a) => fetch(...a) }) {
  const base = new URL(url).origin;
  if (!/^sb_publishable_/.test(publishableKey || '')) throw fail('config', 'Publiceringen ska bara ha den publika nyckeln.');
  const headers = token => ({ apikey: publishableKey, Authorization: 'Bearer ' + token });
  async function getImage(token, owner, name) {
    const r = await request(base + '/storage/v1/object/authenticated/project-images/' + owner + '/' + name, { headers: headers(token) });
    if (!r.ok) throw fail('image', 'En bild kunde inte hämtas från kontot. Öppna projektet och spara igen.');
    const bytes = new Uint8Array(await r.arrayBuffer());
    if (bytes.length > MAX_IMAGE) throw fail('image', 'En bild är större än 2 MB.');
    if (hex(await crypto.subtle.digest('SHA-256', bytes)) !== name.slice(0, 64)) throw fail('image', 'En bild stämmer inte med sin kontrollsumma.');
    return 'data:image/' + name.split('.').pop() + ';base64,' + base64(bytes);
  }
  return {
    async getUser(token) {
      if (!token) return null;
      const r = await request(base + '/auth/v1/user', { headers: headers(token) });
      if (r.status === 401 || r.status === 403) return null;
      if (!r.ok) throw fail('upstream', 'Kontotjänsten svarar inte just nu.');
      const user = await r.json();
      return user && UUID.test(user.id || '') ? { id: user.id, email: typeof user.email === 'string' ? user.email : null } : null;
    },
    // null = projektet finns inte eller tillhör någon annan (RLS ger då inga rader).
    async loadProject(token, ownerId, projectId) {
      if (!PROJECT_ID.test(projectId || '')) return null;
      const r = await request(base + '/rest/v1/projects?select=owner_id,id,content,revision&id=eq.' + encodeURIComponent(projectId), { headers: { ...headers(token), Accept: 'application/json' } });
      if (!r.ok) throw fail('upstream', 'Projektet kunde inte hämtas från kontot.');
      const row = (await r.json()).find(x => x.owner_id === ownerId && x.id === projectId);
      if (!row) return null;
      const images = new Map();
      const walk = async v => {
        if (typeof v === 'string' && v.startsWith(PREFIX)) {
          const name = v.slice(PREFIX.length);
          if (!NAME.test(name)) throw fail('invalid', 'Projektet innehåller en ogiltig bildreferens.');
          if (!images.has(name)) { if (images.size >= MAX_IMAGES) throw fail('invalid', 'För många bilder.'); images.set(name, await getImage(token, ownerId, name)); }
          return images.get(name);
        }
        if (Array.isArray(v)) { const out = []; for (const x of v) out.push(await walk(x)); return out; }
        if (v && typeof v === 'object') { const out = {}; for (const [k, x] of Object.entries(v)) out[k] = await walk(x); return out; }
        return v;
      };
      return { project: await walk(row.content), revision: row.revision, images: images.size };
    }
  };
}
