// sw-update.js — Detección automática de actualizaciones vía hash/versión y banner de recarga

const SwUpdate = (() => {
  'use strict';

  const POLL_MS = 3 * 60 * 1000;

  let _manifest       = { version: '0.0.0', build: '' };
  let _pendingVersion = null;
  let _pendingBuild   = null;
  let _waitingWorker  = null;
  let _reloading      = false;
  let _pollTimer      = null;
  let _registration   = null;

  async function _fetchManifest() {
    const res = await fetch('./version.json?_=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('version.json unavailable');
    return res.json();
  }

  async function _loadLocalManifest() {
    try {
      _manifest = await _fetchManifest();
    } catch {
      _manifest = { version: '0.0.0', build: '' };
    }
    return _manifest;
  }

  function _msgWorker(worker) {
    return new Promise(resolve => {
      if (!worker) {
        resolve({
          version: _manifest.version,
          build:   _manifest.build,
          cache:   'sanicheck-' + (_manifest.build || _manifest.version),
        });
        return;
      }
      const ch = new MessageChannel();
      const t  = setTimeout(() => resolve({
        version: _manifest.version,
        build:   _manifest.build,
        cache:   'sanicheck-' + (_manifest.build || _manifest.version),
      }), 1500);
      ch.port1.onmessage = e => {
        clearTimeout(t);
        resolve(e.data || { version: _manifest.version, build: _manifest.build });
      };
      try {
        worker.postMessage({ type: 'GET_VERSION' }, [ch.port2]);
      } catch {
        clearTimeout(t);
        resolve({ version: _manifest.version, build: _manifest.build });
      }
    });
  }

  async function getActiveInfo() {
    if (!('serviceWorker' in navigator)) {
      return {
        version: _manifest.version,
        build:   _manifest.build,
        cache:   'sanicheck-' + (_manifest.build || _manifest.version),
        swActive: false,
      };
    }
    const info = await _msgWorker(navigator.serviceWorker.controller);
    return {
      version:  info.version  || _manifest.version,
      build:    info.build    || _manifest.build,
      cache:    info.cache    || ('sanicheck-' + (info.build || _manifest.build || _manifest.version)),
      swActive: !!navigator.serviceWorker.controller,
    };
  }

  function getPendingVersion() { return _pendingVersion; }
  function getPendingBuild()   { return _pendingBuild; }

  function showBanner(version, worker, build) {
    _pendingVersion = version || _manifest.version;
    _pendingBuild   = build   || null;
    _waitingWorker  = worker  || null;

    let banner = document.getElementById('sw-update-banner');
    const label = _pendingVersion
      ? `Actualización disponible — versión ${_pendingVersion}`
      : 'Actualización disponible';

    if (banner) {
      const txt = banner.querySelector('.sw-update-text');
      if (txt) txt.textContent = label;
      _bindReloadBtn();
      return;
    }

    banner = document.createElement('div');
    banner.id = 'sw-update-banner';
    banner.className = 'sw-update-banner';
    banner.innerHTML =
      '<span class="sw-update-text">' + _esc(label) + '</span>' +
      '<button type="button" class="sw-update-btn" id="sw-update-btn">Recargar</button>';
    document.body.appendChild(banner);
    _bindReloadBtn();
    document.body.classList.add('has-sw-update');
  }

  function _bindReloadBtn() {
    const btn = document.getElementById('sw-update-btn');
    if (!btn) return;
    btn.disabled = false;
    btn.textContent = 'Recargar';
    btn.onclick = reload;
  }

  async function _resolveWaitingWorker() {
    if (_waitingWorker) return _waitingWorker;
    let reg = _registration;
    if (!reg && 'serviceWorker' in navigator) {
      try { reg = await navigator.serviceWorker.getRegistration(); } catch { reg = null; }
    }
    if (!reg) return null;
    if (reg.waiting) return reg.waiting;
    try { await reg.update(); } catch (e) { console.warn('SwUpdate: reg.update', e); }
    if (reg.waiting) return reg.waiting;
    if (reg.installing) {
      await new Promise(resolve => {
        const w = reg.installing;
        const done = () => { w.removeEventListener('statechange', onState); resolve(); };
        const onState = () => {
          if (w.state === 'installed' || w.state === 'activated') done();
        };
        w.addEventListener('statechange', onState);
        setTimeout(done, 3000);
      });
    }
    return reg.waiting || null;
  }

  async function _applyUpdateAndReload() {
    if (_reloading) return;
    _reloading = true;

    const worker = await _resolveWaitingWorker();
    if (worker) {
      _waitingWorker = worker;
      try {
        worker.postMessage('SKIP_WAITING');
      } catch (e) {
        console.warn('SwUpdate: skipWaiting', e);
      }
      await new Promise(resolve => {
        const t = setTimeout(resolve, 2500);
        const onChange = () => {
          clearTimeout(t);
          navigator.serviceWorker.removeEventListener('controllerchange', onChange);
          resolve();
        };
        navigator.serviceWorker.addEventListener('controllerchange', onChange);
      });
    }

    window.location.reload();
  }

  function hideBanner() {
    document.getElementById('sw-update-banner')?.remove();
    document.body.classList.remove('has-sw-update');
    _pendingVersion = null;
    _pendingBuild   = null;
    _waitingWorker  = null;
  }

  async function reload() {
    const btn = document.getElementById('sw-update-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Actualizando…';
    }

    try {
      if (typeof Store !== 'undefined' && Store.flush) {
        await Store.flush();
      }
    } catch (e) {
      console.warn('SwUpdate: flush before reload', e);
    }

    try {
      await _applyUpdateAndReload();
    } catch (e) {
      console.warn('SwUpdate: reload failed', e);
      _reloading = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Recargar';
      }
      window.location.reload();
    }
  }

  async function _resolveWorkerVersion(worker) {
    const info = await _msgWorker(worker);
    return { version: info.version || _manifest.version, build: info.build || '' };
  }

  function _handleWaiting(worker) {
    if (!worker || !navigator.serviceWorker.controller) return;
    _resolveWorkerVersion(worker).then(info => {
      showBanner(info.version, worker, info.build);
    });
  }

  function _watchRegistration(reg) {
    _registration = reg;
    if (reg.waiting) _handleWaiting(reg.waiting);

    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          _handleWaiting(nw);
        }
      });
    });
  }

  async function _checkRemoteUpdate() {
    if (!('serviceWorker' in navigator)) return { updated: false };
    try {
      const remote = await _fetchManifest();
      const buildChanged = remote.build && remote.build !== _manifest.build;
      if (!buildChanged) return { updated: false };

      const reg = _registration || await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();

      if (reg?.waiting) {
        showBanner(remote.version, reg.waiting, remote.build);
        return { updated: true, version: remote.version, build: remote.build };
      }

      showBanner(remote.version, null, remote.build);
      return { updated: true, version: remote.version, build: remote.build };
    } catch {
      return { updated: false };
    }
  }

  async function checkForUpdate() {
    const result = await _checkRemoteUpdate();
    if (result.updated) return result;

    const reg = _registration || await navigator.serviceWorker.getRegistration();
    if (reg) {
      await reg.update();
      if (reg.waiting && navigator.serviceWorker.controller) {
        const info = await _resolveWorkerVersion(reg.waiting);
        showBanner(info.version, reg.waiting, info.build);
        return { updated: true, version: info.version, build: info.build };
      }
    }

    if (typeof Router !== 'undefined') Router.toast('Ya tienes la última versión');
    return { updated: false };
  }

  function _schedulePoll() {
    clearInterval(_pollTimer);
    _pollTimer = setInterval(() => { _checkRemoteUpdate().catch(() => {}); }, POLL_MS);
  }

  function _onVisible() {
    if (document.visibilityState === 'visible') {
      _checkRemoteUpdate().catch(() => {});
      if (_registration) _registration.update().catch(() => {});
    }
  }

  async function init() {
    await _loadLocalManifest();

    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then(reg => {
        _watchRegistration(reg);
        reg.update().catch(() => {});
      })
      .catch(() => {});

    navigator.serviceWorker.addEventListener('message', e => {
      if (!e.data) return;
      if (e.data.type === 'ACTIVATED') {
        _manifest.version = e.data.version || _manifest.version;
        _manifest.build   = e.data.build   || _manifest.build;
        hideBanner();
      }
      if (e.data.type === 'UPDATE_AVAILABLE') {
        showBanner(e.data.version, null, e.data.build);
      }
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (_reloading) return;
      _reloading = true;
      location.reload();
    });

    document.addEventListener('visibilitychange', _onVisible);
    window.addEventListener('pageshow', e => {
      if (e.persisted) _onVisible();
    });
    window.addEventListener('focus', _onVisible);

    _schedulePoll();
    setTimeout(() => { _checkRemoteUpdate().catch(() => {}); }, 4000);
  }

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return {
    get APP_VERSION() { return _manifest.version; },
    get BUILD_HASH()  { return _manifest.build; },
    init,
    getActiveInfo,
    getPendingVersion,
    getPendingBuild,
    checkForUpdate,
    reload,
    showBanner,
  };
})();
