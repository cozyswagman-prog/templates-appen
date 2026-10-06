// Service worker: gör appen installerbar och offline-kapabel.
// Strategi: nätverk först (så uppdateringar alltid slår igenom när nät finns),
// cache som reserv (så appen fungerar offline).
// VERSION stämplas automatiskt av deploy-workflowet vid varje push.
const VERSION = 'dev';
const CACHE = 'templates-' + VERSION;

const CORE = [
  './',
  'index.html',
  'css/app.css',
  'js/version.js',
  'js/save.js',
  'js/storage.js',
  'js/cloud-config.js',
  'js/image-assets.js',
  'js/image-policy.js',
  'js/image-processing.js',
  'js/project-store.js',
  'js/accounts.js',
  'js/autosave.js',
  'vendor/supabase.js',
  'js/export.js',
  'js/render.js',
  'js/editor.js',
  'js/publish-client.js',
  'js/app.js',
  'templates/exempelbilder.js',
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
      // 'reload' kringgår webbläsarens HTTP-cache så nya versionen hämtas direkt
      .then(cache => cache.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))))
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
  // Cache only the known app shell. Never cache auth, REST responses or customer data.
  const allowed = CORE.map(path => new URL(path, self.registration.scope).href);
  if (event.request.headers.has('authorization') || !allowed.includes(event.request.url)) return;
  event.respondWith(
    // 'no-cache' = omvalidera alltid mot servern (GitHub Pages cachar annars
    // filer i 10 min i webbläsaren och uppdateringar dröjer)
    fetch(event.request, { cache: 'no-cache' })
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
