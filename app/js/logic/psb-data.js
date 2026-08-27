// PSB Data — Catálogo oficial: 5 bloques, 20 ítems, escala A / I / N-A
// Fuente: Instructivo del Acta de Inspección Sanitaria con Enfoque de Riesgo para
// Establecimientos de Preparación de Alimentos (hoja "Instructivo"). Pesos por bloque
// tomados de la hoja "Tablas" del mismo instructivo, redistribuidos a 100% (ver plan).

function getPSBPrograms() {
  return [
    {
      id: 'edificacion',
      nombre: 'Edificación e Instalaciones',
      peso: 1,
      estado_general: null,
      aspectos: [
        {
          id: 'edificacion_1',
          texto: 'Localización y diseño.',
          norma: 'Resolución 2674/2013, Artículo 6, Numerales 1.1, 1.2, 1.3, 2.1, 2.3 y 2.6; Artículo 32, Numerales 1, 2, 3, 4, 6 y 7; Artículo 33, Numeral 8.',
          criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [], _custom: false, _disabled: false,
        },
        {
          id: 'edificacion_2',
          texto: 'Condiciones de Pisos y Paredes.',
          norma: 'Resolución 2674/2013, Artículo 7, Numeral 1 y 2; Artículo 33, Numerales 1, 2 y 3.',
          criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [], _custom: false, _disabled: false,
        },
        {
          id: 'edificacion_3',
          texto: 'Techos, iluminación y ventilación.',
          norma: 'Resolución 2674/2013, Artículo 7, Numeral 3, 4, 5, 7 y 8; Artículo 33, Numeral 4.',
          criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [], _custom: false, _disabled: false,
        },
        {
          id: 'edificacion_4',
          texto: 'Instalaciones sanitarias.',
          norma: 'Resolución 2674/2013, Artículo 6, Numeral 6.1, 6.2, 6.3 y 6.4; Artículo 32, Numeral 9 y 11.',
          criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [], _custom: false, _disabled: false,
        },
      ],
    },
    {
      id: 'equipos',
      nombre: 'Equipos y Utensilios',
      peso: 1,
      estado_general: null,
      aspectos: [
        {
          id: 'equipos_1',
          texto: 'Condiciones de equipos y utensilios.',
          norma: 'Resolución 2674/2013, Artículo 8; Artículo 9, Numerales 1, 6, 8 y 9; Artículo 10, Numerales 2 y 3; Artículo 34.',
          criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [], _custom: false, _disabled: false,
        },
        {
          id: 'equipos_2',
          texto: 'Superficies de contacto con el alimento.',
          norma: 'Resolución 2674/2013, Artículo 8; Artículo 9, Numerales 2, 3, 4, 5, 7 y 10; Artículo 34; Artículo 35, Numeral 8 y 10. Resoluciones 683, 4142 y 4143 de 2012; 834 y 835 de 2013.',
          criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [], _custom: false, _disabled: false,
        },
      ],
    },
    {
      id: 'personal',
      nombre: 'Personal Manipulador de Alimentos',
      peso: 2,
      estado_general: null,
      aspectos: [
        {
          id: 'personal_1',
          texto: 'Estado de salud (signos/lesiones).',
          norma: 'Resolución 2674/2013, Artículo 11; Numeral 1, 2, 4 y 5; Artículo 14, Numeral 12.',
          criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [], _custom: false, _disabled: false,
        },
        {
          id: 'personal_2',
          texto: 'Reconocimiento Médico.',
          norma: 'Resolución 2674 de 2013, Artículo 11, Numeral 1, 2, 3 y 4.',
          criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [], _custom: false, _disabled: false,
        },
        {
          id: 'personal_3',
          texto: 'Prácticas higiénicas.',
          norma: 'Resolución 2674/2013, Artículo 14, Numerales 1 a 11, 13 y 14; Artículo 36; Artículo 35, Numeral 5 y 7.',
          criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [], _custom: false, _disabled: false,
        },
        {
          id: 'personal_4',
          texto: 'Educación y Capacitación.',
          norma: 'Resolución 2674/2013, Artículos 12 y 13; Artículo 36.',
          criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [], _custom: false, _disabled: false,
        },
      ],
    },
    {
      id: 'higienicos',
      nombre: 'Requisitos Higiénicos',
      peso: 2,
      estado_general: null,
      aspectos: [
        {
          id: 'higienicos_1',
          texto: 'Control de materias primas e insumos.',
          norma: 'Decreto 561 de 1984, Art. 89; Resolución 2674/2013, Artículo 16, Numerales 1, 3, 4 y 5; Artículo 35, Numerales 1, 2 y 3; Resolución 5109 de 2005; Resolución 1506 de 2011; Resoluciones 683, 4142 y 4143 de 2012; 834 y 835 de 2013.',
          criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [], _custom: false, _disabled: false,
        },
        {
          id: 'higienicos_2',
          texto: 'Contaminación cruzada.',
          norma: 'Resolución 2674/2013, Artículo 16, Numeral 7; Artículo 18, Numeral 7; Artículo 20, Numeral 5; Artículo 35, Numeral 4.',
          criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [], _custom: false, _disabled: false,
        },
        {
          id: 'higienicos_3',
          texto: 'Manejo de temperaturas.',
          norma: 'Ley 9 de 1979, Artículo 293 y 425; Resolución 2674/2013, Artículo 18, Numeral 3.1, 3.2, 3.3 y 5.',
          criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [], _custom: false, _disabled: false,
        },
        {
          id: 'higienicos_4',
          texto: 'Condiciones de almacenamiento.',
          norma: 'Resoluciones 683/2012; 2674/2013, Artículo 16, Numeral 5 y 6; Artículo 33, Numeral 9.',
          criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [], _custom: false, _disabled: false,
        },
      ],
    },
    {
      id: 'saneamiento',
      nombre: 'Saneamiento',
      peso: 3,
      estado_general: null,
      aspectos: [
        {
          id: 'saneamiento_1',
          texto: 'Suministro y calidad de agua potable.',
          norma: 'Resolución 2674/2013, Artículo 6, Numeral 3.1, 3.2, 3.3, 3.5.1, 3.5.2 y 3.5.3; Artículo 26, Numeral 4; Artículo 32, Numeral 8; Resolución 2115 de 2007, Artículo 9.',
          criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [], _custom: false, _disabled: false,
        },
        {
          id: 'saneamiento_2',
          texto: 'Residuos líquidos.',
          norma: 'Resolución 2674/2013, Artículo 6, Numeral 4; Artículo 32, Numerales 5 y 10.',
          criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [], _custom: false, _disabled: false,
        },
        {
          id: 'saneamiento_3',
          texto: 'Residuos sólidos.',
          norma: 'Resolución 2674/2013, Artículo 6, Numerales 5.1, 5.2 y 5.3; Artículo 33, Numerales 5, 6 y 7; Artículo 18, Numeral 11.',
          criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [], _custom: false, _disabled: false,
        },
        {
          id: 'saneamiento_4',
          texto: 'Control integral de plagas.',
          norma: 'Resolución 2674/2013, Artículo 26, Numeral 3.',
          criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [], _custom: false, _disabled: false,
        },
        {
          id: 'saneamiento_5',
          texto: 'Limpieza y desinfección de áreas, equipos y utensilios.',
          norma: 'Resolución 2674/2013, Artículo 6, Numeral 6.5; Artículo 26, Numeral 1.',
          criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [], _custom: false, _disabled: false,
        },
        {
          id: 'saneamiento_6',
          texto: 'Soportes documentales de saneamiento.',
          norma: 'Decreto 1575 de 2007, Artículo 10; Resolución 2674/2013, Artículo 26.',
          criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [], _custom: false, _disabled: false,
        },
      ],
    },
  ];
}

function crearInspeccion(establecimiento, inspector) {
  return {
    id: 'psb-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    fase_phva: 'H',
    establecimiento: { ...establecimiento },
    inspeccion: {
      inspector: inspector || '',
      fecha: new Date().toISOString().split('T')[0],
      hora_inicio: new Date().toTimeString().slice(0, 5),
      hora_fin: null,
      numero_acta: 'PSB-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4),
    },
    programas: getPSBPrograms(),
    estado_general: null,
    hallazgos_criticos: [],
    catalogo_audit: [],
    score: { A: 0, I: 0, NA: 0, total: 0, pct_cumplimiento: 0 },
    numero_acta: '',
    fecha_proxima_inspeccion: null,
    plan_mejora_generado: false,
    acta_pdf_generada: false,
    creado_en: new Date().toISOString(),
    actualizado_en: new Date().toISOString(),
    version_app: '2.0.0',
  };
}
