// Register över alla templates. Varje template-fil pushar in sig själv här.
window.TEMPLATES = [];

// Självhostade typsnitt (OFL-licens, se fonts/LICENS.txt).
// Relativa sökvägar fungerar både i förhandsvisningen (srcdoc ärver appens
// bas-URL) och i den exporterade sajten (exporten packar med fonts/-mappen).
window.FONTS = {
  inter:    { name: 'Inter' },
  playfair: { name: 'Playfair Display' },
  outfit:   { name: 'Outfit' },
  lora:     { name: 'Lora' }
};

// fontCss('playfair','inter') → @font-face-regler för vikt 400 och 700
window.fontCss = function (...ids) {
  return ids.map(id => {
    const f = window.FONTS[id];
    return [400, 700].map(w =>
      `@font-face{font-family:'${f.name}';font-style:normal;font-weight:${w};` +
      `font-display:swap;src:url('fonts/${id}-${w}.woff2') format('woff2');}`
    ).join('\n');
  }).join('\n');
};

// Platshållarbild som inline-SVG (fungerar helt offline).
// ph(bredd, höjd, bakgrundsfärg, textfärg, etikett)
window.ph = function (w, h, bg, fg, label) {
  // Instruktionen finns i editorns etikett. Text inuti bilden beskärs när
  // samma bild visas med object-fit: cover på olika skärmstorlekar.
  const title = String(label || 'Exempelbild').replace(/[<>&"']/g, char =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<title>${title}</title>` +
    `<rect width="${w}" height="${h}" fill="${bg}"/>` +
    `<rect x="${w * 0.04}" y="${h * 0.07}" width="${w * 0.92}" height="${h * 0.86}" fill="none" stroke="${fg}" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="8 7"/>` +
    `<circle cx="${w / 2}" cy="${h / 2 - h * 0.08}" r="${Math.min(w, h) * 0.09}" fill="${fg}" fill-opacity="0.3"/>` +
    `<path d="M ${w / 2 - Math.min(w, h) * 0.18} ${h / 2 + h * 0.14} l ${Math.min(w, h) * 0.12} -${Math.min(w, h) * 0.12} l ${Math.min(w, h) * 0.08} ${Math.min(w, h) * 0.07} l ${Math.min(w, h) * 0.09} -${Math.min(w, h) * 0.09} l ${Math.min(w, h) * 0.07} ${Math.min(w, h) * 0.14} z" fill="${fg}" fill-opacity="0.3"/>` +
    `</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
};

// Stable, named additions. Original numbered data-slot fields are never moved.
// Kept in this precached file so the complete editor also works offline.
window.SiteKit = (function () {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = (key, label, value, tag = 'p') => `<${tag} data-content="${key}" data-caption="${escape(label)}">${escape(value)}</${tag}>`;
  const picture = (key, label, bg = '#ded8cd', ink = '#645447') => `<img data-image-key="${key}" data-caption="${escape(label)}" src="${window.ph(1000,750,bg,ink,label)}" alt="" loading="lazy">`;
  const action = (key, label) => `<a class="kit-button" data-action="${key}" data-caption="${escape(label)}">${escape(label)}</a>`;
  const section = (key, title, content, extra = '') => `<section class="kit-section ${extra}" data-section="${key}" data-caption="${escape(title)}"><div class="kit-wrap">${text(key+'.title',title+' – rubrik',title,'h2')}${content}</div></section>`;
  const detail = (key, title, body) => `<details class="kit-detail"><summary>${text(key+'.title',title+' – rubrik',title,'span')}</summary>${text(key+'.body',title+' – text',body)}</details>`;
  const palettes = {
    restaurang:['#8c2f2f','#faf6ef','#26201a','#e6d8c5'], salong:['#75404b','#faf3f1','#302329','#e6cfcf'],
    byggfirma:['#14233c','#f4f6f8','#14233c','#d6dfe8'], butik:['#44403c','#faf9f6','#292524','#dfdbd4'],
    portfolio:['#67e8aa','#17171e','#f2f2f5','#3e3e4a'], cafe:['#2f4a3a','#f7f3ec','#2b2b26','#ddd6c7'],
    gym:['#c8f046','#16181d','#f3f5f8','#424753'], konsult:['#17364b','#f9f7f2','#0e2233','#d8d1c3'],
    hemservice:['#12695f','#f5fbfa','#153b36','#cee0db']
  };
  const css = `
    [hidden]{display:none!important} html{scroll-behavior:smooth} body{overflow-wrap:anywhere}
    .kit-section{background:var(--kit-bg);color:var(--kit-ink);padding:72px 0;border-top:1px solid var(--kit-line)}
    .kit-wrap{max-width:1060px;margin:auto;padding:0 24px}.kit-wrap>h2{font-size:clamp(27px,4vw,40px);line-height:1.2;margin:0 0 28px}
    .kit-grid{display:grid;grid-template-columns:1fr 1fr;gap:36px;align-items:start}.kit-grid>*{min-width:0}
    .kit-section p,.kit-detail p{white-space:pre-line;line-height:1.7;margin:12px 0 20px}.kit-section img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;border-radius:3px}
    .kit-section h3{font-size:24px;line-height:1.3;margin:12px 0}.kit-eyebrow{font:700 12px/1.6 system-ui;letter-spacing:.12em;text-transform:uppercase}
    .kit-actions,.kit-filter{display:flex;flex-wrap:wrap;gap:10px;margin:20px 0}.kit-button,.kit-filter button,.kit-next,.kit-back,.kit-form button,.kit-compare button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;padding:10px 18px;border:1px solid var(--kit-accent);border-radius:4px;background:var(--kit-accent);color:var(--kit-on);font:700 15px/1.4 system-ui;text-decoration:none;cursor:pointer;white-space:normal;text-align:center}
    .kit-button[aria-disabled=true]{opacity:.7;cursor:default}.kit-link-note{display:block;font:13px/1.5 system-ui;margin:8px 0;color:var(--kit-ink)}
    .kit-filter{margin:0 0 24px}.kit-filter button{background:transparent;color:var(--kit-ink);border-color:var(--kit-line)}.kit-filter button[aria-pressed=true]{background:var(--kit-accent);color:var(--kit-on);border-color:var(--kit-accent)}
    .kit-detail{border-bottom:1px solid var(--kit-line);padding:8px 0;color:inherit}.kit-detail summary{padding:14px 0;min-height:48px;cursor:pointer;font:700 16px/1.5 system-ui}.kit-detail p{font-size:16px}
    .kit-form{max-width:700px}.kit-form label,.kit-calculator label{display:grid;gap:8px;margin:18px 0;font:600 15px/1.5 system-ui}
    .kit-form input,.kit-form textarea,.kit-form select,.kit-calculator input,.kit-calculator select{width:100%;min-width:0;min-height:48px;padding:12px;border:1px solid var(--kit-line);border-radius:4px;background:var(--kit-bg);color:var(--kit-ink);font:400 16px/1.5 system-ui}
    .kit-form fieldset{border:0;padding:0;margin:0;min-width:0}.kit-form legend{font-weight:700;margin:12px 0}.kit-form [role=status]{min-height:24px}
    .kit-trap{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}.kit-progress{font:700 13px/1.5 system-ui;letter-spacing:.04em}
    .kit-price{font-size:clamp(26px,5vw,44px);font-weight:700;margin:20px 0}.kit-note{font:14px/1.6 system-ui}.kit-quote{font-size:clamp(22px,3vw,32px);line-height:1.5;max-width:760px}
    .kit-compare figure{margin:0}.kit-compare figcaption{font:14px/1.6 system-ui;margin-top:8px}.kit-contact address{font-style:normal;white-space:pre-line}.kit-contact a:not(.kit-button){color:inherit}
    .kit-portfolio .work:first-child{grid-column:1/-1}.kit-portfolio .work:first-child img{max-height:600px;object-fit:cover}
    .kit-salong .price-row{flex-wrap:wrap}.kit-salong .price-row>small{font:14px/1.5 system-ui;flex-basis:100%}.kit-inline{padding:0 18px 18px}.kit-inline h3{font-size:20px}
    .hero-inner .kit-link-note{color:inherit;flex-basis:100%;margin:0}.kit-gym .pass>.kit-button{margin:0 20px 20px}.kit-gym .pass>.kit-link-note{margin:0 20px 20px}
    .kit-form a,.kit-section a:not(.kit-button){color:inherit;text-decoration:underline;text-underline-offset:3px}
    :where(a,button,input,select,textarea,summary):focus-visible{outline:3px solid var(--kit-accent);outline-offset:4px}
    nav a{display:inline-flex;align-items:center;min-height:44px}.kit-choice{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.kit-choice a{white-space:normal}
    @media(max-width:720px){.kit-section{padding:44px 0}.kit-grid,.kit-choice{grid-template-columns:1fr;gap:24px}.kit-wrap{padding:0 22px}.kit-actions>.kit-button{flex:1 1 130px}.kit-filter{gap:8px}.kit-filter button{flex:1 1 auto}.kit-section h3{font-size:23px}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{animation:none!important;transition:none!important}}
  `;

  function filters(doc, selector, categories, choices, group) {
    const items = [...doc.querySelectorAll(selector)];
    if (!items.length) return;
    const row = doc.createElement('div');
    row.className = 'kit-filter'; row.setAttribute('aria-label', 'Filtrera innehåll');
    row.innerHTML = [['all','Alla'],...choices].map(([id,label]) => `<button type="button" data-filter="${group}" data-value="${id}" aria-pressed="${id==='all'}">${label}</button>`).join('');
    items[0].parentElement.before(row);
    items.forEach((el,i) => {el.dataset.filterItem=group;el.dataset.categories=categories[i % categories.length];});
  }
  function compare(key) {
    return `<div class="kit-compare" data-compare><div class="kit-actions"><button type="button" data-view="before" aria-pressed="true">Före</button><button type="button" data-view="after" aria-pressed="false">Efter</button></div><figure data-compare-view="before">${picture(key+'.before','Förebild')}${text(key+'.before.caption','Bildtext före','Före – lägg in en egen bild och beskriv utgångsläget.','figcaption')}</figure><figure data-compare-view="after" hidden>${picture(key+'.after','Efterbild','#c6ccc3','#394b3f')}${text(key+'.after.caption','Bildtext efter','Efter – visa förändringen från samma vinkel.','figcaption')}</figure></div>`;
  }
  function enquiry(kind, title, choices, stepped = false) {
    return section('enquiry',title,`${text('enquiry.intro','Inledning till förfrågan','Berätta vad du behöver hjälp med. En förfrågan är inte en bekräftad bokning.')}<form class="kit-form" data-enquiry data-stepped="${stepped}" method="post">
      <p class="kit-progress" ${stepped?'':'hidden'}>Steg 1 av 3</p>
      <fieldset data-step="0"><legend>Vad behöver du?</legend><label>${kind}<select name="Tjänst">${choices.map(c=>`<option>${escape(c)}</option>`).join('')}</select></label></fieldset>
      <fieldset data-step="1"><legend>Berätta lite mer</legend><label>Önskad tidpunkt<input name="Önskad tidpunkt" placeholder="Till exempel nästa månad" maxlength="160"></label><label>Ort eller område<input name="Ort" autocomplete="address-level2" maxlength="160"></label><label>Beskriv ditt önskemål<textarea name="Meddelande" rows="4" maxlength="4000" required></textarea></label>${kind==='Projekt'?'<label>Ungefärlig budget<input name="Budget" placeholder="Valfritt" maxlength="100"></label>':''}</fieldset>
      <fieldset data-step="2"><legend>Dina kontaktuppgifter</legend><label>Namn<input name="Namn" autocomplete="name" maxlength="160" required></label><label>E-post<input name="email" type="email" autocomplete="email" maxlength="254" required></label><label>Telefon (valfritt)<input name="Telefon" type="tel" autocomplete="tel" maxlength="50"></label><label class="kit-trap" aria-hidden="true">Lämna tomt<input name="_gotcha" tabindex="-1" autocomplete="off"></label><p class="kit-note">Uppgifterna används för att svara på din förfrågan. <a data-privacy hidden>Läs om hur uppgifterna hanteras</a></p></fieldset>
      <div class="kit-actions"><button type="button" class="kit-back" ${stepped?'':'hidden'}>Tillbaka</button><button type="button" class="kit-next" ${stepped?'':'hidden'}>Nästa</button><button type="submit">Skicka förfrågan</button></div><p role="status" aria-live="polite"></p></form>`);
  }

  const faq = {
    restaurang:[['Kan jag boka bord?','Ange hur gästen bokar och vilka tider bokning är möjlig.'],['Har ni specialkost?','Beskriv alternativen och hur gästen kontaktar er om allergier.'],['Kan vi komma som större sällskap?','Beskriv hur gruppbokningar fungerar.']],
    salong:[['Vilken behandling ska jag välja?','Förklara hur kunden får hjälp att välja behandling.'],['Hur avbokar jag?','Fyll i salongens avbokningsvillkor.'],['Vad ingår i priset?','Beskriv vad som ingår och när priset kan variera.']],
    byggfirma:[['Hur börjar vi?','Beskriv första kontakten och eventuell besiktning.'],['Hur lämnar ni pris?','Beskriv offert, tilläggsarbeten och betalningsplan.'],['Vilka områden arbetar ni i?','Fyll i de orter där ni tar uppdrag.']],
    butik:[['Hur levereras varorna?','Fyll i leveranssätt, fraktkostnad och leveranstid.'],['Hur fungerar retur?','Fyll i butikens returinformation och kontaktväg.'],['Kan jag hämta i butik?','Beskriv var och när en beställning kan hämtas.']],
    portfolio:[['Hur går ett samarbete till?','Beskriv startmöte, förslag och leverans.'],['Vad kostar ett uppdrag?','Beskriv vad som påverkar priset och hur offert lämnas.'],['Vad får jag vid leverans?','Beskriv filformat, användning och eventuell uppföljning.']],
    cafe:[['Kan jag beställa till ett firande?','Beskriv vad ni kan baka på beställning och framförhållningen.'],['Finns alternativ för specialkost?','Fyll i korrekt information om utbud och allergener.'],['Hur hittar jag entrén?','Beskriv entré, tillgänglighet och närmaste hållplats.']],
    gym:[['Hur fungerar ett första besök?','Beskriv introduktion och vad besökaren ska ta med.'],['Behöver jag boka passen?','Beskriv bokning och avbokning.'],['Vilka medlemsvillkor gäller?','Fyll i bindningstid, uppsägning och eventuell paus.']],
    konsult:[['Vad händer vid första samtalet?','Beskriv längd, innehåll och eventuell kostnad.'],['Hur prissätts uppdraget?','Beskriv prismodell och när kunden får en offert.'],['Hur arbetar vi tillsammans?','Beskriv kontaktperson, tidplan och uppföljning.']],
    hemservice:[['Vad ingår i städningen?','Beskriv städmoment och eventuella tillval.'],['Behöver jag vara hemma?','Förklara tillträde och nyckelhantering.'],['Hur ändrar jag en bokning?','Fyll i rutiner och villkor för ombokning.']]
  };

  function decorate(template, page) {
    const doc = new DOMParser().parseFromString(page.html,'text/html');
    if(doc.querySelector('#kit-style')) return page;
    const id=template.id, colors=palettes[id]||palettes.konsult;
    const style=doc.createElement('style');style.id='kit-style';style.textContent=`:root{--kit-accent:${colors[0]};--kit-bg:${colors[1]};--kit-ink:${colors[2]};--kit-line:${colors[3]};--kit-on:${['gym','portfolio'].includes(id)?'#17171e':'#fff'}}`+css;doc.head.append(style);
    doc.body.classList.add('kit-'+id);
    // Mark existing links and images before adding new sections; keys stay stable.
    doc.querySelectorAll('a[href]').forEach((el,i)=>{if(!/^(index|meny|kontakt)\.html$/.test(el.getAttribute('href')))el.dataset.linkKey='original-'+i;});
    doc.querySelectorAll('img').forEach((el,i)=>{el.dataset.imageKey='original-'+i;el.dataset.caption=el.getAttribute('data-label')||'Bild '+(i+1);});
    const gallery=doc.querySelector('.gallery');if(gallery){gallery.dataset.section='original-gallery';gallery.dataset.caption='Bildgalleri';}
    let additions='';
    if(id==='restaurang') {
      filters(doc,'.dish',['mat','mat','mat','dessert'],[['mat','Varmrätter'],['dessert','Dessert']],'menu');
      const hero=doc.querySelector('.hero-inner');hero.insertAdjacentHTML('beforeend',`<div class="kit-actions" style="justify-content:center">${action('booking','Boka bord')}<a class="kit-button" href="#kit-lunch">Se dagens lunch</a></div>`);
      additions+=section('lunch','Dagens lunch',`<div class="kit-grid"><div><div class="kit-eyebrow">Från vårt kök</div>${text('lunch.dish','Lunchrätt','Dagens rätt – fyll i veckans meny','h3')}${text('lunch.description','Lunchbeskrivning','Beskriv råvarorna, vad som ingår och vilka dagar lunchen serveras.')}${text('lunch.price','Lunchpris','Ange pris och serveringstid')}</div>${picture('lunch.photo','Bild på lunchrätten')}</div>`);
      additions+=section('signature','Möt köket',`<div class="kit-grid">${picture('signature.photo','Köket eller signaturrätten')}<div>${text('signature.heading','Kökets rubrik','En rätt att återvända till','h3')}${text('signature.story','Kökets berättelse','Berätta om er signaturrätt, råvarorna och människorna bakom maten.')}</div></div>`);
    } else if(id==='salong') {
      doc.querySelectorAll('.price-row').forEach((el,i)=>el.insertAdjacentHTML('beforeend',text('duration.'+i,'Behandling '+(i+1)+' – tid','Ange behandlingstid','small')+action('treatment-'+i,'Boka behandling '+(i+1))));
      additions+=section('inspiration','Hitta din nästa stil',`<div class="kit-grid">${compare('style')}<div>${text('style.heading','Inspiration – rubrik','Från idé till färdig look','h3')}${text('style.story','Inspiration – berättelse','Visa en egen förvandling och beskriv behandling, tidsåtgång och skötselråd.')}${action('booking','Boka konsultation')}</div></div>`);
    } else if(id==='byggfirma') {
      doc.querySelectorAll('.project').forEach((el,i)=>el.insertAdjacentHTML('beforeend',detail('case.'+i,'Om projektet','Beskriv utgångsläget, arbetet och resultatet. Ange bara uppgifter från egna uppdrag.')));
      additions+=section('transformation','Från utgångsläge till färdigt',`<div class="kit-grid">${compare('build')}<div>${text('build.story','Projektberättelse','Berätta vad kunden behövde och hur ni löste uppdraget.')}${text('build.area','Arbetsområde','Fyll i vilka orter ni arbetar i.')}</div></div>`);
      additions+=enquiry('Typ av arbete','Berätta om ditt byggprojekt',['Renovering','Nybyggnation','Projektledning','Annat'],true);
    } else if(id==='butik') {
      const products=[...doc.querySelectorAll('.pbody')].map(e=>e.parentElement);
      products.forEach((el,i)=>{el.classList.add('kit-product');el.insertAdjacentHTML('beforeend',`<div class="kit-inline">${detail('product.'+i,'Detaljer & skötsel','Beskriv material, mått, färgval och hur produkten sköts.')}${action('buy-'+i,'Köp produkten')}</div>`);});
      filters(doc,'.kit-product',['inredning','textil','inredning','dukning','dukning','textil'],[['inredning','Inredning'],['textil','Textil'],['dukning','Dukning']],'products');
      additions+=section('collection','Samla dina favoriter',`<div class="kit-grid">${picture('collection.photo','Bild för kollektionen')}<div><div class="kit-eyebrow">Utvalt med omsorg</div>${text('collection.name','Kollektionens namn','Till dukningen','h3')}${text('collection.story','Kollektionens berättelse','Presentera en samling produkter och berätta hur materialen och formerna passar ihop.')}</div></div>`);
    } else if(id==='portfolio') {
      filters(doc,'.work',['foto','identitet','foto','webb'],[['foto','Foto'],['identitet','Identitet'],['webb','Webb']],'works');
      doc.querySelectorAll('.work').forEach((el,i)=>el.insertAdjacentHTML('beforeend',`<div class="kit-inline">${detail('work.'+i+'.brief','Uppdraget','Beskriv kundens mål och din roll.')}${detail('work.'+i+'.process','Process & resultat','Visa hur du arbetade och vad som levererades.')}</div>`));
      additions+=enquiry('Projekt','Låt oss skapa något tillsammans',['Foto','Visuell identitet','Webb','Annat']);
    } else if(id==='cafe') {
      if(page.file==='index.html') {
        doc.querySelector('.hero-inner').insertAdjacentHTML('beforeend','<div class="kit-actions" style="justify-content:center"><a class="kit-button" href="meny.html">Se menyn</a><a class="kit-button" href="kontakt.html">Planera ditt besök</a></div>');
        additions+=section('weekly','Veckans bakverk',`<div class="kit-grid">${picture('weekly.photo','Veckans bakverk','#e3dccd','#2f4a3a')}<div><div class="kit-eyebrow">Något gott för stunden</div>${text('weekly.name','Bakverkets namn','Veckans favorit','h3')}${text('weekly.story','Bakverkets beskrivning','Fyll i vad som bakas denna vecka, pris och när det finns i disken.')}<a class="kit-button" href="meny.html">Upptäck menyn</a></div></div>`);
        additions+=section('bakery','Bakom disken',text('bakery.story','Bageriets berättelse','Berätta om bageriet, människorna och det som gör ert hantverk speciellt.'));
      } else if(page.file==='meny.html') {
        doc.querySelectorAll('.rad').forEach((el,i)=>el.insertAdjacentHTML('beforeend',text('diet.'+i,'Menyval '+(i+1)+' – kostinformation','Fråga oss om innehåll','small')));
        const menuRows=[...doc.querySelectorAll('.rad')];menuRows.forEach((el,i)=>{el.dataset.filterItem='cafe-menu';el.dataset.categories=i<3?'dryck':'fika';el.style.flexWrap='wrap';el.lastElementChild.style.flexBasis='100%';});
        const h=doc.querySelector('.section-sub');h.insertAdjacentHTML('afterend','<div class="kit-filter" aria-label="Filtrera menyn"><button type="button" data-filter="cafe-menu" data-value="all" aria-pressed="true">Allt</button><button type="button" data-filter="cafe-menu" data-value="dryck" aria-pressed="false">Kaffe & dryck</button><button type="button" data-filter="cafe-menu" data-value="fika" aria-pressed="false">Fika</button></div>');
        doc.querySelectorAll('h3').forEach((el,i)=>{el.dataset.filterItem='cafe-menu';el.dataset.categories=i===0?'dryck':'fika';});
        additions+=section('season','Just nu i bageriet',text('season.story','Säsongens utbud','Beskriv säsongens smaker och eventuella tillfälliga ändringar i sortimentet.'));
      } else {
        additions+=section('visit','Bra att veta inför besöket',`<div class="kit-grid"><div>${text('visit.hours','Avvikande öppettider','Fyll i eventuella helgdagar och avvikande öppettider.','h3')}${text('visit.access','Praktisk besöksinformation','Beskriv entré, barnvagn, tillgänglighet och eventuell uteservering.')}</div>${picture('visit.photo','Bild på entrén')}</div>`);
        additions+=enquiry('Beställning','Tårta, firande eller catering?',['Tårta','Fika till grupp','Catering','Annan fråga']);
      }
    } else if(id==='gym') {
      filters(doc,'.pass',['man ons styrka','tis tors kondition','lor rorlighet'],[['man','Mån'],['tis','Tis'],['ons','Ons'],['tors','Tors'],['lor','Lör'],['styrka','Styrka'],['kondition','Kondition'],['rorlighet','Rörlighet']],'schedule');
      doc.querySelectorAll('.pass').forEach((el,i)=>el.insertAdjacentHTML('beforeend',action('class-'+i,'Boka pass')));
      doc.querySelectorAll('.pris').forEach((el,i)=>el.insertAdjacentHTML('beforeend',action('membership-'+i,'Välj medlemskap')));
      additions+=section('trainers','Träna med oss',`<div class="kit-grid"><div>${picture('trainer.1.photo','Tränare 1')}${text('trainer.1.name','Tränare 1 – namn','Presentera en tränare','h3')}${text('trainer.1.bio','Tränare 1 – inriktning','Beskriv tränarens inriktning och hur hen hjälper nya deltagare.')}</div><div>${picture('trainer.2.photo','Tränare 2')}${text('trainer.2.name','Tränare 2 – namn','Presentera en tränare','h3')}${text('trainer.2.bio','Tränare 2 – inriktning','Beskriv tränarens inriktning och hur hen hjälper nya deltagare.')}</div></div>`);
      additions+=enquiry('Intresse','Börja med ett första besök',['Provträning','Introduktion','Personlig träning','Medlemskap']);
    } else if(id==='konsult') {
      const services=[...doc.querySelectorAll('.tjanst')];services.forEach((el,i)=>{el.id='kit-service-'+i;el.insertAdjacentHTML('beforeend',detail('service.'+i,'Så hjälper vi dig','Beskriv typiska frågor, arbetssätt och vad kunden får med sig.'));});
      additions+=section('guide','Vad behöver du hjälp med?',`<div class="kit-choice">${services.map((el,i)=>`<a class="kit-button" href="#kit-service-${i}">${escape(el.querySelector('h3').textContent)}</a>`).join('')}</div>${text('guide.story','Vägvisarens text','Välj ett område eller boka ett första samtal så hjälper vi dig vidare.')}${action('booking','Boka ett första samtal')}`);
      additions+=section('clientcase','Ett uppdrag från början till slut',`${text('clientcase.heading','Kundberättelsens rubrik','Beskriv ett eget kunduppdrag','h3')}<div class="kit-grid"><div>${text('clientcase.problem','Kundens behov','Vilken fråga behövde kunden lösa?')}</div><div>${text('clientcase.result','Insats och resultat','Vad gjorde ni och vilket resultat fick kunden? Använd bara uppgifter som får publiceras.')}</div></div>`);
    } else if(id==='hemservice') {
      doc.querySelectorAll('.tkort').forEach((el,i)=>el.insertAdjacentHTML('beforeend',detail('included.'+i,'Det här ingår','Fyll i en tydlig lista över momenten som ingår i tjänsten.')));
      additions+=section('estimate','Få en första prisbild',`<div class="kit-grid"><div>${text('estimate.intro','Prisindikator – inledning','Välj tjänst och bostadens storlek. Prisbilden är en uppskattning; ett slutligt pris lämnas efter förfrågan.')}<div class="kit-calculator"><label>Tjänst<select data-calc-service><option value="home">Hemstäd</option><option value="move">Flyttstäd</option><option value="deep">Storstäd</option></select></label><label>Bostadens storlek (m²)<input data-calc-area type="number" min="10" max="1000" step="1" value="70"></label><label>Hur ofta?<select data-calc-frequency><option>En gång</option><option>Varje vecka</option><option>Varannan vecka</option></select></label><output class="kit-price" data-calc-output aria-live="polite"></output><p class="kit-note" data-calc-basis></p><button class="kit-button" type="button" data-calc-transfer>Ta med i förfrågan</button></div></div><div>${picture('estimate.photo','Bild på hemserviceföretaget')}${text('estimate.story','Om hemserviceföretaget','Presentera människorna bakom företaget och hur ni arbetar i kundernas hem.')}</div></div>`);
      additions+=enquiry('Tjänst','Be om ett personligt prisförslag',['Hemstäd','Flyttstäd','Storstäd','Fönsterputs'],true);
    }
    additions+=section('faq','Vanliga frågor',(faq[id]||faq.konsult).map((pair,i)=>detail('faq.'+i,...pair)).join(''));
    additions+=section('reviews','Kundernas egna ord',`${text('review.quote','Kundens omdöme','Lägg in ett äkta omdöme som du har rätt att publicera.','blockquote')}${text('review.source','Omdömets avsändare','Ange avsändare och källa')}`);
    additions+=section('contact','Ta nästa steg',`<div class="kit-grid"><div class="kit-contact"><h3 data-business="name"></h3><address data-business="address"></address><p><a data-business="phone"></a><br><a data-business="email"></a></p></div><div><div class="kit-actions">${action('booking','Boka online')}${action('directions','Hitta hit')}${action('contact','Kontakta oss')}</div><p class="kit-note" data-contact-note>Fyll i företagets kontaktuppgifter i editorn.</p></div></div>`);
    const holder=doc.createElement('div');holder.innerHTML=additions;
    const placements={restaurang:{lunch:['header','after'],signature:['.gallery','after']},salong:{inspiration:['.team','before']},byggfirma:{transformation:['.quote','before'],enquiry:['.quote','before']},butik:{collection:['.about','before']},portfolio:{enquiry:['.kontakt','before']},cafe:{weekly:['.hero','after']},gym:{trainers:['#medlemskap','before'],enquiry:['.kontakt','before']},konsult:{guide:['.hero','after'],clientcase:['.slut','before']},hemservice:{estimate:['.steg','before'],enquiry:['.kontakt','before']}};
    [...holder.children].forEach(el=>{
      el.id='kit-'+el.dataset.section;
      const placement=placements[id]?.[el.dataset.section],anchor=placement&&doc.querySelector(placement[0]);
      if(anchor){anchor[placement[1]](el);return;}
      const footer=doc.querySelector('footer');if(footer)footer.before(el);else doc.body.append(el);
    });
    if(id==='byggfirma')doc.querySelector('.hero .cta')?.setAttribute('href','#kit-enquiry');
    if(id==='hemservice')doc.querySelector('.hero .cta')?.setAttribute('href','#kit-estimate');
    if(id==='gym')doc.querySelector('.hero .cta')?.setAttribute('href','#kit-enquiry');
    doc.querySelector('[data-section="reviews"]').hidden=true;
    // Give all additions a stable heading/field identity; no positional slots are added.
    doc.querySelectorAll('[data-content]').forEach(el=>el.dataset.original=el.textContent);
    doc.querySelectorAll('a[href^="#"]:not([data-link-key])').forEach(el=>el.dataset.linkKey='fragment-'+el.getAttribute('href').slice(1));
    doc.querySelectorAll('[data-link-key]').forEach(el=>el.dataset.defaultHref=el.getAttribute('href')||'');
    return {...page,html:'<!DOCTYPE html>\n'+doc.documentElement.outerHTML};
  }

  function settings(project) {
    const plain=v=>v && typeof v==='object'&&!Array.isArray(v);
    if(!plain(project.site))project.site={};
    for(const key of ['business','links','pages','rates'])if(!plain(project.site[key]))project.site[key]={};
    return project.site;
  }
  function pageSettings(project,file) {
    const site=settings(project);
    if(!site.pages[file]||typeof site.pages[file]!=='object'||Array.isArray(site.pages[file]))site.pages[file]={};
    const p=site.pages[file];for(const key of ['content','images','hidden','categories'])if(!p[key]||typeof p[key]!=='object'||Array.isArray(p[key]))p[key]={};return p;
  }
  function safeLink(value) {
    if(typeof value!=='string')return '';
    value=value.trim();
    if(/[\u0000-\u001f\u007f]/.test(value))return '';
    if(/^#[a-zA-Z][\w-]*$/.test(value)||/^(index|meny|kontakt)\.html$/.test(value))return value;
    if(/^tel:\+?[\d ()-]{3,30}$/.test(value)||/^mailto:[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value))return value;
    try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}
  }
  function endpoint(value) {return typeof value==='string'&&/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(value.trim())?value.trim():'';}
  function apply(doc,project,file) {
    const site=settings(project), p=pageSettings(project,file),b=site.business;
    doc.querySelectorAll('[data-content]').forEach(el=>{if(typeof p.content[el.dataset.content]==='string')el.textContent=p.content[el.dataset.content];});
    doc.querySelectorAll('[data-image-key]').forEach(el=>{const im=p.images[el.dataset.imageKey];if(!im||typeof im!=='object')return;if(typeof im.src==='string'&&/^data:image\/(png|jpeg|webp|gif);base64,/.test(im.src))el.src=im.src;if(typeof im.alt==='string')el.alt=im.alt;el.style.objectPosition=['center','top','bottom','left','right'].includes(im.focus)?im.focus:'center';});
    doc.querySelectorAll('[data-section]').forEach(el=>{const key=el.dataset.section;el.hidden=typeof p.hidden[key]==='boolean'?p.hidden[key]:key==='reviews';});
    doc.querySelectorAll('[data-filter-item]').forEach((el,i)=>{const key=el.dataset.filterItem+'-'+i;if(typeof p.categories[key]==='string')el.dataset.categories=p.categories[key];});
    const automatic={phone:safeLink(b.phone?'tel:'+b.phone:''),email:safeLink(b.email?'mailto:'+b.email:''),booking:safeLink(b.booking),contact:safeLink(b.email?'mailto:'+b.email:''),directions:typeof b.address==='string'&&b.address.trim()?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(b.address):''};
    doc.querySelectorAll('[data-business]').forEach(el=>{const k=el.dataset.business;el.textContent=typeof b[k]==='string'?b[k]:'';if(automatic[k])el.setAttribute('href',automatic[k]);else el.removeAttribute('href');});
    const note=doc.querySelector('[data-contact-note]');if(note)note.hidden=!!(automatic.phone||automatic.email||automatic.booking||automatic.directions);
    doc.querySelectorAll('[data-action],[data-link-key]').forEach(el=>{
      const actionKey=el.dataset.action,key=actionKey||file+':'+el.dataset.linkKey;
      const entry=site.links[key],explicit=entry&&typeof entry==='object';
      let url=explicit?safeLink(entry.url):actionKey?(automatic[actionKey]||(/^treatment-|^class-|^membership-/.test(actionKey)?automatic.booking:'')):el.dataset.defaultHref;
      if(!explicit&&!actionKey&&url?.startsWith('mailto:')&&typeof b.email==='string')url=automatic.email;
      if(!explicit&&!actionKey&&url?.startsWith('tel:')&&typeof b.phone==='string')url=automatic.phone;
      let missingSection=false;
      if(url?.startsWith('#')){const target=doc.getElementById(url.slice(1));missingSection=!target||!!target.closest('[hidden]');if(missingSection)url='';}
      if(explicit&&typeof entry.text==='string'&&entry.text.trim())el.textContent=entry.text;
      if(url){el.setAttribute('href',url);el.removeAttribute('aria-disabled');el.removeAttribute('role');el.removeAttribute('tabindex');}
      else{el.removeAttribute('href');el.setAttribute('aria-disabled','true');el.setAttribute('role','link');el.setAttribute('tabindex','0');}
      // Unconfigured calls to action are explicit, never a pretend booking or purchase.
      let hint=el.nextElementSibling?.classList.contains('kit-link-note')?el.nextElementSibling:null;
      if(!url&&!hint){hint=doc.createElement('small');hint.className='kit-link-note';el.after(hint);}
      if(hint){hint.textContent=missingSection?'Avsnittet är dolt eller saknas.':'Onlinefunktionen är inte ansluten ännu.';hint.hidden=!!url;}
    });
    doc.querySelectorAll('[data-enquiry]').forEach(form=>{form.dataset.endpoint=endpoint(b.formEndpoint);if(form.dataset.endpoint)form.action=form.dataset.endpoint;else form.removeAttribute('action');const privacy=safeLink(b.privacy);const link=form.querySelector('[data-privacy]');link.hidden=!privacy;if(privacy)link.href=privacy;form.querySelector('[type="submit"]').disabled=!form.dataset.endpoint;const status=form.querySelector('[role=status]');status.textContent=form.dataset.endpoint?'':'Formuläret är inte anslutet ännu. Använd företagets telefon eller e-post.';});
    const calc=doc.querySelector('.kit-calculator');if(calc){calc.dataset.rates=JSON.stringify(site.rates);calc.dispatchEvent(new Event('change',{bubbles:true}));}
  }

  // This function is serialized into the exported page: no editor or server dependency.
  function runtime(preview) {
    const doc=document;
    doc.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
      const group=button.dataset.filter,value=button.dataset.value;
      doc.querySelectorAll('[data-filter]').forEach(b=>{if(b.dataset.filter===group)b.setAttribute('aria-pressed',String(b===button));});
      doc.querySelectorAll('[data-filter-item]').forEach(el=>{if(el.dataset.filterItem===group)el.hidden=value!=='all'&&!el.dataset.categories.split(' ').includes(value);});
    }));
    doc.querySelectorAll('[data-compare]').forEach(box=>box.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{
      box.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      box.querySelectorAll('[data-compare-view]').forEach(v=>v.hidden=v.dataset.compareView!==button.dataset.view);
    })));
    doc.querySelectorAll('[data-enquiry]').forEach(form=>{
      form.noValidate=true;
      const steps=[...form.querySelectorAll('[data-step]')],stepped=form.dataset.stepped==='true';let step=0,busy=false;
      const show=()=>{steps.forEach((s,i)=>s.hidden=stepped&&i!==step);form.querySelector('.kit-back').hidden=!stepped||step===0;form.querySelector('.kit-next').hidden=!stepped||step===2;form.querySelector('[type=submit]').hidden=stepped&&step!==2;form.querySelector('.kit-progress').textContent='Steg '+(step+1)+' av 3';};
      const valid=(scope)=>{for(const el of scope.querySelectorAll('input,textarea,select'))if(!el.checkValidity()){el.reportValidity();return false;}return true;};
      form.querySelector('.kit-next').addEventListener('click',()=>{if(valid(steps[step])){step++;show();steps[step].querySelector('input,select,textarea')?.focus();}});
      form.querySelector('.kit-back').addEventListener('click',()=>{step=Math.max(0,step-1);show();steps[step].querySelector('input,select,textarea')?.focus();});show();
      form.addEventListener('submit',async e=>{
        e.preventDefault();if(busy)return;
        if(stepped&&step<2){form.querySelector('.kit-next').click();return;}
        const status=form.querySelector('[role=status]');
        for(let i=0;i<steps.length;i++){if([...steps[i].querySelectorAll('input,textarea,select')].some(el=>!el.checkValidity())){step=i;show();valid(steps[i]);return;}}
        if(preview){status.textContent='Förhandsvisning: inget skickas. Testa formuläret på den publicerade hemsidan.';return;}
        if(!/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(form.dataset.endpoint)){status.textContent='Formuläret är inte anslutet. Ring eller mejla företaget.';return;}
        if(!navigator.onLine){status.textContent='Du är offline. Dina uppgifter finns kvar här; anslut till internet och försök igen.';return;}
        const submit=form.querySelector('[type=submit]');busy=true;submit.disabled=true;status.textContent='Skickar din förfrågan…';
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
        try{const response=await fetch(form.dataset.endpoint,{method:'POST',body:new FormData(form),headers:{Accept:'application/json'},signal:controller.signal});if(!response.ok)throw Error();status.textContent='Tack! Din förfrågan har skickats. Bokning eller beställning gäller först efter företagets bekräftelse.';form.reset();step=0;show();}
        catch{status.textContent='Vi kunde inte bekräfta att förfrågan kom fram. Uppgifterna finns kvar; kontakta företaget eller försök igen.';}
        finally{clearTimeout(timer);busy=false;submit.disabled=false;}
      });
    });
    doc.querySelectorAll('.kit-calculator').forEach(calc=>{
      const update=()=>{
        let rates={};try{rates=JSON.parse(calc.dataset.rates||'{}');}catch{}
        const area=Number(calc.querySelector('[data-calc-area]').value), rate=Number(rates[calc.querySelector('[data-calc-service]').value]);
        const configured=Number.isFinite(rate)&&rate>0&&typeof rates.basis==='string'&&rates.basis.trim();
        const out=calc.querySelector('[data-calc-output]');out.textContent=!configured?'Be om prisförslag':!Number.isFinite(area)||area<10||area>1000?'Ange 10–1 000 m²':Math.round(area*rate).toLocaleString('sv-SE')+' kr / tillfälle';
        calc.querySelector('[data-calc-basis]').textContent=configured?rates.basis+' Uppskattning utifrån yta; frekvensen följer med din förfrågan.':'Företaget har ännu inte angett beräkningspriser.';
      };
      calc.addEventListener('input',update);calc.addEventListener('change',update);update();
      calc.querySelector('[data-calc-transfer]').addEventListener('click',()=>{
        const input=calc.querySelector('[data-calc-area]');if(!input.checkValidity()){input.reportValidity();return;}
        const form=doc.querySelector('[data-enquiry]');if(!form)return;
        const service=calc.querySelector('[data-calc-service]').selectedOptions[0].textContent;form.elements.namedItem('Tjänst').value=service;
        form.elements.namedItem('Meddelande').value=[service,input.value+' m²',calc.querySelector('[data-calc-frequency]').value,calc.querySelector('[data-calc-output]').textContent].join(' · ');
        form.scrollIntoView({block:'start'});form.querySelector('select').focus();
      });
    });
  }
  function activate(doc,preview) {
    const script=doc.createElement('script');script.id='kit-runtime';script.textContent='('+runtime.toString()+')('+JSON.stringify(!!preview)+');';doc.body.append(script);
  }
  function review(project,pages) {
    const warnings=[],s=settings(project);
    if(!s.business.phone&&!s.business.email)warnings.push('Lägg till företagets telefon eller e-post under Företag & funktioner.');
    pages.forEach(page=>{const doc=new DOMParser().parseFromString(page.html,'text/html');apply(doc,project,page.file);const disabled=[...doc.querySelectorAll('a[aria-disabled]')].filter(el=>!el.closest('[hidden]')).length;if(disabled)warnings.push(page.title+': '+disabled+' knappar saknar en ansluten länk.');if(doc.querySelector('[data-enquiry]:not([hidden])')&&!endpoint(s.business.formEndpoint))warnings.push(page.title+': formuläret behöver en giltig Formspree-adress.');const p=pageSettings(project,page.file);const defaults=[...doc.querySelectorAll('[data-content]')].filter(el=>!el.closest('[hidden]')&&(!p.content[el.dataset.content]||p.content[el.dataset.content]===el.dataset.original)).length;if(defaults)warnings.push(page.title+': '+defaults+' nya innehållsfält har exempeltext.');});
    return warnings;
  }
  return {decorate,settings,pageSettings,apply,activate,safeLink,endpoint,review};
})();
