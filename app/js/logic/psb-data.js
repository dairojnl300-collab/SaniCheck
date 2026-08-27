// Catálogo operativo PSB: adaptación ECODESA de 20 aspectos del instructivo.
// Cinco bloques y pesos redistribuidos proporcionalmente a 100%.

const PSB_PESOS = { edificacion: 11.1, equipos: 11.1, personal: 22.2, higienicos: 22.2, saneamiento: 33.3 };

const PSB_DETALLES = {
  edificacion_1: 'Verifique ubicación alejada de focos de contaminación, distribución sanitaria de áreas, separación entre operaciones y circulación que evite contaminación del alimento.',
  edificacion_2: 'Revise que pisos y paredes sean lisos, impermeables, lavables, sin grietas, humedad, desprendimientos ni acumulación de suciedad.',
  edificacion_3: 'Compruebe techos íntegros y limpios, iluminación suficiente y protegida, y ventilación que controle condensación, calor, humo, olores y polvo.',
  edificacion_4: 'Verifique disponibilidad, limpieza y dotación de servicios sanitarios; lavamanos funcionales, agua, jabón, medio de secado y acceso sin contaminar áreas de proceso.',
  equipos_1: 'Compruebe que equipos y utensilios estén limpios, en buen estado, construidos con materiales aptos y permitan limpieza, desinfección y mantenimiento seguro.',
  equipos_2: 'Revise superficies en contacto con alimentos: lisas, no porosas, sin corrosión, roturas ni uniones que acumulen residuos; confirme limpieza y desinfección.',
  personal_1: 'Observe signos de enfermedad, heridas, lesiones o síntomas que puedan contaminar alimentos; confirme retiro o reubicación oportuna cuando corresponda.',
  personal_2: 'Verifique soportes de valoración médica ocupacional y controles de salud requeridos para personal manipulador.',
  personal_3: 'Observe lavado de manos, uniforme limpio, protección de cabello, ausencia de joyas, manejo correcto de alimentos y prácticas que eviten contaminación.',
  personal_4: 'Verifique programa, evidencia y registros de capacitación en manipulación higiénica de alimentos, con refuerzos periódicos y personal capacitado.',
  higienicos_1: 'Revise recepción de materias primas, integridad de empaques, fechas, proveedores, condiciones de transporte, rotación y almacenamiento de insumos.',
  higienicos_2: 'Compruebe separación entre crudo y cocido, uso diferenciado de utensilios y superficies, lavado de manos y flujo que prevenga contaminación cruzada.',
  higienicos_3: 'Verifique control y registro de temperaturas de recepción, almacenamiento, cocción, mantenimiento, enfriamiento y recalentamiento de alimentos.',
  higienicos_4: 'Revise orden, limpieza, rotación PEPS, separación del piso y paredes, protección contra plagas y condiciones de temperatura y humedad del almacenamiento.',
  saneamiento_1: 'Compruebe fuente de agua segura, puntos de abastecimiento limpios, almacenamiento protegido y soportes de control de calidad cuando apliquen.',
  saneamiento_2: 'Verifique drenajes funcionales, ausencia de reboses o fugas, limpieza de trampas y conducción de aguas residuales sin afectar áreas de alimentos.',
  saneamiento_3: 'Revise recipientes con tapa e identificación, separación, frecuencia de retiro, almacenamiento temporal limpio y prevención de contaminación por residuos.',
  saneamiento_4: 'Verifique barreras físicas, monitoreo, ausencia de evidencia de plagas, manejo seguro de productos y registros de las acciones de control.',
  saneamiento_5: 'Compruebe programa, procedimientos, frecuencias, productos, concentraciones, responsables y registros de limpieza y desinfección de áreas, equipos y utensilios.',
  saneamiento_6: 'Verifique que el plan de saneamiento y sus registros estén vigentes, disponibles, diligenciados y permitan evidenciar seguimiento a agua, residuos, plagas y limpieza.',
};

function _aspecto(id, texto, norma) {
  return { id, texto, norma, detalle: PSB_DETALLES[id] || '', criterio: null, evaluacion: null, hallazgo: '', accion: '', obs: '', obs_editada: false, cumple_requerimientos: null, estado: null, fotografias: [], hallazgo_critico: false, plazo: null };
}

function getPSBAspectoDetalle(id) { return PSB_DETALLES[id] || ''; }

