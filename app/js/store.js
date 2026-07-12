// store.js — Estado global con localStorage

const Store = (() => {
  const KEY = 'saneamiento_psb_v1';

  const defaults = {
    inspecciones: [],
    currentId: null,
    ui: { screen: 'home', aspectoIdx: 0 },
  };

  let state = { ...defaults };

  function load() {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) state = { ...defaults, ...JSON.parse(saved) };
    } catch (e) { console.warn('Store load error', e); }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('Store save error', e); }
  }

  function get() { return state; }

  function set(partial) { state = { ...state, ...partial }; save(); }

  function getCurrentInspeccion() {
    if (!state.currentId) return null;
    return state.inspecciones.find(i => i.id === state.currentId) || null;
  }

  function upsertInspeccion(inspeccion) {
    inspeccion.actualizado_en = new Date().toISOString();
    const idx = state.inspecciones.findIndex(i => i.id === inspeccion.id);
    if (idx >= 0) state.inspecciones[idx] = inspeccion;
    else state.inspecciones.unshift(inspeccion);
    state.currentId = inspeccion.id;
    save();
  }

  function _estSlug(est) {
    return String((est && (est.nit || est.nombre)) || 'default').replace(/[^a-zA-Z0-9]/g, '_');
  }

  function _purgeEstData(est) {
    const slug = _estSlug(est);
    ['vencimientos_', 'diagnostico_', 'psb_checklist_'].forEach(prefix => {
      try { localStorage.removeItem(prefix + slug); } catch {}
    });
  }

  function deleteInspeccion(id) {
    const ins = state.inspecciones.find(i => i.id === id);
    state.inspecciones = state.inspecciones.filter(i => i.id !== id);
    if (state.currentId === id) state.currentId = null;
    save();
    if (ins && ins.establecimiento) {
      const slug = _estSlug(ins.establecimiento);
      const quedan = state.inspecciones.some(i => _estSlug(i.establecimiento) === slug);
      if (!quedan) _purgeEstData(ins.establecimiento);
    }
  }

  function setUI(partial) { state.ui = { ...state.ui, ...partial }; save(); }

  return { load, save, get, set, getCurrentInspeccion, upsertInspeccion, deleteInspeccion, setUI };
})();
