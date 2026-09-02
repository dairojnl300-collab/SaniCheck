/**
 * Regresión: un informe finalizado y su borrador anterior comparten local_id;
 * Registro de Informes debe mostrar solo el finalizado, nunca "En curso".
 * Run: node test/sc-informes-final-preferido.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app/js/sc-informes.js'), 'utf8');
const local = { sanicheck_sc_codigo_acceso: 'TEST-CODIGO' };
const finalizado = {
  id: 'informe-final-001',
  local_id: 'local-001',
  establecimiento: { nombre: 'La Bodega de Sancho' },
  actualizado_en: '2026-09-02T15:00:00.000Z',
};
const borradorAnterior = {
  id: 'borrador-001',
  local_id: 'local-001',
  establecimiento: { nombre: 'La Bodega de Sancho' },
  estado_parcial_actualizado_en: '2026-09-02T15:05:00.000Z',
  actualizado_en: '2026-09-02T15:05:00.000Z',
};

const sandbox = {
  localStorage: {
    getItem: key => local[key] ?? null,
    setItem: (key, value) => { local[key] = String(value); },
    removeItem: key => { delete local[key]; },
  },
  window: {
    SC_INFORMES_CONFIG: { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'anon' },
    addEventListener: () => {},
  },
  document: { addEventListener: () => {} },
  navigator: { onLine: true },
  fetch: async url => {
    const rpc = url.split('/').pop();
    const rows = rpc === 'sc_list_mis_informes' ? [finalizado] : [borradorAnterior];
    return { ok: true, text: async () => JSON.stringify(rows) };
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

(async () => {
  const rows = await sandbox.ScInformes.listMisInformesUnificado();
  assert.equal(rows.length, 1, 'un informe final y su borrador anterior aparecen como una sola tarjeta');
  assert.equal(rows[0].id, 'informe-final-001', 'se conserva la tarjeta del informe finalizado');
  assert.equal(rows[0]._enCurso, false, 'la tarjeta finalizada no muestra En curso');
  console.log('OK: Registro prioriza el informe final sobre el borrador anterior');
})().catch(error => { console.error('FAIL:', error.message); process.exit(1); });
