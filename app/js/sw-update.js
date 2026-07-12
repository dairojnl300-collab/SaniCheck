// sw-update.js — Versión de caché, detección de actualizaciones y banner de recarga

const SwUpdate = (() => {
  'use strict';

  // Mantener sincronizado con APP_VERSION en sw.js
  const APP_VERSION = '4.0.0';

  let _pendingVersion = null;
  let _waitingWorker  = null;
  let _reloading      = false;

  function _msgWorker(worker) {
    return new Promise(resolve => {
      if (!worker) {
        resolve({ version: APP_VERSION, cache: 'sanicheck-' + APP_VERSION });
        return;
      }
      const ch = new MessageChannel();
      const t  = setTimeout(() => resolve({ version: APP_VERSION, cache: 'sanicheck-' + APP_VERSION }), 1500);
      ch.port1.onmessage = e => {
        clearTimeout(t);
        resolve(e.data || { version: APP_VERSION, cache: 'sanicheck-' + APP_VERSION });
      };
      try {
        worker.postMessage({ type: 'GET_VERSION' }, [ch.port2]);
      } catch {
        clearTimeout(t);
        resolve({ version: APP_VERSION, cache: 'sanicheck-' + APP_VERSION });
      }
    });
  }

  async function getActiveInfo() {
    if (!('serviceWorker' in navigator)) {
      return { version: APP_VERSION, cache: 'sanicheck-' + APP_VERSION, swActive: false };
    }
    const info = await _msgWorker(navigator.serviceWorker.controller);
    return {
      version:  info.version  || APP_VERSION,
      cache:    info.cache    || ('sanicheck-' + (info.version || APP_VERSION)),
      swActive: !!navigator.serviceWorker.controller,
    };
  }

  function getPendingVersion() { return _pendingVersion; }

  function showBanner(version, worker) {
    _pendingVersion = version;
    _waitingWorker  = worker;
    let banner = document.getElementById('sw-update-banner');
    if (banner) {
      const txt = banner.querySelector('.sw-update-text');
      if (txt) txt.textContent = `Actualización disponible — versión ${version}`;
      return;
    }
    banner = document.createElement('div');
    banner.id = 'sw-update-banner';
    banner.className = 'sw-update-banner';
    banner.innerHTML =
      '<span class="sw-update-text">Actualización disponible — versión ' + _esc(version) + '</span>' +
      '<button type="button" class="sw-update-btn" id="sw-update-btn">Recargar</button>';
    document.body.appendChild(banner);
    document.getElementById('sw-update-btn').onclick = reload;
    document.body.classList.add('has-sw-update');
  }

  function hideBanner() {
    document.getElementById('sw-update-banner')?.remove();
    document.body.classList.remove('has-sw-update');
    _pendingVersion = null;
    _waitingWorker  = null;
  }

  function reload() {
    if (_waitingWorker) _waitingWorker.postMessage('SKIP_WAITING');
    else location.reload();
  }

  async function _resolveWorkerVersion(worker) {
    const info = await _msgWorker(worker);
    return info.version || APP_VERSION;
  }

  function _watchRegistration(reg) {
    if (reg.waiting && navigator.serviceWorker.controller) {
      _resolveWorkerVersion(reg.waiting).then(v => showBanner(v, reg.waiting));
    }
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          _resolveWorkerVersion(nw).then(v => showBanner(v, nw));
        }
      });
    });
  }

  async function checkForUpdate() {
    if (!('serviceWorker' in navigator)) {
      Router.toast('Service Worker no disponible en este navegador');
      return { updated: false };
    }
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      Router.toast('Sin registro de Service Worker');
      return { updated: false };
    }
    await reg.update();
    if (reg.waiting && navigator.serviceWorker.controller) {
      const v = await _resolveWorkerVersion(reg.waiting);
      showBanner(v, reg.waiting);
      return { updated: true, version: v };
    }
    Router.toast('✓ Ya tienes la última versión');
    return { updated: false };
  }

  function init() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./sw.js').then(reg => {
      _watchRegistration(reg);
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    }).catch(() => {});

    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data && e.data.type === 'ACTIVATED') hideBanner();
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (_reloading) return;
      _reloading = true;
      location.reload();
    });
  }

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { APP_VERSION, init, getActiveInfo, getPendingVersion, checkForUpdate, reload, showBanner };
})();
