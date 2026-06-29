// hallazgos.js — Clasificación de urgencia de hallazgos PSB

const PROGRAMAS_CRITICOS = ['infra', 'pcip', 'agua'];

function clasificarUrgencia(evaluacion, programaId) {
  if (!evaluacion || evaluacion === 'B') return null;
  if (evaluacion === 'D' && PROGRAMAS_CRITICOS.includes(programaId)) {
    return { nivel: 'Crítico', plazo: 'Inmediato', dias: 0, color: '#D32F2F' };
  }
  if (evaluacion === 'D') {
    return { nivel: 'Mayor', plazo: '7 días', dias: 7, color: '#F57C00' };
  }
  return { nivel: 'Menor', plazo: '30 días', dias: 30, color: '#F9A825' };
}

function generarHallazgos(programas) {
  const hallazgos = [];
  programas.forEach(prog => {
    prog.aspectos.forEach(asp => {
      if (asp.evaluacion === 'D' || asp.evaluacion === 'R') {
        const urgencia = clasificarUrgencia(asp.evaluacion, prog.id);
        hallazgos.push({
          programaId:     prog.id,
          programaCodigo: prog.codigo,
          programaNombre: prog.nombre,
          aspectoId:      asp.id,
          aspectoTexto:   asp.texto,
          evaluacion:     asp.evaluacion,
          observacion:    asp.obs,
          norma:          asp.norma,
          nivel:          urgencia.nivel,
          plazo:          urgencia.plazo,
          dias:           urgencia.dias,
          color:          urgencia.color,
        });
      }
    });
  });
  return hallazgos.sort((a, b) => a.dias - b.dias);
}
