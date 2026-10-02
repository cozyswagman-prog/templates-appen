// App-skal: vyer, hash-routing och koppling mellan galleri ↔ editor.
(function () {
  const viewGallery = document.getElementById('view-gallery');
  const viewEditor = document.getElementById('view-editor');
  const nameInput = document.getElementById('project-name');
  const previewArea = document.getElementById('preview-area');
  const pageTabs = document.getElementById('page-tabs');

  let currentProject = null;
  let currentPageFile = null;

  // ---------- Toast ----------

  let toastTimer = null;
  window.showToast = function (msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  };

  // ---------- Galleri ----------

  function renderGallery() {
    const grid = document.getElementById('template-gallery');
    grid.innerHTML = '';
    window.TEMPLATES.forEach(t => {
      const pages = window.Editor.pagesOf(t);
      const card = document.createElement('div');
      card.className = 'template-card';

      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      const mini = document.createElement('iframe');
      mini.setAttribute('tabindex', '-1');
      mini.setAttribute('title', t.name + ' miniatyr');
      mini.srcdoc = pages[0].html;
      thumb.appendChild(mini);

      const body = document.createElement('div');
      body.className = 'card-body';
      body.innerHTML = `
        <div class="card-title"></div>
        <div class="card-cat"></div>
        <div class="card-actions">
          <button class="btn btn-primary" style="flex:1">Använd denna</button>
        </div>`;
      body.querySelector('.card-title').textContent = t.name;
      body.querySelector('.card-cat').textContent =
        t.category + (pages.length > 1 ? ' · ' + pages.length + ' sidor' : '');
      body.querySelector('button').addEventListener('click', () => {
        location.hash = '#/new/' + t.id;
      });

      card.append(thumb, body);
      grid.appendChild(card);
    });
  }

  function renderProjects() {
    const list = document.getElementById('my-projects');
    const projects = window.Storage.list();
    document.getElementById('no-projects').hidden = projects.length > 0;
    list.innerHTML = '';

    projects.forEach(p => {
      const t = window.TEMPLATES.find(x => x.id === p.templateId);
      const row = document.createElement('div');
      row.className = 'project-row';
      row.innerHTML = `
        <span class="p-name"></span>
        <span class="p-meta"></span>
        <span class="p-actions">
          <button class="btn btn-secondary">Öppna</button>
          <button class="btn btn-secondary btn-fil" title="Ladda ner projektet som fil — för backup eller en annan dator">Spara som fil</button>
          <button class="btn btn-danger">Ta bort</button>
        </span>`;
      row.querySelector('.p-name').textContent = p.name;
      row.querySelector('.p-meta').textContent =
        (t ? t.name : 'Okänd template') + ' · ' +
        new Date(p.updatedAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

      row.querySelector('.btn-secondary').addEventListener('click', () => {
        location.hash = '#/project/' + p.id;
      });
      row.querySelector('.btn-fil').addEventListener('click', () => {
        window.Storage.downloadProjectFile(p);
        window.showToast('Projektfilen laddas ner.');
      });
      row.querySelector('.btn-danger').addEventListener('click', () => {
        if (confirm('Ta bort projektet "' + p.name + '"? Detta går inte att ångra.')) {
          window.Storage.remove(p.id);
          renderProjects();
        }
      });
      list.appendChild(row);
    });
  }

  // ---------- Vyer / routing ----------

  // Äldre projekt sparade värden platt ({1: "..."}); numera per sidfil.
  function migrateValues(project) {
    const keys = Object.keys(project.values || {});
    const isFlat = keys.length && keys.every(k => /^\d+$/.test(k));
    if (isFlat) project.values = { 'index.html': project.values };
    if (!project.values) project.values = {};
  }

  function showGallery() {
    currentProject = null;
    viewEditor.hidden = true;
    viewGallery.hidden = false;
    renderProjects();
  }

  function renderPageTabs() {
    const template = window.TEMPLATES.find(t => t.id === currentProject.templateId);
    const pages = window.Editor.pagesOf(template);
    pageTabs.hidden = pages.length < 2;
    pageTabs.innerHTML = '';
    pages.forEach(p => {
      const b = document.createElement('button');
      b.className = 'page-tab' + (p.file === currentPageFile ? ' active' : '');
      b.textContent = p.title;
      b.addEventListener('click', () => openPage(p.file));
      pageTabs.appendChild(b);
    });
  }

  function openPage(file) {
    currentPageFile = file;
    renderPageTabs();
    window.Editor.open(currentProject, {
      pageFile: file,
      onSwitchPage: openPage
    });
  }

  function showEditor(project) {
    migrateValues(project);
    currentProject = project;
    viewGallery.hidden = true;
    viewEditor.hidden = false;
    nameInput.value = project.name;
    setDevice('desktop');
    const template = window.TEMPLATES.find(t => t.id === project.templateId);
    openPage(window.Editor.pagesOf(template)[0].file);
  }

  function route() {
    const hash = location.hash || '#/';
    let m;
    if ((m = hash.match(/^#\/new\/(.+)$/))) {
      const t = window.TEMPLATES.find(x => x.id === m[1]);
      if (!t) { location.hash = '#/'; return; }
      showEditor({
        id: window.Storage.newId(),
        templateId: t.id,
        name: t.name + ' – min sida',
        values: {},
        updatedAt: Date.now()
      });
    } else if ((m = hash.match(/^#\/project\/(.+)$/))) {
      const p = window.Storage.get(m[1]);
      if (!p) { window.showToast('Projektet hittades inte.'); location.hash = '#/'; return; }
      showEditor(p);
    } else {
      showGallery();
    }
  }

  // ---------- Editorns topprad ----------

  document.getElementById('btn-back').addEventListener('click', () => {
    location.hash = '#/';
  });

  nameInput.addEventListener('input', () => {
    if (currentProject) currentProject.name = nameInput.value;
  });

  document.getElementById('btn-save').addEventListener('click', () => {
    if (!currentProject) return;
    const ok = window.Storage.save(currentProject);
    window.showToast(ok
      ? 'Projektet sparades — du hittar det under "Mina projekt".'
      : 'Kunde inte spara — lagringen är full. Prova mindre bilder.');
  });

  document.getElementById('btn-export').addEventListener('click', async () => {
    if (!currentProject) return;
    try {
      await window.Exporter.exportSite(currentProject);
      window.showToast('Din sajt laddas ner som zip!');
    } catch (e) {
      console.error(e);
      window.showToast('Exporten misslyckades — se konsolen.');
    }
  });

  function setDevice(mode) {
    previewArea.classList.toggle('mobile', mode === 'mobile');
    document.getElementById('btn-desktop').classList.toggle('active', mode === 'desktop');
    document.getElementById('btn-mobile').classList.toggle('active', mode === 'mobile');
    window.Editor.repositionBadges();
    setTimeout(window.Editor.repositionBadges, 250);
  }
  document.getElementById('btn-desktop').addEventListener('click', () => setDevice('desktop'));
  document.getElementById('btn-mobile').addEventListener('click', () => setDevice('mobile'));

  // ---------- Importera projektfil ----------

  document.getElementById('import-file').addEventListener('change', function () {
    const file = this.files && this.files[0];
    this.value = '';
    if (!file) return;
    window.Storage.importProjectFile(file, (project, err) => {
      if (err) { window.showToast(err); return; }
      const ok = window.Storage.save(project);
      if (!ok) { window.showToast('Kunde inte spara — lagringen är full.'); return; }
      renderProjects();
      window.showToast('Projektet "' + project.name + '" importerades.');
    });
  });

  // ---------- Start ----------

  window.addEventListener('hashchange', route);
  renderGallery();
  route();
})();
