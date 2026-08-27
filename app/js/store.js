// store.js — Estado global con localStorage

const Store = (() => {
  const KEY = 'saneamiento_psb_v2';
  // Clave del esquema anterior (escala B/R/D/NA). Solo se LEE, nunca se escribe:
  // sus inspecciones se muestran en Home como archivo de solo lectura.
  const LEGACY_KEY = 'saneamiento_psb_v1';

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

  // Lectura pura de la clave anterior. No migra ni reescribe nada.
  function getLegacyInspecciones() {
    try {
      const saved = localStorage.getItem(LEGACY_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed?.inspecciones) ? parsed.inspecciones : [];
    } catch (e) { console.warn('Store legacy load error', e); return []; }
  }

  return { load, save, get, set, getCurrentInspeccion, upsertInspeccion, deleteInspeccion, setUI, getLegacyInspecciones };
})();
