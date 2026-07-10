// diagnostico-inicial.js — Perfil Sanitario Inicial (Diagnóstico) por establecimiento (localStorage)
// Igual patrón que checklist-config.js: se asocia al nit/nombre, no a la inspección.

const DiagnosticoInicial = (() => {

  const ITEMS = [
    { id: 'di_01', texto: 'Infraestructura física (pisos, paredes, techos)' },
    { id: 'di_02', texto: 'Iluminación y ventilación' },
    { id: 'di_03', texto: 'Abastecimiento de agua potable' },
    { id: 'di_04', texto: 'Sistema de alcantarillado y desagües' },
    { id: 'di_05', texto: 'Almacenamiento de alimentos' },
    { id: 'di_06', texto: 'Equipos y utensilios' },
    { id: 'di_07', texto: 'Manejo de residuos sólidos' },
    { id: 'di_08', texto: 'Control de plagas' },
    { id: 'di_09', texto: 'Servicios sanitarios del personal' },
    { id: 'di_10', texto: 'Higiene del personal manipulador' },
    { id: 'di_11', texto: 'Documentación y registros' },
    { id: 'di_12', texto: 'Línea de servicio (self-service / bandejas)' },
    { id: 'di_13', texto: 'Transporte de alimentos entre sedes (si aplica)' },
  ];

  function _key(est) {
    const id = (est && (est.nit || est.nombre)) || 'default';
    return 'diagnostico_' + String(id).replace(/[^a-zA-Z0-9]/g, '_');
  }

  function _vacio() {
    return ITEMS.map(it => ({ id: it.id, condicion: '', calificacion: '', accion: '', prioridad: '' }));
  }

  function getDiagnostico(est) {
    try {
      const raw = localStorage.getItem(_key(est));
      if (raw) return JSON.parse(raw);
    } catch {}
    return { items: _vacio(), actualizado_en: null };
  }

  function saveDiagnostico(est, items) {
    const data = { items, actualizado_en: new Date().toISOString() };
    localStorage.setItem(_key(est), JSON.stringify(data));
    return data;
  }

  function contarCompletados(items) {
    return items.filter(it => it.calificacion).length;
  }

  return { ITEMS, getDiagnostico, saveDiagnostico, contarCompletados };
})();
