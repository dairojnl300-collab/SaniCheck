const Hallazgos = (() => {
  function actualizar(inspeccion) {
    const hallazgos = [];
    (inspeccion.programas || []).forEach(programa => (programa.aspectos || []).forEach(aspecto => {
      const aspectos = [{ ...aspecto, texto: 'Aspecto por verificar 1' }, ...(aspecto.criterios_extra || []).map((x, i) => ({ ...x, id: `${aspecto.id}-extra-${i + 1}`, texto: `Aspecto por verificar ${i + 2}`, norma: aspecto.norma, fotografias: x.fotografias || [] }))];
      aspectos.forEach(aspecto => {
      if (Scores.criterio(aspecto) !== 'I') return;
      const critico = !!programa.peso_critico;
      hallazgos.push({ programa_id: programa.id, programa_nombre: programa.nombre, aspecto_id: aspecto.id, texto: aspecto.texto, norma: aspecto.norma, evaluacion: 'I', criterio: 'I', critico, plazo: critico ? 'Inmediato (≤48 h)' : '30 días calendario', obs: aspecto.hallazgo || aspecto.obs || '', accion: aspecto.accion || '', estado: aspecto.estado || 'Abierto', fotografias: aspecto.fotografias || [] });
      });
    }));
    inspeccion.hallazgos_criticos = hallazgos;
    return hallazgos;
  }
  function getResumen(inspeccion) { const h = inspeccion.hallazgos_criticos || []; return { total: h.length, criticos: h.filter(x => x.critico).length, deficientes: h.length, regulares: 0, abiertos: h.filter(x => x.estado !== 'Cerrado').length, cerrados: h.filter(x => x.estado === 'Cerrado').length }; }
  return { actualizar, getResumen };
})();
