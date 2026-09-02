/**
 * Prueba de continuidad cross-device:
 * 1) el snapshot de borrador respeta la pantalla real (no fuerza 'hacer');
 * 2) restaurarEstadoRemoto navega a esa pantalla y conserva fotos locales por id.
 * Run: node test/sc-informes-continuidad.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app/js/sc-informes.js'), 'utf8');
const local = { sanicheck_sc_codigo_acceso: 'TEST-CODIGO' };
const state = { inspecciones: [], currentId: null, ui: { screen: 'verificar', programaIdx: 1, aspectoIdx: 2 } };
const rpcCalls = [];

function inspection() {
  return {
    id: 'psb-continuidad-001',
    fase_phva: 'V',
    establecimiento: { nombre: 'Establecimiento continuidad', nit: '900000002' },
    inspeccion: { fecha: '2026-09-02', numero_acta: 'PSB-2026-0002' },
    numero_acta: 'PSB-2026-0002',
    programas: [{
      id: 'edificacion',
      codigo: 'EDI',
      nombre: 'edificacion',
      aspectos: [{
        id: 'edificacion_1',
        texto: 'Aspecto 1',
        criterio: 'A',
        observaciones: '',
        fotografias: [{ id: 'foto-local-1', data: 'base64-local' }],
      }],
    }],
    score: { total: 1, pct_cumplimiento: 100 },
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
  Router: { go: () => {}, toast: () => {} },
  fetch: async (url, options) => {
    const body = JSON.parse(options.body || '{}');
    const rpc = url.split('/').pop();
    rpcCalls.push({ rpc, body });
    return { ok: true, text: async () => JSON.stringify([{ id: 'remote-continuidad-001' }]) };
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

  // 1) El snapshot respeta Store.ui.screen = 'verificar' (no fuerza 'hacer').
  sandbox.ScInformes.scheduleBorrador(localInspection, { force: true, aspectKey: 'edificacion:edificacion_1:base' });
  await waitTurn();
  const guardado = rpcCalls.find(c => c.rpc === 'sc_guardar_borrador');
  assert(!!guardado, 'se genera un guardado incremental');
  assert(guardado.body.p_estado_parcial.ui.screen === 'verificar',
    'el snapshot usa la pantalla real (verificar), no "hacer" fijo');

  // 2) restaurarEstadoRemoto navega a la pantalla recibida y conserva fotos locales por id.
  const payloadEstado = {
    local_id: localInspection.id,
    ui: { screen: 'actuar', programaIdx: 0, aspectoIdx: 0 },
    inspeccion: {
      ...guardado.body.p_estado_parcial.inspeccion,
      programas: [{
        id: 'edificacion',
        codigo: 'EDI',
        nombre: 'edificacion',
        aspectos: [{ id: 'edificacion_1', texto: 'Aspecto 1', criterio: 'A', observaciones: 'actualizado desde B' }],
      }],
    },
  };
  const restaurada = sandbox.ScInformes.restaurarEstadoRemoto(payloadEstado);
  assert(!!restaurada, 'restaurarEstadoRemoto devuelve la inspección restaurada');
  assert(state.ui.screen === 'actuar', 'Store.ui.screen navega a la pantalla recibida (actuar)');
  assert(restaurada.programas[0].aspectos[0].fotografias?.[0]?.id === 'foto-local-1',
    'las fotografías locales se conservan por id tras restaurar desde el remoto');
  assert(restaurada.programas[0].aspectos[0].observaciones === 'actualizado desde B',
    'el texto/observaciones del remoto reemplaza al local');

  if (failed) process.exit(1);
  console.log('\nALL TESTS PASSED');
})().catch(error => { console.error(error); process.exit(1); });
