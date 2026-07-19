/**
 * test/invima-crud.test.js
 * Run: node test/invima-crud.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const baseJson = JSON.parse(fs.readFileSync(path.join(root, 'app/data/invima-checklist-base-v1.0.json'), 'utf8'));

function loadScript(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const store = {};
let uuidN = 0;
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
    addEventListener: () => {},
  },
  navigator: { onLine: false },
  crypto: {
    randomUUID: () => {
      uuidN += 1;
      const hex = uuidN.toString(16).padStart(12, '0');
      return `00000000-0000-4000-8000-${hex}`;
    },
  },
  PortalCliente: {
    isActivo: () => false,
    getEstablecimientoId: () => 'est-test-001',
    getCodigoAcceso: () => 'TEST01',
  },
  fetch: async (url, opts) => {
    if (url.includes('invima-checklist-base')) {
      return { ok: true, json: async () => baseJson };
    }
    if (opts?.method === 'POST') return { ok: true, json: async () => ([]) };
    if (opts?.method === 'DELETE') return { ok: true };
    return { ok: true, json: async () => ([]) };
  },
  console,
};

vm.createContext(sandbox);
vm.runInContext(loadScript('app/js/logic/invima-crud.js') + '\nthis.InvimaCrud = InvimaCrud;', sandbox);

const IC = sandbox.InvimaCrud;
const EST = 'est-test-001';

let failed = 0;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed++; }
  else console.log('OK:', msg);
}

(async () => {
  await IC.loadBaseChecklist();
  IC.getConfigINVIMA(EST);
  const baseCount = IC.getConfigINVIMA(EST).filter(it => !it.custom).length;
  assert(baseCount === 48, '48 ítems base cargados');

  // Agregar item custom código 1.9 OK (cat_01)
  const custom = IC.agregarItem('cat_01', 'Control adicional', 'Local/ECODESA/Específico', null, EST, '1.9');
  assert(custom.codigo === '1.9' && custom.custom === true, 'agregar custom 1.9 OK');

  // Código duplicado
  try {
    IC.agregarItem('cat_02', 'Dup', 'Local', null, EST, '2.1');
    assert(false, 'duplicado debe fallar');
  } catch (e) {
    assert(String(e.message).includes('duplicado'), 'código duplicado 2.1 rechazado');
  }

  // Eliminar normativo rechaza
  const norm = IC.getConfigINVIMA(EST).find(it => !it.custom);
  try {
    IC.eliminarItem(norm.id, EST);
    assert(false, 'eliminar normativo debe fallar');
  } catch (e) {
    assert(String(e.message).includes('No editable'), 'eliminar normativo rechazado');
  }

  // Editar normativo rechaza
  try {
    IC.editarItem(norm.id, 'Hack', 'X', EST);
    assert(false, 'editar normativo debe fallar');
  } catch (e) {
    assert(String(e.message).includes('No editable'), 'editar normativo rechazado');
  }

  // Editar custom OK
  IC.editarItem(custom.id, 'Control adicional v2', 'ECODESA local', EST);
  const edited = IC.getConfigINVIMA(EST).find(it => it.id === custom.id);
  assert(edited.nombre === 'Control adicional v2', 'editar nombre custom OK');
  assert(edited.normativa === 'ECODESA local', 'editar normativa custom OK');

  // Offline: sync pending
  assert(edited.sync_pending === true, 'offline marca sync_pending');

  // Delete custom OK
  IC.eliminarItem(custom.id, EST);
  assert(!IC.getConfigINVIMA(EST).find(it => it.id === custom.id), 'delete custom OK');

  // Resumen
  const r = IC.resumen(EST);
  assert(r.base === 48 && r.custom === 0, 'resumen base+custom');

  if (failed) {
    console.error(`\n${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log('\nALL TESTS PASSED');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
