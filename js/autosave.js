(function (root) {
  // One trailing save; failures pause until an explicit retry. No background retry loop.
  function createAutosave({ save, canSave, delay = 1500, timers = root }) {
    let timer = null, paused = false;
    const stop = () => { if (timer !== null) timers.clearTimeout(timer); timer = null; };
    return {
      get paused() { return paused; },
      stop,
      pause() { paused = true; stop(); },
      resume() { paused = false; },
      changed() {
        stop();
        if (paused) return;
        timer = timers.setTimeout(() => { timer = null; if (canSave()) void save(); }, delay);
      }
    };
  }
  // Tab-scoped recovery, separate from saved projects. It survives reload, not closing
  // the tab. Callers partition by account and clear private drafts on session changes.
  function createDraftRecovery(getStorage) {
    const prefix = 'templates.recovery.v1:';
    function valid(data) {
      const p = data && data.project;
      return data?.version === 1 && p && typeof p.id === 'string' && typeof p.templateId === 'string'
        && typeof p.name === 'string' && p.values && typeof p.values === 'object' && !Array.isArray(p.values);
    }
    function list(scope) {
      try {
        const data = JSON.parse(getStorage().getItem(prefix + scope));
        if (valid(data)) return [data]; // earlier single-draft format
        return data?.version === 2 && Array.isArray(data.drafts) ? data.drafts.filter(valid) : [];
      } catch { return []; }
    }
    const read = scope => list(scope)[0] || null;
    return {
      read, list,
      write(scope, project) {
        try {
          const drafts = list(scope).filter(data => data.project.id !== project.id);
          drafts.unshift({ version: 1, savedAt: Date.now(), project });
          getStorage().setItem(prefix + scope, JSON.stringify({ version: 2, drafts }));
          return true;
        } catch { return false; }
      },
      clear(scope, id) {
        try {
          const remaining = id ? list(scope).filter(data => data.project.id !== id) : [];
          if (remaining.length) getStorage().setItem(prefix + scope, JSON.stringify({ version: 2, drafts: remaining }));
          else getStorage().removeItem(prefix + scope);
          return true;
        } catch { return false; }
      },
      clearAccountsExcept(scope) {
        try {
          const storage = getStorage();
          for (let i = storage.length - 1; i >= 0; i--) {
            const key = storage.key(i);
            if (key.startsWith(prefix + 'cloud:') && key !== prefix + scope) storage.removeItem(key);
          }
        } catch { /* Storage may be disabled; never claim a recovery copy was written. */ }
      }
    };
  }
  root.createAutosave = createAutosave;
  root.createDraftRecovery = createDraftRecovery;
  if (typeof module !== 'undefined') module.exports = { createAutosave, createDraftRecovery };
})(typeof window === 'undefined' ? globalThis : window);
