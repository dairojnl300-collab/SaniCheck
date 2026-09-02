/**
 * Regresión: una inspección local antigua no puede aparecer como historial
 * si no fue confirmada como informe final de la sesión actual.
 * Run: node test/actuar-comparacion-historica.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const actuarSource = fs.readFileSync(path.join(__dirname, '..', 'app/js/phva/actuar.js'), 'utf8');
const informesSource = fs.readFileSync(path.join(__dirname, '..', 'app/js/sc-informes.js'), 'utf8');
const instrumented = actuarSource.replace(
  '  return { render, attach, compartir, abrirPDF, generarPDF, guardarPDF, limpiarFirma, cargarFirmaImagen, guardarFirmas, editarFirmas, cancelarEdicionFirmas };',
  '  this.__getInspeccionAnterior = _getInspeccionAnterior;\n  return { render, attach, compartir, abrirPDF, generarPDF, guardarPDF, limpiarFirma, cargarFirmaImagen, guardarFirmas, editarFirmas, cancelarEdicionFirmas };'
);

if (instrumented === actuarSource) throw new Error('No se pudo instrumentar Actuar para la prueba');

const actual = {
  id: 'actual',
  establecimiento: { establecimiento_id: 'bodega-sancho' },
  inspeccion: { fecha: '2026-09-02', hora_inicio: '01:40' },
  score: { total: 38, pct_cumplimiento: 29 },
};
const localAntiguaSinRespaldo = {
  id: 'cache-ajeno',
  establecimiento: { establecimiento_id: 'bodega-sancho' },
  inspeccion: { fecha: '2026-08-22', hora_inicio: '09:00' },
  score: { total: 38, pct_cumplimiento: 100 },
};
const historialConfirmado = {
  id: 'historial-confirmado',
  establecimiento: { establecimiento_id: 'bodega-sancho' },
  inspeccion: { fecha: '2026-08-20', hora_inicio: '09:00' },
  score: { total: 38, pct_cumplimiento: 82 },
};
const state = { inspecciones: [actual, localAntiguaSinRespaldo, historialConfirmado] };
const local = {
  sanicheck_sc_codigo_acceso: 'CODIGO-PRUEBA',
  sanicheck_sc_sesion: JSON.stringify({ id: 'profesional-1', nombre: 'Profesional', rol: 'tecnico', usuario: 'profesional' }),
};
let informesFinales = [];
const sandbox = {
  Store: { get: () => state },
  localStorage: {
    getItem: key => local[key] ?? null,
    setItem: (key, value) => { local[key] = String(value); },
    removeItem: key => { delete local[key]; },
  },
  window: { SC_INFORMES_CONFIG: { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'anon' }, addEventListener: () => {} },
  document: { addEventListener: () => {} },
  navigator: { onLine: true },
  fetch: async () => ({ ok: true, text: async () => JSON.stringify(informesFinales) }),
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  Date,
  JSON,
  Promise,
};

vm.createContext(sandbox);
vm.runInContext(informesSource + '\nthis.ScInformes = ScInformes;', sandbox);
vm.runInContext(instrumented, sandbox);

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exitCode = 1;
  } else console.log('OK:', message);
}

(async () => {
  // La profesional solo tiene respaldado el informe actual: el cache local antiguo no es historial.
  informesFinales = [{ local_id: 'actual' }];
  await sandbox.ScInformes.listMisInformes();
  assert(sandbox.__getInspeccionAnterior(actual) === null,
    'una inspección local sin respaldo de la sesión no aparece en la comparación');

  // Cuando existe un informe final confirmado, sí se usa aunque haya otro cache local más reciente.
  informesFinales = [{ local_id: 'actual' }, { local_id: 'historial-confirmado' }];
  await sandbox.ScInformes.listMisInformes();
  assert(sandbox.__getInspeccionAnterior(actual)?.id === 'historial-confirmado',
    'la comparación usa solo el informe final confirmado de la profesional');

  if (process.exitCode) process.exit(process.exitCode);
})().catch(error => { console.error(error); process.exit(1); });
