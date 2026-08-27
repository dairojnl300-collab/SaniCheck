// A = cumple; I = incumple; N-A queda fuera del denominador.
const Scores = (() => {
  // Lectura compatible de inspecciones anteriores: B→A y R/D→I.
  const criterio = a => {
    const valor = a.criterio || a.evaluacion || null;
    return valor === 'B' ? 'A' : (valor === 'R' || valor === 'D') ? 'I' : valor;
  };
  function calcularPrograma(bloque) {
    const aspectos = bloque.aspectos || [];
    const evaluados = aspectos.filter(a => ['A', 'I'].includes(criterio(a)));
    const A = evaluados.filter(a => criterio(a) === 'A').length;
    const I = evaluados.length - A;
    const NA = aspectos.filter(a => criterio(a) === 'NA').length;
    return { pct: evaluados.length ? Math.round((A / evaluados.length) * 100) : 0, evaluados: evaluados.length, total: aspectos.length, A, I, NA };
  }
  function calcular(inspeccion) {
    let suma = 0, peso = 0;
    const todos = [];
    (inspeccion.programas || []).forEach(bloque => {
      const r = calcularPrograma(bloque);
      bloque.estado_general = r.evaluados ? getEstado(r.pct) : null;
      const p = bloque.peso || PSB_PESOS[bloque.id] || 0;
      if (r.evaluados) { suma += p * r.pct; peso += p; }
      todos.push(...bloque.aspectos);
    });
    const pct = peso ? Math.round(suma / peso) : 0;
    const A = todos.filter(a => criterio(a) === 'A').length, I = todos.filter(a => criterio(a) === 'I').length, NA = todos.filter(a => criterio(a) === 'NA').length;
    inspeccion.score = { A, I, NA, total: A + I, pct_cumplimiento: pct };
    inspeccion.estado_general = A + I ? getEstado(pct) : null;
    return inspeccion.score;
  }
  function getEstado(pct) { return pct >= 80 ? 'B' : pct >= 50 ? 'R' : 'D'; }
  function getColor(pct) { return pct >= 80 ? 'var(--color-bueno)' : pct >= 50 ? 'var(--color-regular)' : 'var(--color-deficiente)'; }
  return { calcular, calcularPrograma, getEstado, getColor, criterio };
})();
