// Projektlagring i localStorage.
// Projekt: { id, templateId, name, values: { [slotIndex]: string }, updatedAt }
window.Storage = (function () {
  const KEY = 'templates.projects.v1';

  function readAll() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
      return [];
    }
  }

  function writeAll(projects) {
    try {
      localStorage.setItem(KEY, JSON.stringify(projects));
      return true;
    } catch (e) {
      // Oftast: utrymmet fullt (stora bilder)
      console.error('Kunde inte spara projekt:', e);
      return false;
    }
  }

  return {
    list() {
      return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
    },
    get(id) {
      return readAll().find(p => p.id === id) || null;
    },
    save(project) {
      const all = readAll();
      const i = all.findIndex(p => p.id === project.id);
      project.updatedAt = Date.now();
      if (i >= 0) all[i] = project; else all.push(project);
      return writeAll(all);
    },
    remove(id) {
      return writeAll(readAll().filter(p => p.id !== id));
    },
    // Äldre projekt sparade värden platt ({1: "..."}); numera per sidfil.
    migrate(project) {
      const keys = Object.keys(project.values || {});
      const isFlat = keys.length && keys.every(k => /^\d+$/.test(k));
      if (isFlat) project.values = { 'index.html': project.values };
      if (!project.values) project.values = {};
      return project;
    },

    newId() {
      return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    },

    // Ladda ner ett projekt som fil (backup eller flytt till annan enhet)
    downloadProjectFile(project) {
      const data = { app: 'templates', version: 1, project };
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const filename = (project.name || 'projekt').replace(/[\\/:*?"<>|]/g, '_') + '.projekt.json';
      return window.saveFile(blob, filename);
    },

    // Läs in en projektfil; returnerar projektet via callback eller ett felmeddelande
    importProjectFile(file, cb) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          const p = data && data.app === 'templates' && data.project;
          if (data.version !== 1 || !p || !p.templateId || !p.values || typeof p.values !== 'object' || Array.isArray(p.values)) {
            cb(null, 'Filen är inte en giltig projektfil.');
            return;
          }
          if (!window.TEMPLATES.some(t => t.id === p.templateId)) {
            cb(null, 'Projektet använder en template som inte finns i den här versionen.');
            return;
          }
          p.id = this.newId(); // alltid nytt id så inget skrivs över
          delete p.cloudRevision; // importerade filer är alltid nya projekt
          delete p.localRevision;
          delete p.localSaved;
          p.name = p.name || 'Importerat projekt';
          cb(p, null);
        } catch {
          cb(null, 'Filen kunde inte läsas.');
        }
      };
      reader.onerror = () => cb(null, 'Filen kunde inte läsas.');
      reader.readAsText(file);
    }
  };
})();
