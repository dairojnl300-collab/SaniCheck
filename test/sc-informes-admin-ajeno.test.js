/**
 * Prueba: un admin que continúa el borrador de OTRO técnico debe guardar
 * sobre la fila original (sc_guardar_admin_borrador/sc_guardar_admin_informe
 * por id), nunca crear una fila nueva vía sc_guardar_borrador/
 * sc_guardar_informe con su propio tecnico_id.
 * Run: node test/sc-informes-admin-ajeno.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app/js/sc-informes.js'), 'utf8');
const local = { sanicheck_sc_codigo_acceso: 'ADMIN-CODIGO' };
const state = { inspecciones: [], currentId: null, ui: { screen: 'hacer', programaIdx: 0, aspectoIdx: 0 } };
const rpcCalls = [];

function inspeccionAjena() {
  return {
    id: 'psb-ajeno-001',
    fase_phva: 'H',
    establecimiento: { nombre: 'Establecimiento de otro técnico', nit: '900000003' },
    inspeccion: { fecha: '2026-09-02', numero_acta: 'PSB-2026-0003' },
    numero_acta: 'PSB-2026-0003',
    programas: [{
      id: 'edificacion', codigo: 'EDI', nombre: 'edificacion',
      aspectos: [{ id: 'edificacion_1', texto: 'Aspecto 1', criterio: 'A', observaciones: '', fotografias: [] }],
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
    return { ok: true, text: async () => JSON.stringify([{ id: 'remote-ajeno-001' }]) };
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
  // 1) Restaurar como admin un borrador AJENO (con remoteId) marca el local_id como ajeno.
  const insp = inspeccionAjena();
  const payloadEstado = {
    local_id: insp.id,
    ui: { screen: 'verificar', programaIdx: 0, aspectoIdx: 0 },
    inspeccion: insp,
  };
  const restaurada = sandbox.ScInformes.restaurarEstadoRemoto(payloadEstado, 'remote-row-uuid-999');
  assert(!!restaurada, 'restaurarEstadoRemoto restaura la inspección ajena');
  assert(state.inspecciones.find(i => i.id === insp.id), 'la inspección ajena queda en Store');

  // 2) Guardar el borrador ajeno debe llamar sc_guardar_admin_borrador con p_id = remoteId,
  //    nunca sc_guardar_borrador.
  sandbox.ScInformes.scheduleBorrador(state.inspecciones[0], { force: true, flushOnExit: true, aspectKey: 'x' });
  await waitTurn();
  const llamadaBorrador = rpcCalls.find(c => c.rpc === 'sc_guardar_admin_borrador' || c.rpc === 'sc_guardar_borrador');
  assert(llamadaBorrador?.rpc === 'sc_guardar_admin_borrador', 'el guardado de borrador ajeno usa sc_guardar_admin_borrador, no sc_guardar_borrador');
  assert(llamadaBorrador?.body?.p_id === 'remote-row-uuid-999', 'sc_guardar_admin_borrador recibe el id de la fila remota original');
  assert(!('p_local_id' in (llamadaBorrador?.body || {})), 'sc_guardar_admin_borrador no manda p_local_id (no aplica ON CONFLICT por tecnico_id)');

  // 3) Finalizar (guardarInforme) el informe ajeno debe llamar sc_guardar_admin_informe,
  //    nunca sc_guardar_informe.
  const resInforme = await sandbox.ScInformes.guardarInforme({
    localId: insp.id,
    establecimiento: insp.establecimiento,
    fecha: insp.inspeccion.fecha,
    html: '<html>acta</html>',
    numeroActa: insp.numero_acta,
  });
  assert(resInforme.ok === true, 'guardarInforme del ajeno reporta ok');
  const llamadaInforme = rpcCalls.find(c => c.rpc === 'sc_guardar_admin_informe' || c.rpc === 'sc_guardar_informe');
  assert(llamadaInforme?.rpc === 'sc_guardar_admin_informe', 'el guardado de informe ajeno usa sc_guardar_admin_informe, no sc_guardar_informe');
  assert(llamadaInforme?.body?.p_id === 'remote-row-uuid-999', 'sc_guardar_admin_informe recibe el id de la fila remota original');
  assert(!('p_local_id' in (llamadaInforme?.body || {})), 'sc_guardar_admin_informe no manda p_local_id');

  // 4) Una inspección PROPIA (nunca restaurada como ajena) sigue usando las RPC normales.
  const propia = { ...inspeccionAjena(), id: 'psb-propia-001' };
  state.inspecciones.push(propia);
  sandbox.ScInformes.scheduleBorrador(propia, { force: true, flushOnExit: true, aspectKey: 'y' });
  await waitTurn();
  const llamadaPropia = rpcCalls.filter(c => c.body?.p_local_id === propia.id);
  assert(llamadaPropia.some(c => c.rpc === 'sc_guardar_borrador'), 'una inspección propia (nunca marcada ajena) sigue usando sc_guardar_borrador');

  if (failed) process.exit(1);
  console.log('\nALL TESTS PASSED');
})().catch(error => { console.error(error); process.exit(1); });
