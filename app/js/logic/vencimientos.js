// vencimientos.js — Control de Vencimientos por establecimiento (localStorage)
// Personal: soportes personales · Equipos: soportes de equipos · Decreto 1072/2015

const Vencimientos = (() => {

  const NORMA_BASE = 'Decreto 1072 de 2015';

  const ITEMS = [
    { id: 'cedula_fecha', grupo: 'personal', label: 'Cédula de ciudadanía',
      campoLabel: 'Fecha de vencimiento', tipoFecha: 'vencimiento', meses: 0,
      norma: NORMA_BASE, archivoLabel: 'Soporte — cédula escaneada' },
    { id: 'carne_fecha', grupo: 'personal', label: 'Carné de manipulador de alimentos',
      campoLabel: 'Fecha de vencimiento', tipoFecha: 'vencimiento', meses: 0,
      norma: 'Resolución 2674 de 2013', archivoLabel: 'Soporte — carné vigente' },
    { id: 'examen_medico_fecha', grupo: 'personal', label: 'Examen médico del personal manipulador',
      campoLabel: 'Fecha del último examen', tipoFecha: 'ultimo', meses: 12,
      norma: 'Resolución 2674 de 2013', archivoLabel: 'Soporte — certificado médico' },
    { id: 'certificado_manipulacion_fecha', grupo: 'personal', label: 'Certificado de manipulación de alimentos',
      campoLabel: 'Fecha del certificado', tipoFecha: 'vencimiento', meses: 0,
      norma: 'Resolución 2674 de 2013', archivoLabel: 'Soporte — certificado vigencia' },
    { id: 'capacitacion_bpm_fecha', grupo: 'personal', label: 'Capacitación del personal en BPM',
      campoLabel: 'Fecha de la última capacitación', tipoFecha: 'ultimo', meses: 12,
      norma: 'Decreto 3075 de 1997, Art. 11', archivoLabel: 'Soporte — certificado capacitación' },
    { id: 'frotis_fecha', grupo: 'personal', label: 'Frotis de manos y superficies',
      campoLabel: 'Fecha del último frotis', tipoFecha: 'ultimo', meses: 3,
      norma: 'Decreto 3075 de 1997', archivoLabel: 'Soporte — informe de laboratorio' },

    { id: 'mantenimiento_fecha', grupo: 'equipos', label: 'Mantenimiento preventivo equipos de frío',
      campoLabel: 'Fecha del último mantenimiento', tipoFecha: 'ultimo', meses: 3,
      norma: 'Decreto 3075 de 1997', archivoLabel: 'Soporte — orden de mantenimiento' },
    { id: 'factura_equipo_fecha', grupo: 'equipos', label: 'Factura / soporte de compra de equipo',
      campoLabel: 'Fecha de expedición', tipoFecha: 'ultimo', meses: 60,
      norma: NORMA_BASE, archivoLabel: 'Soporte — factura o remisión' },
    { id: 'manual_equipo_fecha', grupo: 'equipos', label: 'Manual de operación del equipo',
      campoLabel: 'Fecha de última actualización', tipoFecha: 'ultimo', meses: 24,
      norma: NORMA_BASE, archivoLabel: 'Soporte — manual digitalizado' },
    { id: 'calibracion_fecha', grupo: 'equipos', label: 'Certificado de calibración',
      campoLabel: 'Fecha del certificado', tipoFecha: 'vencimiento', meses: 0,
      norma: NORMA_BASE, archivoLabel: 'Soporte — certificado calibración' },
    { id: 'microbiologico_agua_fecha', grupo: 'equipos', label: 'Análisis microbiológico de agua',
      campoLabel: 'Fecha del último análisis', tipoFecha: 'ultimo', meses: 6,
      norma: 'Resolución 2115 de 2007', archivoLabel: 'Soporte — informe análisis' },
    { id: 'fisicoquimico_agua_fecha', grupo: 'equipos', label: 'Análisis fisicoquímico de agua',
      campoLabel: 'Fecha del último análisis', tipoFecha: 'ultimo', meses: 12,
      norma: 'Resolución 2115 de 2007', archivoLabel: 'Soporte — informe análisis' },
    { id: 'fumigacion_fecha', grupo: 'equipos', label: 'Certificado de fumigación / control de plagas',
      campoLabel: 'Fecha del último certificado', tipoFecha: 'ultimo', meses: 3,
      norma: 'Resolución 2674 de 2013', archivoLabel: 'Soporte — certificado fumigación' },
  ];

  const GRUPOS = {
    personal: { label: 'Personal', desc: 'Soportes personales: cédula, carné y certificados de vigencia.' },
    equipos:  { label: 'Equipos',  desc: 'Soportes de equipos: facturas, manuales y certificados de calibración.' },
  };

  function _key(est) {
    const id = (est && (est.nit || est.nombre)) || 'default';
    return 'vencimientos_' + String(id).replace(/[^a-zA-Z0-9]/g, '_');
  }

  function _archivoKey(itemId) { return itemId.replace(/_fecha$/, '') + '_archivo'; }

  function _vacio() {
    const out = { actualizado_en: null };
    ITEMS.forEach(it => {
      out[it.id] = '';
      out[_archivoKey(it.id)] = null;
    });
    return out;
  }

  function _mergeStored(raw) {
    const base = _vacio();
    Object.keys(raw).forEach(k => {
      if (k === 'actualizado_en') base.actualizado_en = raw.actualizado_en;
      else if (Object.prototype.hasOwnProperty.call(base, k)) base[k] = raw[k];
      else if (k.endsWith('_archivo')) base[k] = raw[k];
    });
    return base;
  }

  function getVencimientos(est) {
    try {
      const raw = localStorage.getItem(_key(est));
      if (raw) return _mergeStored(JSON.parse(raw));
    } catch {}
    return _vacio();
  }

  function saveVencimientos(est, data) {
    const out = { actualizado_en: new Date().toISOString() };
    ITEMS.forEach(it => {
      out[it.id] = data[it.id] || '';
      const ak = _archivoKey(it.id);
      out[ak] = data[ak] || null;
    });
    localStorage.setItem(_key(est), JSON.stringify(out));
    return out;
  }

  function getArchivo(data, itemId) {
    return data[_archivoKey(itemId)] || null;
  }

  function setArchivo(data, itemId, archivo) {
    data[_archivoKey(itemId)] = archivo;
    return data;
  }

  function periodicidadTexto(it) {
    if (it.tipoFecha === 'vencimiento') return 'Según fecha de vencimiento';
    if (it.meses === 12) return 'Anual';
    if (it.meses % 12 === 0) return `Cada ${it.meses / 12} años`;
    return `Cada ${it.meses} meses`;
  }

  function estado(fecha, item) {
    if (!fecha) return { proximo: null, estado: 'sin_registrar', dias: null };
    const hoy = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00');
    let proximo;
    if (item.tipoFecha === 'vencimiento') {
      proximo = new Date(fecha + 'T00:00:00');
    } else {
      proximo = new Date(fecha + 'T00:00:00');
      proximo.setMonth(proximo.getMonth() + item.meses);
    }
    const dias = Math.round((proximo - hoy) / 86400000);
    let est_ = 'vigente';
    if (dias < 0) est_ = 'vencido';
    else if (dias <= 30) est_ = 'por_vencer';
    return { proximo: proximo.toISOString().split('T')[0], estado: est_, dias };
  }

  function itemsGrupo(grupo) { return ITEMS.filter(it => it.grupo === grupo); }

  function resumenGrupo(data, grupo) {
    const items = itemsGrupo(grupo);
    const estados = items.map(it => estado(data[it.id], it).estado);
    if (estados.includes('vencido')) return 'vencido';
    if (estados.includes('por_vencer')) return 'por_vencer';
    if (estados.every(e => e === 'sin_registrar')) return 'sin_registrar';
    return 'vigente';
  }

  return {
    ITEMS, GRUPOS, NORMA_BASE,
    getVencimientos, saveVencimientos,
    getArchivo, setArchivo,
    estado, periodicidadTexto, itemsGrupo, resumenGrupo,
  };
})();
