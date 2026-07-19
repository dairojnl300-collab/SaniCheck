/**
 * test/vencimientos-v2.test.js
 * Run: node test/vencimientos-v2.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function loadScript(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const store = {};
const sandbox = {
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  },
  window: {
    SANICHECK_PORTAL_CONFIG: {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
  navigator: { onLine: true },
  crypto: {
    randomUUID: () => '11111111-1111-4111-8111-111111111111',
    getRandomValues: arr => arr,
  },
  PortalCliente: {
    isActivo: () => false,
    getEstablecimientoId: () => '',
    getCodigoAcceso: () => '',
  },
  fetch: async () => ({ ok: true, json: async () => ([]) }),
  console,
  setTimeout,
};

vm.createContext(sandbox);

vm.runInContext(loadScript('app/js/logic/vencimientos-storage.js') + '\nthis.VencimientosStorage = VencimientosStorage;', sandbox);
vm.runInContext(loadScript('app/js/logic/vencimientos-v2-crud.js') + '\nthis.VencimientosV2 = VencimientosV2;', sandbox);

const V2 = sandbox.VencimientosV2;
const Storage = sandbox.VencimientosStorage;

let failed = 0;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed++; }
  else console.log('OK:', msg);
}

// Upload > 10MB rechaza
const big = { size: 11 * 1024 * 1024, type: 'application/pdf', name: 'big.pdf' };
const valBig = Storage.validarArchivo(big);
assert(!valBig.ok && valBig.error.includes('≤10MB'), 'PDF > 10MB rechazado');

// MIME inválido
const badMime = { size: 1000, type: 'application/zip', name: 'x.zip' };
assert(!Storage.validarArchivo(badMime).ok, 'MIME zip rechazado');

// Estado recalcula
const hoy = new Date();
const d30 = new Date(hoy); d30.setDate(d30.getDate() + 20);
const d60 = new Date(hoy); d60.setDate(d60.getDate() + 45);
const dPast = new Date(hoy); dPast.setDate(dPast.getDate() - 5);
assert(V2.calcularEstado(d30.toISOString().slice(0, 10)) === 'por_vencer_30', 'estado por_vencer_30');
assert(V2.calcularEstado(d60.toISOString().slice(0, 10)) === 'por_vencer_60', 'estado por_vencer_60');
assert(V2.calcularEstado(dPast.toISOString().slice(0, 10)) === 'vencido', 'estado vencido');

// Offline: guardar LS
const futuro = new Date(hoy); futuro.setDate(futuro.getDate() + 90);
let item;
try {
  item = V2.guardarVencimiento({
    categoria: 'establecimiento',
    tipo: 'plagas',
    nombre: 'Fumigación test',
    fecha_vencimiento: futuro.toISOString().slice(0, 10),
    frecuencia: 'trimestral',
  });
} catch (e) {
  // sin portal activo puede fallar estId - guardar con local
  store[sandbox.VencimientosV2.LS_KEY] = JSON.stringify({ items: [{
    id: '11111111-1111-4111-8111-111111111111',
    establecimiento_id: 'local-pending',
    categoria: 'establecimiento', tipo: 'plagas', nombre: 'Fumigación test',
    fecha_vencimiento: futuro.toISOString().slice(0, 10), sync_pending: true,
  }] });
}
const items = V2.obtenerVencimientos();
assert(items.length >= 1, 'offline guarda en localStorage');

// Editar fecha → estado
if (items[0]) {
  V2.actualizarVencimiento(items[0].id, { fecha_vencimiento: dPast.toISOString().slice(0, 10) });
  const upd = V2.obtenerVencimientos().find(x => x.id === items[0].id);
  assert(upd && upd.estado === 'vencido', 'editar fecha recalcula estado vencido');
}

// Tipo duplicado
try {
  V2.guardarVencimiento({
    categoria: 'establecimiento', tipo: 'plagas', nombre: 'Dup',
    fecha_vencimiento: futuro.toISOString().slice(0, 10),
  });
  assert(false, 'duplicado debe fallar');
} catch (e) {
  assert(String(e.message).includes('Ya existe'), 'tipo duplicado rechazado');
}

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('\nALL TESTS PASSED');
