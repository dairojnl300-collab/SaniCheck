// planificar.js — Pantalla PLANIFICAR: formulario datos establecimiento

const Planificar = (() => {

  let _diagOpen  = false;
  let _diagItems = null;
  let _diagEst   = null;

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
      </form>
      <div id="diagnostico-card">${_renderDiagnosticoCard()}</div>
      <div style="height:32px"></div>`;
  }

  function _currentEst() {
    return { nombre: _val('inp-nombre'), nit: _val('inp-nit') };
  }

  function _renderDiagnosticoCard() {
    const est   = _diagEst || _currentEst();
    const items = _diagItems || DiagnosticoInicial.getDiagnostico(est).items;
    const completados = DiagnosticoInicial.contarCompletados(items);
    const badgeText = completados === 0 ? 'Pendiente'
                     : completados === 13 ? 'Completado'
                     : `${completados} de 13 completados`;
    const badgeCls = completados === 13 ? 'estado-chip estado-B'
                    : completados > 0 ? 'estado-chip estado-R'
                    : '';

    return `
      <div class="card" style="margin:0 var(--sp-md) var(--sp-md) var(--sp-md);">
        <div onclick="Planificar.toggleDiagnostico()"
          style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;gap:8px;">
          <div>
            <div style="font-size:var(--text-base);font-weight:700;color:var(--color-ink);">
              Perfil Sanitario Inicial (Diagnóstico)</div>
            <div class="norma-badge" style="margin-top:6px;margin-bottom:0;">
              📋 Res. 2674/2013 · Dec. 3075/1997 · Dec. 1575/2007 · Ley 9/1979</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            <span class="${badgeCls}"
              style="${badgeCls ? '' : 'display:inline-flex;align-items:center;padding:3px 10px;border-radius:var(--radius-full);font-size:var(--text-xs);font-weight:700;letter-spacing:0.04em;background:var(--color-border);color:var(--color-ink3);'}">${badgeText}</span>
            <span style="font-size:12px;color:var(--color-ink3);">${_diagOpen ? '▲' : '▼'}</span>
          </div>
        </div>
        ${_diagOpen ? _renderDiagnosticoBody(items) : ''}
      </div>`;
  }

  function _renderDiagnosticoBody(items) {
    return `
      <div style="margin-top:var(--sp-md);padding-top:var(--sp-md);border-top:1px solid var(--color-border);">
        ${DiagnosticoInicial.ITEMS.map((def, i) => {
          const it = items[i];
          return `
          <div style="padding-bottom:var(--sp-md);margin-bottom:var(--sp-md);border-bottom:1px dashed var(--color-border);">
            <div style="font-size:var(--text-sm);font-weight:700;color:var(--color-ink);margin-bottom:8px;">
              ${i + 1}. ${_escAttr(def.texto)}</div>

            <label class="form-label" for="di-cond-${def.id}">Condición encontrada</label>
            <input class="form-input" type="text" id="di-cond-${def.id}" value="${_escAttr(it.condicion)}"
              onchange="Planificar.actualizarDiagItem('${def.id}','condicion',this.value)" style="margin-bottom:8px;">

            <label class="form-label" for="di-calif-${def.id}">Calificación</label>
            <select class="form-select" id="di-calif-${def.id}" style="margin-bottom:8px;"
              onchange="Planificar.actualizarDiagItem('${def.id}','calificacion',this.value)">
              <option value="" ${!it.calificacion ? 'selected' : ''}>Seleccionar…</option>
              <option value="B" ${it.calificacion === 'B' ? 'selected' : ''}>Bueno</option>
              <option value="R" ${it.calificacion === 'R' ? 'selected' : ''}>Regular</option>
              <option value="D" ${it.calificacion === 'D' ? 'selected' : ''}>Deficiente</option>
            </select>

            <label class="form-label" for="di-accion-${def.id}">Acción requerida</label>
            <input class="form-input" type="text" id="di-accion-${def.id}" value="${_escAttr(it.accion)}"
              onchange="Planificar.actualizarDiagItem('${def.id}','accion',this.value)" style="margin-bottom:8px;">

            <label class="form-label" for="di-prio-${def.id}">Prioridad</label>
            <select class="form-select" id="di-prio-${def.id}"
              onchange="Planificar.actualizarDiagItem('${def.id}','prioridad',this.value)">
              <option value="" ${!it.prioridad ? 'selected' : ''}>Seleccionar…</option>
              <option value="Alta" ${it.prioridad === 'Alta' ? 'selected' : ''}>Alta</option>
              <option value="Media" ${it.prioridad === 'Media' ? 'selected' : ''}>Media</option>
              <option value="Baja" ${it.prioridad === 'Baja' ? 'selected' : ''}>Baja</option>
            </select>
          </div>`;
        }).join('')}
        <button type="button" class="btn btn-primary" onclick="Planificar.guardarDiagnostico()">
          Guardar diagnóstico</button>
        <div style="margin-top:var(--sp-sm);font-size:var(--text-xs);color:var(--color-ink3);text-align:justify;">
          Este diagnóstico debe actualizarse anualmente o tras cambios significativos en infraestructura o procesos.
        </div>
      </div>`;
  }

  function toggleDiagnostico() {
    if (!_diagOpen && !_diagItems) {
      _diagEst   = _currentEst();
      _diagItems = DiagnosticoInicial.getDiagnostico(_diagEst).items;
    }
    _diagOpen = !_diagOpen;
    _refreshDiagCard();
  }

  function actualizarDiagItem(id, campo, valor) {
    if (!_diagItems) return;
    const it = _diagItems.find(x => x.id === id);
    if (it) it[campo] = valor;
    if (campo === 'calificacion') _refreshDiagCard();
  }

  function guardarDiagnostico() {
    if (!_diagItems) return;
    _diagEst = _currentEst();
    DiagnosticoInicial.saveDiagnostico(_diagEst, _diagItems);
    Router.toast('✓ Diagnóstico guardado');
    _refreshDiagCard();
  }

  function _refreshDiagCard() {
    const el = document.getElementById('diagnostico-card');
    if (el) el.innerHTML = _renderDiagnosticoCard();
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

  function _val(id) {
    return document.getElementById(id)?.value.trim() || '';
  }

  function _escAttr(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { render, attach, toggleDiagnostico, actualizarDiagItem, guardarDiagnostico };
})();
