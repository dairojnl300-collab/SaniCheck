// observaciones.js — Textos automáticos de observación normativa por programa y evaluación

const Observaciones = (() => {
  const OBS = {
    infra: {
      B: 'Conforme. Cumple con Decreto 3075/1997 Anexo I.',
      R: 'Parcialmente conforme. Se observan deficiencias menores. Corrección requerida en 30 días conforme Decreto 3075/1997 Anexo I.',
      D: 'DEFICIENTE. Riesgo sanitario documentado. ACCIÓN INMEDIATA requerida conforme Ley 9/1979 y Decreto 3075/1997 Anexo I.',
    },
    pld: {
      B: 'Conforme. Procedimientos de limpieza y desinfección implementados correctamente según Resolución 2674/2013.',
      R: 'Parcialmente conforme. Se identifican inconsistencias en los procedimientos de L&D. Subsanar en 30 días según Resolución 2674/2013 Art. 28.',
      D: 'DEFICIENTE. Ausencia o incumplimiento grave del programa de L&D. ACCIÓN CORRECTIVA INMEDIATA según Resolución 2674/2013 y Decreto 3075/1997 Anexo II.',
    },
    pcip: {
      B: 'Conforme. Medidas de control integrado de plagas implementadas según Decreto 3075/1997 Anexo III.',
      R: 'Parcialmente conforme. Se identifican deficiencias en el control preventivo de plagas. Subsanar en 30 días según Decreto 3075/1997 Anexo III.',
      D: 'DEFICIENTE. Presencia activa de plagas o ausencia del programa de control. ACCIÓN INMEDIATA requerida. Riesgo sanitario alto según Ley 9/1979 y Decreto 3075/1997 Anexo III.',
    },
    residuos: {
      B: 'Conforme. Manejo de residuos sólidos adecuado según Resolución 2184/2019 y Decreto 596/2016.',
      R: 'Parcialmente conforme. Se observan deficiencias en separación en la fuente o almacenamiento. Corrección en 30 días según Resolución 2184/2019.',
      D: 'DEFICIENTE. Manejo inadecuado de residuos con riesgo de contaminación cruzada. ACCIÓN CORRECTIVA según Ley 1259/2008 y Decreto 4741/2005.',
    },
    agua: {
      B: 'Conforme. Suministro y calidad del agua potable cumplen con Decreto 1575/2007 y Resolución 2115/2007.',
      R: 'Parcialmente conforme. Se identifican deficiencias en control o documentación de la calidad del agua. Subsanar en 15 días según Decreto 1575/2007.',
      D: 'DEFICIENTE. Riesgo de contaminación hídrica confirmado. SUSPENSIÓN PREVENTIVA hasta corrección. Notificar autoridad sanitaria según Decreto 1575/2007 y Resolución 2115/2007.',
    },
  };

  function getObs(programaId, valor) {
    if (valor === 'NA') return 'No aplica a este establecimiento';
    return (OBS[programaId] && OBS[programaId][valor]) || '';
  }

  return { getObs };
})();
