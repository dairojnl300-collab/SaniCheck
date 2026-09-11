/**
 * Aspecto adicional (criterio_extra) debe tener un aspecto_id ESTABLE.
 *
 * Antes del fix, ese id se recalculaba por posición en el array en tres
 * sitios distintos (Hallazgos.actualizar, Verificar.expandir,
 * Verificar._normalizarFotos): agregar o quitar un aspecto adicional
 * reindexaba a sus hermanos, y el id que la app calculaba dejaba de
 * coincidir con el ya materializado en Supabase (sc_hallazgos_estado),
 * causando que "Marcar como cumple" fallara de forma intermitente.
 *
 * Run: node test/verificar-aspecto-id-estable.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const hallazgosSrc = fs.readFileSync(path.join(__dirname, '..', 'app/js/logic/hallazgos.js'), 'utf8');
const hacerSrc = fs.readFileSync(path.join(__dirname, '..', 'app/js/phva/hacer.js'), 'utf8');

let failed = 0;
function assertTrue(condition, message) {
  if (!condition) { console.error('FAIL:', message); failed++; }
  else console.log('OK:', message);
}

function nuevaInspeccion() {
  return {
    id: 'insp-1',
    programas: [{
      id: 'edificacion',
      nombre: 'Edificación',
      peso_critico: false,
      aspectos: [{ id: 'edificacion_1', texto: 'Aspecto base', norma: 'Norma X', criterio: null, fotografias: [] }],
    }],
  };
}

// ── 1) Hallazgos.idExtra: congelar-en-primer-encuentro ─────────────────────
(function testIdExtraPuro() {
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(hallazgosSrc + '\nthis.Hallazgos = Hallazgos;', sandbox);
  const { Hallazgos } = sandbox;

  const base = { id: 'edificacion_1' };

  // Aspecto legado sin id: la primera llamada lo congela con la fórmula
  // posicional de siempre (compatibilidad con lo ya materializado).
  const extraLegado = { criterio: 'I' };
  const id1 = Hallazgos.idExtra(base, extraLegado, 0);
  assertTrue(id1 === 'edificacion_1-extra-1', 'legado: primera llamada usa la fórmula posicional (índice 0 -> -extra-1)');

  // Si luego se reordena (por ejemplo se eliminó un hermano anterior y este
  // pasa a índice 3), el id YA CONGELADO no debe cambiar.
  const id2 = Hallazgos.idExtra(base, extraLegado, 3);
  assertTrue(id2 === id1, 'legado: el id congelado no cambia aunque el índice cambie después (reordenamiento)');

  // Aspecto nuevo creado ya con id (como hace Hacer.agregarCriterio tras el fix):
  const extraNuevo = { criterio: null, id: 'edificacion_1-extra-7' };
  const id3 = Hallazgos.idExtra(base, extraNuevo, 0);
  assertTrue(id3 === 'edificacion_1-extra-7', 'nuevo: un id ya asignado nunca se recalcula por posición');

  // Foto sin aspecto_id dentro de un adicional: debe heredar el id del
  // aspecto dueño (el adicional), no el del aspecto base.
  const fotoSinAspectoId = { aspecto_id: null };
  const idDueño = Hallazgos.idExtra(base, extraLegado, 9);
  fotoSinAspectoId.aspecto_id = idDueño;
  assertTrue(fotoSinAspectoId.aspecto_id === id1 && fotoSinAspectoId.aspecto_id !== base.id,
    'foto de adicional sin aspecto_id se asocia al aspecto adicional, no al aspecto base');
})();

// ── 2) Hallazgos.actualizar: independencia entre aspectos adicionales ──────
(function testActualizarIndependiente() {
  const sandbox = { console, Scores: { criterio: a => a.criterio || a.evaluacion || null } };
  vm.createContext(sandbox);
  vm.runInContext(hallazgosSrc + '\nthis.Hallazgos = Hallazgos;', sandbox);
  const { Hallazgos } = sandbox;

  const inspeccion = nuevaInspeccion();
  const base = inspeccion.programas[0].aspectos[0];
  base.criterios_extra = [
    { criterio: 'I', hallazgo: 'Falla 1', fotografias: [{ id: 'f1' }] },
    { criterio: 'I', hallazgo: 'Falla 2', fotografias: [{ id: 'f2' }] },
    { criterio: 'A' }, // este NO debe entrar como hallazgo abierto
  ];

  const hallazgos = Hallazgos.actualizar(inspeccion);
  assertTrue(hallazgos.length === 2, 'solo los aspectos con criterio I entran como hallazgo (comportamiento existente, por diseño)');
  const ids = hallazgos.map(h => h.aspecto_id);
  assertTrue(new Set(ids).size === 2, 'cada aspecto adicional con hallazgo tiene un aspecto_id único e independiente');
  assertTrue(ids.every(id => id !== base.id), 'ningún hallazgo de un adicional reutiliza el id del aspecto base');

  const idsCongelados = base.criterios_extra.slice(0, 2).map(x => x.id);

  // Se "aprueba" el primero (deja de ser I) y se recalcula: el id de los
  // hermanos no debe verse afectado.
  base.criterios_extra[0].criterio = 'A';
  Hallazgos.actualizar(inspeccion);
  assertTrue(base.criterios_extra[1].id === idsCongelados[1],
    'aprobar un aspecto adicional no cambia el id ya congelado de sus hermanos');
})();

// ── 3) Hacer.agregarCriterio: numeración sin colisiones tras eliminar ──────
(function testAgregarCriterioSinColisiones() {
  const state = { inspecciones: [], currentId: null, ui: { screen: 'hacer', programaIdx: 0, aspectoIdx: 0 } };
  const sandbox = {
    console,
    window: { confirm: () => true },
    Store: {
      get: () => state,
      getCurrentInspeccion: () => state.inspecciones.find(i => i.id === state.currentId) || null,
      upsertInspeccion: () => {},
      setUI: partial => Object.assign(state.ui, partial),
    },
    ScInformes: { scheduleBorrador: () => {} },
    AppIcons: { row: () => '', icon: () => '', block: () => '' },
    PhvaIcons: { badge: () => '' },
    _esc: x => String(x ?? ''),
    Fotos: { renderThumbnails: () => '' },
    Scores: { criterio: a => a.criterio || a.evaluacion || null, calcular: () => {} },
    Router: { toast: () => {}, go: () => {} },
    getPSBAspectoDetalle: () => '',
    document: { getElementById: () => null },
  };
  vm.createContext(sandbox);
  vm.runInContext(hallazgosSrc + '\nthis.Hallazgos = Hallazgos;', sandbox);
  vm.runInContext(hacerSrc + '\nthis.Hacer = Hacer;', sandbox);
  const { Hacer } = sandbox;

  const inspeccion = nuevaInspeccion();
  state.inspecciones = [inspeccion];
  state.currentId = inspeccion.id;
  const aspecto = inspeccion.programas[0].aspectos[0];

  Hacer.agregarCriterio(); // -extra-1
  Hacer.agregarCriterio(); // -extra-2
  Hacer.agregarCriterio(); // -extra-3
  assertTrue(aspecto.criterios_extra.map(c => c.id).join(',') ===
    'edificacion_1-extra-1,edificacion_1-extra-2,edificacion_1-extra-3',
    'tres aspectos adicionales nuevos reciben ids consecutivos');

  Hacer.eliminarCriterio(0); // elimina -extra-1; quedan -extra-2 y -extra-3
  assertTrue(aspecto.criterios_extra.map(c => c.id).join(',') === 'edificacion_1-extra-2,edificacion_1-extra-3',
    'eliminar el primero no reindexa a los que quedan');

  Hacer.agregarCriterio(); // debe ser -extra-4, NUNCA reusar -extra-1 ni colisionar con -extra-3
  const ids = aspecto.criterios_extra.map(c => c.id);
  assertTrue(new Set(ids).size === ids.length, 'el nuevo id no colisiona con ninguno de los existentes tras una eliminación');
  assertTrue(ids[ids.length - 1] === 'edificacion_1-extra-4', 'el siguiente id continúa la numeración más alta usada, no el largo del arreglo');
})();

if (failed) process.exit(1);
console.log('\nALL TESTS PASSED');
