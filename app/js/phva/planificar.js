// planificar.js — Pantalla PLANIFICAR: formulario datos establecimiento

const Planificar = (() => {

  function render() {
    return `
      <div class="screen-header">
        <div class="screen-fase-badge badge-P">📋 PLANIFICAR</div>
        <div class="screen-title">Nuevo Establecimiento</div>
        <div class="screen-subtitle">Complete los datos para iniciar la inspección PSB</div>
      </div>
      <form class="form-screen" id="form-planificar" novalidate>
        <div class="form-group">
          <label class="form-label" for="inp-nombre">Nombre del establecimiento *</label>
          <input class="form-input" type="text" id="inp-nombre"
            placeholder="Ej: Restaurante El Rincón Costeño" autocomplete="organization" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-nit">NIT / CC Propietario *</label>
          <input class="form-input" type="text" id="inp-nit"
            placeholder="Ej: 800.123.456-7" inputmode="numeric" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-direccion">Dirección *</label>
          <input class="form-input" type="text" id="inp-direccion"
            placeholder="Ej: Cra. 10 # 20-30, Cartagena" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-tipo">Tipo de establecimiento *</label>
          <select class="form-select" id="inp-tipo" required>
            <option value="">Seleccionar tipo…</option>
            <option value="Alimentos">Restaurante / Comedor / Alimentos</option>
            <option value="Manufactura">Planta de Manufactura</option>
            <option value="Bodega">Bodega / Almacén</option>
            <option value="Servicio">Servicios</option>
            <option value="Educativo">Institución Educativa</option>
            <option value="Salud">Clínica / Centro de Salud</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-responsable">Responsable sanitario</label>
          <input class="form-input" type="text" id="inp-responsable"
            placeholder="Nombre del responsable sanitario">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-telefono">Teléfono de contacto</label>
          <input class="form-input" type="tel" id="inp-telefono"
            placeholder="Ej: 300 123 4567" inputmode="tel">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-inspector">Profesional *</label>
          <input class="form-input" type="text" id="inp-inspector"
            value="Ing. Ambiental" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-fecha">Fecha de inspección</label>
          <input class="form-input" type="date" id="inp-fecha" value="${_hoy()}" required>
        </div>
        <button type="submit" class="btn btn-primary" style="margin-top:8px;">
          Iniciar Ciclo PHVA →
        </button>
        <div style="height:32px"></div>
      </form>`;
  }

  function attach() {
    const form = document.getElementById('form-planificar');
    if (form) form.addEventListener('submit', _submit);
  }

  function _submit(e) {
    e.preventDefault();
    const val = id => document.getElementById(id)?.value.trim() || '';

    const nombre    = val('inp-nombre');
    const nit       = val('inp-nit');
    const direccion = val('inp-direccion');
    const tipo      = val('inp-tipo');

    if (!nombre || !nit || !direccion || !tipo) {
      Router.toast('⚠ Complete los campos obligatorios (*)');
      return;
    }

    const establecimiento = {
      nombre, nit, direccion, tipo,
      responsable_sanitario: val('inp-responsable'),
      telefono: val('inp-telefono'),
    };
    const inspector = val('inp-inspector') || 'Ing. Ambiental';
    const fecha     = val('inp-fecha') || _hoy();

    const inspeccion = crearInspeccion(establecimiento, inspector);
    inspeccion.inspeccion.fecha = fecha;

    Store.upsertInspeccion(inspeccion);
    Store.setUI({ aspectoIdx: 0, programaIdx: 0 });
    Router.toast('✓ Establecimiento guardado');
    Router.go('personalizar');
  }

  function _hoy() {
    return new Date().toISOString().split('T')[0];
  }

  return { render, attach };
})();
