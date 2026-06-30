// scores.js — Cálculo ponderado de cumplimiento PSB (5 programas)

const Scores = (() => {
  // Ponderación normativa colombiana (suma = 100)
  const PESOS = { infra: 25, pld: 20, pcip: 25, residuos: 15, agua: 15 };
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
    let sumaPonderada = 0;
    let pesoAcumulado = 0;

    inspeccion.programas.forEach(prog => {
      const r = calcularPrograma(prog);
      if (r.evaluados > 0) {
        const peso = PESOS[prog.id] || 20;
        sumaPonderada += (r.pct / 100) * peso;
        pesoAcumulado += peso;
      }
    });

    const pct = pesoAcumulado > 0 ? Math.round((sumaPonderada / pesoAcumulado) * 100) : 0;

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

  return { calcular, calcularPrograma, getColor, PESOS };
})();
