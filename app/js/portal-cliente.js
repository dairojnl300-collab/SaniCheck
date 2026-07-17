/**
 * portal-cliente.js — Activación Portal Cliente + sync de Control de Vencimientos → Supabase
 * localStorage es la fuente de verdad; Supabase nunca bloquea el guardado local.
 */
const PortalCliente = (() => {
  'use strict';

  const LS_ID = 'sanicheck_portal_establecimiento_id';
  const LS_CODIGO = 'sanicheck_portal_codigo_acceso';
  const LS_NOMBRE = 'sanicheck_portal_nombre';
  const LS_NIT = 'sanicheck_portal_nit';
  const LS_QUEUE = 'sanicheck_portal_sync_queue';

  let _syncing = false;
  let _onlineBound = false;

  function _cfg() {
    const c = window.SANICHECK_PORTAL_CONFIG;
    if (!c || !c.SUPABASE_URL || !c.SUPABASE_ANON_KEY) {
      throw new Error('Falta portal-config.js');
    }
    return c;
  }

  function _headers(prefer) {
    const { SUPABASE_ANON_KEY } = _cfg();
    const h = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    };
    if (prefer) h.Prefer = prefer;
    return h;
  }

  function _rest(path) {
    return _cfg().SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + path;
  }

  function getEstablecimientoId() {
    return localStorage.getItem(LS_ID) || '';
  }

  function getCodigoAcceso() {
    return localStorage.getItem(LS_CODIGO) || '';
  }

  function getPortalMeta() {
    return {
      id: getEstablecimientoId(),
      codigo: getCodigoAcceso(),
      nombre: localStorage.getItem(LS_NOMBRE) || '',
      nit: localStorage.getItem(LS_NIT) || '',
      activo: Boolean(getEstablecimientoId() && getCodigoAcceso()),
    };
  }

  function isActivo() {
    return getPortalMeta().activo;
  }

  function generarCodigoAcceso() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin I/O/0/1
    let out = '';
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 6; i++) out += alphabet[bytes[i] % alphabet.length];
    return out;
  }

  function resolverEstablecimientoLocal() {
    try {
      const draft = typeof Store !== 'undefined' ? Store.getPlanificarDraft() : null;
      const form = draft && draft.form ? draft.form : {};
      let nombre = (form['inp-nombre'] || '').trim();
      let nit = (form['inp-nit'] || '').trim();
      if ((!nombre || !nit) && typeof Store !== 'undefined') {
        const ins = Store.getCurrentInspeccion && Store.getCurrentInspeccion();
        const est = ins && ins.establecimiento;
        if (est) {
          if (!nombre) nombre = String(est.nombre || '').trim();
          if (!nit) nit = String(est.nit || '').trim();
        }
      }
      if ((!nombre || !nit) && typeof Store !== 'undefined') {
        const list = (Store.get() && Store.get().inspecciones) || [];
        const last = list[list.length - 1];
        if (last && last.establecimiento) {
          if (!nombre) nombre = String(last.establecimiento.nombre || '').trim();
          if (!nit) nit = String(last.establecimiento.nit || '').trim();
        }
      }
      return { nombre, nit };
    } catch (_) {
      return { nombre: '', nit: '' };
    }
  }

  async function activar(nombre, nit) {
    const n = String(nombre || '').trim();
    const nitVal = String(nit || '').trim();
    if (!n) throw new Error('Indica el nombre del establecimiento.');
    if (!nitVal) throw new Error('Indica el NIT del establecimiento.');

    const codigo = generarCodigoAcceso();
    const res = await fetch(_rest('establecimientos'), {
      method: 'POST',
      headers: _headers('return=representation'),
      body: JSON.stringify({
        nombre: n,
        nit: nitVal,
        codigo_acceso: codigo,
        activo: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[PortalCliente] activar', res.status, text);
      throw new Error('No se pudo activar el Portal. Revisa la conexión e intenta de nuevo.');
    }

    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row || !row.id) throw new Error('Respuesta inválida al crear el establecimiento.');

    localStorage.setItem(LS_ID, row.id);
    localStorage.setItem(LS_CODIGO, row.codigo_acceso || codigo);
    localStorage.setItem(LS_NOMBRE, row.nombre || n);
    localStorage.setItem(LS_NIT, row.nit || nitVal);

    // Sync inicial en background (no bloquea)
    try {
      const est = { nombre: n, nit: nitVal };
      if (typeof Vencimientos !== 'undefined') {
        const data = Vencimientos.getVencimientos(est);
        syncVencimientos(est, data);
      }
    } catch (e) {
      console.warn('[PortalCliente] sync inicial', e);
    }

    return getPortalMeta();
  }

  function _portalEstado(fechaISO) {
    if (!fechaISO) return null;
    const hoy = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00');
    const venc = new Date(String(fechaISO).slice(0, 10) + 'T00:00:00');
    if (Number.isNaN(venc.getTime())) return null;
    const dias = Math.round((venc - hoy) / 86400000);
    if (dias < 0) return 'vencido';
    if (dias <= 7) return 'por_vencer_7d';
    return 'vigente';
  }

  function buildSnapshots(establecimientoId, data) {
    if (!establecimientoId || typeof Vencimientos === 'undefined') return [];
    const now = new Date().toISOString();
    const rows = [];

    Vencimientos.getPersonalRows(data, '').forEach((r) => {
      if (r.sinVencimiento) return;
      const fecha = r.vencimiento || r.vigencia || '';
      const estado = _portalEstado(fecha);
      if (!estado || !fecha) return;
      rows.push({
        establecimiento_id: establecimientoId,
        origen_key: 'personal:' + r.trabajadorId + ':' + r.itemId,
        categoria: 'personal',
        nombre: r.nombre || 'Personal',
        tipo: r.documento || 'Documento',
        fecha_vencimiento: String(fecha).slice(0, 10),
        estado,
        actualizado_en: now,
      });
    });

    Vencimientos.getEquiposRows(data, '').forEach((r) => {
      const fecha = r.proxima_calibracion || '';
      const estado = _portalEstado(fecha);
      if (!estado || !fecha) return;
      rows.push({
        establecimiento_id: establecimientoId,
        origen_key: 'equipos:' + r.equipoId + ':calibracion',
        categoria: 'equipos',
        nombre: r.codigo || r.tipo || 'Equipo',
        tipo: r.tipo || 'Equipo',
        fecha_vencimiento: String(fecha).slice(0, 10),
        estado,
        actualizado_en: now,
      });
    });

    return rows;
  }

  function _loadQueue() {
    try {
      const raw = localStorage.getItem(LS_QUEUE);
      const q = raw ? JSON.parse(raw) : [];
      return Array.isArray(q) ? q : [];
    } catch (_) {
      return [];
    }
  }

  function _saveQueue(q) {
    try {
      localStorage.setItem(LS_QUEUE, JSON.stringify(q.slice(-50)));
    } catch (e) {
      console.warn('[PortalCliente] queue save', e);
    }
  }

  function _enqueue(rows) {
    if (!rows || !rows.length) return;
    const q = _loadQueue();
    q.push({ at: Date.now(), rows });
    _saveQueue(q);
  }

  async function _upsertRows(rows) {
    if (!rows.length) return { ok: true, count: 0 };
    const res = await fetch(
      _rest('snapshots_control_vencimientos?on_conflict=establecimiento_id,origen_key'),
      {
        method: 'POST',
        headers: _headers('resolution=merge-duplicates,return=minimal'),
        body: JSON.stringify(rows),
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error('upsert ' + res.status + ' ' + text.slice(0, 180));
      err.status = res.status;
      throw err;
    }
    return { ok: true, count: rows.length };
  }

  /**
   * Sync no bloqueante. Si falla, encola para reintento online.
   */
  function syncVencimientos(est, data) {
    const id = getEstablecimientoId();
    if (!id) return;

    let rows;
    try {
      rows = buildSnapshots(id, data || {});
    } catch (e) {
      console.warn('[PortalCliente] buildSnapshots', e);
      return;
    }

    // Fire-and-forget
    Promise.resolve()
      .then(async () => {
        try {
          await _upsertRows(rows);
          await flushQueue();
        } catch (e) {
          console.warn('[PortalCliente] sync diferido', e);
          _enqueue(rows);
        }
      })
      .catch(() => {});
  }

  async function flushQueue() {
    if (_syncing) return;
    if (!navigator.onLine) return;
    const q = _loadQueue();
    if (!q.length) return;

    _syncing = true;
    try {
      const remaining = [];
      for (const item of q) {
        try {
          await _upsertRows(item.rows || []);
        } catch (e) {
          remaining.push(item);
        }
      }
      _saveQueue(remaining);
    } finally {
      _syncing = false;
    }
  }

  function bindOnlineRetry() {
    if (_onlineBound) return;
    _onlineBound = true;
    window.addEventListener('online', () => {
      flushQueue().catch(() => {});
    });
    // Reintento al iniciar
    setTimeout(() => {
      flushQueue().catch(() => {});
    }, 1500);
  }

  return {
    isActivo,
    getPortalMeta,
    getEstablecimientoId,
    getCodigoAcceso,
    generarCodigoAcceso,
    resolverEstablecimientoLocal,
    activar,
    syncVencimientos,
    buildSnapshots,
    flushQueue,
    bindOnlineRetry,
  };
})();
