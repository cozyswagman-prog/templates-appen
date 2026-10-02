// Exporterar ett projekt som en fristående zip: en html-fil per sida + images/.
// Rendering sker från templatens källa + projektets sparade värden, så alla
// sidor kommer med även om de inte är öppna i editorn just nu.
window.Exporter = (function () {

  function slugify(name) {
    return (name || 'min-hemsida')
      .toLowerCase()
      .replace(/[åä]/g, 'a').replace(/ö/g, 'o')
      .replace(/[éèêë]/g, 'e').replace(/[üú]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'min-hemsida';
  }

  function extFromDataUrl(dataUrl) {
    const m = /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml)/.exec(dataUrl);
    if (!m) return null;
    return { 'svg+xml': 'svg', jpeg: 'jpg' }[m[1]] || m[1];
  }

  function dataUrlToBytes(dataUrl) {
    const comma = dataUrl.indexOf(',');
    const meta = dataUrl.slice(0, comma);
    const data = dataUrl.slice(comma + 1);
    if (meta.includes(';base64')) {
      const bin = atob(data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
    return new TextEncoder().encode(decodeURIComponent(data));
  }

  async function exportSite(project) {
    window.Storage.migrate(project);
    const template = window.TEMPLATES.find(t => t.id === project.templateId);
    if (!template) throw new Error('Templaten hittades inte');
    const pages = window.Editor.pagesOf(template);

    const zip = new JSZip();
    const images = zip.folder('images');
    const imageFiles = new Map(); // dataUrl -> filnamn (samma bild återanvänds)
    let imgCount = 0;
    const fontFiles = new Set(); // "inter-400.woff2" osv. som sidorna refererar

    pages.forEach(page => {
      const doc = new DOMParser().parseFromString(page.html, 'text/html');
      const values = project.values[page.file] || {};

      // Applicera sparade värden i samma nummerordning som editorn
      doc.querySelectorAll('[data-slot]').forEach((el, i) => {
        const v = values[i + 1];
        if (v != null) {
          if (el.getAttribute('data-slot') === 'image') el.setAttribute('src', v);
          else el.textContent = v;
        }
        el.removeAttribute('data-slot');
        el.removeAttribute('data-label');
        el.removeAttribute('data-multiline');
        el.removeAttribute('data-slot-active');
        el.removeAttribute('data-shared');
      });

      // Sidtitel: projektnamn (+ sidans namn för undersidor)
      const titleEl = doc.querySelector('title');
      if (titleEl && project.name) {
        titleEl.textContent = page.file === pages[0].file
          ? project.name
          : project.name + ' – ' + page.title;
      }

      // Bryt ut uppladdade bilder (data-URL:er) till riktiga filer.
      // SVG-platshållare som aldrig byttes lämnas kvar inline — de funkar som de är.
      doc.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src') || '';
        if (!src.startsWith('data:image/')) return;
        const ext = extFromDataUrl(src);
        if (!ext || ext === 'svg') return; // platshållare behålls inline
        let filename = imageFiles.get(src);
        if (!filename) {
          imgCount++;
          filename = 'bild-' + imgCount + '.' + ext;
          imageFiles.set(src, filename);
          images.file(filename, dataUrlToBytes(src));
        }
        img.setAttribute('src', 'images/' + filename);
      });

      const html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
      for (const m of html.matchAll(/fonts\/([a-z0-9-]+\.woff2)/g)) fontFiles.add(m[1]);
      zip.file(page.file, html);
    });

    // Packa med de självhostade typsnitten sidorna använder, plus licensen
    if (fontFiles.size) {
      const fonts = zip.folder('fonts');
      for (const name of fontFiles) {
        const r = await fetch('fonts/' + name);
        if (r.ok) fonts.file(name, await r.arrayBuffer());
      }
      const lic = await fetch('fonts/LICENS.txt');
      if (lic.ok) fonts.file('LICENS.txt', await lic.text());
    }

    const sidlista = pages.map(p => '  - ' + p.file + ' (' + p.title + ')').join('\n');
    zip.file('LASMIG.txt',
      'Din hemsida ar klar!\n\n' +
      'Filer:\n' + sidlista + '\n  - mappen images (dina bilder)\n' +
      (fontFiles.size ? '  - mappen fonts (typsnitt, se fonts/LICENS.txt)\n' : '') + '\n' +
      '1. Ladda upp ALLA filer till ditt webbhotell.\n' +
      '2. Klart - sidan fungerar direkt, inga installationer behovs.\n\n' +
      'Skapad med Templates.');

    const blob = await zip.generateAsync({ type: 'blob' });
    return window.saveFile(blob, slugify(project.name) + '.zip');
  }

  return { exportSite };
})();
