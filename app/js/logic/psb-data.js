// PSB Data — 5 programas, 30 aspectos normativos colombianos
// Fuente: Ley 9/1979 · Dec. 3075/1997 · Res. 2674/2013 · Dec. 1575/2007

// Peso por criticidad normativa — cada aspecto hereda el peso de su programa
const PSB_PESOS = { agua: 3, pld: 3, pcip: 2, residuos: 2, infra: 1 };

function getPSBPrograms() {
  return [
    {
      id: 'infra',
      codigo: 'INFRA',
      nombre: 'Infraestructura Física',
      norma_base: 'Decreto 3075/1997 Anexo I',
      estado_general: null,
      peso_critico: true,
      aspectos: [
        { id: 'infra_001', texto: '¿Pisos en buen estado (sin grietas ni deterioro)?', norma: 'Dec. 3075/1997 Anexo I Art. 8', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'infra_002', texto: '¿Paredes limpias y sin humedad visible?', norma: 'Dec. 3075/1997 Anexo I Art. 8', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'infra_003', texto: '¿Techos y cielorrasos en buen estado?', norma: 'Dec. 3075/1997 Anexo I', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'infra_004', texto: '¿Iluminación adecuada (≥500 lux en zonas de trabajo)?', norma: 'Dec. 3075/1997 Anexo I Art. 10', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'infra_005', texto: '¿Ventilación suficiente sin olores cruzados?', norma: 'Res. 2674/2013 Art. 7', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'infra_006', texto: '¿Puertas y ventanas con cierre automático y mallas?', norma: 'Dec. 3075/1997 Anexo I Art. 9', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'infra_007', texto: '¿Drenajes e instalaciones sanitarias funcionales?', norma: 'Ley 9/1979 Art. 28', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
      ],
    },
    {
      id: 'pld',
      codigo: 'PLD',
      nombre: 'Limpieza y Desinfección',
      norma_base: 'Decreto 3075/1997 Anexo II · Resolución 2674/2013',
      estado_general: null,
      peso_critico: false,
      aspectos: [
        { id: 'pld_001', texto: '¿Existen POE (Procedimientos Operativos) documentados y accesibles?', norma: 'Res. 2674/2013 Art. 28', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'pld_002', texto: '¿Fichas técnicas de productos químicos (FDS) disponibles?', norma: 'Res. 773/2021 (SGA)', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'pld_003', texto: '¿Existe cronograma de limpieza y desinfección implementado?', norma: 'Dec. 3075/1997 Anexo II', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'pld_004', texto: '¿Se realiza limpieza y desinfección de superficies de trabajo?', norma: 'Res. 2674/2013 Art. 26', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'pld_005', texto: '¿Se desinfectan equipos y utensilios después de cada uso?', norma: 'Dec. 3075/1997 Anexo II', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'pld_006', texto: '¿Baños se limpian mínimo 2 veces al día con registro?', norma: 'Res. 2674/2013 Art. 29', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'pld_007', texto: '¿Registros de limpieza diligenciados y archivados?', norma: 'Res. 2674/2013 Art. 60', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
      ],
    },
    {
      id: 'pcip',
      codigo: 'PCIP',
      nombre: 'Control Integrado de Plagas',
      norma_base: 'Decreto 3075/1997 Anexo III',
      estado_general: null,
      peso_critico: true,
      aspectos: [
        { id: 'pcip_001', texto: '¿Medidas preventivas estructurales implementadas? (sellamiento, mallas, puertas)', norma: 'Dec. 3075/1997 Anexo III', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'pcip_007', grupo: 'Hermeticidad del establecimiento', texto: 'Brecha entre puerta y piso ≤ 1 cm (o caucho/sello inferior en buen estado)', norma: 'Res. 2674/2013', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'pcip_008', grupo: 'Hermeticidad del establecimiento', texto: 'Anjeos/mallas en ventanas en buen estado, sin roturas', norma: 'Res. 2674/2013', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'pcip_009', grupo: 'Hermeticidad del establecimiento', texto: 'Sifones y rejillas fijos, no removibles, sin espacios de acceso', norma: 'Res. 2674/2013', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'pcip_010', grupo: 'Hermeticidad del establecimiento', texto: 'Sin agujeros visibles en paredes, pisos o techos (puntos de ingreso)', norma: 'Res. 2674/2013', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'pcip_002', texto: '¿Registros de inspección de indicadores de plagas actualizados?', norma: 'Dec. 3075/1997 Anexo III', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'pcip_003', texto: '¿Contrato vigente con empresa certificada de fumigación?', norma: 'Res. 1287/1994 SS Cartagena', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'pcip_004', texto: '¿Cronograma de control químico definido y ejecutado?', norma: 'Dec. 3075/1997 Anexo III', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'pcip_005', texto: '¿Productos plaguicidas autorizados y almacenados correctamente?', norma: 'Res. 2400/1979 MINSALUD', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'pcip_006', texto: '¿Sin evidencia activa de infestación (excrementos, roeduras, insectos)?', norma: 'Ley 9/1979 Art. 28', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
      ],
    },
    {
      id: 'residuos',
      codigo: 'RS',
      nombre: 'Residuos Sólidos',
      norma_base: 'Ley 1259/2008 · Decreto 596/2016 · Decreto 4741/2005',
      estado_general: null,
      peso_critico: false,
      aspectos: [
        { id: 'rs_001', texto: '¿Separación en la fuente implementada (código de colores)?', norma: 'Res. 2184/2019 MADS', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'rs_002', texto: '¿Recipientes identificados, limpios y en buen estado?', norma: 'Dec. 3075/1997 Anexo I', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'rs_003', texto: '¿Almacenamiento temporal de residuos adecuado y señalizado?', norma: 'Dec. 4741/2005', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'rs_004', texto: '¿Cronograma interno de recolección definido y ejecutado?', norma: 'Ley 1259/2008', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'rs_005', texto: '¿Registro de generación de residuos diligenciado?', norma: 'Dec. 596/2016', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
      ],
    },
    {
      id: 'agua',
      codigo: 'AGUA',
      nombre: 'Control de Agua Potable',
      norma_base: 'Decreto 1575/2007 · Resolución 2115/2007',
      estado_general: null,
      peso_critico: true,
      aspectos: [
        { id: 'agua_001', texto: '¿Agua de fuente potable certificada (red pública o acueducto autorizado)?', norma: 'Dec. 1575/2007 Art. 2', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'agua_002', texto: '¿Tanque de almacenamiento en buen estado, tapado y sin contaminación?', norma: 'Dec. 1575/2007 Art. 11', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'agua_003', texto: '¿Análisis de calidad del agua realizado en laboratorio certificado (anual)?', norma: 'Res. 2115/2007 Art. 27', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'agua_004', texto: '¿Parámetros in-situ registrados: cloro residual (0.3–2.0 mg/L), pH (6.5–9.0)?', norma: 'Res. 2115/2007 Art. 4-5', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
        { id: 'agua_005', texto: '¿Limpieza y desinfección del tanque realizada semestralmente con registro?', norma: 'Dec. 1575/2007 Art. 11', evaluacion: null, obs: '', obs_editada: false, fotografias: [], hallazgo_critico: false, plazo: null },
      ],
    },
  ];
}

function crearInspeccion(establecimiento, inspector) {
  return {
    id: 'psb-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    fase_phva: 'P',
    establecimiento: { ...establecimiento },
    inspeccion: {
      inspector: inspector || 'Ing. Ambiental',
      fecha: new Date().toISOString().split('T')[0],
      hora_inicio: new Date().toTimeString().slice(0, 5),
      hora_fin: null,
      numero_acta: 'PSB-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4),
    },
    programas: getPSBPrograms(),
    estado_general: null,
    hallazgos_criticos: [],
    score: { b: 0, r: 0, d: 0, total: 0, pct_cumplimiento: 0 },
    numero_acta: '',
    fecha_proxima_inspeccion: null,
    plan_mejora_generado: false,
    acta_pdf_generada: false,
    creado_en: new Date().toISOString(),
    actualizado_en: new Date().toISOString(),
    version_app: '1.0.0',
  };
}
