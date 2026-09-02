/**
 * Prueba de aceptación del borrador remoto:
 * 1) diligencia 3 de 5 secciones;
 * 2) simula cierre y corrupción del estado local;
 * 3) reabre y recupera el snapshot más reciente desde Supabase (mock RPC).
 * Run: node test/sc-informes-borrador.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app/js/sc-informes.js'), 'utf8');
const local = { sanicheck_sc_codigo_acceso: 'TEST-CODIGO' };
const state = { inspecciones: [], currentId: null, ui: { screen: 'hacer', programaIdx: 0, aspectoIdx: 0 } };
const rpcCalls = [];
let remoteDraft = null;
let recoveredRoute = '';

function inspection() {
  return {
    id: 'psb-acceptance-001',
    fase_phva: 'H',
    establecimiento: { nombre: 'Establecimiento de prueba', nit: '900000001' },
    inspeccion: { fecha: '2026-09-02', numero_acta: 'PSB-2026-0001' },
    numero_acta: 'PSB-2026-0001',
    programas: ['edificacion', 'equipos', 'personal', 'higienicos', 'saneamiento'].map((id, index) => ({
      id,
      codigo: id.slice(0, 3).toUpperCase(),
      nombre: id,
      aspectos: [{ id: `${id}_1`, texto: `Aspecto ${index + 1}`, criterio: null, observaciones: '', fotografias: [] }],
    })),
    score: { total: 0, pct_cumplimiento: 0 },
    creado_en: '2026-09-02T10:00:00.000Z',
    actualizado_en: '2026-09-02T10:00:00.000Z',
  };
}

const sandbox = {
  localStorage: {
    getItem: key => local[key] ?? null,
    setItem: (key, value) => { local[key] = String(value); },
    removeItem: key => { delete local[key]; },
  },
  window: {
    SC_INFORMES_CONFIG: { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'anon' },
    addEventListener: () => {},
    confirm: () => true,
  },
  document: { addEventListener: () => {} },
  navigator: { onLine: true },
  Store: {
    get: () => state,
    getCurrentInspeccion: () => state.inspecciones.find(i => i.id === state.currentId) || null,
    set: partial => Object.assign(state, partial),
  },
  Scores: { criterio: aspecto => aspecto.criterio || aspecto.evaluacion || null },
  Router: { go: route => { recoveredRoute = route; }, toast: () => {} },
  fetch: async (url, options) => {
    const body = JSON.parse(options.body || '{}');
    const rpc = url.split('/').pop();
    rpcCalls.push({ rpc, body });
    if (rpc === 'sc_guardar_borrador') return { ok: true, text: async () => JSON.stringify([{ id: 'remote-acceptance-001' }]) };
    if (rpc === 'sc_list_borradores') return { ok: true, text: async () => JSON.stringify([{
      id: 'remote-acceptance-001',
      local_id: remoteDraft.local_id,
      establecimiento: remoteDraft.establecimiento,
      estado_parcial_actualizado_en: '2026-09-02T10:30:00.000Z',
      actualizado_en: '2026-09-02T10:30:00.000Z',
    }]) };
    if (rpc === 'sc_get_borrador') return { ok: true, text: async () => JSON.stringify([remoteDraft]) };
    return { ok: true, text: async () => '[]' };
  },
  console,
  setTimeout,
  clearTimeout,
  Date,
  JSON,
  Promise,
};

vm.createContext(sandbox);
vm.runInContext(source + '\nthis.ScInformes = ScInformes;', sandbox);

let failed = 0;
function assert(condition, message) {
  if (!condition) { console.error('FAIL:', message); failed++; }
  else console.log('OK:', message);
}
function waitTurn() { return new Promise(resolve => setTimeout(resolve, 0)); }

(async () => {
  const localInspection = inspection();
  state.inspecciones = [localInspection];
  state.currentId = localInspection.id;

  for (let index = 0; index < 3; index++) {
    const program = localInspection.programas[index];
    program.aspectos[0].criterio = 'A';
    sandbox.ScInformes.scheduleBorrador(localInspection, {
      force: true,
      aspectKey: `${program.id}:${program.aspectos[0].id}:base`,
    });
    await waitTurn();
  }

  const saved = rpcCalls.filter(call => call.rpc === 'sc_guardar_borrador');
  assert(saved.length === 3, '3 cambios de sección generan 3 guardados incrementales');
  assert(saved.every(call => !JSON.stringify(call.body.p_estado_parcial).includes('fotografias')),
    'el payload incremental no contiene fotografías');

  remoteDraft = {
    id: 'remote-acceptance-001',
    local_id: localInspection.id,
    establecimiento: localInspection.establecimiento,
    estado_parcial: saved[2].body.p_estado_parcial,
    estado_parcial_actualizado_en: '2026-09-02T10:30:00.000Z',
  };
  state.inspecciones = [];
  state.currentId = null;

  const result = await sandbox.ScInformes.revisarBorradoresRemotos();
  const recovered = state.inspecciones.find(i => i.id === localInspection.id);
  assert(result?.recuperado === true, 'la reapertura ofrece y acepta recuperar el borrador remoto');
  assert(recovered && recovered.programas.slice(0, 3).every(p => p.aspectos[0].criterio === 'A'),
    'se recuperan las 3 secciones diligenciadas');
  assert(recovered && !JSON.stringify(recovered).includes('fotografias'),
    'la recuperación remota conserva el estado liviano sin fotos');
  assert(recoveredRoute === 'hacer', 'la aplicación vuelve a la pantalla de diligenciamiento');

  if (failed) process.exit(1);
  console.log('\nALL TESTS PASSED');
})().catch(error => { console.error(error); process.exit(1); });
