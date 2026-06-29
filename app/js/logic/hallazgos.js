// hallazgos.js — Extracción y clasificación de hallazgos por programa

const Hallazgos = (() => {
  const PLAZOS = {
    critico_D: 'Inmediato (≤48 h)',
    normal_D:  '7 días calendario',
    R:         '30 días calendario',
  };

  function calcularPlazo(programa, evaluacion) {
    if (evaluacion === 'D') {
      return programa.peso_critico ? PLAZOS.critico_D : PLAZOS.normal_D;
    }
    if (evaluacion === 'R') return PLAZOS.R;
    return null;
  }

  function actualizar(inspeccion) {
    const hallazgos = [];
    inspeccion.programas.forEach(prog => {
      prog.aspectos.forEach(asp => {
        if (asp.evaluacion === 'D' || asp.evaluacion === 'R') {
          hallazgos.push({
            programa_id:      prog.id,
            programa_nombre:  prog.nombre,
            aspecto_id:       asp.id,
            texto:            asp.texto,
            norma:            asp.norma,
            evaluacion:       asp.evaluacion,
            critico:          asp.evaluacion === 'D' && prog.peso_critico,
            plazo:            calcularPlazo(prog, asp.evaluacion),
            obs:              asp.obs,
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
      total:       h.length,
      criticos:    h.filter(x => x.critico).length,
      deficientes: h.filter(x => x.evaluacion === 'D').length,
      regulares:   h.filter(x => x.evaluacion === 'R').length,
    };
  }

  return { actualizar, getResumen, calcularPlazo };
})();
