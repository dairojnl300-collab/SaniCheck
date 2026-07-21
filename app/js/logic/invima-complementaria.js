/**
 * invima-complementaria.js — CRUD verificación complementaria (localStorage separado)
 * Keys: invima_config_complementaria · invima_evaluacion_complementaria
 */
const InvimaComplementaria = (() => {
  'use strict';

  const LS_CONFIG = 'invima_config_complementaria';
  const LS_EVAL = 'invima_evaluacion_complementaria';

  const CAT_ID_TO_KEY = {
    cat_01: 'Edificacion',
    cat_02: 'Equipos',
    cat_03: 'Personal',
    cat_04: 'RequisitosHigienicos',
    cat_05: 'Saneamiento',
    cat_06: 'Verificacion',
  };

  const CAT_KEY_TO_ID = Object.fromEntries(
    Object.entries(CAT_ID_TO_KEY).map(([id, key]) => [key, id])
  );

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

  function catKeyFromId(catId) {
    return CAT_ID_TO_KEY[catId] || catId;
  }

  function catIdFromKey(key) {
    return CAT_KEY_TO_ID[key] || key;
  }

  function _emptyStore() {
    const blank = {};
    Object.values(CAT_ID_TO_KEY).forEach(k => { blank[k] = []; });
    return blank;
  }

  function _loadConfig(estId) {
    try {
      const raw = localStorage.getItem(LS_CONFIG);
      const all = raw ? JSON.parse(raw) : {};
      if (!all[estId]) all[estId] = _emptyStore();
      Object.values(CAT_ID_TO_KEY).forEach(k => {
        if (!Array.isArray(all[estId][k])) all[estId][k] = [];
      });
      return all;
    } catch (_) {
      return { [estId]: _emptyStore() };
    }
  }

  function _saveConfig(all) {
    localStorage.setItem(LS_CONFIG, JSON.stringify(all));
  }

  function _loadEval(estId) {
    try {
      const raw = localStorage.getItem(LS_EVAL);
      const all = raw ? JSON.parse(raw) : {};
      if (!all[estId]) all[estId] = {};
      return all;
    } catch (_) {
      return { [estId]: {} };
    }
  }

  function _saveEval(all) {
    localStorage.setItem(LS_EVAL, JSON.stringify(all));
  }

  function list(categoriaKeyOrId, estId) {
    const id = _estId(estId);
    const key = CAT_ID_TO_KEY[categoriaKeyOrId] || categoriaKeyOrId;
    return [...(_loadConfig(id)[id][key] || [])];
  }

  function listByCatId(catId, estId) {
    return list(catKeyFromId(catId), estId);
  }

  function countAll(estId) {
    const id = _estId(estId);
    const store = _loadConfig(id)[id];
    return Object.values(store).reduce((n, arr) => n + (arr?.length || 0), 0);
  }

  function countCriticosCumplidos(catId, estId) {
    const items = listByCatId(catId, estId).filter(it => it.critico);
    if (!items.length) return { total: 0, cumplidos: 0 };
    const evalCat = getEvaluacionCat(catId, estId);
    const cumplidos = items.filter(it => evalCat[it.id] === 'A' || evalCat[it.id] === 'NA').length;
    return { total: items.length, cumplidos };
  }

  function add(categoriaKeyOrId, data, estId) {
    const id = _estId(estId);
    const key = CAT_ID_TO_KEY[categoriaKeyOrId] || categoriaKeyOrId;
    const nombre = String(data.nombre || '').trim();
    if (!nombre) throw new Error('Nombre requerido');
    if (nombre.length > 100) throw new Error('Nombre máximo 100 caracteres');
    const descripcion = String(data.descripcion || data.criterio || '').trim().slice(0, 200);
    const criterio = String(data.criterio || data.descripcion || '').trim().slice(0, 300);
    const normativa = String(data.normativa || '').trim().slice(0, 150);
    const item = {
      id: _uuid(),
      nombre,
      descripcion,
      criterio,
      normativa,
      critico: !!data.critico,
      esComplementaria: true,
      timestamp: Date.now(),
    };
    const all = _loadConfig(id);
    all[id][key].push(item);
    _saveConfig(all);
    return item;
  }

  function update(categoriaKeyOrId, itemId, data, estId) {
    const id = _estId(estId);
    const key = CAT_ID_TO_KEY[categoriaKeyOrId] || categoriaKeyOrId;
    const all = _loadConfig(id);
    const idx = (all[id][key] || []).findIndex(it => it.id === itemId);
    if (idx < 0) throw new Error('Ítem no encontrado');
    const nombre = String(data.nombre || '').trim();
    if (!nombre) throw new Error('Nombre requerido');
    all[id][key][idx] = {
      ...all[id][key][idx],
      nombre: nombre.slice(0, 100),
      descripcion: String(data.descripcion || data.criterio || '').trim().slice(0, 200),
      criterio: String(data.criterio || data.descripcion || all[id][key][idx].criterio || '').trim().slice(0, 300),
      normativa: String(data.normativa || all[id][key][idx].normativa || '').trim().slice(0, 150),
      critico: !!data.critico,
    };
    _saveConfig(all);
    return all[id][key][idx];
  }

  function remove(categoriaKeyOrId, itemId, estId) {
    const id = _estId(estId);
    const key = CAT_ID_TO_KEY[categoriaKeyOrId] || categoriaKeyOrId;
    const all = _loadConfig(id);
    all[id][key] = (all[id][key] || []).filter(it => it.id !== itemId);
    _saveConfig(all);
    const evAll = _loadEval(id);
    if (evAll[id][key]) delete evAll[id][key][itemId];
    _saveEval(evAll);
    return true;
  }

  function getEvaluacionCat(catId, estId) {
    const id = _estId(estId);
    const key = catKeyFromId(catId);
    const slot = _loadEval(id)[id][key];
    return slot && typeof slot === 'object' ? { ...slot } : {};
  }

  function setEvaluacion(catId, itemId, respuesta, estId) {
    const id = _estId(estId);
    const key = catKeyFromId(catId);
    const all = _loadEval(id);
    if (!all[id][key]) all[id][key] = {};
    if (!respuesta) delete all[id][key][itemId];
    else all[id][key][itemId] = respuesta;
    _saveEval(all);
    return getEvaluacionCat(catId, estId);
  }

  function migrateLegacyFromCrud(estId) {
    if (typeof InvimaCrud === 'undefined') return 0;
    const id = _estId(estId);
    const legacy = InvimaCrud.getConfigINVIMA(id).filter(it => it.esComplementaria);
    if (!legacy.length) return 0;
    legacy.forEach(it => {
      try {
        add(it.categoria_id, {
          nombre: it.nombre,
          descripcion: it.descripcion || it.normativa || '',
          critico: false,
        }, id);
        InvimaCrud.eliminarItem(it.id, id);
      } catch (_) { /* skip */ }
    });
    return legacy.length;
  }

  return {
    LS_CONFIG,
    LS_EVAL,
    CAT_ID_TO_KEY,
    catKeyFromId,
    catIdFromKey,
    list,
    listByCatId,
    countAll,
    countCriticosCumplidos,
    add,
    update,
    remove,
    getEvaluacionCat,
    setEvaluacion,
    migrateLegacyFromCrud,
  };
})();
