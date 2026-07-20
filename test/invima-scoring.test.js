/**
 * test/invima-scoring.test.js
 * Run: node test/invima-scoring.test.js
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
    getEstablecimientoId: () => 'est-scoring-001',
    getCodigoAcceso: () => 'TEST01',
  },
  fetch: async (url) => {
    if (url.includes('invima-checklist-base')) {
      return { ok: true, json: async () => baseJson };
    }
    return { ok: true, json: async () => ([]) };
  },
  console,
};

vm.createContext(sandbox);
vm.runInContext(loadScript('app/js/logic/invima-crud.js') + '\nthis.InvimaCrud = InvimaCrud;', sandbox);
vm.runInContext(loadScript('app/js/logic/invima-scoring.js') + '\nthis.InvimaScoring = InvimaScoring;', sandbox);

const IC = sandbox.InvimaCrud;
const IS = sandbox.InvimaScoring;
const EST = 'est-scoring-001';

let failed = 0;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed++; }
  else console.log('OK:', msg);
}

(async () => {
  const pesoSum = (baseJson.categorias || []).reduce((s, c) => s + Number(c.peso || 0), 0);
  assert(pesoSum === 100, 'pesos base suman 100%');

  await IC.loadBaseChecklist();
  const items = IC.getConfigINVIMA(EST);
  assert(items.length === 28, '28 ítems base sembrados');

  const meta = {
    escala: baseJson.escala,
    clasificacion: baseJson.clasificacion,
    categorias: baseJson.categorias,
  };

  // Todos A → 100% FAVORABLE
  const allA = {};
  items.forEach(it => { allA[it.id] = 'A'; });
  let r = IS.calcularPuntaje(allA, meta, EST);
  assert(r.puntajeTotal === 100, 'todos A → 100%');
  assert(r.clasificacion === 'FAVORABLE', 'todos A → FAVORABLE');

  // Todos I → 0% DESFAVORABLE
  const allI = {};
  items.forEach(it => { allI[it.id] = 'I'; });
  r = IS.calcularPuntaje(allI, meta, EST);
  assert(r.puntajeTotal === 0, 'todos I → 0%');
  assert(r.clasificacion === 'DESFAVORABLE', 'todos I → DESFAVORABLE');

  // NA cuenta como A
  const oneNA = { ...allI };
  oneNA[items[0].id] = 'NA';
  r = IS.calcularPuntaje(oneNA, meta, EST);
  const pesoItem = r.itemsDetalle.find(d => d.id === items[0].id);
  assert(pesoItem.puntos > 0, 'NA aporta puntos como A');

  // Custom item entra al reparto de peso categoría
  const custom = IC.agregarItem('cat_01', 'Extra verificación', 'Local', null, EST, '1.9');
  const cat01 = items.filter(it => it.categoria_id === 'cat_01');
  const respCat01 = {};
  cat01.forEach(it => { respCat01[it.id] = 'A'; });
  respCat01[custom.id] = 'A';
  r = IS.calcularPuntaje(respCat01, meta, EST);
  const catRow = r.puntajePorCategoria.find(c => c.id === 'cat_01');
  assert(catRow.numItems === cat01.length + 1, 'custom incrementa n en categoría');

  // Umbrales 80 / 60
  const partial = {};
  items.forEach((it, i) => { partial[it.id] = i % 3 === 0 ? 'I' : 'A'; });
  r = IS.calcularPuntaje(partial, meta, EST);
  assert(typeof r.clasificacion === 'string', 'clasificación calculada');
  assert(['FAVORABLE', 'FAVORABLE CON REQUERIMIENTO', 'DESFAVORABLE'].includes(r.clasificacion), 'clasificación válida');

  if (failed) {
    console.error(`\n${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log('\nALL TESTS PASSED');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
