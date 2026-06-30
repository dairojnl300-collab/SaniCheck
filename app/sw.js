// Service Worker — SaniCheck v4 — Offline-first

const CACHE = 'sanicheck-v6';
const ASSETS = [
  './index.html',
  './css/brand.css',
  './manifest.json',
  './js/logic/psb-data.js',
  './js/logic/observaciones.js',
  './js/logic/scores.js',
  './js/logic/hallazgos.js',
  './js/logic/fotos.js',
  './js/store.js',
  './js/router.js',
  './js/licencias.js',
  './js/phva/planificar.js',
  './js/phva/hacer.js',
  './js/phva/verificar.js',
  './js/phva/actuar.js',
  './js/app.js',
  './assets/icons/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Google Fonts — network-first con fallback silencioso
  if (url.hostname.includes('fonts.g')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => cached);
    })
  );
});
