// store.js — Estado global con localStorage + respaldo IndexedDB y autoguardado

const Store = (() => {
  const KEY        = 'saneamiento_psb_v1';
  const DRAFT_KEY  = 'saneamiento_psb_draft_v1';
  const IDB_NAME   = 'sanicheck-persist';
  const IDB_STORE  = 'kv';
  const DEBOUNCE_MS = 500;

  const defaults = {
    inspecciones: [],
    currentId: null,
    ui: { screen: 'home', aspectoIdx: 0, programaIdx: 0 },
  };

  let state      = { ...defaults };
  let _saveTimer = null;
  let _idbReady  = null;

  function _openIdb() {
    if (_idbReady) return _idbReady;
    _idbReady = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { resolve(null); return; }
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = () => reject(req.error);
    });
    return _idbReady;
  }

  async function _idbSet(key, value) {
    try {
      const db = await _openIdb();
      if (!db) return;
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror    = () => reject(tx.error);
      });
    } catch (e) { console.warn('IDB set', e); }
  }

  async function _idbGet(key) {
    try {
      const db = await _openIdb();
      if (!db) return null;
      return await new Promise((resolve, reject) => {
        const tx  = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror   = () => reject(req.error);
      });
    } catch (e) {
      console.warn('IDB get', e);
      return null;
    }
  }

  function _writeLs(key, data) {
    localStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data));
  }

  function _mirrorCriticalToIdb() {
    const snap = {
      store: state,
      draft: getPlanificarDraft(),
      saved_at: new Date().toISOString(),
    };
    _idbSet('snapshot', snap);
    _idbSet(KEY, state);
  }

  function load() {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) state = { ...defaults, ...JSON.parse(saved) };
    } catch (e) { console.warn('Store load error', e); }
  }

  async function recoverFromIdb() {
    try {
      if (!localStorage.getItem(KEY)) {
        const snap = await _idbGet('snapshot');
        if (snap?.store) {
          state = { ...defaults, ...snap.store };
          _writeLs(KEY, state);
        } else {
          const recovered = await _idbGet(KEY);
          if (recovered) {
            state = { ...defaults, ...recovered };
            _writeLs(KEY, state);
          }
        }
      }
      if (!localStorage.getItem(DRAFT_KEY)) {
        const snap = await _idbGet('snapshot');
        if (snap?.draft) _writeLs(DRAFT_KEY, snap.draft);
      }
    } catch (e) { console.warn('Store IDB recovery', e); }
    return state;
  }

  function save() {
    try {
      _writeLs(KEY, state);
      scheduleMirror();
    } catch (e) { console.warn('Store save error', e); }
  }

  function scheduleMirror() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => { _mirrorCriticalToIdb(); }, DEBOUNCE_MS);
  }

  function flush() {
    clearTimeout(_saveTimer);
    try { _writeLs(KEY, state); } catch (e) { console.warn('Store flush error', e); }
    return _mirrorCriticalToIdb();
  }

  function saveDebounced(partial) {
    if (partial) state = { ...state, ...partial };
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      try {
        _writeLs(KEY, state);
        _mirrorCriticalToIdb();
      } catch (e) { console.warn('Store debounced save', e); }
    }, DEBOUNCE_MS);
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

  function setUI(partial) {
    state.ui = { ...state.ui, ...partial };
    try { _writeLs(KEY, state); } catch (e) { console.warn('Store setUI', e); }
    scheduleMirror();
  }

  function getPlanificarDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function savePlanificarDraft(draft) {
    try {
      const payload = { ...draft, saved_at: new Date().toISOString() };
      _writeLs(DRAFT_KEY, payload);
      scheduleMirror();
    } catch (e) { console.warn('Draft save error', e); }
  }

  function clearPlanificarDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    _idbSet('snapshot', { store: state, draft: null, saved_at: new Date().toISOString() });
  }

  function bindLifecycleFlush() {
    const flushNow = () => { flush(); };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushNow();
    });
    window.addEventListener('pagehide', flushNow);
    window.addEventListener('beforeunload', flushNow);
  }

  return {
    load, recoverFromIdb, save, saveDebounced, flush, get, set,
    getCurrentInspeccion, upsertInspeccion, deleteInspeccion, setUI,
    getPlanificarDraft, savePlanificarDraft, clearPlanificarDraft,
    bindLifecycleFlush,
  };
})();
