/**
 * Prueba real: IDs corruptos se descartan al cargar diagnóstico.
 * Run: node scripts/test-diag-id-hardening.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'js', 'logic', 'diagnostico-inicial.js'),
  'utf8'
);

const store = {};
const sandbox = {
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  },
  console,
};
vm.createContext(sandbox);
vm.runInContext(src + '\nthis.DiagnosticoInicial = DiagnosticoInicial;', sandbox);
const D = sandbox.DiagnosticoInicial;

const est = { nit: '900TEST', nombre: 'Test Hardening' };
const key = 'diagnostico_' + String(est.nit).replace(/[^a-zA-Z0-9]/g, '_');

// Payload malicioso / corrupto
store[key] = JSON.stringify({
  catalog: [
    { id: 'di_01', texto: 'OK base', norma: 'N1', descripcion: 'ok' },
    { id: "di_xss');alert(1)//", texto: 'MALO', norma: 'X', descripcion: 'x' },
    { id: 'evil<script>', texto: 'MALO2', norma: 'X', descripcion: 'x' },
    { id: 'di_c_abc123', texto: 'Custom válido', norma: 'Res. 1', descripcion: 'custom' },
    { id: '../../../etc', texto: 'path', norma: 'X', descripcion: 'x' },
  ],
  items: [
    { id: 'di_01', calificacion: 'B', condicion: '', accion: '', prioridad: 'Baja' },
    { id: "di_xss');alert(1)//", calificacion: 'D', condicion: 'hack', accion: 'x', prioridad: 'Alta' },
    { id: 'di_c_abc123', calificacion: 'R', condicion: '', accion: '', prioridad: 'Media' },
  ],
  actualizado_en: new Date().toISOString(),
});

const loaded = D.getDiagnostico(est);
const ids = loaded.catalog.map(c => c.id);

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  } else {
    console.log('OK:', msg);
  }
}

assert(D.isValidId('di_01'), 'isValidId acepta di_01');
assert(D.isValidId('di_c_abc'), 'isValidId acepta di_c_abc');
assert(!D.isValidId("di_xss');alert(1)//"), 'isValidId rechaza XSS en id');
assert(!D.isValidId('evil<script>'), 'isValidId rechaza HTML en id');
assert(!D.isValidId('../../../etc'), 'isValidId rechaza path traversal');

assert(ids.includes('di_01'), 'catálogo conserva di_01 válido');
assert(ids.includes('di_c_abc123'), 'catálogo conserva custom válido');
assert(!ids.some(id => id.includes("'") || id.includes('<') || id.includes('/')),
  'catálogo sin IDs corruptos');
assert(loaded.items.every(it => D.isValidId(it.id)), 'todos los items tienen ID válido');
assert(!loaded.items.some(it => it.id.includes('xss')), 'item XSS descartado');
assert(loaded.catalog.length >= 2, 'quedan al menos entradas válidas');

// App no se rompe: merge + save
const saved = D.saveDiagnostico(est, loaded.items, loaded.catalog);
assert(saved.catalog.every(c => D.isValidId(c.id)), 'save persiste solo IDs válidos');
assert(JSON.parse(store[key]).catalog.every(c => D.ID_RE.test(c.id)), 'JSON en storage limpio');

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('\nAll hardening tests passed.');
