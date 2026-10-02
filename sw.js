// Service worker: gör appen installerbar och offline-kapabel.
// Strategi: nätverk först (så uppdateringar alltid slår igenom när nät finns),
// cache som reserv (så appen fungerar offline).
// OBS: Bumpa VERSION vid varje release — den avgör cachens namn.
const VERSION = '1.3.0';
const CACHE = 'templates-' + VERSION;

const CORE = [
  './',
  'index.html',
  'css/app.css',
  'js/version.js',
  'js/save.js',
  'js/storage.js',
  'js/export.js',
  'js/editor.js',
  'js/app.js',
  'templates/index.js',
  'templates/restaurang.js',
  'templates/salong.js',
  'templates/byggfirma.js',
  'templates/butik.js',
  'templates/portfolio.js',
  'templates/cafe.js',
  'templates/gym.js',
  'templates/konsult.js',
  'templates/hemservice.js',
  'fonts/inter-400.woff2',
  'fonts/inter-700.woff2',
  'fonts/playfair-400.woff2',
  'fonts/playfair-700.woff2',
  'fonts/outfit-400.woff2',
  'fonts/outfit-700.woff2',
  'fonts/lora-400.woff2',
  'fonts/lora-700.woff2',
  'fonts/LICENS.txt',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .catch(err => console.warn('Förcachning misslyckades delvis:', err))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('templates-') && k !== CACHE)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && (response.ok || response.type === 'opaque')) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached =>
          cached || (event.request.mode === 'navigate' ? caches.match('./') : undefined)
        )
      )
  );
});
