// vencimientos.js — Control de Vencimientos (examen médico, mantenimiento equipos) por establecimiento (localStorage)
// Igual patrón que diagnostico-inicial.js: se asocia al nit/nombre, no a la inspección.

const Vencimientos = (() => {

  function _key(est) {
    const id = (est && (est.nit || est.nombre)) || 'default';
    return 'vencimientos_' + String(id).replace(/[^a-zA-Z0-9]/g, '_');
  }

  function _vacio() {
    return { examen_medico_fecha: '', mantenimiento_fecha: '', actualizado_en: null };
  }

  function getVencimientos(est) {
    try {
      const raw = localStorage.getItem(_key(est));
      if (raw) return JSON.parse(raw);
    } catch {}
    return _vacio();
  }

  function saveVencimientos(est, data) {
    const out = {
      examen_medico_fecha: data.examen_medico_fecha || '',
      mantenimiento_fecha: data.mantenimiento_fecha || '',
      actualizado_en: new Date().toISOString(),
    };
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

  return { getVencimientos, saveVencimientos, estado };
})();
