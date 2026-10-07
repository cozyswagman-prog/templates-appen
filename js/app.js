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
  // "Titta på mallen": bara visning. Inget projekt finns förrän kunden väljer Använd mallen.
  let lookingAtTemplate = false;
  const badgePreferences = { mobile: true, desktop: innerWidth > 900 };
  let imageBusy = false;
  let saving = false, changes = 0, saved = false, projectContext = null, listRequest = 0;
  const store = () => window.Accounts.store;
  const savedText = () => store().mode === 'cloud' ? 'Sparat på ditt konto' : 'Sparat på den här enheten';
  const saveStatus = document.getElementById('save-status');
  const leaveDialog = document.getElementById('leave-dialog');
  const exportDialog = document.getElementById('export-dialog');
  const sessionDialog = document.getElementById('session-dialog');
  const versionDialog = document.getElementById('version-dialog');
  let versionBusy = false, versionRequest = 0;
  const localVersions = window.__templatesLocal === true && location.hostname === '127.0.0.1' && location.protocol === 'http:';
  document.getElementById('local-version-note').hidden = !localVersions;
  const deleteDialog = document.getElementById('version-delete-dialog');
  let deleteTarget = null, deleteBusy = false, deleteRequest = 0;
  function resetDelete() {
    deleteRequest++; deleteBusy = false; deleteTarget = null; deleteDialog.close();
    document.getElementById('version-delete-check').checked = false;
    document.getElementById('version-delete-check').disabled = false;
    document.getElementById('version-delete-confirm').disabled = true;
    document.getElementById('version-delete-cancel').disabled = false;
    document.getElementById('version-delete-cancel').textContent = 'Behåll versionen';
    document.getElementById('version-delete-error').hidden = true;
    document.getElementById('version-delete-status').textContent = '';
    document.getElementById('version-delete-name').textContent = '';
    document.getElementById('version-delete-meta').textContent = '';
  }
  let versionsRequest = 0, versionsController = null;
  async function renderVersions() {
    const request = ++versionsRequest;
    if (versionsController) versionsController.abort();
    const section = document.getElementById('versions-section'), list = document.getElementById('versions-list');
    const refresh = document.getElementById('versions-refresh'), status = document.getElementById('versions-status');
    const error = document.getElementById('versions-error'), unavailable = document.getElementById('versions-unavailable');
    section.hidden = !localVersions || store().mode !== 'local';
    list.replaceChildren(); error.hidden = true; unavailable.hidden = true; status.textContent = '';
    list.setAttribute('aria-busy', 'false'); refresh.disabled = false;
    if (section.hidden) return;
    const context = store().context(), controller = new AbortController(); versionsController = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    status.textContent = 'Hämtar och kontrollerar dina versioner…'; refresh.disabled = true; list.setAttribute('aria-busy', 'true');
    try {
      const sessionResponse = await fetch('/__local/session', { cache: 'no-store', signal: controller.signal });
      if (!sessionResponse.ok) throw new Error('Den lokala tjänsten svarar inte. Starta den och uppdatera listan.');
      const session = await sessionResponse.json();
      if (request !== versionsRequest || context !== store().context()) return;
      const response = await fetch('/__local/versions', { cache: 'no-store', signal: controller.signal, headers: { 'X-Templates-Local': session.token } });
      const result = await response.json();
      if (request !== versionsRequest || context !== store().context()) return;
      if (!response.ok) throw new Error(result.error || 'Listan kunde inte hämtas. Försök igen.');
      if (!Array.isArray(result.versions) || !Number.isInteger(result.used) || !Number.isInteger(result.limit) || !Number.isInteger(result.unavailable)) throw new Error('Listan kunde inte läsas. Uppdatera den igen.');
      const rows = document.createDocumentFragment();
      for (const version of result.versions) {
        const url = new URL(version.previewUrl);
        if (version.published !== false || typeof version.name !== 'string' || typeof version.versionId !== 'string' || !Number.isFinite(Date.parse(version.createdAt)) || url.origin !== session.previewOrigin || url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.search || url.hash || !/^\/[a-f0-9-]{36}\/preview\.html$/.test(url.pathname)) throw new Error('Listan innehöll en ogiltig version. Uppdatera den igen.');
        const row = document.createElement('article'); row.className = 'version-row';
        const description = document.createElement('div'); description.className = 'version-description';
        const name = document.createElement('h3'); name.className = 'version-name'; name.textContent = version.name;
        const meta = document.createElement('p'); meta.className = 'version-meta';
        const template = window.TEMPLATES.find(t => t.id === version.templateId);
        const date = new Intl.DateTimeFormat('sv-SE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Stockholm' }).format(new Date(version.createdAt));
        meta.textContent = (template?.name || 'Hemsida') + ' · ' + date + ' (svensk tid) · Inte publicerad · Version ' + version.versionId.slice(0, 8);
        const link = document.createElement('a'); link.className = 'btn btn-secondary'; link.textContent = 'Öppna granskning';
        link.href = url.href; link.target = '_blank'; link.rel = 'noopener';
        link.setAttribute('aria-label', 'Öppna granskning av ' + version.name + ', ' + date + ', version ' + version.versionId.slice(0, 8));
        const remove = document.createElement('button'); remove.className = 'btn btn-danger'; remove.textContent = 'Ta bort kopia';
        remove.setAttribute('aria-label', 'Ta bort kopia av ' + version.name + ', version ' + version.versionId.slice(0, 8));
        remove.addEventListener('click', () => {
          if (store().mode !== 'local' || deleteBusy) return;
          resetDelete(); deleteTarget = { id: url.pathname.split('/')[1], versionId: version.versionId };
          document.getElementById('version-delete-name').textContent = version.name;
          document.getElementById('version-delete-meta').textContent = date + ' (svensk tid) · Version ' + version.versionId;
          deleteDialog.showModal();
        });
        const download = document.createElement('button'); download.className = 'btn btn-secondary'; download.textContent = 'Ladda ner ZIP';
        download.setAttribute('aria-label', 'Ladda ner ZIP av ' + version.name + ', version ' + version.versionId.slice(0, 8));
        const downloadStatus = document.createElement('p'); downloadStatus.className = 'version-download-status'; downloadStatus.setAttribute('role', 'status');
        download.addEventListener('click', async () => {
          if (download.disabled || store().mode !== 'local') return;
          const current = () => request === versionsRequest && context === store().context() && row.isConnected && !viewGallery.hidden;
          const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 45000);
          download.disabled = true; download.textContent = 'Packar ZIP…'; downloadStatus.textContent = 'Kontrollerar filerna i den sparade versionen…';
          try {
            const auth = await fetch('/__local/session', { cache: 'no-store', signal: abort.signal });
            if (!auth.ok) throw new Error('Den lokala tjänsten svarar inte. Starta den och försök igen.');
            const key = await auth.json();
            if (!current()) return;
            const response = await fetch('/__local/versions/' + url.pathname.split('/')[1] + '/download', {
              cache: 'no-store', signal: abort.signal, headers: { 'X-Templates-Local': key.token }
            });
            if (!response.ok) { const failure = await response.json(); throw new Error(failure.error || 'Nedladdningen misslyckades. Försök igen.'); }
            if (response.headers.get('Content-Type') !== 'application/zip') throw new Error('Svaret var inte en ZIP-fil. Uppdatera listan och försök igen.');
            const blob = await response.blob();
            if (!current()) return;
            const saved = await window.saveFile(blob, 'templates-version-' + version.versionId + '.zip');
            if (current()) downloadStatus.textContent = saved === 'saved'
              ? 'Nedladdningen har startat. Packa upp hela ZIP-filen och öppna index.html. Versionen är inte publicerad.'
              : 'Nedladdningen slutfördes inte. Tryck Ladda ner ZIP för att försöka igen.';
          } catch (failure) {
            if (current()) downloadStatus.textContent = failure.name === 'AbortError' || failure instanceof TypeError
              ? 'Kontakten bröts. Ingen ZIP-fil laddades ner. Kontrollera tjänsten och försök igen.' : failure.message;
          } finally {
            clearTimeout(timer); download.disabled = false; download.textContent = 'Ladda ner ZIP';
          }
        });
        const actions = document.createElement('div'); actions.className = 'version-actions'; actions.append(link, download, remove);
        description.append(name, meta, downloadStatus); row.append(description, actions); rows.append(row);
      }
      list.append(rows);
      status.textContent = result.used === 0
        ? 'Inga granskningsversioner ännu. Öppna ett projekt och välj Mer → Skapa version för granskning.'
        : result.used + ' av ' + result.limit + ' platser använda. Nyast först.';
      unavailable.hidden = result.unavailable === 0;
      unavailable.textContent = result.unavailable + (result.unavailable === 1 ? ' version kunde' : ' versioner kunde')
        + ' inte öppnas eftersom filerna inte kunde verifieras. ' + (result.unavailable === 1 ? 'Kopian finns' : 'Kopiorna finns')
        + ' kvar på datorn och använder fortfarande plats.';
    } catch (failure) {
      if (request !== versionsRequest || context !== store().context()) return;
      error.hidden = false; error.textContent = failure.name === 'AbortError' || failure instanceof TypeError
        ? 'Kontakten med den lokala tjänsten bröts. Starta tjänsten och uppdatera listan. Dina sparade kopior har inte raderats.' : failure.message;
      status.textContent = 'Versionslistan är inte tillgänglig just nu.';
    } finally {
      clearTimeout(timeout);
      if (request === versionsRequest) { refresh.disabled = false; list.setAttribute('aria-busy', 'false'); versionsController = null; }
    }
  }
  document.getElementById('versions-refresh').addEventListener('click', renderVersions);
  document.getElementById('version-delete-cancel').addEventListener('click', () => { if (!deleteBusy) resetDelete(); });
  deleteDialog.addEventListener('cancel', event => { if (deleteBusy) event.preventDefault(); else resetDelete(); });
  document.getElementById('version-delete-check').addEventListener('change', event => {
    document.getElementById('version-delete-confirm').disabled = deleteBusy || !event.target.checked;
  });
  document.getElementById('version-delete-confirm').addEventListener('click', async () => {
    if (!localVersions || store().mode !== 'local' || !deleteTarget || deleteBusy || !document.getElementById('version-delete-check').checked) return;
    const target = { ...deleteTarget }, context = store().context(), request = ++deleteRequest;
    const status = document.getElementById('version-delete-status'), error = document.getElementById('version-delete-error');
    deleteBusy = true; error.hidden = true;
    document.getElementById('version-delete-check').disabled = true;
    document.getElementById('version-delete-confirm').disabled = true;
    document.getElementById('version-delete-cancel').disabled = true;
    status.textContent = 'Kontrollerar och tar bort den valda kopian…';
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const sessionResponse = await fetch('/__local/session', { cache: 'no-store', signal: controller.signal });
      if (!sessionResponse.ok) throw new Error('Den lokala tjänsten svarar inte. Starta tjänsten och uppdatera listan.');
      const session = await sessionResponse.json();
      if (request !== deleteRequest || context !== store().context()) return;
      const response = await fetch('/__local/versions/' + target.id, { method: 'DELETE', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-Templates-Local': session.token }, body: JSON.stringify({ versionId: target.versionId, confirm: true }) });
      const result = await response.json();
      if (request !== deleteRequest || context !== store().context()) return;
      if (!response.ok) throw new Error(result.error || 'Borttagningen kunde inte bekräftas. Uppdatera listan.');
      if (result.deleted !== true || result.versionId !== target.versionId) throw new Error('Borttagningen kunde inte bekräftas. Uppdatera listan.');
      resetDelete(); await renderVersions(); window.showToast('Granskningskopian är borttagen. Utkastet och övriga versioner finns kvar.');
    } catch (failure) {
      if (request !== deleteRequest || context !== store().context()) return;
      error.hidden = false; error.textContent = failure.name === 'AbortError' || failure instanceof TypeError
        ? 'Kontakten bröts och borttagningen kunde inte bekräftas. Kopian kan redan vara borttagen. Stäng dialogen och uppdatera listan innan ett nytt försök.' : failure.message;
      status.textContent = 'Borttagningen är inte bekräftad.';
      document.getElementById('version-delete-cancel').textContent = 'Stäng';
      // Require a fresh list and a new explicit confirmation after any uncertain outcome.
      deleteTarget = null;
      renderVersions();
    } finally {
      clearTimeout(timeout);
      if (request === deleteRequest) { deleteBusy = false; document.getElementById('version-delete-cancel').disabled = false; }
    }
  });
  function resetVersion() {
    versionRequest++; versionBusy = false; versionDialog.close();
    document.getElementById('version-open').hidden = true;
    document.getElementById('version-open').removeAttribute('href');
    document.getElementById('version-error').hidden = true;
    document.getElementById('version-status').textContent = '';
    document.getElementById('version-create').hidden = false;
    document.getElementById('version-create').disabled = false;
    document.getElementById('version-create').textContent = 'Skapa granskningsversion';
    document.getElementById('version-close').disabled = false;
    document.getElementById('btn-version').hidden = !localVersions || store().mode !== 'local';
    updatePublishButton();
  }

  // ---------- Publicera på nätet (inloggat konto + konfigurerad publiceringstjänst) ----------
  const publishDialog = document.getElementById('publish-dialog');
  const publishCfg = window.TEMPLATES_CLOUD || {};
  const publishClient = window.createPublishClient && publishCfg.publishUrl
    ? window.createPublishClient({ baseUrl: publishCfg.publishUrl, getToken: () => window.Accounts.accessToken() }) : null;
  let publishSite = null, publishBusy = false, publishRequest = 0;
  const publishEl = id => document.getElementById(id);
  function updatePublishButton() { publishEl('btn-publish').hidden = !publishClient || store().mode !== 'cloud' || !store().user; }
  function publishMessage(text, isError = false) {
    publishEl('publish-status').textContent = isError ? '' : text;
    publishEl('publish-error').hidden = !isError; publishEl('publish-error').textContent = isError ? text : '';
  }
  // Abonnemangets läge i klartext. Datum kommer från Stripe via servern (sekunder sedan 1970).
  function showPlan(plan) {
    const day = s => new Date(s * 1000).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' });
    const text = !plan || !plan.status ? ''
      : plan.status === 'past_due' ? 'Senaste betalningen gick inte igenom. Stripe försöker igen – uppdatera betalkortet under Hantera abonnemang.'
      : plan.active && plan.cancelAtPeriodEnd && plan.currentPeriodEnd ? 'Abonnemanget är uppsagt och upphör ' + day(plan.currentPeriodEnd) + '. Du kan publicera fram till dess.'
      : plan.active && plan.currentPeriodEnd ? 'Abonnemanget är aktivt och förnyas ' + day(plan.currentPeriodEnd) + '.'
      : plan.active ? 'Abonnemanget är aktivt.'
      : plan.status === 'canceled' ? 'Ditt tidigare abonnemang har upphört.'
      : plan.status === 'incomplete' ? 'Betalningen är inte klar ännu.'
      : 'Abonnemanget är inte aktivt eftersom betalningen inte gick igenom.';
    publishEl('publish-plan').textContent = text; publishEl('publish-plan').hidden = !text;
    publishEl('publish-manage').hidden = !plan?.manageable;
  }
  async function openPublish() {
    if (!publishClient || !currentProject || imageBusy || publishBusy) return;
    const request = ++publishRequest; publishSite = null;
    document.querySelector('.editor-more').open = false;
    publishEl('publish-site-form').hidden = true; publishEl('publish-open').hidden = true; publishEl('publish-subscribe').hidden = true;
    publishEl('publish-domains').hidden = true; publishEl('publish-domain-list').replaceChildren(); publishEl('publish-domain-status').textContent = '';
    showPlan(null);
    const confirm = publishEl('publish-confirm'); confirm.hidden = false; confirm.disabled = true; confirm.textContent = 'Publicera';
    publishMessage('Hämtar din hemsidas adress…');
    publishDialog.showModal();
    try {
      const { site, domain, addressStyle, customDomains, planRequired, plan, price } = await publishClient.status();
      if (request !== publishRequest) return;
      publishSite = site;
      showPlan(plan);
      if (customDomains && site) { publishEl('publish-domains').hidden = false; loadDomains(request); }
      if (planRequired && !plan?.active) {
        confirm.hidden = true; publishEl('publish-subscribe').hidden = false;
        publishMessage('Publicering ingår i abonnemanget' + (price?.sek ? ', som kostar ' + price.sek.toLocaleString('sv-SE') + ' kr i månaden' + (price.vat === 'exclusive' ? ' exkl. moms' : '') : '') + '. Betalningen görs på Stripes säkra sida, och du kan publicera så snart den är bekräftad. Du kan säga upp när du vill.');
        return;
      }
      if (site) publishMessage(site.active ? 'Din hemsida finns på ' + site.url + ' – den nya versionen ersätter den när allt är klart.' : 'Din adress är ' + site.url + '. Inget är publicerat ännu.');
      else {
        publishEl('publish-site-form').hidden = false;
        publishEl('publish-slug').value = window.suggestPublishSlug(currentProject.name);
        // Gemensam adress (t.ex. workers.dev): https://<domän>/<adress>/, annars <adress>.<domän>.
        publishEl('publish-prefix').hidden = addressStyle !== 'path'; publishEl('publish-prefix').textContent = domain + '/';
        publishEl('publish-domain').textContent = addressStyle === 'path' ? '/' : '.' + domain;
        confirm.textContent = 'Skapa adress och publicera';
        publishMessage('Välj adressen till din hemsida.');
      }
      confirm.disabled = false;
    } catch (error) { if (request === publishRequest) publishMessage(error.message, true); }
  }
  publishEl('btn-publish').addEventListener('click', openPublish);
  // ---------- Egen domän: kunden lägger in en TXT-post; servern kontrollerar den via DNS ----------
  const domainStatus = text => { publishEl('publish-domain-status').textContent = text; };
  function renderDomains(list) {
    const items = list.map(d => {
      const li = document.createElement('li'), name = document.createElement('strong'), state = document.createElement('p');
      name.textContent = d.hostname;
      state.textContent = d.status === 'active' ? 'Aktiv. Hemsidan visas på https://' + d.hostname + '/.'
        : d.status === 'verified' ? 'Domänen är bekräftad som din. Under piloten aktiveras den manuellt, och Templates kontaktar dig innan du behöver ändra något mer i DNS.'
        : 'Väntar på TXT-posten. Lägg in den hos din domänleverantör och välj sedan Kontrollera.';
      li.append(name, state);
      if (d.status === 'pending') {
        const dl = document.createElement('dl');
        for (const [label, value] of [['Typ', d.record.type], ['Namn', d.record.name], ['Värde', d.record.value]]) {
          const dt = document.createElement('dt'), dd = document.createElement('dd'), code = document.createElement('code');
          dt.textContent = label; code.textContent = value; dd.append(code); dl.append(dt, dd);
        }
        const hint = document.createElement('p'); hint.className = 'settings-note';
        hint.textContent = 'Om leverantören själv lägger till ditt domännamn skriver du bara den första delen av namnet. Ändringen kan ta upp till några timmar att synas.';
        li.append(dl, hint);
      }
      const actions = document.createElement('div'); actions.className = 'dialog-actions';
      const button = (text, action) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary'; b.textContent = text; b.setAttribute('aria-label', text + ' ' + d.hostname); b.addEventListener('click', () => domainAction(b, action, d.hostname)); actions.append(b); };
      if (d.status === 'pending') button('Kontrollera', 'verify');
      button('Ta bort', 'remove');
      li.append(actions);
      return li;
    });
    publishEl('publish-domain-list').replaceChildren(...items);
  }
  async function loadDomains(request = publishRequest) {
    try { const list = await publishClient.domains(); if (request === publishRequest) renderDomains(list); }
    catch (error) { if (request === publishRequest) domainStatus(error.message); }
  }
  async function domainAction(button, action, hostname) {
    if (publishBusy) return;
    const request = publishRequest; publishBusy = true; button.disabled = true;
    domainStatus(action === 'add' ? 'Lägger till ' + hostname + '…' : action === 'verify' ? 'Söker efter TXT-posten för ' + hostname + '…' : 'Kopplar bort ' + hostname + '…');
    try {
      const result = action === 'add' ? await publishClient.addDomain(hostname) : action === 'verify' ? await publishClient.verifyDomain(hostname) : await publishClient.removeDomain(hostname);
      if (request !== publishRequest) return;
      domainStatus(action === 'add' ? 'Lägg in TXT-posten nedan hos din domänleverantör för ' + result.hostname + '.' : action === 'verify' ? result.hostname + ' är bekräftad som din domän.' : result.hostname + ' är bortkopplad. Du kan ta bort TXT-posten.');
      if (action === 'add') publishEl('publish-domain-input').value = '';
      await loadDomains(request);
    } catch (error) { if (request === publishRequest) domainStatus(error.message); }
    finally { publishBusy = false; button.disabled = false; }
  }
  publishEl('publish-domain-add').addEventListener('click', () => { const value = publishEl('publish-domain-input').value.trim(); if (value) domainAction(publishEl('publish-domain-add'), 'add', value); else domainStatus('Skriv domänen, till exempel www.dittforetag.se.'); });
  publishEl('publish-domain-input').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); publishEl('publish-domain-add').click(); } });
  publishEl('publish-confirm').addEventListener('click', async () => {
    if (publishBusy || !currentProject || !publishClient) return;
    const request = publishRequest, project = currentProject, confirm = publishEl('publish-confirm');
    publishBusy = true; confirm.disabled = true; publishEl('publish-close').disabled = true;
    try {
      // Re-save even a clean legacy project: account saving prepares all old images.
      publishMessage('Anpassar bilder och sparar inför publicering…');
      const savedBeforePublish = await saveProject(false);
      if (currentProject !== project || dirty || !savedBeforePublish) throw new Error(saveStatus.textContent || 'Projektet kunde inte sparas. Inget har publicerats.');
      if (!publishSite) {
        publishMessage('Skapar din adress…');
        publishSite = await publishClient.createSite(publishEl('publish-slug').value.trim().toLowerCase());
        publishEl('publish-site-form').hidden = true;
      }
      publishMessage('Publicerar… Förra versionen visas tills den nya är klar.');
      const result = await publishClient.publish(publishSite.siteId, project.id, publishSite.revision);
      if (request !== publishRequest) return;
      publishSite = { ...publishSite, revision: result.revision, active: result.versionId };
      publishMessage('Publicerad ' + new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) + ' på ' + result.url + ' (version ' + result.revision + ').');
      const open = publishEl('publish-open'); open.href = result.url; open.hidden = false; confirm.hidden = true;
    } catch (error) {
      if (request !== publishRequest) return;
      publishMessage(error.message, true);
      if (error.code === 'plan') { confirm.hidden = true; publishEl('publish-subscribe').hidden = false; }
      if (error.code === 'conflict') { try { publishSite = (await publishClient.status()).site; } catch { /* visa felet som det är */ } }
    } finally { publishBusy = false; confirm.disabled = false; publishEl('publish-close').disabled = false; }
  });
  publishEl('publish-close').addEventListener('click', () => { if (!publishBusy) { publishRequest++; publishDialog.close(); } });
  publishDialog.addEventListener('cancel', event => { if (publishBusy) event.preventDefault(); else publishRequest++; });
  // Till Stripes egna sidor (betalning eller kundportal). Osparade ändringar sparas först, eftersom sidan lämnas.
  async function goToStripe(button, getUrl, opening) {
    if (publishBusy || !publishClient) return;
    publishBusy = true; button.disabled = true; publishEl('publish-close').disabled = true;
    try {
      if (currentProject && dirty) {
        publishMessage('Sparar dina ändringar…');
        if (!await saveProject(false) || dirty) throw new Error('Projektet kunde inte sparas. Spara innan du lämnar sidan.');
      }
      publishMessage(opening);
      location.assign(await getUrl());
    } catch (error) {
      publishMessage(error.message, true);
      publishBusy = false; button.disabled = false; publishEl('publish-close').disabled = false;
    }
  }
  publishEl('publish-subscribe').addEventListener('click', () => goToStripe(publishEl('publish-subscribe'), () => publishClient.checkout(), 'Öppnar betalsidan hos Stripe…'));
  publishEl('publish-manage').addEventListener('click', () => goToStripe(publishEl('publish-manage'), () => publishClient.portal(), 'Öppnar abonnemangssidan hos Stripe…'));
  // Tillbaka från Stripe: bara ett besked. Rätten att publicera ges av servern när Stripe bekräftat betalningen.
  // Beskedet visas när inloggningen är laddad, eftersom ett kontobyte rensar tidigare besked.
  (function paymentReturn() {
    const params = new URLSearchParams(location.search), outcome = params.get('betalning');
    if (!outcome) return;
    params.delete('betalning');
    history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : '') + location.hash);
    let message = { klar: 'Tack! Abonnemanget aktiveras så snart Stripe har bekräftat betalningen. Det brukar ta någon minut.',
      avbruten: 'Betalningen avbröts. Inget har dragits.',
      hanterat: 'Ändringar i abonnemanget syns här så snart Stripe har bekräftat dem.' }[outcome] || null;
    const show = () => { if (message) { const m = message; message = null; setTimeout(() => window.showToast(m), 0); } };
    window.Accounts.subscribe(show);
    setTimeout(show, 1500);
  })();
  const recovery = window.createDraftRecovery(() => window.sessionStorage);
  let recoveryReady = false, draftScope = null, recoveryOK = false, saveConflict = false;
  const storageScope = () => store().mode === 'cloud' ? 'cloud:' + store().user.id : 'local';
  const auto = window.createAutosave({
    canSave: () => !!currentProject && dirty && !imageBusy && !saving && !viewEditor.hidden
      && !leaveDialog.open && projectContext === store().context()
      && (store().mode === 'cloud' || !!navigator.locks),
    save: () => saveProject(true)
  });
  function recoveryNote() {
    const note = document.getElementById('autosave-note');
    // After a conflict, Spara only conflicts again: point to the file and the latest version instead.
    const savingHelp = auto.paused && saveConflict ? 'Autosparandet är pausat eftersom projektet har ändrats någon annanstans. Välj Mer → Spara som projektfil och öppna sedan projektet på nytt under Mina projekt.'
      : auto.paused ? 'Autosparandet är pausat. Tryck Spara för att försöka igen.'
      : store().mode === 'local' && !navigator.locks ? 'Tryck Spara. Automatisk sparning kräver en nyare webbläsare på en säker adress.'
        : 'Ändringar sparas automatiskt efter en kort paus.';
    note.textContent = savingHelp + (dirty
      ? recoveryOK ? ' En återställningskopia finns i den här fliken tills du stänger den.'
        : ' Återställningskopian kunde inte uppdateras. Spara som projektfil innan du lämnar.'
      : '');
  }
  function checkpoint() {
    if (!currentProject || !dirty || projectContext !== store().context()) return;
    recoveryOK = recovery.write(draftScope, currentProject);
    recoveryNote();
  }
  function renderRecovery() {
    const panel = document.getElementById('recovery-panel');
    const data = recoveryReady && recovery.read(storageScope());
    panel.hidden = !data;
    if (data) {
      const count = recovery.list(storageScope()).length;
      document.getElementById('recovery-description').textContent = 'Osparade ändringar i ”' + data.project.name + '” finns kvar i den här fliken.'
        + (count > 1 ? ' Du har ' + count + ' återställningskopior. Nästa visas när du har tagit hand om den här.' : '');
    }
    document.getElementById('recovery-discard').textContent = 'Ta bort återställningskopian';
    delete document.getElementById('recovery-discard').dataset.armed;
  }

  function markDirty() {
    changes++;
    dirty = true;
    if (!auto.paused) saveStatus.textContent = 'Osparade ändringar';
    checkpoint();
    auto.changed();
  }

  async function saveProject(automatic = false) {
    if (!currentProject || imageBusy || saving) return false;
    if (automatic && !dirty) return true;
    auto.stop();
    if (!automatic) auto.resume();
    const project = currentProject, version = changes;
    let succeeded = false;
    saving = true;
    document.getElementById('btn-save').disabled = true;
    saveStatus.textContent = 'Sparar…';
    try {
      const result = await store().save(project, projectContext);
      if (currentProject !== project) return false;
      project.cloudRevision = result.cloudRevision;
      project.localRevision = result.localRevision;
      project.updatedAt = result.updatedAt;
      saved = true;
      saveConflict = false;
      dirty = changes !== version;
      if (!dirty && result.preparedImages) {
        project.values = result.values;
        if (result.site) project.site = result.site;
        openPage(currentPageFile);
      }
      succeeded = true;
      if (dirty) checkpoint();
      else { recovery.clear(draftScope, project.id); recoveryOK = false; }
      saveStatus.textContent = dirty ? 'Osparade ändringar' : savedText();
      if (!automatic) window.showToast(dirty ? 'Tidigare ändringar sparade. Dina senaste ändringar sparas strax.' : savedText() + ', under Mina projekt.');
      recoveryNote();
      return !dirty;
    } catch (error) {
      if (currentProject === project) {
        auto.pause();
        saveConflict = error.code === 'conflict';
        dirty = true;
        checkpoint();
        saveStatus.textContent = error.message;
        if (!automatic) window.showToast(error.message);
        recoveryNote();
      }
      return false;
    } finally {
      saving = false;
      document.getElementById('btn-save').disabled = imageBusy;
      if (currentProject && dirty && (succeeded || currentProject !== project)) auto.changed();
    }
  }

  function setPreviewOnly(enabled) {
    if (!enabled && browsingTemplate) {
      browsingTemplate = false;
      setDevice(deviceMode);
    }
    if (!enabled) setLookingAtTemplate(false);
    viewEditor.classList.toggle('preview-only', enabled);
    const button = document.getElementById('btn-preview');
    button.textContent = enabled ? (lookingAtTemplate ? 'Använd mallen' : 'Redigera') : 'Förhandsvisa';
    button.setAttribute('aria-pressed', String(enabled));
    requestAnimationFrame(layoutPreview);
  }

  function setLookingAtTemplate(enabled) {
    if (lookingAtTemplate === enabled) return;
    lookingAtTemplate = enabled;
    viewEditor.classList.toggle('looking-at-template', enabled);
    const template = currentProject && window.TEMPLATES.find(t => t.id === currentProject.templateId);
    nameInput.readOnly = enabled;
    nameInput.setAttribute('aria-label', enabled ? 'Mall' : 'Projektnamn');
    if (currentProject) nameInput.value = enabled && template ? template.name : currentProject.name;
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
    // Längre meddelanden visas längre så att de hinner läsas (minst 2,6 s som tidigare).
    toastTimer = setTimeout(() => { t.hidden = true; }, Math.max(2600, String(msg).length * 55));
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
      mini.setAttribute('sandbox', 'allow-same-origin');
      mini.srcdoc = window.SiteRenderer.previewHtml(pages[0].html);
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
        setLookingAtTemplate(true);
        setDevice(deviceMode);
        setPreviewOnly(true);
      });

      card.append(thumb, body);
      grid.appendChild(card);
    });
  }

  async function renderProjects() {
    const list = document.getElementById('my-projects');
    const request = ++listRequest, expected = store().context();
    renderRecovery();
    const error = document.getElementById('projects-error');
    error.hidden = true;
    document.getElementById('projects-retry').hidden = true;
    list.replaceChildren();
    list.setAttribute('aria-busy', 'true');
    document.getElementById('no-projects').hidden = true;
    document.querySelector('.storage-note').textContent = store().mode === 'cloud'
      ? 'Ändringar sparas automatiskt på ditt konto. Internet behövs. Du kan också spara en egen projektfil.'
      : 'Projekten sparas i den här webbläsaren. Spara som fil för en säkerhetskopia eller för att fortsätta på en annan enhet.';
    document.getElementById('no-projects').textContent = store().mode === 'cloud'
      ? 'Ditt konto har inga projekt ännu. Välj en mall eller importera en projektfil.'
      : 'Välj en mall nedan för att börja. När du sparar finns ditt projekt här, i den här webbläsaren.';
    let projects;
    try { projects = await store().list(); }
    catch (e) {
      if (request !== listRequest) return;
      error.textContent = e.message; error.hidden = false;
      document.getElementById('projects-retry').hidden = false;
      list.setAttribute('aria-busy', 'false'); return;
    }
    if (request !== listRequest || expected !== store().context()) return;
    list.setAttribute('aria-busy', 'false');
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

      const openButton = row.querySelector('.btn-secondary');
      openButton.addEventListener('click', async () => {
        openButton.disabled = true; openButton.textContent = 'Öppnar…';
        try { await openProject(p.id, expected); }
        finally { openButton.disabled = false; openButton.textContent = 'Öppna'; }
      });
      row.querySelector('.btn-fil').addEventListener('click', async () => {
        try {
          const full = await store().get(p.id, expected);
          if (!full) throw new Error('Projektet hittades inte.');
          const status = await window.Storage.downloadProjectFile(full);
          if (status === 'saved') window.showToast('Projektfilen laddas ner.');
        } catch (e) { window.showToast(e.message); }
      });
      if (store().mode === 'local' && store().user) {
        const copy = document.createElement('button');
        copy.className = 'btn btn-secondary'; copy.textContent = 'Kopiera till mitt konto';
        copy.addEventListener('click', async () => {
          copy.disabled = true;
          try { await store().copyToAccount(p, expected); copy.textContent = 'Kopierat till kontot'; window.showToast('En kopia finns nu på ditt konto. Originalet finns kvar på enheten.'); }
          catch (e) { copy.disabled = false; window.showToast(e.message); }
        });
        row.querySelector('.p-actions').append(copy);
      }

      // Radering i två steg — dialogrutor (confirm) fungerar inte överallt
      const delBtn = row.querySelector('.btn-danger');
      let armedTimer = null;
      delBtn.addEventListener('click', async () => {
        if (delBtn.dataset.armed) {
          clearTimeout(armedTimer);
          delBtn.disabled = true;
          try { await store().remove(p, expected); renderProjects(); window.showToast('Projektet togs bort.'); }
          catch (e) { window.showToast(e.message); delBtn.disabled = false; delete delBtn.dataset.armed; delBtn.textContent = 'Ta bort'; }
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
    renderVersions();
    auto.stop();
    imageBusy = false;
    window.Editor.close();
    document.getElementById('slot-fields').replaceChildren();
    document.getElementById('site-settings').replaceChildren();
    document.getElementById('preview-frame').srcdoc = '';
    nameInput.value = '';
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
    const editingProject = currentProject;
    window.Editor.open(currentProject, {
      pageFile: file,
      onSwitchPage: openPage,
      onChange: markDirty,
      onSelect: () => setPreviewOnly(false),
      onReady: () => { layoutPreview(); window.Editor.setBadgesVisible(showBadges); },
      onBusy: busy => {
        if (currentProject !== editingProject) return;
        imageBusy = busy;
        ['btn-save', 'btn-export', 'btn-project-file', 'btn-version'].forEach(id => {
          document.getElementById(id).disabled = busy || (id === 'btn-save' && saving);
        });
        document.querySelectorAll('.img-btn').forEach(button => { button.disabled = busy; });
        document.querySelectorAll('#site-settings button, #site-settings input[type=file]').forEach(control => { control.disabled = busy; });
        if (busy) saveStatus.textContent = 'Bearbetar bilden…';
        else if (!auto.paused) saveStatus.textContent = dirty ? 'Osparade ändringar'
          : saved ? savedText() : 'Inte sparat ännu';
      }
    });
  }

  function showEditor(project, isSaved = false) {
    resetDelete();
    resetVersion();
    auto.stop(); auto.resume();
    saveConflict = false;
    browsingTemplate = false;
    setLookingAtTemplate(false);
    window.Storage.migrate(project);
    currentProject = project;
    projectContext = store().context();
    draftScope = storageScope();
    recoveryOK = false;
    saved = isSaved;
    changes = 0;
    dirty = false;
    recoveryNote();
    ['btn-save', 'btn-export', 'btn-project-file', 'btn-version'].forEach(id => { document.getElementById(id).disabled = id === 'btn-save' && saving; });
    saveStatus.textContent = saved ? savedText() : 'Inte sparat ännu';
    document.getElementById('btn-save').title = store().mode === 'cloud' ? 'Spara på ditt konto' : 'Spara på den här enheten';
    viewGallery.hidden = true;
    viewEditor.hidden = false;
    nameInput.value = project.name;
    document.getElementById('settings-disclosure').open = false;
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

  async function openProject(id, expected) {
    try {
      if (recovery.list(storageScope()).some(data => data.project.id === id)) {
        renderRecovery();
        document.getElementById('recovery-panel').scrollIntoView({ block: 'center' });
        window.showToast('Det finns osparade ändringar i projektet. Ta hand om återställningskopian först.');
        return;
      }
      const p = await store().get(id, expected);
      if (!viewEditor.hidden) return;
      if (!p) { window.showToast('Projektet hittades inte.'); return; }
      showEditor(p, true);
    } catch (e) { window.showToast(e.message); }
  }

  // ---------- Editorns topprad ----------

  document.getElementById('btn-back').addEventListener('click', () => {
    if (imageBusy || saving) { window.showToast('Vänta tills bilden eller sparandet är klart.'); return; }
    if (dirty) {
      auto.stop();
      document.getElementById('leave-error').hidden = true;
      leaveDialog.showModal();
    }
    else showGallery();
  });
  document.getElementById('leave-cancel').addEventListener('click', () => { leaveDialog.close(); if (dirty) auto.changed(); });
  leaveDialog.addEventListener('cancel', () => { if (dirty) auto.changed(); });
  document.getElementById('leave-discard').addEventListener('click', () => {
    if (saving) return;
    if (currentProject) recovery.clear(draftScope, currentProject.id);
    leaveDialog.close(); showGallery();
  });
  document.getElementById('leave-save').addEventListener('click', async () => {
    if (await saveProject()) { leaveDialog.close(); showGallery(); }
    else {
      const error = document.getElementById('leave-error');
      error.textContent = 'Det gick inte att spara. Fortsätt redigera och välj Mer → Spara som projektfil för att behålla ditt arbete.';
      error.hidden = false;
    }
  });
  window.addEventListener('beforeunload', e => {
    checkpoint();
    if (deleteBusy || (currentProject && (dirty || imageBusy || saving || versionBusy))) { e.preventDefault(); e.returnValue = ''; }
  });
  window.addEventListener('pagehide', checkpoint);
  document.addEventListener('visibilitychange', () => { if (document.hidden) checkpoint(); });

  nameInput.addEventListener('input', () => {
    if (currentProject) { currentProject.name = nameInput.value; markDirty(); }
  });

  document.getElementById('btn-save').addEventListener('click', () => saveProject());
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
    window.SiteKit.review(currentProject, window.Editor.pagesOf(template)).forEach(warning => {
      const item = document.createElement('li'); item.textContent = warning; review.append(item);
    });
    document.querySelector('.editor-more').open = false;
    exportDialog.showModal();
  });
  document.getElementById('export-cancel').addEventListener('click', () => exportDialog.close());
  document.getElementById('btn-version').addEventListener('click', () => {
    if (!localVersions || !currentProject || imageBusy || store().mode !== 'local') return;
    resetVersion();
    document.querySelector('.editor-more').open = false;
    versionDialog.showModal();
  });
  document.getElementById('version-close').addEventListener('click', () => { if (!versionBusy) resetVersion(); });
  versionDialog.addEventListener('cancel', event => { if (versionBusy) event.preventDefault(); else resetVersion(); });
  document.getElementById('version-create').addEventListener('click', async () => {
    if (!localVersions || versionBusy || !currentProject || imageBusy || store().mode !== 'local' || projectContext !== store().context()) return;
    const request = ++versionRequest, context = projectContext;
    const input = JSON.stringify({ name: currentProject.name, templateId: currentProject.templateId, values: currentProject.values, site: currentProject.site });
    const create = document.getElementById('version-create'), close = document.getElementById('version-close');
    const status = document.getElementById('version-status'), error = document.getElementById('version-error');
    versionBusy = true; create.disabled = true; close.disabled = true; error.hidden = true;
    create.textContent = 'Skapar version…'; status.textContent = 'Kontrollerar bilder och skapar din kopia. Vänta tills granskningen är klar.';
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const sessionResponse = await fetch('/__local/session', { cache: 'no-store', signal: controller.signal });
      if (!sessionResponse.ok) throw new Error('Den lokala tjänsten svarar inte. Starta den och försök igen.');
      const session = await sessionResponse.json();
      if (request !== versionRequest || context !== store().context()) return;
      const response = await fetch('/__local/versions', { method: 'POST', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-Templates-Local': session.token }, body: input });
      const result = await response.json();
      if (request !== versionRequest || context !== store().context()) return;
      if (!response.ok) throw new Error(result.error || 'Versionen kunde inte skapas. Försök igen.');
      const url = new URL(result.previewUrl);
      if (result.published !== false || url.origin !== session.previewOrigin || url.hostname !== '127.0.0.1' || url.protocol !== 'http:' || !/^\/[a-f0-9-]{36}\/preview\.html$/.test(url.pathname)) throw new Error('Ogiltig granskningsadress.');
      const link = document.getElementById('version-open'); link.href = url.href; link.hidden = false;
      create.hidden = true; status.textContent = 'Versionen är klar och sparad på den här datorn. Den är inte publicerad. Öppna den för att granska alla sidor.';
      link.focus();
      renderVersions();
    } catch (failure) {
      if (request !== versionRequest || context !== store().context()) return;
      error.textContent = failure.name === 'AbortError' || failure instanceof TypeError
        ? 'Kontakten med den lokala tjänsten bröts. Utkastet finns kvar. En kopia kan ha skapats, men det kunde inte bekräftas. Kontrollera tjänsten och försök igen.'
        : failure.message;
      error.hidden = false; status.textContent = 'Utkastet har inte ändrats av versionsskapandet.';
    } finally {
      clearTimeout(timeout);
      if (request === versionRequest) { versionBusy = false; create.disabled = false; close.disabled = false; create.textContent = 'Skapa granskningsversion'; }
    }
  });
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
    const expected = store().context();
    window.Storage.importProjectFile(file, async (project, err) => {
      if (err) { window.showToast(err); return; }
      try { await store().save(project, expected); }
      catch (e) { window.showToast(e.message); return; }
      renderProjects();
      window.showToast('Projektet "' + project.name + '" importerades.');
    });
  });

  // ---------- Start ----------

  renderGallery();
  showGallery();
  document.getElementById('projects-retry').addEventListener('click', renderProjects);
  sessionDialog.addEventListener('cancel', e => e.preventDefault());
  document.getElementById('session-backup').addEventListener('click', async () => {
    if (currentProject) await window.Storage.downloadProjectFile(currentProject);
  });
  document.getElementById('session-leave').addEventListener('click', () => {
    if (currentProject) recovery.clear(draftScope, currentProject.id);
    sessionDialog.close(); showGallery();
  });
  document.getElementById('recovery-open').addEventListener('click', () => {
    const scope = storageScope(), data = recovery.read(scope);
    if (!data) return;
    if (!window.TEMPLATES.some(t => t.id === data.project.templateId)) { window.showToast('Mallen kunde inte hittas. Spara återställningskopian som fil.'); return; }
    const project = data.project;
    const oldId = project.id;
    project.id = window.Storage.newId();
    project.name = project.name.slice(0, 180) + ' – återställd';
    delete project.cloudRevision; delete project.localRevision; delete project.localSaved;
    showEditor(project);
    recovery.clear(scope, oldId);
    markDirty();
  });
  document.getElementById('recovery-file').addEventListener('click', async () => {
    const data = recovery.read(storageScope());
    if (data) await window.Storage.downloadProjectFile(data.project);
  });
  document.getElementById('recovery-discard').addEventListener('click', function () {
    if (!this.dataset.armed) {
      this.dataset.armed = '1'; this.textContent = 'Säker? Ta bort kopian';
      setTimeout(() => { delete this.dataset.armed; this.textContent = 'Ta bort återställningskopian'; }, 3000);
      return;
    }
    const data = recovery.read(storageScope());
    if (data) recovery.clear(storageScope(), data.project.id);
    renderRecovery();
  });
  window.Accounts.subscribe(() => {
    resetDelete();
    resetVersion();
    renderVersions();
    clearTimeout(toastTimer);
    document.getElementById('toast').hidden = true;
    if (currentProject && projectContext !== store().context()) {
      auto.pause();
      if (draftScope?.startsWith('cloud:')) recovery.clear(draftScope);
      leaveDialog.close(); exportDialog.close();
      if (dirty || saving || imageBusy) {
        window.Editor.close();
        document.getElementById('slot-fields').replaceChildren();
        document.getElementById('site-settings').replaceChildren();
        document.getElementById('preview-frame').srcdoc = '';
        nameInput.value = '';
        viewEditor.hidden = true;
        viewGallery.hidden = false;
        if (!sessionDialog.open) sessionDialog.showModal();
      } else showGallery();
    }
    if (recoveryReady) recovery.clearAccountsExcept(storageScope());
    renderProjects();
  });
  window.Accounts.init().then(() => {
    recoveryReady = true;
    // A failed/offline auth bootstrap is not an explicit logout. Keep hidden
    // account recovery until its owner can sign in again; never display it locally.
    if (store().user) recovery.clearAccountsExcept(storageScope());
    renderRecovery();
  });

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
