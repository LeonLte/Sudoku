// Service worker: keeps a copy of the app so it also works without internet.
// Increase VERSION whenever files change, so phones fetch the new version.
const VERSION = 'sudoku-v9';
const FILES = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'src/app.js',
  'src/art.js',
  'src/storage.js',
  'src/logic/game.js',
  'src/logic/random.js',
  'src/logic/stats.js',
  'src/logic/sudoku.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'img/pattern.svg',
  'img/pattern-dark.svg',
  'fonts/mochiy-pop-one.woff2',
  'fonts/fredoka.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first (so updates arrive quickly), cache as fallback when offline.
// "no-cache" makes the browser ask the server every time, so the phone never mixes
// old and new files (GitHub Pages lets browsers keep files for 10 minutes otherwise).
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  const fresh = request.mode === 'navigate'
    ? fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' })
    : fetch(request, { cache: 'no-cache' });
  event.respondWith(
    fresh
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html')))
  );
});
