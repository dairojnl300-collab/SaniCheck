/**
 * Regresión: el cliente no debe liberar las fotos locales cuando el informe
 * queda encolado; solo después de que la RPC confirma el informe final.
 * Run: node test/sc-informes-liberar-fotos.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app/js/sc-informes.js'), 'utf8');
const local = {
  sanicheck_sc_codigo_acceso: 'CODIGO-PRUEBA',
  sanicheck_sc_sesion: JSON.stringify({ id: 'tecnico-1', nombre: 'Profesional', rol: 'tecnico', usuario: 'profesional' }),
};
const updatedAt = '2026-09-02T18:00:00.000Z';
const state = {
  inspecciones: [{
    id: 'cliente-final-001',
    actualizado_en: updatedAt,
    establecimiento: { nombre: 'Cliente real' },
    inspeccion: { fecha: '2026-09-02' },
    programas: [{ aspectos: [{ fotografias: [{ id: 'foto-1', data: 'data:image/jpeg;base64,foto' }] }] }],
  }],
};
let releaseCalls = [];
let online = true;
let rpcShouldFail = false;
const outbox = new Map();
const drafts = new Map();
const db = {
  objectStoreNames: { contains: () => true },
  transaction: (storeName, mode) => {
    const tx = { oncomplete: null, onerror: null, onabort: null };
    tx.objectStore = () => ({
      delete: key => {
        (storeName === 'pendientes' ? outbox : drafts).delete(key);
        setTimeout(() => tx.oncomplete && tx.oncomplete(), 0);
      },
      put: (value, key) => {
        const target = storeName === 'pendientes' ? outbox : drafts;
        target.set(key ?? value?.local_id, value);
        setTimeout(() => tx.oncomplete && tx.oncomplete(), 0);
      },
    });
    return tx;
  },
};
const indexedDB = {
  open: () => {
    const request = { result: db, onsuccess: null, onupgradeneeded: null, onerror: null };
    setTimeout(() => request.onsuccess && request.onsuccess({ target: request }), 0);
    return request;
  },
};
const sandbox = {
  localStorage: {
    getItem: key => local[key] ?? null,
    setItem: (key, value) => { local[key] = String(value); },
    removeItem: key => { delete local[key]; },
  },
  window: {
    SC_INFORMES_CONFIG: { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'anon' },
    addEventListener: () => {},
    indexedDB,
  },
  indexedDB,
  document: { addEventListener: () => {} },
  navigator: { get onLine() { return online; } },
  Store: {
    get: () => state,
    liberarFotosInspeccion: async (id, expected) => { releaseCalls.push({ id, expected }); return true; },
  },
  fetch: async () => {
    if (rpcShouldFail) throw new Error('red simulada caída');
    return { ok: true, text: async () => JSON.stringify('remote-final-001') };
  },
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  Date,
  JSON,
  Promise,
};

vm.createContext(sandbox);
vm.runInContext(source + '\nthis.ScInformes = ScInformes;', sandbox);

(async () => {
  const result = await sandbox.ScInformes.guardarInforme({
    localId: 'cliente-final-001',
    establecimiento: state.inspecciones[0].establecimiento,
    fecha: '2026-09-02',
    html: '<html>PDF compacto</html>',
    numeroActa: 'PSB-2026-0001',
    liberarFotosAlConfirmar: true,
    localActualizadoEn: updatedAt,
  });

  assert.equal(result.ok, true, 'confirma el guardado remoto del informe');
  assert.deepEqual(releaseCalls, [{ id: 'cliente-final-001', expected: updatedAt }],
    'libera fotos solo después de la confirmación remota y con versión del estado');

  releaseCalls = [];
  rpcShouldFail = true;
  const queued = await sandbox.ScInformes.guardarInforme({
    localId: 'cliente-final-001',
    establecimiento: state.inspecciones[0].establecimiento,
    fecha: '2026-09-02',
    html: '<html>PDF compacto pendiente</html>',
    numeroActa: 'PSB-2026-0001',
    liberarFotosAlConfirmar: true,
    localActualizadoEn: updatedAt,
  });
  assert.equal(queued.encolado, true, 'si falla la red, la copia queda encolada para reintentar');
  assert.deepEqual(releaseCalls, [], 'si queda encolado, no libera fotos locales');
  assert.equal(outbox.get('cliente-final-001').liberarFotosAlConfirmar, true,
    'la orden pendiente conserva la autorización de liberar fotos al confirmar');
  console.log('ALL TESTS PASSED');
})().catch(error => { console.error('FAIL:', error.message); process.exit(1); });
