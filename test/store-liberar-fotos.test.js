/**
 * Regresión: una inspección finalizada solo libera las fotos locales después
 * de que el respaldo remoto fue confirmado; también limpia la copia pesada
 * de recuperación sin tocar el resto del estado.
 * Run: node test/store-liberar-fotos.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app/js/store.js'), 'utf8');
const local = {};
const idb = new Map();
const photo = 'data:image/jpeg;base64,' + 'x'.repeat(80);
const updatedAt = '2026-09-02T18:00:00.000Z';
const inspection = {
  id: 'cliente-final-001',
  actualizado_en: updatedAt,
  establecimiento: { nombre: 'Cliente real' },
  programas: [{ aspectos: [{ fotografias: [{ id: 'foto-1', data: photo }], criterios_extra: [{ fotografias: [{ id: 'foto-2', data: photo }] }] }] }],
};
const state = { inspecciones: [inspection], currentId: inspection.id, ui: { screen: 'actuar' } };
local.saneamiento_psb_v1 = JSON.stringify(state);
idb.set('recovery-original', { store: JSON.parse(JSON.stringify(state)), saved_at: updatedAt });

function transaction(mode) {
  const tx = { oncomplete: null, onerror: null, onabort: null };
  const store = {
    put(value, key) {
      idb.set(key, value);
      setTimeout(() => tx.oncomplete && tx.oncomplete(), 0);
    },
    get(key) {
      const request = { result: idb.get(key) ?? null, onsuccess: null, onerror: null };
      setTimeout(() => request.onsuccess && request.onsuccess({ target: request }), 0);
      return request;
    },
  };
  tx.objectStore = () => store;
  return tx;
}
const db = { objectStoreNames: { contains: () => true }, transaction };
const indexedDB = {
  open() {
    const request = { result: db, onsuccess: null, onupgradeneeded: null, onerror: null };
    setTimeout(() => request.onsuccess && request.onsuccess({ target: request }), 0);
    return request;
  },
};

const sandbox = {
  window: { indexedDB },
  indexedDB,
  localStorage: {
    getItem: key => local[key] ?? null,
    setItem: (key, value) => { local[key] = String(value); },
    removeItem: key => { delete local[key]; },
  },
  document: { addEventListener: () => {} },
  setTimeout,
  clearTimeout,
  Promise,
  Date,
  JSON,
  console,
};

vm.createContext(sandbox);
vm.runInContext(source + '\nthis.Store = Store;', sandbox);

(async () => {
  sandbox.Store.load();
  const released = await sandbox.Store.liberarFotosInspeccion('cliente-final-001', updatedAt);

  assert.equal(released, true, 'confirma la liberación de fotos de la inspección esperada');
  assert.equal(sandbox.Store.get().inspecciones[0].programas[0].aspectos[0].fotografias.length, 0,
    'libera las fotografías del estado local');
  assert.equal(sandbox.Store.get().inspecciones[0].programas[0].aspectos[0].criterios_extra[0].fotografias.length, 0,
    'libera también las fotografías de aspectos extra');
  assert.equal(idb.get('recovery-original').store.inspecciones[0].programas[0].aspectos[0].fotografias.length, 0,
    'limpia las fotografías de la copia original de recuperación');
  assert.equal(JSON.parse(local.saneamiento_psb_v1).inspecciones[0].establecimiento.nombre, 'Cliente real',
    'conserva los datos de la inspección al liberar solo las fotos');
  console.log('ALL TESTS PASSED');
})().catch(error => { console.error('FAIL:', error.message); process.exit(1); });
