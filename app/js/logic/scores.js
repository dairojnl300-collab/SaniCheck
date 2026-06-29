// scores.js — Cálculo de scores y estado general PSB

function calcularScore(programas) {
  let b = 0, r = 0, d = 0, total = 0;
  programas.forEach(prog => {
    prog.aspectos.forEach(asp => {
      if (asp.evaluacion) {
        total++;
        if (asp.evaluacion === 'B') b++;
        else if (asp.evaluacion === 'R') r++;
        else d++;
      }
    });
  });
  const pct_cumplimiento = total > 0 ? Math.round((b / total) * 100) : 0;
  return { b, r, d, total, pct_cumplimiento };
}

function calcularEstadoGeneral(programas) {
  const evaluados = programas.flatMap(p => p.aspectos.filter(a => a.evaluacion));
  if (!evaluados.length) return null;
  if (evaluados.some(a => a.evaluacion === 'D')) return 'D';
  if (evaluados.some(a => a.evaluacion === 'R')) return 'R';
  return 'B';
}

function calcularEstadoPrograma(programa) {
  const evaluados = programa.aspectos.filter(a => a.evaluacion);
  if (!evaluados.length) return null;
  if (evaluados.some(a => a.evaluacion === 'D')) return 'D';
  if (evaluados.some(a => a.evaluacion === 'R')) return 'R';
  return 'B';
}
