// A = cumple; I = incumple; N-A queda fuera del denominador.
const Scores = (() => {
  // Lectura compatible de inspecciones anteriores: B→A y R/D→I.
  const criterio = a => {
    const valor = a.criterio || a.evaluacion || null;
    return valor === 'B' ? 'A' : (valor === 'R' || valor === 'D') ? 'I' : valor;
  };
  const evaluacionesDe = aspecto => {
    return [aspecto, ...(aspecto.criterios_extra || [])].map(x => criterio(x));
  };
  function calcularPrograma(bloque) {
    const aspectos = bloque.aspectos || [];
    const valores = aspectos.flatMap(evaluacionesDe);
    const evaluados = valores.filter(v => ['A', 'I'].includes(v));
    const A = evaluados.filter(v => v === 'A').length;
    const I = evaluados.filter(v => v === 'I').length;
    const NA = valores.filter(v => v === 'NA').length;
    return { pct: evaluados.length ? Math.round((A / evaluados.length) * 100) : 0, evaluados: evaluados.length, total: valores.length, A, I, NA };
  }
  function calcular(inspeccion) {
    let suma = 0, peso = 0;
    const todos = [];
    (inspeccion.programas || []).forEach(bloque => {
      const r = calcularPrograma(bloque);
      bloque.estado_general = r.evaluados ? getEstado(r.pct) : null;
      const p = bloque.peso || PSB_PESOS[bloque.id] || 0;
      if (r.evaluados) { suma += p * r.pct; peso += p; }
      bloque.aspectos.forEach(a => todos.push(...evaluacionesDe(a)));
    });
    const pct = peso ? Math.round(suma / peso) : 0;
    const A = todos.filter(v => v === 'A').length, I = todos.filter(v => v === 'I').length, NA = todos.filter(v => v === 'NA').length;
    inspeccion.score = { A, I, NA, total: A + I, pct_cumplimiento: pct };
    inspeccion.estado_general = A + I ? getEstado(pct) : null;
    return inspeccion.score;
  }
  function getEstado(pct) { return pct >= 80 ? 'B' : pct >= 50 ? 'R' : 'D'; }
  function getColor(pct) { return pct >= 80 ? 'var(--color-bueno)' : pct >= 50 ? 'var(--color-regular)' : 'var(--color-deficiente)'; }
  return { calcular, calcularPrograma, getEstado, getColor, criterio };
})();
