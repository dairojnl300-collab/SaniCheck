// Service Worker — SaniCheck — Offline-first completo

const APP_VERSION = '4.0.0';
const CACHE = 'sanicheck-' + APP_VERSION;

const ASSETS = [
  './index.html',
  './manifest.json',
  './css/brand.css',
  './js/store.js',
  './js/router.js',
  './js/licencias.js',
  './js/sw-update.js',
  './js/about.js',
  './js/app.js',
  './js/logic/psb-data.js',
  './js/logic/checklist-config.js',
  './js/logic/diagnostico-inicial.js',
  './js/logic/vencimientos.js',
  './js/logic/observaciones.js',
  './js/logic/scores.js',
  './js/logic/hallazgos.js',
  './js/logic/fotos.js',
  './js/phva/planificar.js',
  './js/phva/personalizar.js',
  './js/phva/hacer.js',
  './js/phva/verificar.js',
  './js/phva/actuar.js',
  './assets/vendor/chart.umd.min.js',
  './assets/icons/favicon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon.svg',
  './assets/icons/logotipo-sanicheck.png',
  './assets/icons/isotipo-transparente.png',
];

function _versionPayload() {
  return { type: 'VERSION', version: APP_VERSION, cache: CACHE };
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (e.data && e.data.type === 'GET_VERSION') {
    const payload = _versionPayload();
    if (e.ports && e.ports[0]) e.ports[0].postMessage(payload);
    else if (e.source) e.source.postMessage(payload);
  }
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => {
        clients.forEach(c => c.postMessage({ type: 'ACTIVATED', version: APP_VERSION }));
      })
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

  // Navegación (HTML) — network-first con fallback al shell cacheado
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Resto de assets — cache-first
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
