// Async project repository. Device projects are never uploaded without an explicit copy.
(function (root) {
  function createProjectStore(local, client) {
    let user = null, mode = 'local', epoch = 0;
    const images = (root.ImageAssets || (typeof require === 'function' ? require('./image-assets.js') : null)).create(client);
    const listeners = new Set();
    const localLock = fn => root.document && root.navigator?.locks ? root.navigator.locks.request('templates.projects.v1', fn) : Promise.resolve().then(fn);
    const conflict = () => Object.assign(new Error('Projektet har ändrats i en annan flik eller tagits bort. Spara dina ändringar som projektfil eller återställ som ett nytt projekt.'), { code: 'conflict' });
    // Key-order independent comparison (jsonb reorders object keys).
    const canonical = v => Array.isArray(v) ? '[' + v.map(canonical).join(',') + ']'
      : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}' : JSON.stringify(v);
    const context = () => epoch + ':' + mode + ':' + (user ? user.id : '');
    const message = error => {
      if (error && error.code === 'PT409') return 'Projektet har ändrats i en annan flik eller är inte längre tillgängligt. Spara dina ändringar som projektfil och öppna den senaste versionen.';
      if (error && error.code === 'PT410') return 'En bild behöver laddas upp igen. Tryck Spara för att försöka igen. Dina ändringar finns kvar; spara gärna en projektfil.';
      if (error && error.code === '23514') return 'Projektet är för stort eller innehåller ogiltiga uppgifter. Spara som projektfil och kontrollera namn och bilder.';
      return 'Kunde inte nå ditt konto. Kontrollera anslutningen och försök igen. Dina ändringar finns kvar här; spara som projektfil för en egen kopia.';
    };
    function assertContext(expected) {
      if (expected !== context()) throw new Error('Kontot eller lagringsplatsen har ändrats. Öppna projektet igen innan du sparar.');
    }
    async function request(query, expected) {
      const result = await query;
      assertContext(expected);
      if (result.error) throw Object.assign(new Error(message(result.error)), result.error.code === 'PT409' ? { code: 'conflict' } : {});
      return result.data;
    }
    const fromRow = row => row && ({ ...row.content, id: row.id, updatedAt: Date.parse(row.updated_at), cloudRevision: row.revision });
    function contentOf(copy) {
      const content = { name: copy.name.trim(), templateId: copy.templateId, values: copy.values };
      if (copy.site) content.site = copy.site;
      if (!content.name || content.name.length > 200) throw new Error('Ge projektet ett namn med 1–200 tecken.');
      if (new TextEncoder().encode(JSON.stringify(content)).length > 20 * 1024 * 1024) throw new Error('Projektet är för stort för kontolagring (max 20 MB). Spara som projektfil och minska antalet stora bilder.');
      return content;
    }
    async function prepareImages(content, expected) {
      if (root.document && !root.ImageProcessing) throw new Error('Bildverktyget kunde inte laddas. Ladda om appen och försök igen.');
      return root.ImageProcessing ? root.ImageProcessing.project(content, () => assertContext(expected)) : { project: content, changed: 0 };
    }
    const api = {
      get mode() { return mode; }, get user() { return user; }, context,
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
      setUser(next) {
        if ((next && next.id) === (user && user.id)) { user = next; return; }
        user = next; mode = next ? 'cloud' : 'local'; epoch++;
        listeners.forEach(fn => fn());
      },
      setMode(next) {
        if (!['local', 'cloud'].includes(next) || (next === 'cloud' && !user)) throw new Error('Logga in först.');
        if (mode !== next) { mode = next; epoch++; listeners.forEach(fn => fn()); }
      },
      async list() {
        if (mode === 'local') return local.list().map(project => ({ ...project, localSaved: true }));
        const rows = await request(client.from('projects').select('id,revision,updated_at,name:content->>name,template_id:content->>templateId').order('updated_at', { ascending: false }), context());
        return rows.map(row => ({ id: row.id, name: row.name, templateId: row.template_id, updatedAt: Date.parse(row.updated_at), cloudRevision: row.revision }));
      },
      async get(id, expected = context()) {
        assertContext(expected);
        if (mode === 'local') { const project = local.get(id); return project ? { ...project, localSaved: true } : null; }
        const owner = user.id;
        const row = await request(client.from('projects').select('id,content,revision,updated_at').eq('id', id).maybeSingle(), expected);
        if (!row) return null;
        const content = await images.unpack(row.content, owner, () => assertContext(expected));
        assertContext(expected);
        return fromRow({ ...row, content });
      },
      async save(project, expected = context()) {
        assertContext(expected);
        const copy = JSON.parse(JSON.stringify(project));
        if (mode === 'local') {
          return localLock(() => {
            assertContext(expected);
            const existing = local.get(copy.id);
            if (!existing && copy.localSaved) throw conflict();
            if ((existing?.localRevision || 0) !== (copy.localRevision || 0)) throw conflict();
            delete copy.cloudRevision;
            copy.localRevision = (existing?.localRevision || 0) + 1;
            copy.localSaved = true;
            if (!local.save(copy)) throw new Error('Kunde inte spara på enheten. Spara som projektfil för att behålla ditt arbete.');
            return copy;
          });
        }
        const owner = user.id, prepared = await prepareImages(contentOf(copy), expected), portable = prepared.project;
        assertContext(expected);
        const content = await images.pack(portable, owner, () => assertContext(expected));
        assertContext(expected);
        let row;
        try { row = (await request(client.rpc('save_project', { p_id: copy.id, p_content: content, p_revision: copy.cloudRevision || 0, p_owner: owner }), expected))[0]; }
        catch (error) {
          if (error.code !== 'conflict') throw error;
          // A previous attempt may have been saved although its response was lost. If the
          // account already holds exactly this content, that save succeeded; anything else
          // remains a conflict and nothing is overwritten.
          let current = null;
          try { current = (await client.from('projects').select('id,content,revision,updated_at').eq('id', copy.id).maybeSingle()).data; } catch { /* keep the conflict */ }
          assertContext(expected);
          if (!current || canonical(current.content) !== canonical(content)) throw error;
          return { ...fromRow({ ...current, content: portable }), preparedImages: prepared.changed };
        }
        if (!row || row.id !== copy.id || row.revision !== (copy.cloudRevision || 0) + 1) throw new Error('Kontot bekräftade inte sparningen. Behåll en projektfil och öppna den sparade versionen innan du försöker igen.');
        // No download after committing: a later network failure must not hide the new revision.
        return { ...fromRow({ ...row, content: portable }), preparedImages: prepared.changed };
      },
      async remove(project, expected = context()) {
        assertContext(expected);
        if (mode === 'local') {
          await localLock(() => {
            assertContext(expected);
            if ((local.get(project.id)?.localRevision || 0) !== (project.localRevision || 0)) throw conflict();
            if (!local.remove(project.id)) throw new Error('Projektet kunde inte tas bort på enheten.');
          });
        } else await request(client.rpc('delete_project', { p_id: project.id, p_revision: project.cloudRevision, p_owner: user.id }), expected);
      },
      async copyToAccount(project, expected = context()) {
        assertContext(expected);
        if (!user || !client) throw new Error('Logga in för att kopiera till ditt konto.');
        const copy = JSON.parse(JSON.stringify(project));
        const owner = user.id;
        const prepared = await prepareImages(contentOf(copy), expected);
        const content = await images.pack(prepared.project, owner, () => assertContext(expected));
        assertContext(expected);
        // Same local id makes repeated attempts non-destructive (conflict, never overwrite).
        await request(client.rpc('save_project', { p_id: copy.id, p_content: content, p_revision: 0, p_owner: owner }), expected);
      }
    };
    return api;
  }
  root.createProjectStore = createProjectStore;
  if (typeof module !== 'undefined') module.exports = { createProjectStore };
})(typeof window === 'undefined' ? globalThis : window);
