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

  function deleteInspeccion(id) {
    state.inspecciones = state.inspecciones.filter(i => i.id !== id);
    if (state.currentId === id) state.currentId = null;
    save();
  }

  function setUI(partial) { state.ui = { ...state.ui, ...partial }; save(); }

  return { load, save, get, set, getCurrentInspeccion, upsertInspeccion, deleteInspeccion, setUI };
})();
