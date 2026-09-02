/**
 * Regresión: una recuperación pesada ya completada no debe redirigir otra vez
 * a recuperar.html al volver a abrir la PWA.
 * Run: node test/store-recovery-loop.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app/js/store.js'), 'utf8');
const local = {};
const idb = new Map();
const db = {
  objectStoreNames: { contains: () => true },
  createObjectStore: () => {},
  transaction: () => ({
    objectStore: () => ({
      put: (value, key) => { idb.set(key, value); },
      get: key => {
        const request = { result: idb.get(key) ?? null };
        setTimeout(() => request.onsuccess && request.onsuccess({ target: request }), 0);
        return request;
      },
    }),
    oncomplete: null,
    onerror: null,
  }),
};
const indexedDB = {
  open: () => {
    const request = { result: db };
    setTimeout(() => request.onsuccess && request.onsuccess({ target: request }), 0);
    return request;
  },
};
const snapshotDate = '2026-09-02T07:00:00.000Z';
idb.set('snapshot', {
  store: {
    inspecciones: [{
      id: 'heavy-recovered',
      programas: [{ aspectos: [{ fotografias: [{ data: 'x'.repeat(3 * 1024 * 1024 + 1) }] }] }],
    }],
    currentId: 'heavy-recovered',
  },
  saved_at: snapshotDate,
});
idb.set('recovery-ready', { valid: true, saved_at: snapshotDate });

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
  await sandbox.Store.recoverFromIdb();
  if (sandbox.Store.needsRecovery()) {
    console.error('FAIL: una recuperación completada vuelve a redirigir a la pantalla de recuperación');
    process.exit(1);
  }
  console.log('OK: una recuperación completada abre la aplicación sin entrar en bucle');
})().catch(error => { console.error(error); process.exit(1); });
