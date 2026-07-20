/**
 * invima-crud.js — CRUD configuración INVIMA por establecimiento
 * localStorage: sanicheck_invima_config
 */
const InvimaCrud = (() => {
  'use strict';

  const LS_KEY = 'sanicheck_invima_config';
  const LS_QUEUE = 'sanicheck_invima_pending';

  let _base = null;

  function _uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function _estId(fallback) {
    return (typeof PortalCliente !== 'undefined' && PortalCliente.getEstablecimientoId())
      || fallback || 'local-pending';
  }

  function _headers(prefer) {
    const cfg = window.SANICHECK_PORTAL_CONFIG;
    const codigo = typeof PortalCliente !== 'undefined' ? PortalCliente.getCodigoAcceso() : '';
    const h = {
      apikey: cfg.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + cfg.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'x-sanicheck-codigo-acceso': codigo ? String(codigo).trim().toUpperCase() : '',
    };
    if (prefer) h.Prefer = prefer;
    return h;
  }

  function _rest(path) {
    return window.SANICHECK_PORTAL_CONFIG.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + path;
  }

  function _loadStore(estId) {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const all = raw ? JSON.parse(raw) : {};
      if (!all[estId]) all[estId] = { items: [], sincronizado_en: null };
      if (!Array.isArray(all[estId].items)) all[estId].items = [];
      return all;
    } catch (_) {
      return { [estId]: { items: [], sincronizado_en: null } };
    }
  }

  function _saveStore(all) {
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  }

  async function loadBaseChecklist() {
    if (_base) return _base;
    try {
      const res = await fetch('data/invima-checklist-base-v1.0.json');
      if (res.ok) { _base = await res.json(); return _base; }
    } catch (_) { /* offline */ }
    _base = { categorias: [] };
    return _base;
  }

  function _seedBaseItems(estId) {
    const all = _loadStore(estId);
    if (all[estId].items.length) return all[estId].items;
    const base = _base || { categorias: [] };
    const items = [];
    (base.categorias || []).forEach(cat => {
      (cat.items || []).forEach(it => {
        items.push({
          id: _uuid(),
          establecimiento_id: estId,
          categoria_id: cat.id,
          item_id: it.id,
          codigo: it.codigo,
          nombre: it.nombre,
          normativa: it.normativa,
          descripcion: it.descripcion || '',
          peso: cat.peso || 1,
          custom: false,
          estado: 'activo',
          creado_por: 'Sistema',
        });
      });
    });
    all[estId].items = items;
    _saveStore(all);
    return items;
  }

  function getConfigINVIMA(establecimientoId) {
    const estId = _estId(establecimientoId);
    const all = _loadStore(estId);
    let items = all[estId].items;
    if (!items.length && _base) items = _seedBaseItems(estId);
    return items.filter(it => it.estado !== 'inactivo');
  }

  function _codigoDuplicado(estId, codigo, excludeId) {
    return getConfigINVIMA(estId).some(it => it.codigo === codigo && it.id !== excludeId);
  }

  function _nextCodigo(estId, categoriaId) {
    const prefix = (categoriaId || 'cat_01').replace('cat_0', '').replace('cat_', '') || '1';
    const nums = getConfigINVIMA(estId)
      .filter(it => it.categoria_id === categoriaId && /^\d+\.\d+$/.test(it.codigo))
      .map(it => parseFloat(it.codigo.split('.')[1]) || 0);
    const next = (Math.max(0, ...nums) + 1);
    return prefix + '.' + next;
  }

  function agregarItem(categoriaId, nombre, normativa, frecuencia, establecimientoId, codigoOpt) {
    const estId = _estId(establecimientoId);
    const nombreVal = String(nombre || '').trim();
    if (!nombreVal) throw new Error('Nombre requerido');
    const codigo = codigoOpt || _nextCodigo(estId, categoriaId);
    if (_codigoDuplicado(estId, codigo)) throw new Error('Código duplicado');

    const item = {
      id: _uuid(),
      establecimiento_id: estId,
      categoria_id: categoriaId,
      item_id: 'item_custom_' + codigo.replace('.', '_'),
      codigo,
      nombre: nombreVal,
      normativa: normativa || 'Local/ECODESA/Específico',
      peso: 1,
      custom: true,
      estado: 'activo',
      creado_por: 'Profesional',
      frecuencia: frecuencia || null,
      fecha_creacion: new Date().toISOString(),
      sync_pending: true,
    };

    const all = _loadStore(estId);
    all[estId].items.push(item);
    _saveStore(all);
    _syncItem(item).catch(() => _enqueue(item.id));
    return item;
  }

  function editarItem(itemId, nombre, normativa, establecimientoId) {
    const estId = _estId(establecimientoId);
    const all = _loadStore(estId);
    const idx = all[estId].items.findIndex(it => it.id === itemId);
    if (idx < 0) throw new Error('Ítem no encontrado');
    if (!all[estId].items[idx].custom) throw new Error('No editable');

    all[estId].items[idx] = {
      ...all[estId].items[idx],
      nombre: String(nombre || '').trim() || all[estId].items[idx].nombre,
      normativa: normativa || all[estId].items[idx].normativa,
      fecha_actualizacion: new Date().toISOString(),
      sync_pending: true,
    };
    _saveStore(all);
    _syncItem(all[estId].items[idx]).catch(() => _enqueue(itemId));
    return all[estId].items[idx];
  }

  function eliminarItem(itemId, establecimientoId) {
    const estId = _estId(establecimientoId);
    const all = _loadStore(estId);
    const item = all[estId].items.find(it => it.id === itemId);
    if (!item) return false;
    if (!item.custom) throw new Error('No editable');

    all[estId].items = all[estId].items.filter(it => it.id !== itemId);
    _saveStore(all);
    if (typeof PortalCliente !== 'undefined' && PortalCliente.isActivo()) {
      fetch(_rest('invima_config?id=eq.' + encodeURIComponent(itemId)), {
        method: 'DELETE', headers: _headers(),
      }).catch(() => _enqueue('del:' + itemId));
    }
    return true;
  }

  function _row(item) {
    return {
      id: item.id,
      establecimiento_id: item.establecimiento_id,
      categoria_id: item.categoria_id,
      item_id: item.item_id,
      codigo: item.codigo,
      nombre: item.nombre,
      normativa: item.normativa,
      peso: item.peso,
      custom: !!item.custom,
      estado: item.estado || 'activo',
      creado_por: item.creado_por || 'Profesional',
    };
  }

  async function _syncItem(item) {
    if (typeof PortalCliente === 'undefined' || !PortalCliente.isActivo()) return;
    const estId = PortalCliente.getEstablecimientoId();
    if (!estId) return;
    item.establecimiento_id = estId;
    const res = await fetch(_rest('invima_config?on_conflict=id'), {
      method: 'POST',
      headers: _headers('resolution=merge-duplicates,return=minimal'),
      body: JSON.stringify([_row(item)]),
    });
    if (!res.ok) throw new Error('sync invima ' + res.status);
    const all = _loadStore(estId);
    const idx = all[estId].items.findIndex(it => it.id === item.id);
    if (idx >= 0) {
      all[estId].items[idx].sync_pending = false;
      all[estId].sincronizado_en = new Date().toISOString();
      _saveStore(all);
    }
  }

  function _enqueue(id) {
    try {
      const q = JSON.parse(localStorage.getItem(LS_QUEUE) || '[]');
      q.push({ id, at: Date.now() });
      localStorage.setItem(LS_QUEUE, JSON.stringify(q.slice(-50)));
    } catch (_) { /* ignore */ }
  }

  async function flushQueue() {
    if (!navigator.onLine || typeof PortalCliente === 'undefined' || !PortalCliente.isActivo()) return;
    const q = JSON.parse(localStorage.getItem(LS_QUEUE) || '[]');
    const remaining = [];
    for (const job of q) {
      try {
        if (String(job.id).startsWith('del:')) {
          await fetch(_rest('invima_config?id=eq.' + encodeURIComponent(job.id.slice(4))), {
            method: 'DELETE', headers: _headers(),
          });
        } else {
          const estId = PortalCliente.getEstablecimientoId();
          const item = _loadStore(estId)[estId]?.items.find(it => it.id === job.id);
          if (item) await _syncItem(item);
        }
      } catch (_) { remaining.push(job); }
    }
    localStorage.setItem(LS_QUEUE, JSON.stringify(remaining));
  }

  function bindOnlineRetry() {
    window.addEventListener('online', () => flushQueue().catch(() => {}));
  }

  function resumen(establecimientoId) {
    const items = getConfigINVIMA(establecimientoId);
    const base = items.filter(it => !it.custom).length;
    const custom = items.filter(it => it.custom).length;
    return { base, custom, total: items.length };
  }

  return {
    LS_KEY,
    loadBaseChecklist,
    getConfigINVIMA,
    agregarItem,
    editarItem,
    eliminarItem,
    flushQueue,
    bindOnlineRetry,
    resumen,
  };
})();
