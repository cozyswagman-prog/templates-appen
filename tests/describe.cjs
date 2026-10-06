module.exports = function describe(doc){
  const body=doc.body.cloneNode(true);body.querySelectorAll('script').forEach(e=>e.remove());
  return {title:doc.title,text:body.textContent.replace(/\s+/g,' ').trim(),
    links:[...doc.querySelectorAll('a')].map(e=>[e.textContent,e.getAttribute('href'),e.getAttribute('aria-disabled')]),
    images:[...doc.querySelectorAll('img')].map(e=>[e.getAttribute('src'),e.getAttribute('alt'),e.getAttribute('style')]),
    sections:[...doc.querySelectorAll('[data-section]')].map(e=>[e.getAttribute('data-section'),e.hasAttribute('hidden')]),
    categories:[...doc.querySelectorAll('[data-filter-item]')].map(e=>[e.getAttribute('data-filter-item'),e.getAttribute('data-categories')]),
    styles:[...doc.querySelectorAll('style')].map(e=>e.textContent)};
};
