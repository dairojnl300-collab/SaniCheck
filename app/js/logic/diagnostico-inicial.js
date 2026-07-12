// diagnostico-inicial.js — Perfil Sanitario Inicial (Diagnóstico) por establecimiento (localStorage)
// Igual patrón que checklist-config.js: se asocia al nit/nombre, no a la inspección.

const DiagnosticoInicial = (() => {

  const ITEMS = [
    {
      id: 'di_01',
      texto: 'Infraestructura física (pisos, paredes, techos)',
      norma: 'Dec. 3075/1997 Art. 8',
      descripcion: 'Evalúe si pisos, paredes y techos están en buen estado, son impermeables, sin grietas ni desprendimientos, y fáciles de limpiar.',
    },
    {
      id: 'di_02',
      texto: 'Iluminación y ventilación',
      norma: 'Dec. 3075/1997 Art. 10',
      descripcion: 'Verifique iluminación adecuada en zonas de trabajo y ventilación suficiente sin olores cruzados ni acumulación de humedad.',
    },
    {
      id: 'di_03',
      texto: 'Abastecimiento de agua potable',
      norma: 'Dec. 1575/2007 Art. 2',
      descripcion: 'Confirme que el agua para consumo humano proviene de fuente autorizada, con suministro continuo y puntos de entrega identificados.',
    },
    {
      id: 'di_04',
      texto: 'Sistema de alcantarillado y desagües',
      norma: 'Dec. 1575/2007 Art. 15',
      descripcion: 'Revise que desagües, sifones y rejillas funcionen correctamente, sin obstrucciones, retornos ni malos olores.',
    },
    {
      id: 'di_05',
      texto: 'Almacenamiento de alimentos',
      norma: 'Res. 2674/2013 Cap. III',
      descripcion: 'Compruebe separación crudo/cocido, temperaturas de conservación, rotación PEPS y ausencia de productos vencidos o sin rotular.',
    },
    {
      id: 'di_06',
      texto: 'Equipos y utensilios',
      norma: 'Dec. 3075/1997 Art. 12',
      descripcion: 'Evalúe estado, limpieza y material de equipos y utensilios en contacto con alimentos; deben ser de fácil higienización.',
    },
    {
      id: 'di_07',
      texto: 'Manejo de residuos sólidos',
      norma: 'Dec. 2981/2013',
      descripcion: 'Verifique segregación en origen, recipientes identificados, área de almacenamiento temporal y retiro oportuno por recolector autorizado.',
    },
    {
      id: 'di_08',
      texto: 'Control de plagas',
      norma: 'Dec. 3075/1997 Anexo III',
      descripcion: 'Revise medidas preventivas, contrato de fumigación vigente y ausencia de evidencia activa de roedores, insectos o excrementos.',
    },
    {
      id: 'di_09',
      texto: 'Servicios sanitarios del personal',
      norma: 'Ley 9/1979 Art. 148',
      descripcion: 'Compruebe baños en cantidad suficiente, con agua, jabón, papel y señalización; deben mantenerse limpios y en buen estado.',
    },
    {
      id: 'di_10',
      texto: 'Higiene del personal manipulador',
      norma: 'NTC 5093',
      descripcion: 'Verifique dotación de uniformes limpios, cofias, calzado cerrado, uñas cortas y cumplimiento de lavado de manos al inicio y durante la jornada.',
    },
    {
      id: 'di_11',
      texto: 'Documentación y registros',
      norma: 'Dec. 3075/1997 Art. 4',
      descripcion: 'Confirme existencia y actualización de POE, registros de limpieza, capacitaciones, fichas técnicas y documentos exigidos por la norma.',
    },
    {
      id: 'di_12',
      texto: 'Línea de servicio (self-service / bandejas)',
      norma: 'Res. 2674/2013 Art. 22',
      descripcion: 'Evalúe protección de alimentos expuestos, temperatura de mantenimiento, utensilios de porcionado y flujo del comensal sin contaminación cruzada.',
    },
    {
      id: 'di_13',
      texto: 'Transporte de alimentos entre sedes (si aplica)',
      norma: 'Dec. 3075/1997 Art. 34',
      descripcion: 'Si hay transporte, verifique vehículo autorizado, temperatura controlada, separación de cargas y limpieza del contenedor o isotermo.',
    },
  ];

  function _key(est) {
    const id = (est && (est.nit || est.nombre)) || 'default';
    return 'diagnostico_' + String(id).replace(/[^a-zA-Z0-9]/g, '_');
  }

  function _vacio() {
    return ITEMS.map(it => ({ id: it.id, condicion: '', calificacion: '', accion: '', prioridad: '' }));
  }

  function getDiagnostico(est) {
    try {
      const raw = localStorage.getItem(_key(est));
      if (raw) return JSON.parse(raw);
    } catch {}
    return { items: _vacio(), actualizado_en: null };
  }

  function saveDiagnostico(est, items) {
    const data = { items, actualizado_en: new Date().toISOString() };
    localStorage.setItem(_key(est), JSON.stringify(data));
    return data;
  }

  function contarCompletados(items) {
    return items.filter(it => it.calificacion).length;
  }

  return { ITEMS, getDiagnostico, saveDiagnostico, contarCompletados };
})();
