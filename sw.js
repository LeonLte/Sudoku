// Service worker: keeps a copy of the app so it also works without internet.
// Increase VERSION whenever files change, so phones fetch the new version.
const VERSION = 'sudoku-v3';
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
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first (so updates arrive quickly), cache as fallback when offline.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(VERSION).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
