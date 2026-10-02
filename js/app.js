// App-skal: vyer, hash-routing och koppling mellan galleri ↔ editor.
(function () {
  const viewGallery = document.getElementById('view-gallery');
  const viewEditor = document.getElementById('view-editor');
  const nameInput = document.getElementById('project-name');
  const previewArea = document.getElementById('preview-area');
  const pageTabs = document.getElementById('page-tabs');

  let currentProject = null;
  let currentPageFile = null;
  let dirty = false;
  let deviceMode = 'desktop';
  let showBadges = true;
  let browsingTemplate = false;
  const badgePreferences = { mobile: true, desktop: innerWidth > 900 };
  let imageBusy = false;
  const saveStatus = document.getElementById('save-status');
  const leaveDialog = document.getElementById('leave-dialog');
  const exportDialog = document.getElementById('export-dialog');

  function markDirty() {
    dirty = true;
    saveStatus.textContent = 'Osparade ändringar';
  }

  function saveProject() {
    if (!currentProject || imageBusy) return false;
    const ok = window.Storage.save(currentProject);
    if (ok) {
      dirty = false;
      saveStatus.textContent = 'Sparat på den här enheten';
    }
    window.showToast(ok ? 'Sparat på den här enheten, under Mina projekt.'
      : 'Kunde inte spara. Spara som projektfil för att behålla ditt arbete.');
    return ok;
  }

  function setPreviewOnly(enabled) {
    if (!enabled && browsingTemplate) {
      browsingTemplate = false;
      setDevice(deviceMode);
    }
    viewEditor.classList.toggle('preview-only', enabled);
    const button = document.getElementById('btn-preview');
    button.textContent = enabled ? 'Redigera' : 'Förhandsvisa';
    button.setAttribute('aria-pressed', String(enabled));
    requestAnimationFrame(layoutPreview);
  }

  function layoutPreview() {
    const viewport = document.getElementById('preview-viewport');
    if (!viewport.clientWidth || !viewport.clientHeight) return;
    const width = deviceMode === 'mobile' ? 390 : 1200;
    const scale = Math.min(1, viewport.clientWidth / width);
    const stage = document.getElementById('preview-stage');
    const frame = document.getElementById('preview-frame');
    stage.style.width = width * scale + 'px';
    stage.style.height = viewport.clientHeight + 'px';
    frame.style.width = width + 'px';
    frame.style.height = viewport.clientHeight / scale + 'px';
    frame.style.transform = 'scale(' + scale + ')';
    window.Editor.setPreviewScale(scale);
    window.Editor.repositionBadges();
  }
  new ResizeObserver(layoutPreview).observe(document.getElementById('preview-viewport'));

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
      mini.setAttribute('scrolling', 'no');
      mini.setAttribute('title', t.name + ' miniatyr');
      mini.srcdoc = pages[0].html;
      thumb.appendChild(mini);
      new ResizeObserver(entries => {
        const width = entries[0].contentRect.width;
        if (width) mini.style.transform = 'scale(' + width / 1200 + ')';
      }).observe(thumb);

      const body = document.createElement('div');
      body.className = 'card-body';
      body.innerHTML = `
        <div class="card-title"></div>
        <div class="card-cat"></div>
        <div class="card-actions">
          <button class="btn btn-secondary btn-look">Titta på mallen</button>
          <button class="btn btn-primary btn-use">Använd denna</button>
        </div>`;
      body.querySelector('.card-title').textContent = t.name;
      body.querySelector('.card-cat').textContent =
        t.category + (pages.length > 1 ? ' · ' + pages.length + ' sidor' : '');
      body.querySelector('.btn-use').addEventListener('click', () => startTemplate(t.id));
      body.querySelector('.btn-look').addEventListener('click', () => {
        startTemplate(t.id);
        browsingTemplate = true;
        setDevice(deviceMode);
        setPreviewOnly(true);
      });

      card.append(thumb, body);
      grid.appendChild(card);
    });
  }

  function renderProjects() {
    const list = document.getElementById('my-projects');
    const projects = window.Storage.list();
    document.getElementById('no-projects').hidden = projects.length > 0;
    document.querySelector('.storage-note').hidden = projects.length === 0;
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
        (t ? t.name : 'Okänd mall') + ' · ' +
        new Date(p.updatedAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

      row.querySelector('.btn-secondary').addEventListener('click', () => openProject(p.id));
      row.querySelector('.btn-fil').addEventListener('click', async () => {
        const status = await window.Storage.downloadProjectFile(p);
        if (status === 'saved') window.showToast('Projektfilen laddas ner.');
      });

      // Radering i två steg — dialogrutor (confirm) fungerar inte överallt
      const delBtn = row.querySelector('.btn-danger');
      let armedTimer = null;
      delBtn.addEventListener('click', () => {
        if (delBtn.dataset.armed) {
          clearTimeout(armedTimer);
          window.Storage.remove(p.id);
          renderProjects();
          window.showToast('Projektet togs bort.');
          return;
        }
        delBtn.dataset.armed = '1';
        delBtn.textContent = 'Säker? Ta bort';
        armedTimer = setTimeout(() => {
          delete delBtn.dataset.armed;
          delBtn.textContent = 'Ta bort';
        }, 3000);
      });
      list.appendChild(row);
    });
  }

  // ---------- Vyer / routing ----------

  function showGallery() {
    window.Editor.close();
    currentProject = null;
    dirty = false;
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
      b.setAttribute('aria-pressed', String(p.file === currentPageFile));
      b.addEventListener('click', () => openPage(p.file));
      pageTabs.appendChild(b);
    });
  }

  function openPage(file) {
    if (imageBusy) { window.showToast('Vänta tills bilden är klar.'); return; }
    currentPageFile = file;
    renderPageTabs();
    window.Editor.open(currentProject, {
      pageFile: file,
      onSwitchPage: openPage,
      onChange: markDirty,
      onSelect: () => setPreviewOnly(false),
      onReady: () => { layoutPreview(); window.Editor.setBadgesVisible(showBadges); },
      onBusy: busy => {
        imageBusy = busy;
        ['btn-save', 'btn-export', 'btn-project-file'].forEach(id => {
          document.getElementById(id).disabled = busy;
        });
        document.querySelectorAll('.img-btn').forEach(button => { button.disabled = busy; });
        if (busy) saveStatus.textContent = 'Bearbetar bilden…';
        else saveStatus.textContent = dirty ? 'Osparade ändringar'
          : window.Storage.get(currentProject.id) ? 'Sparat på den här enheten' : 'Inte sparat ännu';
      }
    });
  }

  function showEditor(project) {
    browsingTemplate = false;
    window.Storage.migrate(project);
    currentProject = project;
    dirty = false;
    saveStatus.textContent = window.Storage.get(project.id) ? 'Sparat på den här enheten' : 'Inte sparat ännu';
    viewGallery.hidden = true;
    viewEditor.hidden = false;
    nameInput.value = project.name;
    setPreviewOnly(false);
    setDevice(matchMedia('(max-width: 900px)').matches ? 'mobile' : 'desktop');
    const template = window.TEMPLATES.find(t => t.id === project.templateId);
    openPage(window.Editor.pagesOf(template)[0].file);
  }

  function startTemplate(templateId) {
    const t = window.TEMPLATES.find(x => x.id === templateId);
    if (!t) return;
    showEditor({
      id: window.Storage.newId(),
      templateId: t.id,
      name: t.name + ' – min sida',
      values: {},
      updatedAt: Date.now()
    });
  }

  function openProject(id) {
    const p = window.Storage.get(id);
    if (!p) { window.showToast('Projektet hittades inte.'); return; }
    showEditor(p);
  }

  // ---------- Editorns topprad ----------

  document.getElementById('btn-back').addEventListener('click', () => {
    if (imageBusy) { window.showToast('Vänta tills bilden är klar.'); return; }
    if (dirty) {
      document.getElementById('leave-error').hidden = true;
      leaveDialog.showModal();
    }
    else showGallery();
  });
  document.getElementById('leave-cancel').addEventListener('click', () => leaveDialog.close());
  document.getElementById('leave-discard').addEventListener('click', () => { leaveDialog.close(); showGallery(); });
  document.getElementById('leave-save').addEventListener('click', () => {
    if (saveProject()) { leaveDialog.close(); showGallery(); }
    else {
      const error = document.getElementById('leave-error');
      error.textContent = 'Det gick inte att spara. Fortsätt redigera och välj Mer → Spara som projektfil för att behålla ditt arbete.';
      error.hidden = false;
    }
  });
  window.addEventListener('beforeunload', e => {
    if (currentProject && (dirty || imageBusy)) { e.preventDefault(); e.returnValue = ''; }
  });

  nameInput.addEventListener('input', () => {
    if (currentProject) { currentProject.name = nameInput.value; markDirty(); }
  });

  document.getElementById('btn-save').addEventListener('click', saveProject);
  document.getElementById('btn-preview').addEventListener('click', () => {
    setPreviewOnly(!viewEditor.classList.contains('preview-only'));
  });
  document.getElementById('btn-badges').addEventListener('click', () => {
    browsingTemplate = false;
    showBadges = !showBadges;
    badgePreferences[deviceMode] = showBadges;
    window.Editor.setBadgesVisible(showBadges);
    document.getElementById('btn-badges').textContent = showBadges ? 'Dölj nummer' : 'Visa nummer';
    document.getElementById('btn-badges').setAttribute('aria-pressed', String(showBadges));
  });
  document.getElementById('btn-project-file').addEventListener('click', async () => {
    if (!currentProject || imageBusy) return;
    const status = await window.Storage.downloadProjectFile(currentProject);
    if (status === 'saved') window.showToast('Projektfilen laddas ner. Den innehåller dina senaste ändringar.');
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    if (!currentProject || imageBusy) return;
    const template = window.TEMPLATES.find(t => t.id === currentProject.templateId);
    const review = document.getElementById('export-review');
    review.replaceChildren();
    window.Editor.pagesOf(template).forEach(page => {
      const doc = new DOMParser().parseFromString(page.html, 'text/html');
      const values = currentProject.values[page.file] || {};
      let images = 0, texts = 0;
      doc.querySelectorAll('[data-slot]').forEach((el, i) => {
        const original = el.getAttribute('data-slot') === 'image' ? el.getAttribute('src') : el.textContent;
        if (values[i + 1] == null || values[i + 1] === original) {
          if (el.getAttribute('data-slot') === 'image') images++; else texts++;
        }
      });
      const item = document.createElement('li');
      item.textContent = page.title + ': ' + images + ' exempelbilder och ' + texts + ' oförändrade textfält.';
      review.appendChild(item);
    });
    document.getElementById('export-summary').textContent = 'Kontrollera att namn, priser, kontaktuppgifter och bilder stämmer. Oförändrade fält kan vara rätt för dig. Du laddar ner hemsidan som en fil; den publiceras inte på nätet.';
    document.querySelector('.editor-more').open = false;
    exportDialog.showModal();
  });
  document.getElementById('export-cancel').addEventListener('click', () => exportDialog.close());
  document.getElementById('confirm-export').addEventListener('click', async () => {
    if (!currentProject) return;
    const button = document.getElementById('confirm-export');
    button.disabled = true;
    try {
      const status = await window.Exporter.exportSite(currentProject);
      if (status === 'saved') window.showToast('Din sajt laddas ner som zip!');
      else if (status === 'error') window.showToast('Exporten kunde inte sparas — försök igen.');
    } catch (e) {
      console.error(e);
      window.showToast('Exporten misslyckades.');
    } finally {
      button.disabled = false;
      exportDialog.close();
    }
  });

  function setDevice(mode) {
    deviceMode = mode;
    showBadges = browsingTemplate ? false : badgePreferences[mode];
    window.Editor.setBadgesVisible(showBadges);
    document.getElementById('btn-badges').textContent = showBadges ? 'Dölj nummer' : 'Visa nummer';
    document.getElementById('btn-badges').setAttribute('aria-pressed', String(showBadges));
    previewArea.classList.toggle('mobile', mode === 'mobile');
    document.getElementById('btn-desktop').classList.toggle('active', mode === 'desktop');
    document.getElementById('btn-mobile').classList.toggle('active', mode === 'mobile');
    document.getElementById('btn-desktop').setAttribute('aria-pressed', String(mode === 'desktop'));
    document.getElementById('btn-mobile').setAttribute('aria-pressed', String(mode === 'mobile'));
    layoutPreview();
  }
  document.getElementById('btn-desktop').addEventListener('click', () => setDevice('desktop'));
  document.getElementById('btn-mobile').addEventListener('click', () => setDevice('mobile'));

  // ---------- Importera projektfil ----------

  document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-file').click());

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

  renderGallery();
  showGallery();

  // ---------- Installera appen ----------
  // Visar en riktig installationsknapp när webbläsaren tillåter (Android/dator),
  // och tydliga instruktioner på iPhone/iPad där knappen inte finns.
  (function installUi() {
    let topLevel = true;
    try { topLevel = window.self === window.top; } catch { topLevel = false; }
    const standalone = matchMedia('(display-mode: standalone)').matches
      || navigator.standalone === true;
    if (!topLevel || standalone) return; // redan installerad, eller inbäddad vy

    const area = document.createElement('div');
    area.className = 'install-area';
    document.querySelector('.app-header').appendChild(area);

    function visaKnapp() {
      area.innerHTML = '';
      const b = document.createElement('button');
      b.className = 'btn btn-primary';
      b.textContent = '📲 Installera appen';
      b.addEventListener('click', async () => {
        const p = window.deferredInstallPrompt;
        if (!p) return;
        b.disabled = true;
        try {
          await p.prompt();
          const val = await p.userChoice;
          if (val.outcome === 'accepted') {
            window.showToast('Appen installeras — kolla hemskärmen!');
            area.remove();
          } else visaTips();
        } catch {
          visaTips();
        } finally {
          window.deferredInstallPrompt = null;
        }
      });
      area.appendChild(b);
    }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    function visaTips() {
      area.innerHTML = '<p class="install-tip">Du kan använda appen direkt här. Om din webbläsare stöder installation hittar du ”Installera app” eller ”Lägg till på hemskärmen” i dess meny.</p>';
    }
    if (window.deferredInstallPrompt) visaKnapp();
    window.addEventListener('installready', visaKnapp);
    window.addEventListener('appinstalled', () => area.remove());

    if (isIos) {
      area.innerHTML =
        '<p class="install-tip">Installera: öppna sidan i <strong>Safari</strong>, ' +
        'tryck på <strong>Dela</strong>-knappen <span aria-hidden="true">(fyrkanten med pil)</span> ' +
        'och välj <strong>”Lägg till på hemskärmen”</strong>.</p>';
    } else {
      // Android/dator: om webbläsaren inte erbjuder installation inom några
      // sekunder, visa hur man gör manuellt.
      setTimeout(() => {
        if (!window.deferredInstallPrompt && !area.querySelector('button') && !area.innerHTML) {
          visaTips();
        }
      }, 4000);
    }
  })();

  if (window.APP_VERSION) {
    const f = document.createElement('p');
    f.className = 'empty-note';
    f.style.textAlign = 'center';
    f.style.marginTop = '48px';
    f.textContent = 'Templates v' + window.APP_VERSION;
    document.querySelector('.gallery-main').appendChild(f);
  }
})();
