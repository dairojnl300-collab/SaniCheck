// hallazgos.js — Extracción y clasificación de hallazgos (criterio 'I') por bloque

const Hallazgos = (() => {
  const PLAZOS = {
    inmediato: 'Inmediato (≤48 h)',
    corto:     '7 días calendario',
    largo:     '30 días calendario',
  };

  // Plazo según el peso del bloque (más peso normativo → plazo más corto).
  function calcularPlazo(bloque, criterio) {
    if (criterio !== 'I') return null;
    if (bloque.peso >= 3) return PLAZOS.inmediato;
    if (bloque.peso === 2) return PLAZOS.corto;
    return PLAZOS.largo;
  }

  function actualizar(inspeccion) {
    const hallazgos = [];
    inspeccion.programas.forEach(bloque => {
      bloque.aspectos.forEach(asp => {
        if (asp.criterio === 'I') {
          hallazgos.push({
            bloque_id:     bloque.id,
            bloque_nombre: bloque.nombre,
            peso:          bloque.peso,
            aspecto_id:    asp.id,
            texto:         asp.texto,
            norma:         asp.norma,
            criterio:      asp.criterio,
            hallazgo:      asp.hallazgo,
            accion:        asp.accion,
            estado:        asp.estado,
            plazo:         calcularPlazo(bloque, asp.criterio),
            fotografias:   asp.fotografias || [],
          });
        }
      });
    });
    inspeccion.hallazgos_criticos = hallazgos;
    return hallazgos;
  }

  function getResumen(inspeccion) {
    const h = inspeccion.hallazgos_criticos || [];
    return {
      total:    h.length,
      abiertos: h.filter(x => x.estado === 'Abierto').length,
      cerrados: h.filter(x => x.estado === 'Cerrado').length,
    };
  }

  return { actualizar, getResumen, calcularPlazo };
})();
