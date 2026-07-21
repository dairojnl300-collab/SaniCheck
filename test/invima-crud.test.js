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
  const baseCount = IC.getConfigINVIMA(EST).filter(it => !it.esComplementaria).length;
  assert(baseCount === 28, '28 ítems base cargados');

  // Agregar item esComplementaria código 1.9 OK (cat_01)
  const esComplementaria = IC.agregarItem('cat_01', 'Control adicional', 'Local/ECODESA/Específico', null, EST, '1.9');
  assert(esComplementaria.codigo === '1.9' && esComplementaria.esComplementaria === true, 'agregar esComplementaria 1.9 OK');

  // Código duplicado
  try {
    IC.agregarItem('cat_02', 'Dup', 'Local', null, EST, '2.1');
    assert(false, 'duplicado debe fallar');
  } catch (e) {
    assert(String(e.message).includes('duplicado'), 'código duplicado 2.1 rechazado');
  }

  // Eliminar normativo rechaza
  const norm = IC.getConfigINVIMA(EST).find(it => !it.esComplementaria);
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

  // Editar esComplementaria OK
  IC.editarItem(esComplementaria.id, 'Control adicional v2', 'ECODESA local', EST);
  const edited = IC.getConfigINVIMA(EST).find(it => it.id === esComplementaria.id);
  assert(edited.nombre === 'Control adicional v2', 'editar nombre complementaria OK');
  assert(edited.normativa === 'ECODESA local', 'editar normativa complementaria OK');

  // Offline: sync pending
  assert(edited.sync_pending === true, 'offline marca sync_pending');

  // Delete esComplementaria OK
  IC.eliminarItem(esComplementaria.id, EST);
  assert(!IC.getConfigINVIMA(EST).find(it => it.id === esComplementaria.id), 'eliminar complementaria OK');

  // Resumen
  const r = IC.resumen(EST);
  assert(r.base === 28 && r.complementaria === 0, 'resumen base+complementaria');

  if (failed) {
    console.error(`\n${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log('\nALL TESTS PASSED');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
