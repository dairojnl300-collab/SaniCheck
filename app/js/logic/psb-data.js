// Catálogo operativo PSB: adaptación ECODESA de 20 aspectos del instructivo.
// Cinco bloques y pesos redistribuidos proporcionalmente a 100%.

const PSB_PESOS = { edificacion: 11.1, equipos: 11.1, personal: 22.2, higienicos: 22.2, saneamiento: 33.3 };

function _aspecto(id, texto, norma) {
  return { id, texto, norma, criterio: null, evaluacion: null, hallazgo: '', accion: '', obs: '', obs_editada: false, cumple_requerimientos: null, estado: null, fotografias: [], hallazgo_critico: false, plazo: null };
}

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
