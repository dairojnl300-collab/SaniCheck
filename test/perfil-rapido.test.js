/**
 * test/perfil-rapido.test.js
 * Run: node test/perfil-rapido.test.js
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
  window: { addEventListener: () => {} },
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
    getEstablecimientoId: () => 'est-perfil-001',
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
const EST = 'est-perfil-001';

let failed = 0;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed++; }
  else console.log('OK:', msg);
}

(async () => {
  await IC.loadBaseChecklist();
  IC.getConfigINVIMA(EST);

  const perfil = IC.getPerfilRapido(EST);
  assert(perfil.length === 8, 'seed perfil rápido = 8 ítems default');
  assert(IC.PERFIL_RAPIDO_DEFAULT_CODIGOS.length === 8, '8 códigos default definidos');
  const codigos = perfil.map(it => it.codigo).sort();
  const expected = [...IC.PERFIL_RAPIDO_DEFAULT_CODIGOS].sort();
  assert(JSON.stringify(codigos) === JSON.stringify(expected), 'códigos default coinciden con seed');
  const byCat = {};
  perfil.forEach(it => { byCat[it.categoria_id] = (byCat[it.categoria_id] || 0) + 1; });
  assert(byCat.cat_03 >= 1, 'categoría Personal representada');
  assert(byCat.cat_06 >= 1, 'categoría Verificación representada');

  const first = perfil[0];
  try {
    IC.quitarDelPerfil(first.id, EST);
    assert(IC.getPerfilRapido(EST).length === 7, 'quitar normativo del perfil OK');
  } catch (e) {
    assert(false, 'quitar normativo: ' + e.message);
  }

  const disponibles = IC.getDisponiblesPerfil(EST);
  assert(disponibles.some(it => it.codigo === first.codigo), 'ítem quitado disponible para re-agregar');

  IC.agregarAlPerfil(first.id, EST);
  assert(IC.getPerfilRapido(EST).length === 8, 're-agregar al perfil OK');

  while (IC.getPerfilRapido(EST).length > 1) {
    const p = IC.getPerfilRapido(EST);
    IC.quitarDelPerfil(p[p.length - 1].id, EST);
  }
  try {
    IC.quitarDelPerfil(IC.getPerfilRapido(EST)[0].id, EST);
    assert(false, 'min 1 ítem debe bloquear');
  } catch (e) {
    assert(String(e.message).includes('al menos 1'), 'min 1 ítem validado');
  }

  const custom = IC.agregarItem('cat_01', 'Extra perfil', 'Local test', null, EST, '1.9', true);
  assert(custom.en_perfil_rapido === true, 'custom agregado al perfil');
  assert(IC.getPerfilRapido(EST).some(it => it.id === custom.id), 'custom visible en perfil');

  const meta = { escala: baseJson.escala, clasificacion: baseJson.clasificacion };
  const resp = {};
  IC.getPerfilRapido(EST).forEach(it => { resp[it.id] = 'A'; });
  const r = IS.calcularPerfilRapido(resp, meta, EST);
  assert(r.puntajeTotal === 100, 'todos A en perfil → 100%');
  assert(r.clasificacion === 'FAVORABLE', 'todos A → FAVORABLE');

  if (failed) {
    console.error(`\n${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log('\nALL TESTS PASSED');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
