// Shared by the browser exporter and the local Node renderer. No storage or network access.
window.SiteRenderer = (function () {
  function pagesOf(template) {
    if (!template.enrichedPages) template.enrichedPages = (template.pages || [{ file: 'index.html', title: 'Hem', html: template.html }])
      .map(page => window.SiteKit.decorate(template, page));
    return template.enrichedPages;
  }

  function normalize(project) {
    const copy = JSON.parse(JSON.stringify(project));
    const keys = Object.keys(copy.values || {});
    if (keys.length && keys.every(key => /^\d+$/.test(key))) copy.values = { 'index.html': copy.values };
    if (!copy.values) copy.values = {};
    return copy;
  }

  function imageBytes(src) {
    const comma = src.indexOf(',');
    const data = src.slice(comma + 1);
    if (src.slice(0, comma).includes(';base64')) {
      return Uint8Array.from(atob(data), char => char.charCodeAt(0));
    }
    return new TextEncoder().encode(decodeURIComponent(data));
  }

  function render(input) {
    const project = normalize(input);
    const template = window.TEMPLATES.find(t => t.id === project.templateId);
    if (!template) throw new Error('Templaten hittades inte');
    const pages = pagesOf(template), files = new Map(), imageNames = new Map(), fontFiles = new Set();
    for (const page of pages) {
      const doc = new DOMParser().parseFromString(page.html, 'text/html');
      const values = project.values[page.file] || {};
      window.SiteKit.apply(doc, project, page.file);
      doc.querySelectorAll('[data-slot]').forEach((el, i) => {
        const value = values[i + 1];
        if (value != null) {
          if (el.getAttribute('data-slot') === 'image') el.setAttribute('src', value);
          else el.textContent = value;
        }
        for (const attr of ['data-slot', 'data-label', 'data-multiline', 'data-slot-active', 'data-shared', 'data-contains-shared']) el.removeAttribute(attr);
      });
      // Explicit link labels and named fields retain the same precedence as the old exporter.
      window.SiteKit.apply(doc, project, page.file);
      const title = doc.querySelector('title');
      if (title && project.name) title.textContent = page.file === pages[0].file ? project.name : project.name + ' – ' + page.title;
      doc.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src') || '';
        const match = /^data:image\/(png|jpeg|jpg|webp|gif)[;,]/.exec(src);
        if (!match) return;
        let filename = imageNames.get(src);
        if (!filename) {
          filename = 'bild-' + (imageNames.size + 1) + '.' + (match[1] === 'jpeg' ? 'jpg' : match[1]);
          imageNames.set(src, filename);
          files.set('images/' + filename, imageBytes(src));
        }
        img.setAttribute('src', 'images/' + filename);
      });
      window.SiteKit.activate(doc, false);
      const html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
      for (const match of html.matchAll(/fonts\/([a-z0-9-]+\.woff2)/g)) fontFiles.add(match[1]);
      files.set(page.file, html);
    }
    return { pages, files, fontFiles };
  }

  // Scriptless same-origin sandbox: only trusted parent code binds interaction handlers.
  // Never combine allow-same-origin with allow-scripts. This is not an arbitrary-HTML editor.
  function previewHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,base,iframe,object,embed,meta[http-equiv]').forEach(el => el.remove());
    doc.querySelectorAll('*').forEach(el => {
      for (const attr of [...el.attributes]) if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
    });
    const policy = doc.createElement('meta');
    policy.setAttribute('http-equiv', 'Content-Security-Policy');
    policy.setAttribute('content', "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-src 'none'; object-src 'none'");
    doc.head.prepend(policy);
    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  }

  return { pagesOf, normalize, render, previewHtml };
})();
