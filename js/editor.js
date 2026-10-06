// Editorn: laddar en templatesida i iframe, numrerar alla [data-slot]-element,
// ritar badges i förhandsvisningen och bygger sidopanelens fält.
// Flersidiga templates: varje sida redigeras för sig, värden sparas per sidfil.
window.Editor = (function () {

  const frame = () => document.getElementById('preview-frame');
  const fieldsEl = () => document.getElementById('slot-fields');

  let current = null;   // { project, page, slots: [{el, type, label, num}] }
  let rafPending = false;
  let previewScale = 1;
  let badgesVisible = true;

  // Normaliserar en template till en lista av sidor (bakåtkompatibel med t.html)
  function pagesOf(template) {
    return window.SiteRenderer.pagesOf(template);
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
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      cb(null, 'Välj en PNG-, JPEG-, WebP- eller GIF-bild.'); return;
    }
    if (file.size > 12 * 1024 * 1024) { cb(null, 'Välj en bild som är mindre än 12 MB.'); return; }
    const done = data => {
      try { window.ImageAssets.parse(data); cb(data); }
      catch (error) { cb(null, error.message); }
    };
    const reader = new FileReader();
    reader.onload = () => {
      try { window.ImageAssets.parse(reader.result, 12 * 1024 * 1024); }
      catch (error) { cb(null, error.message); return; }
      const img = new Image();
      img.onload = () => {
        if (!img.width || !img.height || img.width * img.height > 40000000) { cb(null, 'Bilden har för hög upplösning. Välj en bild på högst 40 megapixel.'); return; }
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        if (scale === 1 && file.size < 400 * 1024) {
          done(reader.result); // liten nog, använd som den är
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const isPng = file.type === 'image/png';
        done(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.85));
      };
      img.onerror = () => cb(null);
      img.src = reader.result;
    };
    reader.onerror = () => cb(null);
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
        width: var(--badge-hit, 44px); height: var(--badge-hit, 44px);
        padding: 0; border: 0; background: transparent;
        display: grid; place-items: center;
        cursor: pointer;
        user-select: none;
      }
      .__badge span {
        width: var(--badge-size, 26px); height: var(--badge-size, 26px);
        background: #4f46e5; color: #fff; border: 2px solid #fff; border-radius: 50%;
        font: 700 var(--badge-font, 12px)/1 system-ui, sans-serif;
        display: grid; place-items: center;
        box-shadow: 0 2px 8px rgba(0,0,0,.35);
      }
      .__badge:focus-visible { outline: 3px solid #4f46e5; outline-offset: 2px; }
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
    const size = 44 / previewScale;
    layer.hidden = !badgesVisible;
    layer.style.setProperty('--badge-hit', size + 'px');
    layer.style.setProperty('--badge-size', 26 / previewScale + 'px');
    layer.style.setProperty('--badge-font', 12 / previewScale + 'px');
    const maxLeft = Math.max(0, doc.documentElement.clientWidth - size);
    current.slots.forEach(s => {
      const r = s.el.getBoundingClientRect();
      s.badge.style.left = Math.max(0, Math.min(maxLeft, r.left + win.scrollX - size)) + 'px';
      s.badge.style.top = Math.max(0, r.top + win.scrollY - size / 2) + 'px';
      s.badge.style.display = (r.width || r.height) ? 'grid' : 'none';
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

  function buildField(slot, values, project, opts) {
    const wrap = document.createElement('div');
    wrap.className = 'slot-field';
    wrap.innerHTML = `
      <div class="slot-head">
        <span class="slot-num">${slot.num}</span>
        <span class="slot-label"></span>
        <span class="slot-type">${slot.type === 'image' ? 'Bild' : 'Text'}</span>
      </div>`;
    wrap.querySelector('.slot-label').textContent = slot.label;
    wrap.querySelector('.slot-label').id = 'slot-label-' + slot.num;

    if (slot.type === 'image') {
      const row = document.createElement('div');
      row.className = 'img-field';
      const thumb = document.createElement('img');
      thumb.className = 'img-preview';
      thumb.src = slot.el.getAttribute('src');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'img-btn';
      btn.textContent = 'Byt bild…';
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/webp,image/gif';
      input.setAttribute('aria-label', slot.label);
      btn.addEventListener('click', () => input.click());
      row.append(thumb, btn, input);
      wrap.appendChild(row);

      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) return;
        input.value = '';
        btn.disabled = true;
        if (opts.onBusy) opts.onBusy(true);
        downscaleImage(file, 1600, (dataUrl, error) => {
          btn.disabled = false;
          if (opts.onBusy) opts.onBusy(false);
          if (!current || current.project !== project) return;
          if (!dataUrl) { window.showToast(error || 'Kunde inte läsa bilden.'); return; }
          slot.el.setAttribute('src', dataUrl);
          thumb.src = dataUrl;
          values[slot.num] = dataUrl;
          if (opts.onChange) opts.onChange();
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
      input.setAttribute('aria-labelledby', 'slot-label-' + slot.num);
      wrap.appendChild(input);

      input.addEventListener('input', () => {
        slot.el.textContent = input.value;
        values[slot.num] = input.value;
        const linkKey = slot.el.dataset.linkKey && current?.page.file + ':' + slot.el.dataset.linkKey;
        const linked = linkKey && window.SiteKit.settings(project).links[linkKey];
        if (linked) linked.text = input.value;
        if (opts.onChange) opts.onChange();
        schedulePosition();
      });
      const sharedKey = slot.el.getAttribute('data-shared');
      if (sharedKey) {
        const sync = document.createElement('button');
        sync.className = 'btn btn-secondary shared-field';
        sync.textContent = 'Använd på alla sidor';
        sync.addEventListener('click', () => {
          const template = window.TEMPLATES.find(t => t.id === project.templateId);
          const changed = window.SiteKit.syncShared(project, pagesOf(template), sharedKey, input.value);
          // Fält på den öppna sidan (t.ex. sidfoten) visar det nya namnet direkt.
          if (current && current.project === project) current.slots.forEach(s => {
            const v = pageValues(project, current.page.file)[s.num];
            if (s.type === 'image' || v == null || s.el.textContent === v) return;
            s.el.textContent = v;
            const control = s.field && s.field.querySelector('input[type="text"], textarea');
            if (control) control.value = v;
          });
          if (opts.onChange) opts.onChange();
          window.showToast(changed
            ? 'Namnet används nu på alla sidor, även i ' + changed + (changed === 1 ? ' annat fält' : ' andra fält') + ' där det gamla namnet stod.'
            : 'Namnet används nu på alla sidor.');
          schedulePosition();
        });
        wrap.appendChild(sync);
      }
    }

    wrap.addEventListener('click', () => highlightSlot(slot, true));
    slot.field = wrap;
    return wrap;
  }

  // ---------- Öppna en sida i ett projekt ----------

  // Named settings live beside the numbered fields, preserving old project values.
  function buildSiteSettings(doc, project, page, opts) {
    const root = document.getElementById('site-settings');
    root.replaceChildren();
    const kit = window.SiteKit, site = kit.settings(project), saved = kit.pageSettings(project, page.file);
    const changed = () => { kit.apply(doc, project, page.file); opts.onChange?.(); schedulePosition(); };
    let sequence = 0;
    const group = (title, parent = root) => {
      const box = document.createElement('details'); box.className = 'site-group';
      const summary = document.createElement('summary'); summary.textContent = title;
      box.append(summary); parent.append(box); return box;
    };
    const note = (parent, value) => { const p = document.createElement('p'); p.className='settings-note';p.textContent=value;parent.append(p);return p; };
    const field = (parent, label, value, update, type = 'text', options) => {
      const wrap = document.createElement('label'); wrap.className='settings-field';
      const title = document.createElement('span'); title.textContent=label;wrap.append(title);
      const input=document.createElement(type==='textarea'?'textarea':type==='select'?'select':'input');
      input.id='site-field-'+(++sequence);input.setAttribute('aria-label',label);
      if(type==='select')options.forEach(([v,t])=>{const option=document.createElement('option');option.value=v;option.textContent=t;input.append(option);});
      else if(type==='textarea')input.rows=3;else input.type=type;
      input.value=typeof value==='string'||typeof value==='number'?value:'';
      if(type==='number'){input.min='0';input.step='0.01';}
      input.addEventListener(type==='select'?'change':'input',()=>{update(input.value,input);changed();});
      wrap.append(input);parent.append(wrap);return input;
    };
    const business=group('Företag & funktioner');
    note(business,'Gemensamma uppgifter används i de nya kontaktavsnitten på alla sidor. Knappen nedan uppdaterar även mallens ursprungliga namn och kontakttexter.');
    [['name','Företagsnamn','text'],['phone','Telefon','tel'],['email','E-post','email'],['address','Besöksadress','textarea'],['booking','Bokningslänk (https://)','url'],['formEndpoint','Formuläradress från Formspree','url'],['privacy','Länk till integritetsinformation','url']].forEach(([key,label,type])=>{
      const input=field(business,label,site.business[key],(value,el)=>{
        site.business[key]=value;
        const invalid=value&&(key==='formEndpoint'?!kit.endpoint(value):['booking','privacy'].includes(key)?!kit.safeLink(value):key==='phone'?!kit.safeLink('tel:'+value):false);
        el.setCustomValidity(invalid?'Kontrollera adressen. Använd en fullständig https-adress eller ett giltigt telefonnummer.':'');
        el.setAttribute('aria-invalid',String(!!invalid));
      },type);
      if(key==='formEndpoint')input.placeholder='https://formspree.io/f/dittformulär';
    });
    note(business,'Bokning och betalning öppnar din egen tjänst. För formulär anger du adressen från ett Formspree-konto; det krävs internet och en mottagare. Förhandsvisningen skickar aldrig något.');
    const sync=document.createElement('button');sync.className='btn btn-secondary';sync.textContent='Använd uppgifterna på alla sidor';
    sync.addEventListener('click',()=>{
      const template=window.TEMPLATES.find(t=>t.id===project.templateId),b=site.business;
      pagesOf(template).forEach(p=>{
        const source=new DOMParser().parseFromString(p.html,'text/html'), values=pageValues(project,p.file);
        const all=[...source.querySelectorAll('[data-slot]')];
        const isName=label=>/^(Restaurangens namn|Namn i menyraden|Företagsnamn i toppen|Butikens namn i menyn|Ditt namn|Caféets namn.*|Gymmets namn i toppen|Byråns namn i toppen)$/.test(label);
        const oldNames=all.flatMap((el,i)=>isName(el.dataset.label||'')?[el.textContent,values[i+1]].filter(Boolean):[]);
        source.querySelectorAll('[data-slot="text"]').forEach(el=>{
          const num=all.indexOf(el)+1,label=el.dataset.label||'';
          if(b.name&&isName(label))values[num]=b.name;
          else if(b.phone&&label==='Telefonnummer i toppen')values[num]=b.phone;
          else if(b.name&&label.startsWith('Sidfotstext')){
            let footer=values[num]??el.textContent;
            for(const name of [...new Set(oldNames)].sort((a,b)=>b.length-a.length)){
              const at=footer.toLocaleLowerCase('sv').indexOf(String(name).toLocaleLowerCase('sv'));
              if(at>=0){footer=footer.slice(0,at)+b.name+footer.slice(at+name.length);break;}
            }
            values[num]=footer;
          }
          else if(/^(Kontaktuppgifter|Adress och kontakt)$/.test(label)&&(b.phone||b.email||b.address)){
            const original=values[num]??el.textContent;
            const hours=original.split('\n').filter(line=>/\b\d{1,2}[.:]\d{2}.*[–-].*\d/.test(line));
            values[num]=[b.address,b.phone,b.email,...hours].filter(Boolean).join('\n');
          }
        });
      });
      opts.onChange?.();open(project,opts);window.showToast('Namn och kontakttexter uppdaterade. Kontrollera även sidfot och öppettider.');
    });business.append(sync);

    const links=group('Knappar & länkar på sidan');
    note(links,'Ändra både knapptext och destination. Välj ring, mejl, webbadress eller ett avsnitt på sidan. Tom destination stänger av knappen.');
    doc.querySelectorAll('[data-action],[data-link-key]').forEach(el=>{
      const key=el.dataset.action||page.file+':'+el.dataset.linkKey;
      const box=group(el.dataset.caption||el.textContent.trim()||'Länk',links);
      const get=()=>{if(!site.links[key]||typeof site.links[key]!=='object')site.links[key]={text:el.textContent,url:el.getAttribute('href')||''};return site.links[key];};
      field(box,'Knapptext – '+box.firstChild.textContent,el.textContent,value=>{get().text=value;});
      const existing=el.getAttribute('href')||'';
      const classify=v=>v.startsWith('tel:')?'tel':v.startsWith('mailto:')?'email':v.startsWith('#')?'section':'url';
      let kind=classify(existing);
      let destination;
      const saveDestination=()=>{
        const raw=destination.value.trim(), url=raw?(kind==='tel'?'tel:':kind==='email'?'mailto:':kind==='section'?'#':'')+raw:'';
        get().url=url;const bad=raw&&!kit.safeLink(url);destination.setCustomValidity(bad?'Ange en giltig destination. Webblänkar måste börja med https://.':'');destination.setAttribute('aria-invalid',String(!!bad));
      };
      field(box,'Typ av länk – '+box.firstChild.textContent,kind,value=>{kind=value;saveDestination();},'select',[['url','Webbadress'],['tel','Ring'],['email','Mejla'],['section','Avsnitt på sidan']]);
      destination=field(box,'Destination – '+box.firstChild.textContent,existing.replace(/^(tel:|mailto:|#)/,''),saveDestination);
      const reset=document.createElement('button');reset.className='btn btn-ghost';reset.textContent='Återgå till gemensam länk';reset.addEventListener('click',()=>{delete site.links[key];opts.onChange?.();open(project,opts);});box.append(reset);
    });

    const sections=group('Visa eller dölj avsnitt');
    doc.querySelectorAll('[data-section]').forEach(el=>{
      const label=document.createElement('label');label.className='settings-check';const input=document.createElement('input');input.type='checkbox';input.checked=!el.hidden;
      input.addEventListener('change',()=>{saved.hidden[el.dataset.section]=!input.checked;changed();});label.append(input,document.createTextNode(el.dataset.caption));sections.append(label);
    });
    const content=group('Nya texter på denna sida');
    note(content,'Dessa fält har fasta namn och påverkar inte dina tidigare numrerade rutor. Exempeltexterna behöver ersättas med företagets egna uppgifter.');
    doc.querySelectorAll('[data-content]').forEach(el=>field(content,el.dataset.caption,el.textContent,value=>{saved.content[el.dataset.content]=value;},el.matches('p,blockquote')?'textarea':'text'));
    const filterItems=[...doc.querySelectorAll('[data-filter-item]')];
    if(filterItems.length){const filters=group('Kategorier i filtren');filterItems.forEach((el,i)=>{
      const choices=[...doc.querySelectorAll('[data-filter]')].filter(b=>b.dataset.filter===el.dataset.filterItem&&b.dataset.value!=='all').map(b=>[b.dataset.value,b.textContent]);
      const box=group((el.querySelector('h3,b')?.textContent||el.textContent).slice(0,60),filters);
      choices.forEach(([key,title])=>{const label=document.createElement('label');label.className='settings-check';const input=document.createElement('input');input.type='checkbox';input.checked=el.dataset.categories.split(' ').includes(key);input.addEventListener('change',()=>{const selected=[...box.querySelectorAll('input:checked')].map(x=>x.value);saved.categories[el.dataset.filterItem+'-'+i]=selected.join(' ');changed();});input.value=key;label.append(input,document.createTextNode(title));box.append(label);});
    });}
    const images=group('Bilder, beskrivningar & beskärning');
    doc.querySelectorAll('[data-image-key]').forEach(el=>{
      const key=el.dataset.imageKey,box=group(el.dataset.caption||'Bild',images);
      const get=()=>{if(!saved.images[key]||typeof saved.images[key]!=='object')saved.images[key]={};return saved.images[key];};
      if(!el.hasAttribute('data-slot')){
        const label=document.createElement('label');label.className='settings-field';label.textContent='Byt bild';
        const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp,image/gif';input.setAttribute('aria-label','Byt bild – '+el.dataset.caption);
        input.addEventListener('change',()=>{const file=input.files[0];if(!file)return;input.value='';opts.onBusy?.(true);input.disabled=true;downscaleImage(file,1600,(data,error)=>{opts.onBusy?.(false);input.disabled=false;if(!current||current.project!==project)return;if(data){get().src=data;changed();}else window.showToast(error||'Bilden kunde inte läsas.');});});label.append(input);box.append(label);
      }else note(box,'Byt själva bilden i dess numrerade ruta.');
      field(box,'Bildbeskrivning – '+el.dataset.caption,el.alt,value=>{get().alt=value;});
      field(box,'Bildens fokus – '+el.dataset.caption,saved.images[key]?.focus||'center',value=>{get().focus=value;},'select',[['center','Mitten'],['top','Övre delen'],['bottom','Nedre delen'],['left','Vänster'],['right','Höger']]);
    });
    if(project.templateId==='hemservice'){
      const rates=group('Priser för prisindikatorn');note(rates,'Ange företagets egna priser per m² och tillfälle. Ange tydligt moms och eventuell avdragsgrund; inga avdrag beräknas automatiskt.');
      [['home','Hemstäd – kr per m²'],['move','Flyttstäd – kr per m²'],['deep','Storstäd – kr per m²']].forEach(([key,label])=>field(rates,label,site.rates[key],value=>{site.rates[key]=value;},'number'));
      field(rates,'Förklaring till priset',site.rates.basis,value=>{site.rates.basis=value;},'textarea');
    }
  }

  // opts: sidbyte, ändringsstatus, bildbearbetning och fokus tillbaka till fälten.
  function open(project, opts) {
    opts = opts || {};
    current = null;
    fieldsEl().replaceChildren();
    const template = window.TEMPLATES.find(t => t.id === project.templateId);
    if (!template) { window.showToast('Templaten hittades inte.'); return; }

    const pages = pagesOf(template);
    const page = pages.find(p => p.file === opts.pageFile) || pages[0];
    const values = pageValues(project, page.file);

    const f = frame();
    f.setAttribute('sandbox', 'allow-same-origin');
    f.onload = function () {
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

      window.SiteKit.apply(doc, project, page.file);
      window.SiteKit.activate(doc, true);

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
        const b = doc.createElement('button');
        b.type = 'button';
        b.className = '__badge';
        const number = doc.createElement('span');
        number.textContent = s.num;
        b.appendChild(number);
        b.setAttribute('aria-label', 'Redigera ruta ' + s.num + ': ' + s.label);
        b.title = s.label;
        b.addEventListener('click', e => {
          e.stopPropagation();
          if (opts.onSelect) opts.onSelect();
          highlightSlot(s, false);
          s.field.scrollIntoView({ block: 'center' });
          const control = s.field.querySelector('input[type="text"], textarea, button');
          if (control) control.focus({ preventScroll: true });
        });
        layer.appendChild(b);
        s.badge = b;
      });

      // Panelfält
      const fields = fieldsEl();
      fields.innerHTML = '';
      slots.forEach(s => fields.appendChild(buildField(s, values, project, opts)));

      current = { project, page, slots };
      buildSiteSettings(doc, project, page, opts);
      if (opts.onReady) opts.onReady();

      win.addEventListener('scroll', schedulePosition, { passive: true });
      win.addEventListener('resize', schedulePosition);
      doc.querySelectorAll('img').forEach(img =>
        img.addEventListener('load', schedulePosition));
      positionBadges();
      setTimeout(positionBadges, 300); // efter att bilder/typsnitt satt sig
    };

    f.srcdoc = window.SiteRenderer.previewHtml(page.html);
  }

  function close() {
    current = null;
    frame().onload = null;
  }

  function setBadgesVisible(visible) {
    badgesVisible = visible;
    positionBadges();
  }

  function setPreviewScale(scale) { previewScale = scale; schedulePosition(); }

  return { open, close, pagesOf, setBadgesVisible, setPreviewScale, repositionBadges: schedulePosition };
})();
