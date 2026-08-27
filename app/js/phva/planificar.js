// planificar.js — Pantalla PLANIFICAR: formulario datos establecimiento

const Planificar = (() => {

  function render() {
    return `
      <img src="assets/icons/isotipo-transparente.png" class="watermark-bg" alt="">
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
          <label class="form-label" for="inp-direccion">Dirección *</label>
          <input class="form-input" type="text" id="inp-direccion"
            placeholder="Ej: Cra. 10 # 20-30, Cartagena" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-responsable">Responsable / Contacto</label>
          <input class="form-input" type="text" id="inp-responsable"
            placeholder="Nombre del responsable">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-contacto">Teléfono / correo de contacto</label>
          <input class="form-input" type="text" id="inp-contacto"
            placeholder="Ej: 300 123 4567">
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
    const direccion = val('inp-direccion');

    if (!nombre || !direccion) {
      Router.toast('⚠ Complete los campos obligatorios (*)');
      return;
    }

    const establecimiento = {
      nombre, direccion,
      responsable: val('inp-responsable'),
      contacto:    val('inp-contacto'),
    };
    const fecha = val('inp-fecha') || _hoy();

    const inspeccion = crearInspeccion(establecimiento);
    inspeccion.inspeccion.fecha = fecha;

    Store.upsertInspeccion(inspeccion);
    Store.setUI({ aspectoIdx: 0, programaIdx: 0 });
    Router.toast('✓ Establecimiento guardado');
    Router.go('hacer');
  }

  function _hoy() {
    return new Date().toISOString().split('T')[0];
  }

  return { render, attach };
})();
