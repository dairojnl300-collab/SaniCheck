// Service Worker — SaniCheck — Offline-first (public/service-worker.js)
// Sincronizado con app/sw.js; CI actualiza CACHE_NAME y COMMIT_HASH en push a main.

const APP_VERSION = '4.12.7';
const CACHE_NAME = 'sanicheck-v4.12.7';
const COMMIT_HASH = 'main';
const CACHE = CACHE_NAME;
const BUILD_HASH = COMMIT_HASH;

const ASSETS = [
  './index.html',
  './manifest.json',
  './version.json',
  './css/brand.css',
  './css/motion.css',
  '../src/styles/update-banner.css',
  './js/store.js',
  './js/router.js',
  './js/motion.js',
  './js/licencias.js',
  './js/app-version.js',
  './js/sw-update.js',
  './js/portal-config.js',
  './js/portal-cliente.js',
  './js/about.js',
  './js/phva-icons.js',
  './js/app.js',
  './js/logic/psb-data.js',
  './js/logic/checklist-config.js',
  './js/logic/diagnostico-inicial.js',
  './js/logic/vencimientos.js',
  './js/logic/observaciones.js',
  './js/logic/scores.js',
  './js/logic/hallazgos.js',
  './js/logic/fotos.js',
  './js/logic/dadis-scoring.js',
  './js/phva/planificar.js',
  './js/phva/personalizar.js',
  './js/phva/hacer.js',
  './js/phva/verificar.js',
  './js/phva/actuar.js',
  './js/screens/dadis-simulador.js',
  './data/dadis-config.json',
  './assets/vendor/chart.umd.min.js',
  './assets/icons/favicon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon.svg',
  './assets/icons/logotipo-sanicheck.png',
  './assets/icons/isotipo-transparente.png',
];

const OFFLINE_HTML = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SaniCheck · Sin conexión</title>
<style>
  body{margin:0;font-family:system-ui,sans-serif;background:#0A2E23;color:#fff;
    min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;}
  h1{font-size:20px;margin:0 0 8px;}p{font-size:14px;opacity:0.85;line-height:1.5;margin:0;}
</style></head><body><div><h1>SaniCheck</h1><p>Sin conexión a internet.<br>
Los datos guardados siguen disponibles al recargar la app instalada.</p></div></body></html>`;

function _versionPayload() {
  return { type: 'VERSION', version: APP_VERSION, build: BUILD_HASH, cache: CACHE };
}

function _notifyClients(msg) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(clients => { clients.forEach(c => c.postMessage(msg)); });
}

async function _cleanResponse(response) {
  if (!response || !response.redirected) return response;
  const body = await response.clone().blob();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

async function _safeCachePut(cache, request, response) {
  if (!response || !response.ok) return;
  if (response.redirected) {
    const body = await response.clone().blob();
    const cleanResponse = new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    return cache.put(request, cleanResponse);
  }
  return cache.put(request, response.clone());
}

function _respond(event, promise) {
  event.respondWith(
    Promise.resolve(promise)
      .then(async res => {
        if (!(res instanceof Response)) return _fallbackResponse(event.request);
        return _cleanResponse(res);
      })
      .catch(() => _fallbackResponse(event.request))
  );
}

function _offlinePage() {
  return new Response(OFFLINE_HTML, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function _emptyScript() {
  return new Response('// SaniCheck offline\n', {
    status: 200,
    headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
  });
}

function _emptyStyle() {
  return new Response('/* SaniCheck offline */', {
    status: 200,
    headers: { 'Content-Type': 'text/css; charset=utf-8' },
  });
}

function _emptyJson() {
  return new Response('{}', {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function _matchCached(request) {
  let hit = await caches.match(request);
  if (hit) return _cleanResponse(hit);

  hit = await caches.match(request, { ignoreSearch: true });
  if (hit) return _cleanResponse(hit);

  try {
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return null;
    const cache = await caches.open(CACHE);
    const keys = await cache.keys();
    const path = url.pathname.replace(/\/$/, '') || '/';
    for (const req of keys) {
      const p = new URL(req.url).pathname.replace(/\/$/, '') || '/';
      if (p === path) {
        hit = await cache.match(req);
        if (hit) return _cleanResponse(hit);
      }
    }
  } catch (_) { /* ignore */ }

  return null;
}

async function _shellDocument() {
  const candidates = ['./index.html', 'index.html', '/index.html', './'];
  for (const u of candidates) {
    const hit = await caches.match(u);
    if (hit) return _cleanResponse(hit);
  }
  const cache = await caches.open(CACHE);
  const keys = await cache.keys();
  for (const req of keys) {
    if (req.url.includes('index.html') || req.url.endsWith('/')) {
      const hit = await cache.match(req);
      if (hit) return _cleanResponse(hit);
    }
  }
  return _offlinePage();
}

async function _fallbackResponse(request) {
  const dest = request.destination;
  const url = new URL(request.url);

  if (request.mode === 'navigate' || dest === 'document') {
    return _shellDocument();
  }

  const cached = await _matchCached(request);
  if (cached) return cached;

  if (dest === 'script' || url.pathname.endsWith('.js')) return _emptyScript();
  if (dest === 'style' || url.pathname.endsWith('.css')) return _emptyStyle();
  if (dest === 'json' || url.pathname.endsWith('.json')) return _emptyJson();

  if (request.mode === 'navigate') return _shellDocument();
  return _offlinePage();
}

async function _cacheOne(cache, url) {
  try {
    const res = await fetch(url, { cache: 'reload' });
    if (res && res.ok) {
      await _safeCachePut(cache, url, res);
    }
  } catch (err) {
    console.warn('[SW] No se pudo cachear:', url, err);
  }
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.allSettled(ASSETS.map(u => _cacheOne(cache, u))))
      .then(() => {
        if (self.registration && self.registration.active) {
          return _notifyClients({
            type: 'UPDATE_AVAILABLE',
            version: APP_VERSION,
            build: BUILD_HASH,
            commitHash: COMMIT_HASH,
          });
        }
      })
  );
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
      .then(() => _notifyClients({ type: 'ACTIVATED', version: APP_VERSION, build: BUILD_HASH }))
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  if (url.origin !== self.location.origin) {
    if (url.hostname.includes('fonts.g')) {
      _respond(e, fetch(e.request).catch(() => new Response('', { status: 503 })));
    }
    return;
  }

  if (url.pathname.endsWith('/version.json') || url.pathname.endsWith('/sw.js') || url.pathname.endsWith('/service-worker.js')) {
    _respond(e, fetch(e.request)
      .then(res => (res && res.ok ? res : _matchCached(e.request)))
      .then(res => res || _emptyJson())
    );
    return;
  }

  if (e.request.mode === 'navigate') {
    _respond(e, fetch(e.request)
      .then(res => (res && res.ok ? res : _shellDocument()))
      .catch(() => _shellDocument())
    );
    return;
  }

  _respond(e, _matchCached(e.request).then(cached => {
    if (cached) return cached;
    return fetch(e.request).then(res => {
      if (!res || !res.ok) return _fallbackResponse(e.request);
      if (res.type === 'basic' || res.type === 'cors') {
        caches.open(CACHE)
          .then(c => _safeCachePut(c, e.request, res))
          .catch(() => {});
      }
      return res;
    });
  }));
});
