// vencimientos.js — Control de Vencimientos (8 ítems normativos) por establecimiento (localStorage)
// Igual patrón que diagnostico-inicial.js: se asocia al nit/nombre, no a la inspección.

const Vencimientos = (() => {

  const ITEMS = [
    { id: 'examen_medico_fecha', label: 'Examen médico del personal manipulador',
      campoLabel: 'Fecha del último examen', norma: 'Resolución 2674 de 2013', meses: 12 },
    { id: 'mantenimiento_fecha', label: 'Mantenimiento preventivo equipos de frío',
      campoLabel: 'Fecha del último mantenimiento', norma: 'Decreto 3075 de 1997', meses: 3 },
    { id: 'certificado_manipulacion_fecha', label: 'Certificado de manipulación de alimentos',
      campoLabel: 'Fecha del último certificado', norma: 'Resolución 2674 de 2013', meses: 12 },
    { id: 'microbiologico_agua_fecha', label: 'Análisis microbiológico de agua (coliformes/E. coli)',
      campoLabel: 'Fecha del último análisis', norma: 'Resolución 2115 de 2007', meses: 6 },
    { id: 'fisicoquimico_agua_fecha', label: 'Análisis fisicoquímico de agua (nitratos)',
      campoLabel: 'Fecha del último análisis', norma: 'Resolución 2115 de 2007', meses: 12 },
    { id: 'fumigacion_fecha', label: 'Certificado de fumigación / control de plagas',
      campoLabel: 'Fecha del último certificado', norma: 'Resolución 2674 de 2013', meses: 3 },
    { id: 'frotis_fecha', label: 'Frotis de manos y superficies (control microbiológico)',
      campoLabel: 'Fecha del último frotis', norma: 'Decreto 3075 de 1997', meses: 3 },
    { id: 'capacitacion_bpm_fecha', label: 'Capacitación del personal en BPM',
      campoLabel: 'Fecha de la última capacitación', norma: 'Decreto 3075 de 1997, Art. 11', meses: 12 },
  ];

  function _key(est) {
    const id = (est && (est.nit || est.nombre)) || 'default';
    return 'vencimientos_' + String(id).replace(/[^a-zA-Z0-9]/g, '_');
  }

  function _vacio() {
    const out = { actualizado_en: null };
    ITEMS.forEach(it => { out[it.id] = ''; });
    return out;
  }

  function getVencimientos(est) {
    try {
      const raw = localStorage.getItem(_key(est));
      if (raw) return { ..._vacio(), ...JSON.parse(raw) };
    } catch {}
    return _vacio();
  }

  function saveVencimientos(est, data) {
    const out = { actualizado_en: new Date().toISOString() };
    ITEMS.forEach(it => { out[it.id] = data[it.id] || ''; });
    localStorage.setItem(_key(est), JSON.stringify(out));
    return out;
  }

  function estado(fecha, mesesVigencia) {
    if (!fecha) return { proximo: null, estado: 'sin_registrar', dias: null };
    const proximo = new Date(fecha + 'T00:00:00');
    proximo.setMonth(proximo.getMonth() + mesesVigencia);
    const hoy = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00');
    const dias = Math.round((proximo - hoy) / 86400000);
    let est_ = 'vigente';
    if (dias < 0) est_ = 'vencido';
    else if (dias <= 30) est_ = 'por_vencer';
    return { proximo: proximo.toISOString().split('T')[0], estado: est_, dias };
  }

  return { ITEMS, getVencimientos, saveVencimientos, estado };
})();
