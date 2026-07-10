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
          <label class="form-label" for="inp-nombre">Nombre / Razón Social *</label>
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
          <label class="form-label" for="inp-barrio">Barrio / Localidad</label>
          <input class="form-input" type="text" id="inp-barrio"
            placeholder="Ej: Bocagrande">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-ciudad">Ciudad / Municipio</label>
          <input class="form-input" type="text" id="inp-ciudad"
            placeholder="Ej: Cartagena de Indias">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-telefono">Teléfono / WhatsApp</label>
          <input class="form-input" type="tel" id="inp-telefono"
            placeholder="Ej: 300 123 4567" inputmode="tel">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-correo">Correo electrónico</label>
          <input class="form-input" type="email" id="inp-correo"
            placeholder="Ej: contacto@empresa.com">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-representante">Representante Legal</label>
          <input class="form-input" type="text" id="inp-representante"
            placeholder="Nombre del representante legal">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-ciiu">Actividad Económica (CIIU)</label>
          <input class="form-input" type="text" id="inp-ciiu"
            placeholder="Ej: 5610 - Expendio a la mesa">
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
            <option value="Comedor industrial">Comedor industrial</option>
            <option value="Casino">Casino</option>
            <option value="Catering">Catering</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-turnos">Turnos de producción</label>
          <input class="form-input" type="text" id="inp-turnos"
            placeholder="Ej: Mañana y tarde">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-raciones">Volumen diario de raciones servidas</label>
          <input class="form-input" type="number" id="inp-raciones"
            placeholder="Ej: 500" inputmode="numeric" min="0">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-empresa-cliente">Empresa cliente / contratante</label>
          <input class="form-input" type="text" id="inp-empresa-cliente"
            placeholder="Ej: Industrias del Caribe S.A.S.">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-concepto-sanitario">Concepto sanitario vigente</label>
          <select class="form-select" id="inp-concepto-sanitario">
            <option value="">Seleccionar…</option>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
            <option value="En trámite">En trámite</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-fecha-elaboracion">Fecha de elaboración</label>
          <input class="form-input" type="date" id="inp-fecha-elaboracion" value="${_hoy()}">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-fecha-vigencia">Fecha de vigencia</label>
          <input class="form-input" type="date" id="inp-fecha-vigencia">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-version-doc">Versión del documento</label>
          <input class="form-input" type="text" id="inp-version-doc" value="1.0">
        </div>

        <div class="form-label" style="margin-top:var(--sp-md);font-weight:700;">Datos de la inspección</div>
        <div class="form-group">
          <label class="form-label" for="inp-responsable">Administrador / Responsable PSB</label>
          <input class="form-input" type="text" id="inp-responsable"
            placeholder="Nombre del administrador / responsable PSB">
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
      barrio: val('inp-barrio'),
      ciudad: val('inp-ciudad'),
      correo: val('inp-correo'),
      representante_legal: val('inp-representante'),
      actividad_ciiu: val('inp-ciiu'),
      turnos_produccion: val('inp-turnos'),
      volumen_raciones: val('inp-raciones'),
      empresa_cliente: val('inp-empresa-cliente'),
      concepto_sanitario: val('inp-concepto-sanitario'),
      fecha_elaboracion: val('inp-fecha-elaboracion'),
      fecha_vigencia: val('inp-fecha-vigencia'),
      version_documento: val('inp-version-doc'),
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
