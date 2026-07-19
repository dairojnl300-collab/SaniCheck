/**
 * test/vencimientos-v2-crud.test.js
 * Run: node test/vencimientos-v2-crud.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const store = {};

function load(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const sandbox = {
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  },
  window: {
    SANICHECK_PORTAL_CONFIG: { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'k' },
  },
  navigator: { onLine: false },
  crypto: { randomUUID: () => 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee', getRandomValues: a => a },
  PortalCliente: { isActivo: () => false, getEstablecimientoId: () => '', getCodigoAcceso: () => '' },
  fetch: async () => ({ ok: true, json: async () => [] }),
  console,
  setTimeout,
};

vm.createContext(sandbox);
vm.runInContext(load('app/js/logic/vencimientos-storage.js') + '\nthis.VencimientosStorage = VencimientosStorage;', sandbox);
vm.runInContext(load('app/js/logic/vencimientos-v2-crud.js') + '\nthis.VencimientosV2 = VencimientosV2;', sandbox);

const V2 = sandbox.VencimientosV2;
const Storage = sandbox.VencimientosStorage;
let failed = 0;

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed++; }
  else console.log('OK:', msg);
}

const big = { size: 11 * 1024 * 1024, type: 'application/pdf', name: 'big.pdf' };
assert(Storage.validarArchivo(big).error === 'Archivo debe ser ≤10MB', 'PDF > 10MB rechaza mensaje exacto');

const zip = { size: 1000, type: 'application/zip', name: 'x.zip' };
assert(Storage.validarArchivo(zip).error === 'Formato no permitido', 'ZIP MIME rechazado');

const hoy = new Date();
const futuro = new Date(hoy); futuro.setDate(futuro.getDate() + 90);
const d60 = new Date(hoy); d60.setDate(d60.getDate() + 45);

store[V2.LS_KEY] = JSON.stringify({ items: [] });
V2.guardarVencimiento({
  categoria: 'establecimiento', tipo: 'plagas', nombre: 'Fumigación',
  fecha_vencimiento: futuro.toISOString().slice(0, 10), frecuencia: 'trimestral',
});
const saved = JSON.parse(store[V2.LS_KEY]);
assert(saved.items.length === 1 && saved.items[0].sync_pending === true, 'offline guarda LS sync pendiente');

try {
  V2.guardarVencimiento({
    categoria: 'establecimiento', tipo: 'plagas', nombre: 'Dup',
    fecha_vencimiento: futuro.toISOString().slice(0, 10),
  });
  assert(false, 'duplicado debe fallar');
} catch (e) {
  assert(String(e.message).includes('Ya existe'), 'tipo duplicado rechaza Ya existe');
}

V2.editarVencimiento(saved.items[0].id, { fecha_vencimiento: d60.toISOString().slice(0, 10) });
const edited = V2.obtenerVencimientos()[0];
assert(edited.estado === 'por_vencer_60', 'editar fecha recalcula por_vencer_60');

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nALL TESTS PASSED');
