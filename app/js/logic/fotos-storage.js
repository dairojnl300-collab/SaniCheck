/**
 * fotos-storage.js — Sube/baja fotos de sc-informes-fotos (Supabase Storage,
 * proyecto isncjtomlvxyvcaohcpx) y encola reintentos offline.
 *
 * Sin SDK supabase-js (igual que sc-informes.js y vencimientos-storage.js):
 * fetch() crudo con apikey/Authorization = anon key. El bucket es privado
 * pero sus policies aceptan anon/authenticated sin aislar por técnico a
 * nivel Storage (ver comentario de arquitectura en
 * supabase/migrations/migration_sc_informes_fotos_storage.sql) — el gate
 * real sigue siendo el código de acceso validado en las RPCs sc_*.
 *
 * Outbox: IndexedDB nativa, mismo patrón ya probado en ProyeCar
 * (index.html: colaInformes) — Blob guardado tal cual (sin base64), loop de
 * reintento simple sin backoff ni límite, sin Background Sync API (soporte
 * iOS Safari).
 */
const FotosStorage = (() => {
  'use strict';

  const BUCKET = 'sc-informes-fotos';
  const IDB_NAME = 'sanicheck-sc-fotos-outbox';
  const IDB_STORE = 'pendientes';
  const IDB_VERSION = 1;

  let _idbReady = null;
  let _onlineBound = false;
  let _onCambioPendientes = null;

  function _cfg() {
    const c = window.SC_INFORMES_CONFIG;
    if (!c || !c.SUPABASE_URL || !c.SUPABASE_ANON_KEY) return null;
    return c;
  }

  function path(tecnicoId, informeId, fotoId) {
    return `${tecnicoId}/${informeId}/${fotoId}.jpg`;
  }

  function _headers(extra) {
    const cfg = _cfg();
    return {
      apikey: cfg.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + cfg.SUPABASE_ANON_KEY,
      ...(extra || {}),
    };
  }

  function _objectUrl(objectPath) {
    const cfg = _cfg();
    return cfg.SUPABASE_URL.replace(/\/$/, '') + '/storage/v1/object/' + BUCKET + '/' + encodeURI(objectPath);
  }

  async function _subirAhora(blob, objectPath) {
    const cfg = _cfg();
    if (!cfg) { const e = new Error('Falta configurar sc-informes-config.secrets.js'); e.sinConfig = true; throw e; }
    const res = await fetch(_objectUrl(objectPath), {
      method: 'POST',
      headers: _headers({ 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }),
      body: blob,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error('Error al subir foto (' + res.status + '): ' + text.slice(0, 160));
      err.status = res.status;
      throw err;
    }
    return true;
  }

  async function descargarFotoBlob(objectPath) {
    const cfg = _cfg();
    if (!cfg) throw new Error('Falta configurar sc-informes-config.secrets.js');
    const res = await fetch(_objectUrl(objectPath), { headers: _headers() });
    if (!res.ok) throw new Error('Error al descargar foto (' + res.status + ')');
    return res.blob();
  }

  // ── Outbox IndexedDB ─────────────────────────────────────────────────────

  function _openIdb() {
    if (_idbReady) return _idbReady;
    _idbReady = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { resolve(null); return; }
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = () => reject(req.error);
    });
    return _idbReady;
  }

  function _idbTx(mode, fn) {
    return _openIdb().then(db => {
      if (!db) throw new Error('IndexedDB no está disponible en este dispositivo');
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, mode);
        const store = tx.objectStore(IDB_STORE);
        let out;
        try { out = fn(store); } catch (e) { reject(e); return; }
        tx.oncomplete = () => resolve(out);
        tx.onerror = () => reject(tx.error || new Error('La transacción de IndexedDB falló'));
      });
    });
  }

  function _encolar(rec) {
    return _idbTx('readwrite', store => store.put(rec)).then(() => _notificarCambio());
  }

  function _retirar(id) {
    return _idbTx('readwrite', store => store.delete(id)).then(() => _notificarCambio());
  }

  function _listarPendientes() {
    return _openIdb().then(db => {
      if (!db) return [];
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  }

  function _notificarCambio() {
    if (typeof _onCambioPendientes !== 'function') return;
    _listarPendientes().then(items => _onCambioPendientes(items.length)).catch(() => {});
  }

  function onCambioPendientes(fn) {
    _onCambioPendientes = fn;
    _notificarCambio();
  }

  /** Sube una foto; si falla o está offline, la encola para reintentar. Nunca lanza. */
  async function subirFoto(blob, tecnicoId, informeId, fotoId) {
    const objectPath = path(tecnicoId, informeId, fotoId);
    if (navigator.onLine) {
      try {
        await _subirAhora(blob, objectPath);
        return { ok: true, path: objectPath, encolado: false };
      } catch (e) {
        console.warn('[FotosStorage] subida falló, se encola', e);
      }
    }
    try {
      await _encolar({ id: fotoId, path: objectPath, blob, creadoEn: new Date().toISOString() });
      return { ok: false, path: objectPath, encolado: true };
    } catch (e) {
      console.warn('[FotosStorage] no se pudo encolar la foto', e);
      return { ok: false, path: objectPath, encolado: false, error: e.message };
    }
  }

  async function reintentarCola() {
    if (!navigator.onLine) return 0;
    let n = 0;
    const items = await _listarPendientes();
    for (const item of items) {
      try {
        await _subirAhora(item.blob, item.path);
        await _retirar(item.id);
        n++;
      } catch (e) {
        console.warn('[FotosStorage] reintento de cola falló', item.path, e.message);
      }
    }
    return n;
  }

  function bindAutoRetry() {
    if (_onlineBound) return;
    _onlineBound = true;
    window.addEventListener('online', () => reintentarCola().catch(() => {}));
    window.addEventListener('load', () => reintentarCola().catch(() => {}));
    setTimeout(() => reintentarCola().catch(() => {}), 3000);
  }

  return {
    path, subirFoto, descargarFotoBlob, reintentarCola, bindAutoRetry, onCambioPendientes,
  };
})();
