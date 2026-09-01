/**
 * sc-informes.js — Respaldo remoto de Actas (Supabase isncjtomlvxyvcaohcpx)
 *
 * Identidad: un solo código de acceso secreto por técnico/admin
 * (mismo patrón que app/js/portal-cliente.js: header x-sanicheck-codigo-acceso).
 * El servidor (RPC sc_*) resuelve tecnico_id y rol a partir del código —
 * el cliente nunca envía ni conoce su propio UUID.
 *
 * Outbox: si sc_guardar_informe falla (sin red, RPC caída), el informe queda
 * en IndexedDB (sanicheck-sc-informes-outbox) para reintentar con backoff.
 * El guardado local (Store.upsertInspeccion) NUNCA se bloquea por esto.
 */
const ScInformes = (() => {
  'use strict';

  const LS_CODIGO   = 'sanicheck_sc_codigo_acceso';
  const LS_SESION   = 'sanicheck_sc_sesion';
  const IDB_NAME    = 'sanicheck-sc-informes-outbox';
  const IDB_STORE   = 'pendientes';
  const MAX_BACKOFF_MS = 30 * 60 * 1000; // 30 min

  let _idbReady = null;
  let _syncing = false;
  let _onlineBound = false;

  // ── Config / código de acceso ───────────────────────────────────────────

  function _cfg() {
    const c = window.SC_INFORMES_CONFIG;
    if (!c || !c.SUPABASE_URL || !c.SUPABASE_ANON_KEY) return null;
    return c;
  }

  function getCodigo() {
    return (localStorage.getItem(LS_CODIGO) || '').trim();
  }

  function setCodigo(codigo) {
    try { localStorage.setItem(LS_CODIGO, String(codigo || '').trim()); } catch (e) {}
  }

  function clearSesion() {
    try {
      localStorage.removeItem(LS_CODIGO);
      localStorage.removeItem(LS_SESION);
    } catch (e) {}
  }

  function getSesionCache() {
    try { return JSON.parse(localStorage.getItem(LS_SESION) || 'null'); } catch (e) { return null; }
  }

  function _setSesionCache(s) {
    try { localStorage.setItem(LS_SESION, JSON.stringify(s)); } catch (e) {}
  }

  // ── RPC ──────────────────────────────────────────────────────────────────

  async function _rpc(nombre, params) {
    const cfg = _cfg();
    if (!cfg) { const e = new Error('Falta configurar sc-informes-config.secrets.js'); e.sinConfig = true; throw e; }
    const res = await fetch(cfg.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rpc/' + nombre, {
      method: 'POST',
      headers: {
        apikey: cfg.SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + cfg.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params || {}),
    });
    const text = await res.text().catch(() => '');
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) {}
    if (!res.ok) {
      const msg = (data && (data.message || data.error_description)) || text || ('RPC ' + nombre + ' ' + res.status);
      const err = new Error(msg);
      err.status = res.status;
      err.rpc = nombre;
      throw err;
    }
    return data;
  }

  /** true si el código guardado es válido; refresca la caché de sesión. */
  async function whoami() {
    const codigo = getCodigo();
    if (!codigo) return null;
    try {
      const rows = await _rpc('sc_whoami', { p_codigo: codigo });
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row || !row.id) return null;
      const s = { id: row.id, nombre: row.nombre, rol: row.rol };
      _setSesionCache(s);
      return s;
    } catch (e) {
      if (e.status === 400 || e.status === 404) clearSesion(); // código inválido, no reintentar con éste
      return null;
    }
  }

  async function loginUsuario(usuario, password) {
    const rows = await _rpc('sc_login_usuario', {
      p_usuario: String(usuario || '').trim().toLowerCase(),
      p_password: String(password || ''),
    });
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row || !row.id || !row.codigo_acceso) return null;
    setCodigo(row.codigo_acceso);
    const sesion = { id: row.id, nombre: row.nombre, rol: row.rol, usuario: row.usuario };
    _setSesionCache(sesion);
    return sesion;
  }

  async function configurarPasswordInicial(usuario, codigo, password) {
    const rows = await _rpc('sc_configurar_password_inicial', {
      p_usuario: String(usuario || '').trim().toLowerCase(),
      p_codigo: String(codigo || '').trim().toUpperCase(),
      p_password: String(password || ''),
    });
    return Array.isArray(rows) ? rows[0] : rows;
  }

  function esAdmin() {
    const s = getSesionCache();
    return !!(s && s.rol === 'admin');
  }

  // ── IndexedDB outbox ─────────────────────────────────────────────────────

  function _openIdb() {
    if (_idbReady) return _idbReady;
    _idbReady = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { resolve(null); return; }
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'local_id' });
        }
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = () => reject(req.error);
    });
    return _idbReady;
  }

  function _idbTx(mode, fn) {
    return _openIdb().then(db => {
      if (!db) {
        const error = new Error('IndexedDB no está disponible en este dispositivo');
        error.code = 'IDB_UNAVAILABLE';
        throw error;
      }
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, mode);
        const store = tx.objectStore(IDB_STORE);
        let out;
        try { out = fn(store); } catch (e) { reject(e); return; }
        tx.oncomplete = () => resolve(out);
        tx.onerror    = () => reject(tx.error || new Error('La transacción de IndexedDB falló'));
        tx.onabort    = () => reject(tx.error || new Error('La transacción de IndexedDB fue cancelada'));
      });
    });
  }

  function _idbPut(rec) {
    return _idbTx('readwrite', store => store.put(rec)).then(() => true).catch(e => {
      console.warn('[ScInformes] outbox put', e);
      throw e;
    });
  }

  function _idbDelete(localId) {
    return _idbTx('readwrite', store => store.delete(localId)).then(() => true).catch(e => {
      console.warn('[ScInformes] outbox delete', e);
      throw e;
    });
  }

  function _idbGetAll() {
    return _openIdb().then(db => {
      if (!db) return [];
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror   = () => reject(req.error);
      });
    });
  }

  function encolarPendiente(payload) {
    const rec = { ...payload, intentos: payload.intentos || 0, ultimo_intento: 0 };
    return _idbPut(rec);
  }

  async function flushPendientes() {
    if (_syncing || !navigator.onLine) return 0;
    _syncing = true;
    let n = 0;
    try {
      const todos = await _idbGetAll();
      const ahora = Date.now();
      const listos = todos.filter(r => {
        if (!r.intentos) return true;
        const backoff = Math.min(30000 * Math.pow(2, r.intentos), MAX_BACKOFF_MS);
        return (ahora - (r.ultimo_intento || 0)) >= backoff;
      });
      for (const rec of listos) {
        try {
          await _rpc('sc_guardar_informe', {
            p_codigo: rec.codigo,
            p_establecimiento: rec.establecimiento,
            p_fecha: rec.fecha,
            p_html: rec.html,
            p_local_id: rec.local_id,
            p_numero_acta: rec.numero_acta || null,
            p_nivel_cumplimiento: rec.nivel_cumplimiento || null,
            p_aspectos_evaluados: Number.isFinite(rec.aspectos_evaluados) ? rec.aspectos_evaluados : null,
            p_aspectos_total: Number.isFinite(rec.aspectos_total) ? rec.aspectos_total : null,
            p_porcentaje_cumplimiento: Number.isFinite(rec.porcentaje_cumplimiento) ? rec.porcentaje_cumplimiento : null,
          });
          await _idbDelete(rec.local_id);
          n++;
        } catch (e) {
          rec.intentos = (rec.intentos || 0) + 1;
          rec.ultimo_intento = Date.now();
          await _idbPut(rec); // nunca se borra por fallo: no perder el informe
          console.warn('[ScInformes] reintento pendiente', rec.local_id, e.message);
        }
      }
    } finally {
      _syncing = false;
    }
    return n;
  }

  function bindAutoRetry() {
    if (_onlineBound) return;
    _onlineBound = true;
    window.addEventListener('online', () => flushPendientes().catch(() => {}));
    setInterval(() => flushPendientes().catch(() => {}), 60000);
    setTimeout(() => flushPendientes().catch(() => {}), 3000);
  }

  // ── Guardar informe (llamado desde Actuar.guardarFirmas, mismo click) ────

  /**
   * payload: { localId, establecimiento, fecha, html, numeroActa }
   * No bloquea el guardado local: si falla, intenta encolar y solo confirma
   * `encolado` después de que IndexedDB complete la transacción.
   */
  async function guardarInforme(payload) {
    const codigo = getCodigo();
    if (!codigo) return { ok: false, sinCodigo: true };

    const params = {
      p_codigo: codigo,
      p_establecimiento: payload.establecimiento || {},
      p_fecha: payload.fecha,
      p_html: payload.html,
      p_local_id: payload.localId || null,
      p_numero_acta: payload.numeroActa || null,
      p_nivel_cumplimiento: payload.nivelCumplimiento || null,
      p_aspectos_evaluados: Number.isFinite(payload.aspectosEvaluados) ? payload.aspectosEvaluados : null,
      p_aspectos_total: Number.isFinite(payload.aspectosTotal) ? payload.aspectosTotal : null,
      p_porcentaje_cumplimiento: Number.isFinite(payload.porcentajeCumplimiento) ? payload.porcentajeCumplimiento : null,
    };
    try {
      const id = await _rpc('sc_guardar_informe', params);
      return { ok: true, id };
    } catch (e) {
      // Código inválido: no tiene sentido encolar (nunca va a pasar sin corregirlo).
      if (/código de acceso inválido/i.test(e.message || '')) {
        return { ok: false, codigoInvalido: true };
      }
      const pendiente = {
        local_id: payload.localId || ('sc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
        codigo,
        establecimiento: payload.establecimiento || {},
        fecha: payload.fecha,
        html: payload.html,
        numero_acta: payload.numeroActa || null,
        nivel_cumplimiento: payload.nivelCumplimiento || null,
        aspectos_evaluados: Number.isFinite(payload.aspectosEvaluados) ? payload.aspectosEvaluados : null,
        aspectos_total: Number.isFinite(payload.aspectosTotal) ? payload.aspectosTotal : null,
        porcentaje_cumplimiento: Number.isFinite(payload.porcentajeCumplimiento) ? payload.porcentajeCumplimiento : null,
      };
      try {
        await encolarPendiente(pendiente);
        return { ok: false, encolado: true, error: e.message };
      } catch (outboxError) {
        return {
          ok: false,
          outboxUnavailable: true,
          error: e.message,
          outboxError: outboxError.message,
        };
      }
    }
  }

  // ── CRUD técnico ─────────────────────────────────────────────────────────

  function listMisInformes() {
    return _rpc('sc_list_mis_informes', { p_codigo: getCodigo() });
  }
  function getInforme(id) {
    return _rpc('sc_get_informe', { p_id: id, p_codigo: getCodigo() }).then(r => Array.isArray(r) ? r[0] : r);
  }
  function updateInforme(id, html) {
    return _rpc('sc_update_informe', { p_id: id, p_codigo: getCodigo(), p_html: html });
  }
  function deleteInforme(id) {
    return _rpc('sc_delete_informe', { p_id: id, p_codigo: getCodigo() });
  }

  // ── CRUD admin ───────────────────────────────────────────────────────────

  function listAdminInformes() {
    return _rpc('sc_list_admin_informes', { p_codigo: getCodigo() });
  }
  function getAdminInforme(id) {
    return _rpc('sc_get_admin_informe', { p_id: id, p_codigo: getCodigo() }).then(r => Array.isArray(r) ? r[0] : r);
  }
  function updateAdminInforme(id, html) {
    return _rpc('sc_update_admin_informe', { p_id: id, p_codigo: getCodigo(), p_html: html });
  }
  function deleteAdminInforme(id) {
    return _rpc('sc_delete_admin_informe', { p_id: id, p_codigo: getCodigo() });
  }

  function listUsuarios() { return _rpc('sc_list_usuarios', { p_codigo_admin: getCodigo() }); }
  function crearUsuario(datos) {
    return _rpc('sc_crear_usuario', { p_codigo_admin: getCodigo(), p_nombre: datos.nombre,
      p_usuario: datos.usuario, p_rol: datos.rol, p_password: datos.password });
  }
  function eliminarUsuario(id) {
    return _rpc('sc_eliminar_usuario', { p_codigo_admin: getCodigo(), p_id: id });
  }
  function cambiarPassword(password) {
    return _rpc('sc_cambiar_password', { p_codigo: getCodigo(), p_password: String(password || '') });
  }

  return {
    getCodigo, setCodigo, clearSesion, getSesionCache, whoami, loginUsuario,
    configurarPasswordInicial, esAdmin, eliminarUsuario, cambiarPassword,
    guardarInforme, flushPendientes, bindAutoRetry, encolarPendiente,
    listMisInformes, getInforme, updateInforme, deleteInforme,
    listAdminInformes, getAdminInforme, updateAdminInforme, deleteAdminInforme,
    listUsuarios, crearUsuario,
  };
})();
