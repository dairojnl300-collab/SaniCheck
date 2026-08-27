const Observaciones = (() => {
  function getObs(programaId, valor, aspecto) {
    if (valor === 'NA') return 'No aplica a este establecimiento.';
    if (valor === 'A') return 'Conforme con el aspecto evaluado.';
    if (valor === 'I') return `Incumplimiento identificado. ${aspecto?.norma || ''}`.trim();
    return '';
  }
  return { getObs };
})();