function getPSBPrograms() {
  return [
    { id: 'edificacion', codigo: 'EDI', nombre: 'Edificación e Instalaciones', peso: PSB_PESOS.edificacion, peso_critico: true, aspectos: [
      _aspecto('edificacion_1', 'Localización y diseño.', 'Resolución 2674/2013, arts. 5–7 y 32–33.'),
      _aspecto('edificacion_2', 'Condiciones de pisos y paredes.', 'Resolución 2674/2013, art. 7 y art. 33.'),
      _aspecto('edificacion_3', 'Techos, iluminación y ventilación.', 'Resolución 2674/2013, art. 7 y art. 33.'),
      _aspecto('edificacion_4', 'Instalaciones sanitarias.', 'Resolución 2674/2013, arts. 6, 32 y 33.'),
    ] },
    { id: 'equipos', codigo: 'EQU', nombre: 'Equipos y Utensilios', peso: PSB_PESOS.equipos, peso_critico: true, aspectos: [
      _aspecto('equipos_1', 'Condiciones de equipos y utensilios.', 'Resolución 2674/2013, arts. 8–10 y 34.'),
      _aspecto('equipos_2', 'Superficies de contacto con el alimento.', 'Resolución 2674/2013, arts. 8–10, 34 y 35.'),
    ] },
    { id: 'personal', codigo: 'PER', nombre: 'Personal Manipulador de Alimentos', peso: PSB_PESOS.personal, peso_critico: true, aspectos: [
      _aspecto('personal_1', 'Estado de salud (signos y lesiones).', 'Resolución 2674/2013, arts. 11 y 14.'),
      _aspecto('personal_2', 'Reconocimiento médico.', 'Resolución 2674/2013, art. 11.'),
      _aspecto('personal_3', 'Prácticas higiénicas.', 'Resolución 2674/2013, arts. 14, 35 y 36.'),
      _aspecto('personal_4', 'Educación y capacitación.', 'Resolución 2674/2013, arts. 12, 13 y 36.'),
    ] },
    { id: 'higienicos', codigo: 'HIG', nombre: 'Requisitos Higiénicos', peso: PSB_PESOS.higienicos, peso_critico: true, aspectos: [
      _aspecto('higienicos_1', 'Control de materias primas e insumos.', 'Resolución 2674/2013, arts. 16 y 35.'),
      _aspecto('higienicos_2', 'Prevención de contaminación cruzada.', 'Resolución 2674/2013, arts. 16, 18, 20 y 35.'),
      _aspecto('higienicos_3', 'Manejo de temperaturas.', 'Ley 9/1979 y Resolución 2674/2013, art. 18.'),
      _aspecto('higienicos_4', 'Condiciones de almacenamiento.', 'Resolución 2674/2013, arts. 16 y 33.'),
    ] },
    { id: 'saneamiento', codigo: 'SAN', nombre: 'Saneamiento', peso: PSB_PESOS.saneamiento, peso_critico: true, aspectos: [
      _aspecto('saneamiento_1', 'Suministro y calidad de agua potable.', 'Resolución 2674/2013, arts. 6, 26 y 32. Decreto 1575/2007 y Resolución 2115/2007, cuando aplique.'),
      _aspecto('saneamiento_2', 'Manejo de residuos líquidos.', 'Resolución 2674/2013, arts. 6 y 32.'),
      _aspecto('saneamiento_3', 'Manejo de residuos sólidos.', 'Resolución 2674/2013, arts. 6, 18 y 33.'),
      _aspecto('saneamiento_4', 'Control integral de plagas.', 'Resolución 2674/2013, art. 26.'),
      _aspecto('saneamiento_5', 'Limpieza y desinfección de áreas, equipos y utensilios.', 'Resolución 2674/2013, arts. 6 y 26.'),
      _aspecto('saneamiento_6', 'Soportes documentales de saneamiento.', 'Resolución 2674/2013, art. 26.'),
    ] },
  ];
}

function crearInspeccion(establecimiento, profesional) {
  const ahora = new Date();
  return { id: 'psb-' + ahora.getTime() + '-' + Math.random().toString(36).slice(2, 8), fase_phva: 'P', establecimiento: { ...establecimiento }, inspeccion: { inspector: profesional || '', fecha: ahora.toISOString().split('T')[0], hora_inicio: ahora.toTimeString().slice(0, 5), hora_fin: null, numero_acta: 'PSB-' + ahora.getFullYear() + '-' + String(ahora.getTime()).slice(-4) }, programas: getPSBPrograms(), estado_general: null, hallazgos_criticos: [], score: { A: 0, I: 0, NA: 0, total: 0, pct_cumplimiento: 0 }, creado_en: ahora.toISOString(), actualizado_en: ahora.toISOString(), version_app: '2.0.0' };
}
