// idb-fotos.js — IndexedDB para almacenamiento de fotografías PSB

const IDBFotos = (() => {
  const DB_NAME = 'sanicheck_fotos_v1';
  const STORE   = 'fotos';
  let _db = null;

  function _open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('aspectoId', 'aspectoId', { unique: false });
        }
      };
      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror   = () => reject(req.error);
    });
  }

  async function guardar(aspectoId, file) {
    const db     = await _open();
    const id     = 'foto-' + aspectoId + '-' + Date.now();
    const dataUrl = await _fileToDataUrl(file);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({
        id, aspectoId, dataUrl,
        nombre:      file.name,
        tipo:        file.type,
        guardado_en: new Date().toISOString(),
      });
      tx.oncomplete = () => resolve(id);
      tx.onerror    = () => reject(tx.error);
    });
  }

  async function obtenerPorAspecto(aspectoId) {
    const db = await _open();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).index('aspectoId').getAll(aspectoId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = () => reject(req.error);
    });
  }

  async function eliminar(fotoId) {
    const db = await _open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(fotoId);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }

  function _fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  return { guardar, obtenerPorAspecto, eliminar };
})();
