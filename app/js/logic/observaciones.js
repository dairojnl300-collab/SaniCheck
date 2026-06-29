// observaciones.js — Plantillas de observaciones normativas PSB

const PLANTILLAS_PSB = {
  infra: {
    B: 'Conforme. La infraestructura física cumple con los requisitos del Decreto 3075/1997 Anexo I y la Resolución 2674/2013. No se requieren acciones correctivas.',
    R: 'Parcialmente conforme. Se identifican deficiencias menores en la infraestructura física. Se requiere corrección en plazo de 30 días según Decreto 3075/1997 Anexo I Art. 8.',
    D: 'DEFICIENTE. Riesgo sanitario documentado en la infraestructura física. ACCIÓN CORRECTIVA INMEDIATA requerida conforme a la Ley 9/1979 Art. 28 y Decreto 3075/1997 Anexo I.',
  },
  pld: {
    B: 'Conforme. Los procedimientos de limpieza y desinfección cumplen con el Decreto 3075/1997 Anexo II y la Resolución 2674/2013 Arts. 26–29. Registros al día.',
    R: 'Parcialmente conforme. Se observan deficiencias en el programa de limpieza y desinfección. Corrección requerida en 30 días según Resolución 2674/2013 Art. 60.',
    D: 'DEFICIENTE. El programa de limpieza y desinfección presenta fallas críticas que comprometen la inocuidad alimentaria. CORRECCIÓN EN 7 DÍAS según Decreto 3075/1997 Anexo II y Resolución 2674/2013 Art. 28.',
  },
  pcip: {
    B: 'Conforme. El control integrado de plagas cumple con el Decreto 3075/1997 Anexo III. No se evidencian signos de infestación activa ni deficiencias estructurales.',
    R: 'Parcialmente conforme. Se detectan deficiencias en el programa de control de plagas. Corrección requerida en 30 días según Decreto 3075/1997 Anexo III.',
    D: 'DEFICIENTE. PRESENCIA ACTIVA DE PLAGAS o falla crítica en el sistema de control integrado. ACCIÓN INMEDIATA obligatoria conforme a Ley 9/1979 Art. 28 y Decreto 3075/1997 Anexo III.',
  },
  residuos: {
    B: 'Conforme. El manejo de residuos sólidos cumple con la Resolución 2184/2019 (código de colores), el Decreto 596/2016 y el Decreto 4741/2005.',
    R: 'Parcialmente conforme. Se observan incumplimientos en el manejo o separación de residuos. Corrección requerida en 30 días según Ley 1259/2008 y Decreto 596/2016.',
    D: 'DEFICIENTE. Manejo inadecuado de residuos que representa riesgo sanitario y ambiental verificable. CORRECCIÓN EN 7 DÍAS conforme al Decreto 4741/2005 y Ley 1259/2008.',
  },
  agua: {
    B: 'Conforme. El sistema de control de agua potable cumple con el Decreto 1575/2007 y la Resolución 2115/2007. Parámetros dentro de los límites admisibles.',
    R: 'Parcialmente conforme. Se identifican falencias en el control de calidad del agua o en los registros requeridos. Corrección en 30 días según Resolución 2115/2007 Art. 27.',
    D: 'DEFICIENTE. RIESGO DE CONTAMINACIÓN HÍDRICA CONFIRMADO. Suspensión inmediata del uso hasta corrección y nueva verificación, obligatorio conforme a Decreto 1575/2007 Art. 2 y Resolución 2115/2007.',
  },
};

function generarObservacion(programaId, evaluacion) {
  const prog = PLANTILLAS_PSB[programaId];
  if (!prog) return '';
  return prog[evaluacion] || '';
}
