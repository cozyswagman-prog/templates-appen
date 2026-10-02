// Editorn: laddar en templatesida i iframe, numrerar alla [data-slot]-element,
// ritar badges i förhandsvisningen och bygger sidopanelens fält.
// Flersidiga templates: varje sida redigeras för sig, värden sparas per sidfil.
window.Editor = (function () {

  const frame = () => document.getElementById('preview-frame');
  const fieldsEl = () => document.getElementById('slot-fields');

  let current = null;   // { project, page, slots: [{el, type, label, num}] }
  let rafPending = false;

  // Normaliserar en template till en lista av sidor (bakåtkompatibel med t.html)
  function pagesOf(template) {
    return template.pages || [{ file: 'index.html', title: 'Hem', html: template.html }];
  }

  // Värden för en viss sida i projektet
  function pageValues(project, file) {
    if (!project.values[file] || typeof project.values[file] !== 'object') {
      project.values[file] = {};
    }
    return project.values[file];
  }

  // ---------- Hjälpare ----------

  function downscaleImage(file, maxSide, cb) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        if (scale === 1 && file.size < 400 * 1024) {
          cb(reader.result); // liten nog, använd som den är
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const isPng = file.type === 'image/png';
        cb(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.85));
      };
      img.onerror = () => cb(null);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  // ---------- Badges i förhandsvisningen ----------

  function injectEditorChrome(doc) {
    const style = doc.createElement('style');
    style.id = '__editorStyle';
    style.textContent = `
      #__slotBadges { position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 99999; }
      .__badge {
        position: absolute;
        width: 26px; height: 26px;
        background: #4f46e5; color: #fff;
        border: 2px solid #fff;
        border-radius: 50%;
        font: 700 12px/22px system-ui, sans-serif;
        text-align: center;
        box-shadow: 0 2px 8px rgba(0,0,0,.35);
        cursor: pointer;
        user-select: none;
        transition: transform .1s;
      }
      .__badge:hover { transform: scale(1.2); }
      [data-slot-active] { outline: 3px solid #4f46e5 !important; outline-offset: 2px; }
    `;
    doc.head.appendChild(style);

    const layer = doc.createElement('div');
    layer.id = '__slotBadges';
    doc.body.appendChild(layer);
    return layer;
  }

  function positionBadges() {
    if (!current) return;
    const doc = frame().contentDocument;
    const layer = doc && doc.getElementById('__slotBadges');
    if (!layer) return;
    const win = frame().contentWindow;
    current.slots.forEach(s => {
      const r = s.el.getBoundingClientRect();
      s.badge.style.left = (r.left + win.scrollX - 10) + 'px';
      s.badge.style.top = (r.top + win.scrollY - 10) + 'px';
      s.badge.style.display = (r.width || r.height) ? 'block' : 'none';
    });
  }

  function schedulePosition() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      positionBadges();
    });
  }

  function highlightSlot(slot, scrollPreview) {
    const doc = frame().contentDocument;
    doc.querySelectorAll('[data-slot-active]').forEach(el => el.removeAttribute('data-slot-active'));
    slot.el.setAttribute('data-slot-active', '');
    if (scrollPreview) slot.el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    document.querySelectorAll('.slot-field.highlight').forEach(f => f.classList.remove('highlight'));
    slot.field.classList.add('highlight');
    setTimeout(() => {
      slot.el.removeAttribute('data-slot-active');
      slot.field.classList.remove('highlight');
    }, 1800);
  }

  // ---------- Sidopanelens fält ----------

  function buildField(slot, values) {
    const wrap = document.createElement('div');
    wrap.className = 'slot-field';
    wrap.innerHTML = `
      <div class="slot-head">
        <span class="slot-num">${slot.num}</span>
        <span class="slot-label"></span>
        <span class="slot-type">${slot.type === 'image' ? 'Bild' : 'Text'}</span>
      </div>`;
    wrap.querySelector('.slot-label').textContent = slot.label;

    if (slot.type === 'image') {
      const row = document.createElement('div');
      row.className = 'img-field';
      const thumb = document.createElement('img');
      thumb.className = 'img-preview';
      thumb.src = slot.el.getAttribute('src');
      const btn = document.createElement('label');
      btn.className = 'img-btn';
      btn.textContent = 'Byt bild…';
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      btn.appendChild(input);
      row.append(thumb, btn);
      wrap.appendChild(row);

      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) return;
        downscaleImage(file, 1600, dataUrl => {
          if (!dataUrl) { window.showToast('Kunde inte läsa bilden.'); return; }
          slot.el.setAttribute('src', dataUrl);
          thumb.src = dataUrl;
          values[slot.num] = dataUrl;
          slot.el.addEventListener('load', schedulePosition, { once: true });
          schedulePosition();
        });
      });
    } else {
      const multiline = slot.el.hasAttribute('data-multiline') || slot.el.textContent.includes('\n');
      const input = document.createElement(multiline ? 'textarea' : 'input');
      if (!multiline) input.type = 'text';
      else input.rows = 3;
      input.value = slot.el.textContent;
      wrap.appendChild(input);

      input.addEventListener('input', () => {
        slot.el.textContent = input.value;
        values[slot.num] = input.value;
        schedulePosition();
      });
    }

    wrap.addEventListener('click', () => highlightSlot(slot, true));
    slot.field = wrap;
    return wrap;
  }

  // ---------- Öppna en sida i ett projekt ----------

  // opts: { pageFile, onSwitchPage(file) }
  function open(project, opts) {
    opts = opts || {};
    current = null;
    const template = window.TEMPLATES.find(t => t.id === project.templateId);
    if (!template) { window.showToast('Templaten hittades inte.'); return; }

    const pages = pagesOf(template);
    const page = pages.find(p => p.file === opts.pageFile) || pages[0];
    const values = pageValues(project, page.file);

    const f = frame();
    f.addEventListener('load', function onload() {
      f.removeEventListener('load', onload);
      const doc = f.contentDocument;
      const win = f.contentWindow;

      // Samla slots i dokumentordning och numrera
      const slots = [];
      doc.querySelectorAll('[data-slot]').forEach((el, i) => {
        slots.push({
          el,
          num: i + 1,
          type: el.getAttribute('data-slot'),
          label: el.getAttribute('data-label') || 'Ruta ' + (i + 1)
        });
      });

      // Återställ sparade värden för den här sidan
      slots.forEach(s => {
        const v = values[s.num];
        if (v == null) return;
        if (s.type === 'image') s.el.setAttribute('src', v);
        else s.el.textContent = v;
      });

      // Länkar mellan sidor i templaten byter sida i editorn.
      // Övriga länkar (mailto, externa) stoppas i förhandsvisningen.
      doc.addEventListener('click', e => {
        const a = e.target.closest && e.target.closest('a[href]');
        if (!a) return;
        const href = a.getAttribute('href');
        if (href.startsWith('#')) return; // ankare funkar som vanligt
        e.preventDefault();
        const target = pages.find(p => p.file === href);
        if (target && opts.onSwitchPage) opts.onSwitchPage(target.file);
      }, true);

      // Badges
      const layer = injectEditorChrome(doc);
      slots.forEach(s => {
        const b = doc.createElement('div');
        b.className = '__badge';
        b.textContent = s.num;
        b.title = s.label;
        b.addEventListener('click', e => {
          e.stopPropagation();
          highlightSlot(s, false);
          s.field.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        layer.appendChild(b);
        s.badge = b;
      });

      // Panelfält
      const fields = fieldsEl();
      fields.innerHTML = '';
      slots.forEach(s => fields.appendChild(buildField(s, values)));

      current = { project, page, slots };

      win.addEventListener('scroll', schedulePosition, { passive: true });
      win.addEventListener('resize', schedulePosition);
      doc.querySelectorAll('img').forEach(img =>
        img.addEventListener('load', schedulePosition));
      positionBadges();
      setTimeout(positionBadges, 300); // efter att bilder/typsnitt satt sig
    });

    f.srcdoc = page.html;
  }

  return { open, pagesOf, repositionBadges: schedulePosition };
})();
