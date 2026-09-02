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
  const LS_FINALES  = 'sanicheck_sc_informes_finales';
  const LS_AJENOS   = 'sanicheck_sc_admin_ajenos';
  const IDB_NAME    = 'sanicheck-sc-informes-outbox';
  const IDB_STORE   = 'pendientes';
  const IDB_DRAFT_STORE = 'borradores';
  const IDB_VERSION = 2;
  const MAX_BACKOFF_MS = 30 * 60 * 1000; // 30 min
  const DRAFT_INTERVAL_MS = 30 * 1000;

  let _idbReady = null;
  let _syncing = false;
  let _onlineBound = false;
  let _draftTimer = null;
  let _draftPending = null;
  let _draftSending = false;
  let _draftLastSentAt = 0;
  let _draftLastAspectKey = '';
  let _remoteDraftChecked = false;

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
    _remoteDraftChecked = false;
  }

  function getSesionCache() {
    try { return JSON.parse(localStorage.getItem(LS_SESION) || 'null'); } catch (e) { return null; }
  }

  function _setSesionCache(s) {
    try { localStorage.setItem(LS_SESION, JSON.stringify(s)); } catch (e) {}
  }

  // Solo los local_id confirmados por el listado remoto de la sesión pueden
  // participar en comparaciones históricas. El Store es compartido por el
  // navegador y puede conservar inspecciones antiguas de otra sesión.
  function _guardarFinalesDeSesion(filas) {
    const sesion = getSesionCache();
    if (!sesion?.id) return;
    const localIds = [...new Set((filas || []).map(f => f?.local_id).filter(Boolean))];
    try { localStorage.setItem(LS_FINALES, JSON.stringify({ sesion_id: sesion.id, local_ids: localIds })); } catch (e) {}
  }

  function _leerFinalesDeSesion() {
    const sesion = getSesionCache();
    if (!sesion?.id) return [];
    try {
      const cache = JSON.parse(localStorage.getItem(LS_FINALES) || 'null');
      return cache?.sesion_id === sesion.id && Array.isArray(cache.local_ids) ? cache.local_ids : [];
    } catch (e) { return []; }
  }

  function _registrarFinalDeSesion(localId) {
    if (!localId) return;
    _guardarFinalesDeSesion([..._leerFinalesDeSesion().map(local_id => ({ local_id })), { local_id: localId }]);
  }

  function esInformeFinalDeSesion(localId) {
    return Boolean(localId && _leerFinalesDeSesion().includes(localId));
  }

  // Cuando un admin continúa (no solo ve) el borrador o informe finalizado de
  // OTRO técnico, el guardado debe apuntar a la fila original por id (RPCs
  // sc_guardar_admin_borrador/sc_guardar_admin_informe) en vez de
  // sc_guardar_borrador/sc_guardar_informe (que conflictúan por
  // (tecnico_id, local_id) y crearían una fila duplicada, ya que el
  // tecnico_id del admin difiere del técnico dueño original).
  function _leerAjenos() {
    const sesion = getSesionCache();
    if (!sesion?.id) return {};
    try {
      const cache = JSON.parse(localStorage.getItem(LS_AJENOS) || 'null');
      return (cache?.sesion_id === sesion.id && cache.map) ? cache.map : {};
    } catch (e) { return {}; }
  }
  function _marcarAjeno(localId, remoteId) {
    if (!localId || !remoteId) return;
    const sesion = getSesionCache();
    if (!sesion?.id) return;
    const map = _leerAjenos();
    map[localId] = remoteId;
    try { localStorage.setItem(LS_AJENOS, JSON.stringify({ sesion_id: sesion.id, map })); } catch (e) {}
  }
  function _remoteIdAjeno(localId) {
    return _leerAjenos()[localId] || null;
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
    _remoteDraftChecked = false;
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
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'local_id' });
        }
        if (!db.objectStoreNames.contains(IDB_DRAFT_STORE)) {
          db.createObjectStore(IDB_DRAFT_STORE, { keyPath: 'local_id' });
        }
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = () => reject(req.error);
    });
    return _idbReady;
  }

  function _idbTx(mode, fn, storeName = IDB_STORE) {
    return _openIdb().then(db => {
      if (!db) {
        const error = new Error('IndexedDB no está disponible en este dispositivo');
        error.code = 'IDB_UNAVAILABLE';
        throw error;
      }
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
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

  function _idbPutDraft(rec) {
    return _idbTx('readwrite', store => store.put(rec), IDB_DRAFT_STORE).then(() => true).catch(e => {
      console.warn('[ScInformes] outbox borrador put', e);
      throw e;
    });
  }

  function _idbDeleteDraft(localId) {
    return _idbTx('readwrite', store => store.delete(localId), IDB_DRAFT_STORE).then(() => true).catch(e => {
      console.warn('[ScInformes] outbox borrador delete', e);
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

  function encolarBorrador(payload) {
    const rec = { ...payload, intentos: payload.intentos || 0, ultimo_intento: 0 };
    return _idbPutDraft(rec);
  }

  async function flushPendientes() {
    if (_syncing || !navigator.onLine) return 0;
    _syncing = true;
    let n = 0;
    try {
      const informes = await _idbGetAll();
      const borradores = await _idbGetAllDrafts();
      const todos = [
        ...informes.map(r => ({ ...r, _tipoPendiente: 'informe' })),
        ...borradores.map(r => ({ ...r, _tipoPendiente: 'borrador' })),
      ];
      const ahora = Date.now();
      const listos = todos.filter(r => {
        if (!r.intentos) return true;
        const backoff = Math.min(30000 * Math.pow(2, r.intentos), MAX_BACKOFF_MS);
        return (ahora - (r.ultimo_intento || 0)) >= backoff;
      });
      for (const rec of listos) {
        try {
          if (rec._tipoPendiente === 'borrador') {
            if (rec.ajeno_id) {
              await _rpc('sc_guardar_admin_borrador', {
                p_id: rec.ajeno_id,
                p_codigo: rec.codigo,
                p_estado_parcial: rec.estado_parcial,
              });
            } else {
              await _rpc('sc_guardar_borrador', {
                p_codigo: rec.codigo,
                p_establecimiento: rec.establecimiento,
                p_fecha: rec.fecha,
                p_local_id: rec.local_id,
                p_numero_acta: rec.numero_acta || null,
                p_estado_parcial: rec.estado_parcial,
              });
            }
            await _idbDeleteDraft(rec.local_id);
          } else {
            if (rec.ajeno_id) {
              await _rpc('sc_guardar_admin_informe', {
                p_id: rec.ajeno_id,
                p_codigo: rec.codigo,
                p_html: rec.html,
                p_numero_acta: rec.numero_acta || null,
                p_nivel_cumplimiento: rec.nivel_cumplimiento || null,
                p_aspectos_evaluados: Number.isFinite(rec.aspectos_evaluados) ? rec.aspectos_evaluados : null,
                p_aspectos_total: Number.isFinite(rec.aspectos_total) ? rec.aspectos_total : null,
                p_porcentaje_cumplimiento: Number.isFinite(rec.porcentaje_cumplimiento) ? rec.porcentaje_cumplimiento : null,
                p_estado_estructurado: rec.estado_estructurado || null,
              });
            } else {
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
                p_estado_estructurado: rec.estado_estructurado || null,
              });
            }
            await _idbDelete(rec.local_id);
          }
          n++;
        } catch (e) {
          rec.intentos = (rec.intentos || 0) + 1;
          rec.ultimo_intento = Date.now();
          if (rec._tipoPendiente === 'borrador') await _idbPutDraft(rec);
          else await _idbPut(rec); // nunca se borra por fallo: no perder el informe
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
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushBorradorPendiente().catch(() => {});
    });
    window.addEventListener('pagehide', () => flushBorradorPendiente().catch(() => {}));
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

    let estadoEstructurado = null;
    try {
      const inspeccion = (typeof Store !== 'undefined' && Store.get)
        ? (Store.get().inspecciones || []).find(i => i.id === payload.localId) : null;
      if (inspeccion) estadoEstructurado = _crearEstadoParcial(inspeccion, null, 'finalizada');
    } catch (e) { estadoEstructurado = null; }

    const ajenoId = _remoteIdAjeno(payload.localId);

    const params = ajenoId ? {
      p_id: ajenoId,
      p_codigo: codigo,
      p_html: payload.html,
      p_numero_acta: payload.numeroActa || null,
      p_nivel_cumplimiento: payload.nivelCumplimiento || null,
      p_aspectos_evaluados: Number.isFinite(payload.aspectosEvaluados) ? payload.aspectosEvaluados : null,
      p_aspectos_total: Number.isFinite(payload.aspectosTotal) ? payload.aspectosTotal : null,
      p_porcentaje_cumplimiento: Number.isFinite(payload.porcentajeCumplimiento) ? payload.porcentajeCumplimiento : null,
      p_estado_estructurado: estadoEstructurado,
    } : {
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
      p_estado_estructurado: estadoEstructurado,
    };
    try {
      const id = await _rpc(ajenoId ? 'sc_guardar_admin_informe' : 'sc_guardar_informe', params);
      await _retirarBorradorPendiente(payload.localId);
      _registrarFinalDeSesion(payload.localId);
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
        estado_estructurado: estadoEstructurado,
        ajeno_id: ajenoId || null,
      };
      try {
        await encolarPendiente(pendiente);
        await _retirarBorradorPendiente(payload.localId);
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

  // ── Borrador incremental: texto estructurado, nunca fotografías ─────────

  function _clonarSinFotos(value) {
    if (Array.isArray(value)) return value.map(_clonarSinFotos);
    if (!value || typeof value !== 'object') return value;
    const out = {};
    Object.keys(value).forEach(key => {
      if (key === 'fotografias' || key === 'firmas') return;
      out[key] = _clonarSinFotos(value[key]);
    });
    return out;
  }

  function _aspectosTotales(inspeccion) {
    return (inspeccion?.programas || []).reduce((total, programa) => total
      + (programa.aspectos || []).reduce((subtotal, aspecto) => subtotal
        + 1 + (aspecto.criterios_extra || []).length, 0), 0);
  }

  function _aspectosEvaluados(inspeccion) {
    const criterioDe = aspecto => (typeof Scores !== 'undefined' && typeof Scores.criterio === 'function')
      ? Scores.criterio(aspecto) : (aspecto.criterio || aspecto.evaluacion);
    return (inspeccion?.programas || []).reduce((total, programa) => total
      + (programa.aspectos || []).reduce((subtotal, aspecto) => subtotal
        + (criterioDe(aspecto) ? 1 : 0)
        + (aspecto.criterios_extra || []).reduce((extra, criterio) => extra
          + (criterio.criterio ? 1 : 0), 0), 0), 0);
  }

  const UI_SCREENS = ['home', 'about', 'planificar', 'personalizar', 'hacer', 'verificar', 'dashboard', 'actuar'];

  function _crearEstadoParcial(inspeccion, cursor, estadoLabel) {
    const ahora = new Date().toISOString();
    const total = _aspectosTotales(inspeccion);
    const evaluados = _aspectosEvaluados(inspeccion);
    const snapshot = _clonarSinFotos({
      id: inspeccion.id,
      fase_phva: inspeccion.fase_phva,
      establecimiento: inspeccion.establecimiento,
      inspeccion: inspeccion.inspeccion,
      numero_acta: inspeccion.numero_acta,
      programas: inspeccion.programas,
      estado_general: inspeccion.estado_general,
      hallazgos_criticos: inspeccion.hallazgos_criticos,
      score: inspeccion.score,
      creado_en: inspeccion.creado_en,
      actualizado_en: inspeccion.actualizado_en,
      version_app: inspeccion.version_app,
    });
    const ui = (typeof Store !== 'undefined' && Store.get) ? (Store.get().ui || {}) : {};
    const screenReal = UI_SCREENS.includes(ui.screen) ? ui.screen : 'hacer';
    return {
      version: 1,
      estado: estadoLabel || 'en_curso',
      local_id: inspeccion.id,
      guardado_en: ahora,
      aspectos_completados: evaluados,
      aspectos_total: total,
      ultimo_aspecto: cursor || null,
      ui: { screen: screenReal, programaIdx: ui.programaIdx || 0, aspectoIdx: ui.aspectoIdx || 0 },
      inspeccion: snapshot,
    };
  }

  function _crearPayloadBorrador(inspeccion, cursor) {
    return {
      localId: inspeccion.id,
      establecimiento: inspeccion.establecimiento || {},
      fecha: inspeccion.inspeccion?.fecha || new Date().toISOString().slice(0, 10),
      numeroActa: inspeccion.numero_acta || inspeccion.inspeccion?.numero_acta || null,
      estadoParcial: _crearEstadoParcial(inspeccion, cursor),
    };
  }

  async function guardarBorrador(payload) {
    const codigo = getCodigo();
    if (!codigo) return { ok: false, sinCodigo: true };
    const ajenoId = _remoteIdAjeno(payload.localId);
    const params = ajenoId ? {
      p_id: ajenoId,
      p_codigo: codigo,
      p_estado_parcial: payload.estadoParcial,
    } : {
      p_codigo: codigo,
      p_establecimiento: payload.establecimiento || {},
      p_fecha: payload.fecha,
      p_local_id: payload.localId,
      p_numero_acta: payload.numeroActa || null,
      p_estado_parcial: payload.estadoParcial,
    };
    try {
      const id = await _rpc(ajenoId ? 'sc_guardar_admin_borrador' : 'sc_guardar_borrador', params);
      return { ok: true, id };
    } catch (e) {
      if (/código de acceso inválido/i.test(e.message || '')) {
        return { ok: false, codigoInvalido: true };
      }
      const pendiente = {
        local_id: payload.localId,
        codigo,
        establecimiento: payload.establecimiento || {},
        fecha: payload.fecha,
        numero_acta: payload.numeroActa || null,
        estado_parcial: payload.estadoParcial,
        ajeno_id: ajenoId || null,
      };
      try {
        await encolarBorrador(pendiente);
        return { ok: false, encolado: true, error: e.message };
      } catch (outboxError) {
        return { ok: false, outboxUnavailable: true, error: e.message, outboxError: outboxError.message };
      }
    }
  }

  async function _flushBorradorNow() {
    if (_draftSending || !_draftPending) return null;
    clearTimeout(_draftTimer);
    _draftTimer = null;
    const item = _draftPending;
    _draftPending = null;
    _draftSending = true;
    try {
      const result = await guardarBorrador(item.payload);
      if (result.ok || result.encolado) {
        _draftLastSentAt = Date.now();
        _draftLastAspectKey = item.aspectKey || '';
      }
      return result;
    } finally {
      _draftSending = false;
      if (_draftPending) {
        const remaining = Math.max(0, DRAFT_INTERVAL_MS - (Date.now() - _draftLastSentAt));
        _draftTimer = setTimeout(() => _flushBorradorNow().catch(() => {}), remaining);
      }
    }
  }

  function scheduleBorrador(inspeccion, options = {}) {
    if (!inspeccion?.id || typeof guardarBorrador !== 'function') return;
    _draftPending = {
      payload: _crearPayloadBorrador(inspeccion, options.cursor),
      aspectKey: options.aspectKey || '',
    };
    const elapsed = Date.now() - _draftLastSentAt;
    const cambioDeAspecto = !!options.aspectKey && options.aspectKey !== _draftLastAspectKey;
    const enviarAhora = options.flushOnExit || (options.force && cambioDeAspecto) || elapsed >= DRAFT_INTERVAL_MS;
    clearTimeout(_draftTimer);
    if (enviarAhora) {
      _flushBorradorNow().catch(() => {});
    } else {
      _draftTimer = setTimeout(() => _flushBorradorNow().catch(() => {}), Math.max(0, DRAFT_INTERVAL_MS - elapsed));
    }
  }

  function flushBorradorPendiente() {
    return _flushBorradorNow();
  }

  function _cancelarBorradorEnMemoria(localId) {
    if (_draftPending?.payload?.localId !== localId) return;
    clearTimeout(_draftTimer);
    _draftTimer = null;
    _draftPending = null;
  }

  async function _retirarBorradorPendiente(localId) {
    if (!localId) return;
    _cancelarBorradorEnMemoria(localId);
    try { await _idbDeleteDraft(localId); } catch (e) {
      console.warn('[ScInformes] no se pudo retirar el borrador finalizado', e);
    }
  }

  function programarBorradorActual(force = true) {
    if (typeof Store === 'undefined' || !Store.getCurrentInspeccion) return;
    const inspeccion = Store.getCurrentInspeccion();
    if (inspeccion) scheduleBorrador(inspeccion, { force, flushOnExit: force });
  }

  function _fechaMs(value) {
    const time = Date.parse(value || '');
    return Number.isFinite(time) ? time : 0;
  }

  function _buscarAspecto(programa, aspecto) {
    return (programa?.aspectos || []).find(a => a.id === aspecto.id) || null;
  }

  function _conservarFotografias(local, restaurada) {
    if (!local || !restaurada) return;
    const programas = restaurada.programas || [];
    (local.programas || []).forEach(localPrograma => {
      const programa = programas.find(p => p.id === localPrograma.id);
      if (!programa) return;
      (localPrograma.aspectos || []).forEach(localAspecto => {
        const aspecto = _buscarAspecto(programa, localAspecto);
        if (!aspecto || !Array.isArray(localAspecto.fotografias)) return;
        aspecto.fotografias = localAspecto.fotografias;
        (localAspecto.criterios_extra || []).forEach((extra, index) => {
          if (!Array.isArray(extra.fotografias)) return;
          if (!Array.isArray(aspecto.criterios_extra)) aspecto.criterios_extra = [];
          if (aspecto.criterios_extra[index]) aspecto.criterios_extra[index].fotografias = extra.fotografias;
        });
      });
    });
  }

  function _idbGetAllDrafts() {
    return _openIdb().then(db => {
      if (!db) return [];
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_DRAFT_STORE, 'readonly');
        const req = tx.objectStore(IDB_DRAFT_STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
  }

  function _restaurarEstadoRemoto(payloadEstado, remoteId) {
    const remoto = payloadEstado?.inspeccion;
    const localId = payloadEstado?.local_id;
    if (!remoto?.programas?.length || !localId) return null;
    const actual = (typeof Store !== 'undefined' && Store.get) ? Store.get() : { inspecciones: [], ui: {} };
    const local = (actual.inspecciones || []).find(i => i.id === localId) || null;
    const restaurada = { ...(local || {}), ...remoto, id: localId };
    if (local?.firmas && !restaurada.firmas) restaurada.firmas = local.firmas;
    _conservarFotografias(local, restaurada);
    restaurada.actualizado_en = new Date().toISOString();
    const inspecciones = (actual.inspecciones || []).filter(i => i.id !== localId);
    inspecciones.unshift(restaurada);
    const screenReal = UI_SCREENS.includes(payloadEstado.ui?.screen) ? payloadEstado.ui.screen : 'hacer';
    const ui = { ...(actual.ui || {}), ...(payloadEstado.ui || {}), screen: screenReal };
    Store.set({ inspecciones, currentId: localId, ui });
    if (remoteId) _marcarAjeno(localId, remoteId);
    return restaurada;
  }

  // Wrapper delgado: único caller restante es revisarBorradoresRemotos (sin uso en UI, ver 4.3).
  function _restaurarBorradorLocal(detalle) {
    return _restaurarEstadoRemoto(detalle?.estado_parcial);
  }

  async function revisarBorradoresRemotos() {
    if (_remoteDraftChecked || !getCodigo() || typeof Store === 'undefined') return null;
    let filas;
    try { filas = await listBorradores(); } catch (e) { return null; }
    _remoteDraftChecked = true;
    const inspecciones = Store.get().inspecciones || [];
    const candidatos = (filas || []).filter(fila => {
      const local = inspecciones.find(i => i.id === fila.local_id);
      const remotoMs = _fechaMs(fila.estado_parcial_actualizado_en || fila.actualizado_en);
      const localMs = _fechaMs(local?.actualizado_en || local?.creado_en);
      return !local || remotoMs > localMs;
    }).sort((a, b) => {
      const current = Store.get().currentId;
      if (a.local_id === current && b.local_id !== current) return -1;
      if (b.local_id === current && a.local_id !== current) return 1;
      return _fechaMs(b.estado_parcial_actualizado_en || b.actualizado_en)
        - _fechaMs(a.estado_parcial_actualizado_en || a.actualizado_en);
    });
    const fila = candidatos[0];
    if (!fila) return null;
    let detalle;
    try { detalle = await getBorrador(fila.id); } catch (e) { return null; }
    const nombre = detalle?.establecimiento?.nombre || 'esta inspección';
    const recuperar = window.confirm(
      `Hay un borrador remoto más reciente de ${nombre}. ¿Deseas recuperar el progreso guardado?`
    );
    if (!recuperar) return { ofrecido: true, recuperado: false, localId: detalle.local_id };
    const restaurada = _restaurarBorradorLocal(detalle);
    if (!restaurada) return { ofrecido: true, recuperado: false, localId: detalle.local_id };
    if (typeof Router !== 'undefined' && Router.go) Router.go('hacer');
    if (typeof Router !== 'undefined' && Router.toast) Router.toast('Progreso recuperado desde la nube');
    return { ofrecido: true, recuperado: true, localId: detalle.local_id };
  }

  // ── CRUD técnico ─────────────────────────────────────────────────────────

  function listMisInformes() {
    return _rpc('sc_list_mis_informes', { p_codigo: getCodigo() }).then(filas => {
      _guardarFinalesDeSesion(filas);
      return filas;
    });
  }
  function listBorradores() {
    return _rpc('sc_list_borradores', { p_codigo: getCodigo() });
  }
  function getBorrador(id) {
    return _rpc('sc_get_borrador', { p_id: id, p_codigo: getCodigo() }).then(r => Array.isArray(r) ? r[0] : r);
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

  function _fusionarUnificado(informes, borradores) {
    const marcados = [
      ...(informes || []).map(f => ({ ...f, _enCurso: false })),
      ...(borradores || []).map(f => ({ ...f, _enCurso: true })),
    ];
    return marcados.sort((a, b) => {
      const tsA = _fechaMs(a._enCurso ? (a.estado_parcial_actualizado_en || a.actualizado_en) : a.actualizado_en);
      const tsB = _fechaMs(b._enCurso ? (b.estado_parcial_actualizado_en || b.actualizado_en) : b.actualizado_en);
      return tsB - tsA;
    });
  }

  async function listMisInformesUnificado() {
    const [informes, borradores] = await Promise.all([listMisInformes(), listBorradores()]);
    return _fusionarUnificado(informes, borradores);
  }

  function listAdminBorradores() {
    return _rpc('sc_list_admin_borradores', { p_codigo: getCodigo() });
  }
  function getAdminBorrador(id) {
    return _rpc('sc_get_admin_borrador', { p_id: id, p_codigo: getCodigo() }).then(r => Array.isArray(r) ? r[0] : r);
  }

  async function listAdminInformesUnificado() {
    const [informes, borradores] = await Promise.all([listAdminInformes(), listAdminBorradores()]);
    return _fusionarUnificado(informes, borradores);
  }

  return {
    getCodigo, setCodigo, clearSesion, getSesionCache, whoami, loginUsuario, esInformeFinalDeSesion,
    configurarPasswordInicial, esAdmin, eliminarUsuario, cambiarPassword,
    guardarInforme, flushPendientes, bindAutoRetry, encolarPendiente,
    guardarBorrador, scheduleBorrador, flushBorradorPendiente, programarBorradorActual,
    revisarBorradoresRemotos, listBorradores, getBorrador,
    listMisInformes, getInforme, updateInforme, deleteInforme,
    listAdminInformes, getAdminInforme, updateAdminInforme, deleteAdminInforme,
    listUsuarios, crearUsuario,
    restaurarEstadoRemoto: _restaurarEstadoRemoto,
    marcarAjeno: _marcarAjeno,
    listMisInformesUnificado, listAdminInformesUnificado,
    listAdminBorradores, getAdminBorrador,
  };
})();
