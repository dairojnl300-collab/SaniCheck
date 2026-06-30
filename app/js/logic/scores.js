// scores.js — Score ponderado por ítem: Σ(peso_programa × valor) / Σ(peso_programa) × 100
// N/A excluido de numerador y denominador. Pesos definidos en PSB_PESOS (psb-data.js).

const Scores = (() => {
  const VALORES = { B: 1, R: 0.5, D: 0 };

  function calcularPrograma(programa) {
    const aspectos  = programa.aspectos;
    const na        = aspectos.filter(a => a.evaluacion === 'NA').length;
    const evaluados = aspectos.filter(a => a.evaluacion && a.evaluacion !== 'NA');
    if (!evaluados.length) {
      return { pct: 0, evaluados: 0, total: aspectos.length, na, B: 0, R: 0, D: 0 };
    }
    const c = { B: 0, R: 0, D: 0 };
    let suma = 0;
    evaluados.forEach(a => { c[a.evaluacion]++; suma += VALORES[a.evaluacion]; });
    return {
      pct:      Math.round((suma / evaluados.length) * 100),
      evaluados: evaluados.length,
      total:    aspectos.length,
      na,
      ...c,
    };
  }

  function calcular(inspeccion) {
    let numerador = 0, denominador = 0;

    inspeccion.programas.forEach(prog => {
      const peso = PSB_PESOS[prog.id] || 1;
      prog.aspectos.forEach(asp => {
        if (asp.evaluacion && asp.evaluacion !== 'NA') {
          numerador   += peso * VALORES[asp.evaluacion];
          denominador += peso;
        }
      });
    });

    const pct = denominador > 0 ? Math.round((numerador / denominador) * 100) : 0;

    const todos  = inspeccion.programas.flatMap(p => p.aspectos.filter(a => a.evaluacion && a.evaluacion !== 'NA'));
    const todosNA = inspeccion.programas.flatMap(p => p.aspectos.filter(a => a.evaluacion === 'NA'));
    let estado = null;
    if (todos.length) {
      if (todos.some(a => a.evaluacion === 'D'))      estado = 'D';
      else if (todos.some(a => a.evaluacion === 'R')) estado = 'R';
      else                                             estado = 'B';
    }

    inspeccion.score = {
      B:                todos.filter(a => a.evaluacion === 'B').length,
      R:                todos.filter(a => a.evaluacion === 'R').length,
      D:                todos.filter(a => a.evaluacion === 'D').length,
      NA:               todosNA.length,
      total:            todos.length,
      pct_cumplimiento: pct,
    };
    inspeccion.estado_general = estado;
    return inspeccion.score;
  }

  function getColor(pct) {
    if (pct >= 80) return 'var(--color-bueno)';
    if (pct >= 50) return 'var(--color-regular)';
    return 'var(--color-deficiente)';
  }

  return { calcular, calcularPrograma, getColor };
})();
