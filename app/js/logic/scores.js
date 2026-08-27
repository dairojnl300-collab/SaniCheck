// scores.js — Cumplimiento ponderado en 2 etapas:
// 1) % por bloque = promedio simple de sus ítems evaluados (N-A excluido).
// 2) % global = Σ(peso_bloque × %bloque) / Σ(peso_bloque), solo bloques con ≥1 evaluado.

const Scores = (() => {
  const VALORES = { A: 1, I: 0 };

  function calcularPrograma(bloque) {
    const aspectos  = bloque.aspectos;
    const na        = aspectos.filter(a => a.criterio === 'NA').length;
    const evaluados = aspectos.filter(a => a.criterio === 'A' || a.criterio === 'I');
    if (!evaluados.length) {
      return { pct: 0, evaluados: 0, total: aspectos.length, na, A: 0, I: 0 };
    }
    const c = { A: 0, I: 0 };
    let suma = 0;
    evaluados.forEach(a => { c[a.criterio]++; suma += VALORES[a.criterio]; });
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

    inspeccion.programas.forEach(bloque => {
      const scBloque = calcularPrograma(bloque);
      if (scBloque.evaluados > 0) {
        numerador   += bloque.peso * scBloque.pct;
        denominador += bloque.peso;
      }
    });

    const pct = denominador > 0 ? Math.round(numerador / denominador) : 0;

    const todos   = inspeccion.programas.flatMap(p => p.aspectos.filter(a => a.criterio === 'A' || a.criterio === 'I'));
    const todosNA = inspeccion.programas.flatMap(p => p.aspectos.filter(a => a.criterio === 'NA'));

    inspeccion.score = {
      A:                todos.filter(a => a.criterio === 'A').length,
      I:                todos.filter(a => a.criterio === 'I').length,
      NA:               todosNA.length,
      total:            todos.length,
      pct_cumplimiento: pct,
    };
    inspeccion.estado_general = todos.length ? getEstado(pct) : null;
    return inspeccion.score;
  }

  // Cortes solo para codificación de color en la UI (no es un juicio normativo).
  function getEstado(pct) {
    if (pct >= 80) return 'B';
    if (pct >= 50) return 'R';
    return 'D';
  }

  function getColor(pct) {
    if (pct >= 80) return 'var(--color-bueno)';
    if (pct >= 50) return 'var(--color-regular)';
    return 'var(--color-deficiente)';
  }

  return { calcular, calcularPrograma, getEstado, getColor };
})();
