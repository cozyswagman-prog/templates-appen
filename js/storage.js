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
      writeAll(readAll().filter(p => p.id !== id));
    },
    newId() {
      return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    },

    // Ladda ner ett projekt som fil (backup eller flytt till annan dator)
    downloadProjectFile(project) {
      const data = { app: 'templates', version: 1, project };
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (project.name || 'projekt').replace(/[\\/:*?"<>|]/g, '_') + '.projekt.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    },

    // Läs in en projektfil; returnerar projektet via callback eller ett felmeddelande
    importProjectFile(file, cb) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          const p = data && data.app === 'templates' && data.project;
          if (!p || !p.templateId || typeof p.values !== 'object') {
            cb(null, 'Filen är inte en giltig projektfil.');
            return;
          }
          if (!window.TEMPLATES.some(t => t.id === p.templateId)) {
            cb(null, 'Projektet använder en template som inte finns i den här versionen.');
            return;
          }
          p.id = this.newId(); // alltid nytt id så inget skrivs över
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
