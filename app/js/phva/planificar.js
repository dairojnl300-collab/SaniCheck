// planificar.js — Pantalla PLANIFICAR: acordeón Datos Generales + Diagnóstico

const Planificar = (() => {

  const _ACC_ICON = {
    building: 'building',
    clipboardCheck: 'clipboardCheck',
    listCheck: 'listCheck',
    scale: 'scale',
    calendarTime: 'calendarClock',
  };

  const MARCO_GENERAL = [
    ['Ley 9 de 1979', 'Código Sanitario Nacional', 'General'],
    ['Decreto 1072 de 2015', 'Decreto Único Reglamentario Sector Trabajo', 'SST'],
    ['Resolución 0312 de 2019', 'Estándares mínimos SG-SST', 'SST'],
    ['Resolución 2400 de 1979', 'Estatuto de Seguridad Industrial', 'SST'],
    ['Decreto 1575 de 2007', 'Protección y control calidad del agua', 'Control de agua'],
    ['Resolución 2115 de 2007', 'Características y frecuencias control calidad agua', 'Análisis de agua'],
    ['Decreto 1077 de 2015', 'Agua potable y residuos sólidos', 'Agua/Residuos'],
    ['Resolución 3956 de 2009', 'Norma vertimientos alcantarillado', 'Vertimientos'],
    ['Decreto 3930 de 2010', 'Usos del agua y residuos líquidos', 'Vertimientos'],
    ['Resolución 3079 de 2015', 'Requisitos plaguicidas uso doméstico', 'Control de plagas'],
    ['Resolución 1439 de 2003', 'Requisitos sanitarios plaguicidas', 'Control de plagas'],
    ['Decreto 1843 de 1991', 'Uso y manejo de plaguicidas', 'Control de plagas'],
    ['Resolución 754 de 2014', 'Metodología PGIRS', 'Residuos sólidos'],
    ['Decreto 2981 de 2013', 'Prestación servicio público de aseo', 'Residuos sólidos'],
    ['Ley 1259 de 2008', 'Comparendo ambiental', 'Residuos sólidos'],
    ['Decreto 4741 de 2005', 'Prevención manejo residuos peligrosos', 'RESPEL'],
    ['Ley 99 de 1993', 'Sistema Nacional Ambiental', 'Ambiental general'],
    ['Decreto 2811 de 1974', 'Código Nacional Recursos Naturales', 'Ambiental general'],
  ];
  const _ALIM = [
    ['Decreto 3075 de 1997', 'Buenas Prácticas de Manufactura (BPM)', 'Alimentos'],
    ['Resolución 2674 de 2013', 'Requisitos sanitarios fabricación/expendio alimentos', 'Alimentos'],
    ['NTC 5093', 'Manipulación de alimentos', 'Alimentos'],
    ['Resolución 5109 de 2005', 'Rotulado o etiquetado de alimentos', 'Alimentos'],
  ];
  const MARCO_TIPOS = [
    { key: 'Alimentos', label: 'Restaurante / Comedor / Alimentos', normas: _ALIM },
    { key: 'Casino', label: 'Casino', normas: _ALIM },
    { key: 'Catering', label: 'Catering', normas: [..._ALIM,
      ['Decreto 3075 de 1997 Art. 34-36', 'Transporte de alimentos preparados', 'Transporte'],
      ['Resolución 2674 de 2013 Cap. VII', 'Condiciones de transporte de alimentos', 'Transporte']] },
    { key: 'Manufactura', label: 'Planta de Manufactura', normas: [
      ['Decreto 3075 de 1997', 'BPM (si produce alimentos)', 'Alimentos'],
      ['Resolución 2674 de 2013', 'Requisitos sanitarios (si aplica)', 'Alimentos']] },
    { key: 'Bodega', label: 'Bodega/Almacén', normas: [
      ['Decreto 1843 de 1991', 'Almacenamiento de plaguicidas (si aplica)', 'Control de plagas'],
      ['NTC 1692', 'Almacenamiento mercancías peligrosas (si aplica)', 'Almacenamiento']] },
    { key: 'Salud', label: 'Clínica / Centro de Salud', normas: [
      ['Resolución 1164 de 2002', 'Manejo integral residuos hospitalarios', 'Residuos peligrosos'],
      ['Decreto 4741 de 2005', 'Prevención manejo residuos peligrosos (reforzado)', 'RESPEL'],
      ['Resolución 2183 de 2004', 'Manual de bioseguridad IPS', 'Bioseguridad']] },
    { key: 'Comedor industrial', label: 'Comedor Industrial', normas: _ALIM },
    { key: 'Educativo', label: 'Institución Educativa', normas: [
      ['Decreto 3075 de 1997', 'BPM (si tiene comedor/restaurante escolar)', 'Alimentos'],
      ['Resolución 2674 de 2013', 'Requisitos sanitarios (si aplica)', 'Alimentos'],
      ['Resolución 3803 de 2016', 'Lineamientos PAE (Programa Alimentación Escolar)', 'Alimentación escolar']] },
  ];

  let _generalOpen    = false;
  let _diagOpen       = false;
  let _resultadosOpen = false;
  let _marcoOpen      = false;
  let _vencOpen       = false;
  let _vencV2Tab       = 'personal';
  let _vencV2EditId    = '';
  let _vencTab            = 'personal';
  let _vencFiltroPersonal = '';
  let _vencFiltroEquipos  = '';
  let _vencNotified       = false;
  let _vencReqFormOpen    = false;
  let _marcoOpenSubs  = { general: true };
  let _diagItems      = null;
  let _diagCatalog    = null;
  let _diagEst        = null;
  let _diagIdx        = 0;
  let _diagModalMode  = 'edit';
  let _diagModalCal   = '';
  let _venc           = null;
  let _vencEst        = null;
  let _draftTimer     = null;
  let _diagSaveTimer  = null;

  /** v1 oculto — mantener por compatibilidad de datos existentes, ver ETAPA futura de migración v1→v2 */
  const _VENC_V1_UI = false;

  const FORM_IDS = [
    'inp-nombre', 'inp-nit', 'inp-direccion', 'inp-barrio', 'inp-ciudad', 'inp-telefono',
    'inp-correo', 'inp-representante', 'inp-ciiu', 'inp-tipo', 'inp-turnos', 'inp-raciones',
    'inp-empresa-cliente', 'inp-concepto-sanitario', 'inp-fecha-elaboracion', 'inp-fecha-vigencia',
    'inp-version-doc', 'inp-responsable-cocina', 'inp-responsable', 'inp-inspector', 'inp-fecha',
  ];

  function _draftVal(id) {
    const el = document.getElementById(id);
    if (el && String(el.value || '').trim()) return el.value.trim();
    const draft = Store.getPlanificarDraft();
    return (draft?.form?.[id] || '').trim();
  }

  function _fv(id) { return _escAttr(_draftVal(id)); }

  function _restoreUiFromDraft() {
    const d = Store.getPlanificarDraft();
    if (!d?.ui) return;
    const u = d.ui;
    if (typeof u.generalOpen === 'boolean')    _generalOpen    = u.generalOpen;
    if (typeof u.diagOpen === 'boolean')       _diagOpen       = u.diagOpen;
    if (typeof u.resultadosOpen === 'boolean') _resultadosOpen = u.resultadosOpen;
    if (typeof u.marcoOpen === 'boolean')      _marcoOpen      = u.marcoOpen;
    if (typeof u.vencOpen === 'boolean')       _vencOpen       = u.vencOpen;
    if (u.vencTab)                             _vencTab        = u.vencTab;
    if (typeof u.vencFiltroPersonal === 'string') _vencFiltroPersonal = u.vencFiltroPersonal;
    if (typeof u.vencFiltroEquipos === 'string')  _vencFiltroEquipos  = u.vencFiltroEquipos;
    if (typeof u.diagIdx === 'number')         _diagIdx        = u.diagIdx;
    if (u.marcoOpenSubs)                       _marcoOpenSubs  = { ..._marcoOpenSubs, ...u.marcoOpenSubs };
  }

  function _collectPlanificarDraft() {
    const form = {};
    FORM_IDS.forEach(id => {
      const el = document.getElementById(id);
      form[id] = el ? (el.value || '').trim() : _draftVal(id);
    });
    return {
      form,
      ui: {
        generalOpen: _generalOpen,
        diagOpen: _diagOpen,
        resultadosOpen: _resultadosOpen,
        marcoOpen: _marcoOpen,
        vencOpen: _vencOpen,
        vencTab: _vencTab,
        vencFiltroPersonal: _vencFiltroPersonal,
        vencFiltroEquipos: _vencFiltroEquipos,
        diagIdx: _diagIdx,
        marcoOpenSubs: _marcoOpenSubs,
      },
    };
  }

  function _schedulePlanificarDraft() {
    clearTimeout(_draftTimer);
    _draftTimer = setTimeout(() => {
      Store.savePlanificarDraft(_collectPlanificarDraft());
    }, 500);
  }

  function _persistDiagnostico() {
    if (!_diagItems || !_diagCatalog) return;
    _diagEst = _currentEst();
    const data = DiagnosticoInicial.saveDiagnostico(_diagEst, _diagItems, _diagCatalog);
    _diagItems   = data.items;
    _diagCatalog = data.catalog;
    Store.flush();
  }

  function _scheduleDiagSave() {
    if (!_diagItems) return;
    clearTimeout(_diagSaveTimer);
    _diagSaveTimer = setTimeout(_persistDiagnostico, 500);
  }

  function render() {
    _restoreUiFromDraft();
    _diagEst   = _currentEst();
    const diag = DiagnosticoInicial.getDiagnostico(_diagEst);
    _diagItems   = diag.items;
    _diagCatalog = diag.catalog;
    _diagIdx     = Math.min(_diagIdx, Math.max(0, _diagCatalog.length - 1));
    if (!_venc) {
      _vencEst = _currentEst();
      _venc    = Vencimientos.getVencimientos(_vencEst);
    }

    return `
      <img src="assets/icons/isotipo-transparente.png" class="watermark-bg" alt="">
      <div class="screen-header">
        ${PhvaIcons.badge('P', 'PLANIFICAR')}
        <div class="screen-title">Nuevo Establecimiento</div>
        <div class="screen-subtitle">Complete los datos para iniciar la inspección PSB</div>
      </div>
      <style>
        .acc-card { padding: 0; overflow: hidden; margin: 0 var(--sp-md) var(--sp-md) var(--sp-md); }
        .acc-header { display: flex; align-items: center; justify-content: space-between; gap: 8px;
          padding: var(--sp-md); cursor: pointer; user-select: none;
          transition: transform .15s cubic-bezier(0.16,1,0.3,1); }
        .acc-header:active { transform: scale(0.97); }
        .acc-chevron { flex-shrink: 0; color: var(--color-ink3);
          transition: transform .4s cubic-bezier(0.16,1,0.3,1); }
        .acc-header.open .acc-chevron { transform: rotate(180deg); }
        .acc-body-wrap { max-height: 0; overflow: hidden; opacity: 0;
          transition: max-height .4s cubic-bezier(0.16,1,0.3,1), opacity .3s ease; }
        .acc-body-wrap.open { max-height: 10000px; opacity: 1; }
        .acc-body-inner { padding: 0 var(--sp-md) var(--sp-md) var(--sp-md); }
        .acc-badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: var(--radius-full);
          font-size: var(--text-xs); font-weight: 700; letter-spacing: 0.04em;
          background: var(--color-border); color: var(--color-ink3); }
        .acc-header.disabled { opacity: 0.5; cursor: not-allowed; }
      </style>

      ${_renderAccordionCard('general', 'Datos Generales del Establecimiento',
        'building', 'var(--color-planificar)', _generalBadgeInfo(), _generalOpen, _renderGeneralForm())}

      ${_renderAccordionCard('diagnostico', 'Perfil Sanitario Inicial (Diagnóstico)',
        'clipboardCheck', 'var(--color-accent)', _diagBadgeInfo(), _diagOpen, _renderDiagnosticoBody(_diagItems))}

      ${_renderAccordionCard('resultados', 'Resultados del Diagnóstico Inicial',
        'listCheck', 'var(--emerald)', _resultadosBadgeInfo(), _resultadosOpen, _renderResultadosBody(),
        !_resultadosData().rated.length)}

      ${_renderAccordionCard('marco', 'Marco Normativo y Legal de Referencia',
        'scale', 'var(--azure)', _marcoBadgeInfo(), _marcoOpen, _renderMarcoBody())}

      ${_renderAccordionCard('vencimientos', 'Control de Vencimientos',
        'calendarTime', 'var(--amber)', _vencBadgeInfo(), _vencOpen, _renderVencimientosBody())}

      <div style="margin:0 var(--sp-md) var(--sp-sm);">
        <button type="button" class="btn btn-accent" style="width:100%;display:inline-flex;align-items:center;justify-content:center;gap:6px;"
          data-p-act="exportarDashboardPDF">
          ${AppIcons.row('barChart', 'Dashboard Ejecutivo PDF', 14)}
        </button>
      </div>

      <div style="margin:0 var(--sp-md);">
        <button type="submit" form="form-planificar" class="btn btn-primary">
          Iniciar Ciclo PHVA ${AppIcons.icon('arrowRight', 14)}
        </button>
      </div>

      <div style="height:32px"></div>`;
  }

  function _icon(name, color) {
    return AppIcons.accordion(_ACC_ICON[name] || name, color);
  }

  function _chevron() {
    return `<svg class="acc-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;
  }

  function _renderAccordionCard(key, title, iconName, iconColor, badge, isOpen, bodyHtml, disabled) {
    const openEff = isOpen && !disabled;
    return `
      <div class="card acc-card">
        <div class="acc-header${openEff ? ' open' : ''}${disabled ? ' disabled' : ''}" id="acc-header-${key}"
          data-p-act="toggle" data-p-key="${key}">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            ${_icon(iconName, iconColor)}
            <div style="font-size:var(--text-base);font-weight:700;color:var(--color-ink);">${title}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            <span id="acc-badge-${key}" class="${badge.cls}" style="${badge.style}">${badge.text}</span>
            ${_chevron()}
          </div>
        </div>
        <div class="acc-body-wrap${openEff ? ' open' : ''}" id="acc-body-${key}">
          <div class="acc-body-inner">${bodyHtml}</div>
        </div>
      </div>`;
  }

  function toggle(key) {
    if (key === 'resultados' && !_resultadosData().rated.length) {
      Router.toast('Guarda el diagnóstico con al menos 1 ítem calificado primero');
      return;
    }
    _generalOpen    = key === 'general'      ? !_generalOpen    : false;
    _diagOpen       = key === 'diagnostico'  ? !_diagOpen       : false;
    _resultadosOpen = key === 'resultados'   ? !_resultadosOpen : false;
    _marcoOpen      = key === 'marco'        ? !_marcoOpen      : false;
    _vencOpen       = key === 'vencimientos' ? !_vencOpen       : false;
    if (_vencOpen) _initVencDashboard();
    _syncAccordion();
    _schedulePlanificarDraft();
  }

  function openSection(key) {
    if (key === 'resultados' && !_resultadosData().rated.length) {
      Router.toast('Guarda el diagnóstico con al menos 1 ítem calificado primero');
      return;
    }
    _generalOpen    = key === 'general';
    _diagOpen       = key === 'diagnostico';
    _resultadosOpen = key === 'resultados';
    _marcoOpen      = key === 'marco';
    _vencOpen       = key === 'vencimientos';
    if (_vencOpen) _initVencDashboard();
    _syncAccordion();
    _schedulePlanificarDraft();
    requestAnimationFrame(() => {
      document.getElementById(`acc-header-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function _syncAccordion() {
    _setCardState('general', _generalOpen, _generalBadgeInfo());
    _setCardState('diagnostico', _diagOpen, _diagBadgeInfo());
    _setCardState('marco', _marcoOpen, _marcoBadgeInfo());
    _setCardState('vencimientos', _vencOpen, _vencBadgeInfo());
    _syncResultados();
  }

  function marcoSub(key) {
    _marcoOpenSubs[key] = !_marcoOpenSubs[key];
    const inner = document.querySelector('#acc-body-marco .acc-body-inner');
    if (inner) inner.innerHTML = _renderMarcoBody();
  }

  function _marcoBadgeInfo() {
    return { text: '10 categorías', cls: 'estado-chip estado-B', style: '' };
  }

  function _diagResumenTable(d, r, b) {
    return `
      <table style="width:100%;border-collapse:collapse;font-size:var(--text-xs);">
        <thead><tr style="background:var(--emerald-2);color:#fff;">
          <th style="padding:8px;text-align:left;">Indicador</th>
          <th style="padding:8px;text-align:center;width:90px;">Cantidad</th>
          <th style="padding:8px;text-align:left;">Estado</th>
        </tr></thead>
        <tbody>
          <tr style="background:var(--color-white);">
            <td style="padding:8px;border-bottom:1px solid var(--color-border);font-weight:600;">Aspectos deficientes</td>
            <td style="padding:8px;border-bottom:1px solid var(--color-border);text-align:center;font-weight:700;color:var(--color-deficiente);">${d.length}</td>
            <td style="padding:8px;border-bottom:1px solid var(--color-border);"><span class="estado-chip estado-D">Crítico</span></td>
          </tr>
          <tr style="background:var(--color-surface);">
            <td style="padding:8px;border-bottom:1px solid var(--color-border);font-weight:600;">Aspectos regulares</td>
            <td style="padding:8px;border-bottom:1px solid var(--color-border);text-align:center;font-weight:700;color:var(--color-regular);">${r.length}</td>
            <td style="padding:8px;border-bottom:1px solid var(--color-border);"><span class="estado-chip estado-R">Por mejorar</span></td>
          </tr>
          <tr style="background:var(--color-white);">
            <td style="padding:8px;border-bottom:1px solid var(--color-border);font-weight:600;">Aspectos en buen estado</td>
            <td style="padding:8px;border-bottom:1px solid var(--color-border);text-align:center;font-weight:700;color:var(--color-bueno);">${b.length}</td>
            <td style="padding:8px;border-bottom:1px solid var(--color-border);"><span class="estado-chip estado-B">Conforme</span></td>
          </tr>
        </tbody>
      </table>`;
  }

  function _diagHallazgosTable(rows) {
    return `
      <table style="width:100%;border-collapse:collapse;font-size:var(--text-xs);">
        <thead><tr style="background:var(--emerald-2);color:#fff;">
          <th style="padding:8px;text-align:left;width:28px;">#</th>
          <th style="padding:8px;text-align:left;">Aspecto evaluado</th>
          <th style="padding:8px;text-align:left;width:88px;">Calificación</th>
          <th style="padding:8px;text-align:left;width:72px;">Prioridad</th>
          <th style="padding:8px;text-align:left;">Acción requerida</th>
        </tr></thead>
        <tbody>
          ${rows.map((it, i) => {
            const cls   = it.calificacion === 'D' ? 'estado-D' : 'estado-R';
            const label = it.calificacion === 'D' ? 'Deficiente' : 'Regular';
            return `
          <tr style="background:${i % 2 === 0 ? 'var(--color-white)' : 'var(--color-surface)'};">
            <td style="padding:8px;border-bottom:1px solid var(--color-border);color:var(--color-ink3);font-weight:600;">${i + 1}</td>
            <td style="padding:8px;border-bottom:1px solid var(--color-border);font-weight:600;">${_escAttr(it.texto)}</td>
            <td style="padding:8px;border-bottom:1px solid var(--color-border);"><span class="estado-chip ${cls}">${label}</span></td>
            <td style="padding:8px;border-bottom:1px solid var(--color-border);color:var(--color-ink3);">${_escAttr(it.prioridad || '—')}</td>
            <td style="padding:8px;border-bottom:1px solid var(--color-border);color:var(--color-ink2);">${_escAttr(it.accion || it.condicion || '—')}</td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  function _normaTable(rows) {
    return `
      <table style="width:100%;border-collapse:collapse;font-size:var(--text-xs);">
        <thead><tr style="background:var(--emerald-2);color:#fff;">
          <th style="padding:8px;text-align:left;">Norma</th>
          <th style="padding:8px;text-align:left;">Descripción</th>
          <th style="padding:8px;text-align:left;">Aplicabilidad</th>
        </tr></thead>
        <tbody>
          ${rows.map((r, i) => `
          <tr style="background:${i % 2 === 0 ? 'var(--color-white)' : 'var(--color-surface)'};">
            <td style="padding:8px;border-bottom:1px solid var(--color-border);font-weight:600;">${_escAttr(r[0])}</td>
            <td style="padding:8px;border-bottom:1px solid var(--color-border);">${_escAttr(r[1])}</td>
            <td style="padding:8px;border-bottom:1px solid var(--color-border);color:var(--color-ink3);">${_escAttr(r[2])}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function _renderMarcoSub(key, title, rows) {
    const isOpen = !!_marcoOpenSubs[key];
    const body = rows.length ? _normaTable(rows)
      : `<div style="padding:12px;font-size:var(--text-sm);color:var(--color-ink3);">
          Solo normativa general aplica a este tipo de establecimiento.</div>`;
    return `
      <div style="border:1px solid var(--color-border);border-radius:var(--radius-md);margin-bottom:8px;overflow:hidden;">
        <div data-p-act="marcoSub" data-p-key="${key}" style="display:flex;align-items:center;justify-content:space-between;
          padding:10px 12px;cursor:pointer;background:var(--color-surface);">
          <span style="font-size:var(--text-sm);font-weight:700;color:var(--color-ink);">${_escAttr(title)}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            style="transform:rotate(${isOpen ? 180 : 0}deg);transition:transform .3s cubic-bezier(0.16,1,0.3,1);color:var(--color-ink3);flex-shrink:0;">
            <path d="M6 9l6 6 6-6"/></svg>
        </div>
        ${isOpen ? `<div style="overflow-x:auto;">${body}</div>` : ''}
      </div>`;
  }

  function _renderMarcoBody() {
    return `
      <div style="font-size:var(--text-xs);color:var(--color-ink3);margin-bottom:var(--sp-md);font-style:italic;">
        La normativa general aplica a todos los establecimientos. Las normas específicas se activan según el tipo seleccionado.</div>
      ${_renderMarcoSub('general', 'General (aplica a los 9 tipos)', MARCO_GENERAL)}
      ${MARCO_TIPOS.map(t => _renderMarcoSub(t.key, t.label, t.normas)).join('')}`;
  }

  function _syncResultados() {
    const enabled = !!_resultadosData().rated.length;
    document.getElementById('acc-header-resultados')?.classList.toggle('disabled', !enabled);
    _setCardState('resultados', _resultadosOpen && enabled, _resultadosBadgeInfo());
    const inner = document.querySelector('#acc-body-resultados .acc-body-inner');
    if (inner) inner.innerHTML = _renderResultadosBody();
  }

  function _setCardState(key, isOpen, badge) {
    document.getElementById(`acc-header-${key}`)?.classList.toggle('open', isOpen);
    document.getElementById(`acc-body-${key}`)?.classList.toggle('open', isOpen);
    const badgeEl = document.getElementById(`acc-badge-${key}`);
    if (badgeEl) {
      badgeEl.className = badge.cls;
      badgeEl.setAttribute('style', badge.style);
      badgeEl.textContent = badge.text;
    }
  }

  function _pendienteStyle() {
    return 'display:inline-flex;align-items:center;padding:3px 10px;border-radius:var(--radius-full);' +
      'font-size:var(--text-xs);font-weight:700;letter-spacing:0.04em;background:var(--color-border);color:var(--color-ink3);';
  }

  function _generalBadgeInfo() {
    const completo = _val('inp-nombre') && _val('inp-nit') && _val('inp-direccion') && _val('inp-tipo');
    return completo
      ? { text: 'Completado', cls: 'estado-chip estado-B', style: '' }
      : { text: 'Pendiente', cls: '', style: _pendienteStyle() };
  }

  function _diagBadgeInfo() {
    const catalog = _diagCatalog || DiagnosticoInicial.getCatalog(_diagEst || _currentEst());
    const items   = _diagItems || DiagnosticoInicial.getDiagnostico(_diagEst || _currentEst()).items;
    const total   = catalog.length;
    const completados = DiagnosticoInicial.contarCompletados(items);
    if (completados === total && total > 0) return { text: 'Completado', cls: 'estado-chip estado-B', style: '' };
    if (completados > 0) return { text: `${completados} de ${total} completados`, cls: 'estado-chip estado-R', style: '' };
    return { text: 'Pendiente', cls: '', style: _pendienteStyle() };
  }

  function _currentEst() {
    return { nombre: _draftVal('inp-nombre'), nit: _draftVal('inp-nit') };
  }

  function _resultadosData() {
    const est     = _currentEst();
    const diag    = DiagnosticoInicial.getDiagnostico(est);
    const catMap  = Object.fromEntries(diag.catalog.map(c => [c.id, c]));
    const rated   = diag.items
      .map(it => ({
        ...it,
        texto: catMap[it.id]?.texto || '',
        norma: catMap[it.id]?.norma || '',
      }))
      .filter(it => it.calificacion && it.texto);
    const d = rated.filter(it => it.calificacion === 'D');
    const r = rated.filter(it => it.calificacion === 'R');
    const b = rated.filter(it => it.calificacion === 'B');
    const prioW = { Alta: 2, Media: 1, Baja: 0 };
    const critList = [...d, ...r].sort((x, y) => {
      const wx = (x.calificacion === 'D' ? 10 : 0) + (prioW[x.prioridad] ?? -1);
      const wy = (y.calificacion === 'D' ? 10 : 0) + (prioW[y.prioridad] ?? -1);
      return wy - wx;
    });
    return { rated, d, r, b, critList };
  }

  function _resultadosBadgeInfo() {
    const { rated, d, r } = _resultadosData();
    if (!rated.length) return { text: 'Sin diagnóstico aún', cls: '', style: _pendienteStyle() };
    if (d.length) return { text: `${d.length} crítico${d.length !== 1 ? 's' : ''}`, cls: 'estado-chip estado-D', style: '' };
    if (r.length) return { text: `${r.length} por mejorar`, cls: 'estado-chip estado-R', style: '' };
    return { text: 'Todo en orden', cls: 'estado-chip estado-B', style: '' };
  }

  function _renderResultadosBody() {
    const { rated, d, r, b, critList } = _resultadosData();
    if (!rated.length) {
      return `<div style="font-size:var(--text-sm);color:var(--color-ink3);text-align:center;padding:var(--sp-md) 0;">
        Aún no hay ítems calificados. Guarda el diagnóstico con al menos una calificación para ver resultados aquí.</div>`;
    }

    const estNombre = _escAttr(_val('inp-nombre') || 'Establecimiento');
    const estNit    = _escAttr(_val('inp-nit') || '—');
    const fecha     = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

    const docHeader = `
      <div style="border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;margin-bottom:var(--sp-md);">
        <div style="background:var(--emerald-2);color:#fff;padding:12px 14px;">
          <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;opacity:0.85;">
            ECODESA · SaniCheck · Documento oficial</div>
          <div style="font-size:var(--text-base);font-weight:700;margin-top:4px;letter-spacing:-0.01em;">
            Resultados del Diagnóstico Inicial</div>
        </div>
        <div style="padding:10px 14px;background:var(--color-surface);border-bottom:1px solid var(--color-border);
          font-size:var(--text-xs);color:var(--color-ink3);line-height:1.6;">
          <strong style="color:var(--color-ink);">Establecimiento:</strong> ${estNombre}<br>
          <strong style="color:var(--color-ink);">NIT:</strong> ${estNit} ·
          <strong style="color:var(--color-ink);">Fecha de consulta:</strong> ${fecha}
        </div>
        <div style="padding:12px 14px;font-size:var(--text-xs);color:var(--color-ink3);font-style:italic;
          border-bottom:1px solid var(--color-border);">
          Resumen consolidado del perfil sanitario inicial. Los hallazgos deficientes y regulares requieren seguimiento
          según prioridad automática asignada (Alta · Media · Baja).</div>
        <div style="overflow-x:auto;">${_diagResumenTable(d, r, b)}</div>
      </div>`;

    if (!critList.length) {
      return docHeader + `
        <div style="border:1px solid var(--color-bueno);border-radius:var(--radius-md);overflow:hidden;">
          <div style="padding:14px 16px;background:var(--color-bueno-bg);text-align:center;">
            <div style="font-size:var(--text-sm);font-weight:700;color:var(--color-bueno);margin-bottom:4px;display:flex;align-items:center;justify-content:center;gap:6px;">
              ${AppIcons.icon('check', 14)} Sin hallazgos críticos
            </div>
              Mantener buenas prácticas y actualizar el diagnóstico ante cambios en infraestructura o procesos.</div>
          </div>
        </div>`;
    }

    return docHeader + `
      <div style="border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:space-between;
          padding:10px 12px;background:var(--color-surface);border-bottom:1px solid var(--color-border);">
          <span style="font-size:var(--text-sm);font-weight:700;color:var(--color-ink);">
            Hallazgos Prioritarios (${critList.length})</span>
          <span style="font-size:var(--text-xs);color:var(--color-ink3);">
            ${d.length} crítico${d.length !== 1 ? 's' : ''} · ${r.length} por mejorar</span>
        </div>
        <div style="overflow-x:auto;">${_diagHallazgosTable(critList)}</div>
      </div>`;
  }

  function _refreshVencBody() {
    const inner = document.querySelector('#acc-body-vencimientos .acc-body-inner');
    if (inner && _venc) {
      inner.innerHTML = _renderVencimientosBody();
      _mostrarNotificacionesVenc();
    }
    _setCardState('vencimientos', _vencOpen, _vencBadgeInfo());
  }

  function _initVencDashboard() {
    const estId = typeof PortalCliente !== 'undefined' ? PortalCliente.getEstablecimientoId() : '';
    VencimientosDashboard.loadDashboard(estId, _refreshVencBody).catch(() => {});
  }

  function _mostrarNotificacionesVenc() {
    if (!_venc || _vencNotified) return;
    const dash = Vencimientos.getDashboard(_venc);
    if (dash.notificaciones.length) {
      Router.toast(`${dash.notificaciones.length} alerta(s) de vencimiento — revisar dashboard`);
      _vencNotified = true;
    }
  }

  function _vencBadgeInfo() {
    const kpi = VencimientosV2.getKpis();
    if (kpi.counts.vencido > 0) {
      return { text: `${kpi.counts.vencido} vencido(s)`, cls: 'estado-chip estado-D', style: '' };
    }
    if (kpi.counts.por_vencer_30 > 0) {
      return { text: `${kpi.counts.por_vencer_30} por vencer`, cls: 'estado-chip estado-R', style: '' };
    }
    if (kpi.total > 0) {
      return { text: `${kpi.total} documento(s)`, cls: 'estado-chip estado-B', style: '' };
    }
    const v = _venc || Vencimientos.getVencimientos(_currentEst());
    const dash = Vencimientos.getDashboard(v);
    if (dash.notificaciones.some(n => n.nivel === 'critico')) {
      return { text: `${dash.notificaciones.length} alerta(s)`, cls: 'estado-chip estado-D', style: '' };
    }
    if (dash.alertas30 > 0) {
      return { text: `${dash.alertas30} por vencer`, cls: 'estado-chip estado-R', style: '' };
    }
    const resumen = Vencimientos.resumenGrupo(v, 'personal');
    if (resumen === 'sin_registrar') return { text: 'Pendiente', cls: '', style: _pendienteStyle() };
    return { text: 'Vigente', cls: 'estado-chip estado-B', style: '' };
  }

  function _vencEstadoLabel(est_) {
    if (est_ === 'vencido') return { cls: 'estado-D', label: 'Vencido' };
    if (est_ === 'por_vencer') return { cls: 'estado-R', label: 'Por vencer' };
    if (est_ === 'sin_registrar') return { cls: '', label: 'Sin registrar' };
    return { cls: 'estado-B', label: 'Vigente' };
  }

  function _vencDashboardHtml(v) {
    const dash = Vencimientos.getDashboard(v);
    return `
      <div style="border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;margin-bottom:var(--sp-md);">
        <div style="background:var(--emerald-2);color:#fff;padding:10px 14px;">
          <div style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">Dashboard general</div>
          <div style="font-size:var(--text-sm);font-weight:700;margin-top:4px;">Control de Vencimientos</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px 14px;background:var(--color-surface);
          border-bottom:1px solid var(--color-border);">
          <div style="text-align:center;padding:10px;background:var(--color-white);border-radius:var(--radius-md);border:1px solid var(--color-border);">
            <div style="font-size:22px;font-weight:900;color:var(--color-bueno);">${dash.pctPersonal}%</div>
            <div style="font-size:10px;color:var(--color-ink3);text-transform:uppercase;letter-spacing:0.04em;">Vigencia personal</div>
          </div>
          <div style="text-align:center;padding:10px;background:var(--color-white);border-radius:var(--radius-md);border:1px solid var(--color-border);">
            <div style="font-size:22px;font-weight:900;color:var(--color-bueno);">${dash.pctEquipos}%</div>
            <div style="font-size:10px;color:var(--color-ink3);text-transform:uppercase;letter-spacing:0.04em;">Vigencia equipos</div>
          </div>
        </div>
        ${dash.proximos30.length ? `
        <div style="padding:10px 14px;border-bottom:1px solid var(--color-border);">
          <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-ink);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em;">
            Próximos vencimientos (30 días)</div>
          ${dash.proximos30.slice(0, 5).map(p => {
            const st = _vencEstadoLabel(p.estado);
            return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;
              border-bottom:1px dashed var(--color-border);font-size:var(--text-xs);">
              <span style="color:var(--color-ink2);"><strong>${_escAttr(p.ref)}</strong> · ${_escAttr(p.detalle)}</span>
              <span class="estado-chip ${st.cls}">${st.label}</span>
            </div>`;
          }).join('')}
        </div>` : ''}
        ${dash.notificaciones.length ? `
        <div style="padding:10px 14px;background:rgba(245,124,0,0.08);">
          <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-regular);margin-bottom:6px;">🔔 Notificaciones automáticas</div>
          ${dash.notificaciones.slice(0, 4).map(n => `
            <div style="font-size:11px;color:var(--color-ink2);margin-bottom:4px;">• ${_escAttr(n.texto)}</div>`).join('')}
        </div>` : `<div style="padding:10px 14px;font-size:var(--text-xs);color:var(--color-bueno);display:flex;align-items:center;gap:6px;">${AppIcons.icon('check', 12)} Sin alertas de vencimiento</div>`}
      </div>`;
  }

  function _vencPersonalTable(v) {
    const rows = Vencimientos.getPersonalRows(v, _vencFiltroPersonal);
    if (!rows.length) {
      return `<div style="padding:16px;text-align:center;font-size:var(--text-sm);color:var(--color-ink3);">Sin resultados para el filtro.</div>`;
    }
    return `
      <table style="width:100%;border-collapse:collapse;font-size:var(--text-xs);">
        <thead><tr style="background:var(--emerald-2);color:#fff;">
          <th style="padding:8px;text-align:left;">Trabajador</th>
          <th style="padding:8px;text-align:left;">Documento</th>
          <th style="padding:8px;text-align:left;width:88px;">Expedición</th>
          <th style="padding:8px;text-align:left;width:88px;">Vigencia</th>
          <th style="padding:8px;text-align:center;width:88px;">Estado</th>
        </tr></thead>
        <tbody>
          ${rows.map((r, i) => {
            const st = _vencEstadoLabel(r.estado);
            const fmt = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CO') : '—';
            const vigTxt = r.sinVencimiento ? '—' : fmt(r.vigencia);
            const expTxt = r.sinVencimiento && !r.expedicion ? '—' : fmt(r.expedicion);
            const alerta = !r.sinVencimiento && r.estado === 'por_vencer' ? ` ${AppIcons.icon('alertTriangle', 11)}` : '';
            return `
          <tr style="background:${i % 2 === 0 ? 'var(--color-white)' : 'var(--color-surface)'};">
            <td style="padding:8px;border-bottom:1px solid var(--color-border);">
              <div style="font-weight:600;">${_escAttr(r.nombre)}</div>
              <div style="color:var(--color-ink3);font-size:10px;">CC ${_escAttr(r.cedula || '—')}</div>
            </td>
            <td style="padding:8px;border-bottom:1px solid var(--color-border);">${_escAttr(r.documento)}</td>
            <td style="padding:8px;border-bottom:1px solid var(--color-border);color:var(--color-ink3);">${expTxt}</td>
            <td style="padding:8px;border-bottom:1px solid var(--color-border);color:var(--color-ink3);">${vigTxt}${alerta}</td>
            <td style="padding:8px;border-bottom:1px solid var(--color-border);text-align:center;">
              <span class="estado-chip ${st.cls}">${st.label}</span></td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  function _vencEquiposTable(v) {
    const rows = Vencimientos.getEquiposRows(v, _vencFiltroEquipos);
    if (!rows.length) {
      return `<div style="padding:16px;text-align:center;font-size:var(--text-sm);color:var(--color-ink3);">Sin resultados para el filtro.</div>`;
    }
    return `
      <table style="width:100%;border-collapse:collapse;font-size:var(--text-xs);">
        <thead><tr style="background:var(--emerald-2);color:#fff;">
          <th style="padding:8px;text-align:left;">Equipo</th>
          <th style="padding:8px;text-align:left;width:96px;">Últ. calibración</th>
          <th style="padding:8px;text-align:left;width:96px;">Próx. calibración</th>
          <th style="padding:8px;text-align:center;width:88px;">Estado</th>
        </tr></thead>
        <tbody>
          ${rows.map((r, i) => {
            const st = _vencEstadoLabel(r.estado);
            const fmt = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CO') : '—';
            return `
          <tr style="background:${i % 2 === 0 ? 'var(--color-white)' : 'var(--color-surface)'};">
            <td style="padding:8px;border-bottom:1px solid var(--color-border);">
              <div style="font-weight:600;">${_escAttr(r.codigo)}</div>
              <div style="color:var(--color-ink3);font-size:10px;">${_escAttr(r.tipo)}</div>
            </td>
            <td style="padding:8px;border-bottom:1px solid var(--color-border);color:var(--color-ink3);">${fmt(r.ultima_calibracion)}</td>
            <td style="padding:8px;border-bottom:1px solid var(--color-border);color:var(--color-ink3);">${fmt(r.proxima_calibracion)}</td>
            <td style="padding:8px;border-bottom:1px solid var(--color-border);text-align:center;">
              <span class="estado-chip ${st.cls}">${st.label}</span></td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  function _renderArchivoPreview(arch, itemId, trId) {
    if (!arch || !arch.data) return '';
    const isPdf  = (arch.tipo || '').includes('pdf') || /\.pdf$/i.test(arch.nombre || '');
    const isImg  = (arch.tipo || '').startsWith('image/');
    const nombre = _escAttr(arch.nombre || 'Soporte');
    const bar = `
      <div style="padding:6px 10px;font-size:10px;display:flex;justify-content:space-between;align-items:center;
        gap:8px;background:var(--color-surface);border-top:1px solid var(--color-border);">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">${nombre}</span>
        <button type="button" data-p-act="verSoporteVenc" data-p-item="${_escAttr(itemId)}" data-p-tr="${_escAttr(trId)}"
          style="padding:2px 8px;font-size:10px;border:1px solid var(--color-border);border-radius:4px;
            background:#fff;cursor:pointer;color:var(--emerald-2);">Ver</button>
        <button type="button" data-p-act="eliminarSoporteVenc" data-p-item="${_escAttr(itemId)}" data-p-tr="${_escAttr(trId)}"
          style="padding:2px 8px;font-size:10px;border:1px solid var(--color-border);border-radius:4px;
            background:#fff;cursor:pointer;color:var(--color-deficiente);display:inline-flex;align-items:center;justify-content:center;">${AppIcons.icon('x', 12)}</button>
      </div>`;
    if (isImg) {
      return `<div style="margin-top:8px;border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;">
        <img src="${arch.data}" alt="Vista previa" style="width:100%;max-height:140px;object-fit:contain;background:#f8faf9;display:block;">
        ${bar}</div>`;
    }
    return `<div style="margin-top:8px;border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;">
      <div style="padding:16px 12px;text-align:center;background:#f8faf9;color:var(--color-ink3);">
        ${AppIcons.icon('fileText', 28)}
        <div style="font-size:11px;color:var(--color-ink2);margin-top:4px;">${isPdf ? 'Documento PDF' : 'Archivo adjunto'}</div>
      </div>${bar}</div>`;
  }

  function _renderDocPersonalCard(v, tr, doc) {
    const arch = Vencimientos.getArchivo(v, doc.id, tr.id);
    const est  = Vencimientos.estadoDocPersonal(doc, tr);
    const st   = _vencEstadoLabel(est.estado);
    const docs = tr.documentos || {};
    const alerta = est.estado === 'por_vencer'
      ? `<div style="margin-top:6px;font-size:10px;color:var(--color-regular);display:flex;align-items:center;gap:4px;">${AppIcons.icon('alertTriangle', 11)} Vence en ${est.dias} días</div>` : '';
    const periodicidad = doc.periodicidad
      ? `<span style="font-size:10px;color:var(--color-ink3);background:var(--color-surface);padding:2px 8px;border-radius:99px;">${_escAttr(doc.periodicidad)}</span>` : '';

    let campos = '';
    if (doc.soloNumero) {
      campos = `
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:10px;">Número de cédula</label>
          <input class="form-input" type="text" inputmode="numeric" pattern="[0-9]*"
            placeholder="Solo número — sin fechas ni vencimiento" value="${_escAttr(tr.cedula)}"
            data-p-change="actualizarTrabajador" data-p-tr="${_escAttr(tr.id)}" data-p-campo="cedula">
        </div>`;
    } else if (doc.soloExp) {
      campos = `
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:10px;">Fecha expedición</label>
          <input class="form-input" type="date" value="${_escAttr(docs[doc.expId] || '')}"
            data-p-change="actualizarTrabajador" data-p-tr="${_escAttr(tr.id)}" data-p-campo="${_escAttr(doc.expId)}">
        </div>`;
    } else {
      campos = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:10px;">Fecha expedición</label>
            <input class="form-input" type="date" value="${_escAttr(docs[doc.expId] || '')}"
              data-p-change="actualizarTrabajador" data-p-tr="${_escAttr(tr.id)}" data-p-campo="${_escAttr(doc.expId)}">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:10px;">Fecha vencimiento</label>
            <input class="form-input" type="date" value="${_escAttr(docs[doc.vencId] || '')}"
              data-p-change="actualizarTrabajador" data-p-tr="${_escAttr(tr.id)}" data-p-campo="${_escAttr(doc.vencId)}">
          </div>
        </div>`;
    }

    return `
      <div style="border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;margin-bottom:10px;background:var(--color-white);">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 12px;
          background:var(--emerald-2);color:#fff;">
          <div>
            <div style="font-size:var(--text-sm);font-weight:700;">${_escAttr(doc.label)}</div>
            <div style="font-size:10px;opacity:0.85;margin-top:2px;">${_escAttr(doc.norma)}</div>
          </div>
          <span class="estado-chip ${st.cls}" style="flex-shrink:0;">${st.label}</span>
        </div>
        <div style="padding:12px;">
          <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:10px;">${periodicidad}</div>
          ${campos}
          ${alerta}
          <button type="button" data-p-act="subirSoporteVenc" data-p-item="${_escAttr(doc.id)}" data-p-tr="${_escAttr(tr.id)}"
            style="margin-top:10px;width:100%;padding:10px;cursor:pointer;border:1.5px dashed var(--emerald-2);
              border-radius:var(--radius-md);background:rgba(10,115,80,0.06);color:var(--emerald-2);font-size:12px;font-weight:600;">
            ${AppIcons.row('paperclip', _escAttr(doc.archivoLabel) + (arch ? ' — adjunto' : ''), 12)}
          </button>
          ${_renderArchivoPreview(arch, doc.id, tr.id)}
        </div>
      </div>`;
  }

  function _guardarVencAuto() {
    if (!_venc) return;
    _vencEst = _currentEst();
    _venc = Vencimientos.saveVencimientos(_vencEst, _venc);
    _vencNotified = false;
    _refreshVencBody();
    _setCardState('vencimientos', _vencOpen, _vencBadgeInfo());
    Store.flush();
  }

  function _renderRequerimientoCard(v, tr, req) {
    const arch = Vencimientos.getArchivo(v, req.id, tr.id);
    const est  = Vencimientos.estadoRequerimiento(req);
    const st   = _vencEstadoLabel(est.estado);
    const alerta = est.estado === 'por_vencer'
      ? `<div style="margin-top:6px;font-size:10px;color:var(--color-regular);display:flex;align-items:center;gap:4px;">${AppIcons.icon('alertTriangle', 11)} Vence en ${est.dias} días</div>` : '';
    const vencCampo = req.sinVencimiento ? '' : `
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:10px;">Fecha vencimiento</label>
            <input class="form-input" type="date" value="${_escAttr(req.venc || '')}"
              data-p-change="actualizarRequerimiento" data-p-tr="${_escAttr(tr.id)}" data-p-req="${_escAttr(req.id)}" data-p-campo="venc">
          </div>`;
    const gridCols = req.sinVencimiento ? '1fr' : '1fr 1fr';

    return `
      <div style="border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;margin-bottom:10px;background:var(--color-white);">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 12px;
          background:var(--emerald);color:#fff;">
          <div style="flex:1;min-width:0;">
            <input class="form-input" type="text" value="${_escAttr(req.nombre)}"
              placeholder="Nombre del documento"
              data-p-change="actualizarRequerimiento" data-p-tr="${_escAttr(tr.id)}" data-p-req="${_escAttr(req.id)}" data-p-campo="nombre"
              style="margin:0;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);color:#fff;font-weight:700;">
            <div style="font-size:10px;opacity:0.85;margin-top:4px;">Requerimiento adicional</div>
          </div>
          <span class="estado-chip ${st.cls}" style="flex-shrink:0;">${st.label}</span>
        </div>
        <div style="padding:12px;">
          <div style="display:grid;grid-template-columns:${gridCols};gap:8px;">
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:10px;">Fecha expedición</label>
              <input class="form-input" type="date" value="${_escAttr(req.exp || '')}"
                data-p-change="actualizarRequerimiento" data-p-tr="${_escAttr(tr.id)}" data-p-req="${_escAttr(req.id)}" data-p-campo="exp">
            </div>
            ${vencCampo}
          </div>
          <label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:var(--text-xs);color:var(--color-ink2);cursor:pointer;">
            <input type="checkbox" ${req.sinVencimiento ? 'checked' : ''}
              data-p-change="actualizarRequerimiento" data-p-tr="${_escAttr(tr.id)}" data-p-req="${_escAttr(req.id)}" data-p-campo="sinVencimiento">
            No aplica vencimiento
          </label>
          ${alerta}
          <button type="button" data-p-act="subirSoporteVenc" data-p-item="${_escAttr(req.id)}" data-p-tr="${_escAttr(tr.id)}"
            style="margin-top:10px;width:100%;padding:10px;cursor:pointer;border:1.5px dashed var(--emerald-2);
              border-radius:var(--radius-md);background:rgba(10,115,80,0.06);color:var(--emerald-2);font-size:12px;font-weight:600;">
            ${AppIcons.row('paperclip', 'Adjuntar soporte' + (arch ? ' — adjunto' : ''), 12)}
          </button>
          ${_renderArchivoPreview(arch, req.id, tr.id)}
          <button type="button" data-p-act="eliminarRequerimiento" data-p-tr="${_escAttr(tr.id)}" data-p-req="${_escAttr(req.id)}"
            style="margin-top:8px;width:100%;padding:8px;border:1px solid rgba(163,45,45,0.35);border-radius:var(--radius-md);
              background:rgba(163,45,45,0.06);color:var(--color-deficiente);font-size:11px;cursor:pointer;">
            Eliminar requerimiento
          </button>
        </div>
      </div>`;
  }

  function _renderNuevoRequerimientoForm(tr) {
    return `
      <div id="venc-req-nuevo" style="border:2px dashed var(--emerald-2);border-radius:var(--radius-md);padding:12px;margin-bottom:10px;background:rgba(10,115,80,0.04);">
        <div style="font-size:var(--text-xs);font-weight:700;color:var(--emerald-2);margin-bottom:10px;">Nuevo requerimiento adicional</div>
        <div class="form-group">
          <label class="form-label">Nombre del documento / certificado</label>
          <input class="form-input" type="text" id="req-nombre" placeholder="Ej: Certificado manipulación de alimentos">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:10px;">Fecha expedición</label>
            <input class="form-input" type="date" id="req-exp">
          </div>
          <div class="form-group" style="margin-bottom:0;" id="req-venc-wrap">
            <label class="form-label" style="font-size:10px;">Fecha vencimiento</label>
            <input class="form-input" type="date" id="req-venc">
          </div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:var(--text-xs);color:var(--color-ink2);cursor:pointer;">
          <input type="checkbox" id="req-sin-venc" data-p-change="toggleReqSinVencNuevo">
          No aplica vencimiento
        </label>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
          <button type="button" class="btn btn-primary" style="flex:1;min-width:120px;padding:10px;"
            data-p-act="crearRequerimiento" data-p-tr="${_escAttr(tr.id)}">Guardar requerimiento</button>
          <button type="button" class="btn btn-outline" style="padding:10px;"
            data-p-act="cancelarRequerimiento">Cancelar</button>
        </div>
      </div>`;
  }

  function _vencPersonalGestion(v) {
    const tr = (v.trabajadores || [])[0];
    if (!tr) return '';
    const reqs = tr.requerimientos || [];
    return `
      <div style="margin-top:var(--sp-md);padding-top:var(--sp-md);border-top:1px dashed var(--color-border);">
        <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-ink3);text-transform:uppercase;
          letter-spacing:0.05em;margin-bottom:var(--sp-sm);">Registrar / editar — documentos base</div>
        <div class="form-group">
          <label class="form-label">Nombre del trabajador</label>
          <input class="form-input" type="text" value="${_escAttr(tr.nombre)}"
            data-p-change="actualizarTrabajador" data-p-tr="${_escAttr(tr.id)}" data-p-campo="nombre">
        </div>
        ${Vencimientos.allDocsPersonal().map(doc => _renderDocPersonalCard(v, tr, doc)).join('')}
        ${reqs.length ? `
        <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-ink3);text-transform:uppercase;
          letter-spacing:0.05em;margin:var(--sp-md) 0 var(--sp-sm);">Requerimientos adicionales</div>
        ${reqs.map(req => _renderRequerimientoCard(v, tr, req)).join('')}` : ''}
        ${_vencReqFormOpen ? _renderNuevoRequerimientoForm(tr) : ''}
        <button type="button" class="btn btn-accent" style="width:100%;padding:10px;margin-top:8px;display:inline-flex;align-items:center;justify-content:center;gap:6px;"
          data-p-act="toggleReqForm">${AppIcons.row('plus', 'Agregar requerimiento adicional', 14)}</button>
        <button type="button" class="btn btn-outline" style="width:auto;padding:8px 14px;margin-top:8px;display:inline-flex;align-items:center;gap:6px;"
          data-p-act="agregarTrabajador">${AppIcons.row('plus', 'Agregar trabajador', 14)}</button>
      </div>`;
  }

  function _vencEquiposGestion(v) {
    const eq = (v.equiposLista || [])[0];
    if (!eq) return '';
    const hist = (eq.historial || []).slice(0, 5);
    return `
      <div style="margin-top:var(--sp-md);padding-top:var(--sp-md);border-top:1px dashed var(--color-border);">
        <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-ink3);text-transform:uppercase;
          letter-spacing:0.05em;margin-bottom:var(--sp-sm);">Registrar / editar equipo</div>
        <div class="form-group">
          <label class="form-label">Código del equipo</label>
          <input class="form-input" type="text" value="${_escAttr(eq.codigo)}"
            data-p-change="actualizarEquipo" data-p-eq="${_escAttr(eq.id)}" data-p-campo="codigo">
        </div>
        <div class="form-group">
          <label class="form-label">Tipo de equipo</label>
          <input class="form-input" type="text" value="${_escAttr(eq.tipo)}"
            data-p-change="actualizarEquipo" data-p-eq="${_escAttr(eq.id)}" data-p-campo="tipo">
        </div>
        <div class="form-group">
          <label class="form-label">Última calibración</label>
          <input class="form-input" type="date" value="${_escAttr(eq.ultima_calibracion || '')}"
            data-p-change="actualizarEquipo" data-p-eq="${_escAttr(eq.id)}" data-p-campo="ultima_calibracion">
        </div>
        <div class="form-group">
          <label class="form-label">Próxima calibración</label>
          <input class="form-input" type="date" value="${_escAttr(eq.proxima_calibracion || '')}"
            data-p-change="actualizarEquipo" data-p-eq="${_escAttr(eq.id)}" data-p-campo="proxima_calibracion">
        </div>
        <div class="form-group">
          <label class="form-label">Mantenimiento programado</label>
          <input class="form-input" type="date" value="${_escAttr(eq.mantenimiento_programado || '')}"
            data-p-change="actualizarEquipo" data-p-eq="${_escAttr(eq.id)}" data-p-campo="mantenimiento_programado">
        </div>
        ${hist.length ? `
        <div style="margin-top:var(--sp-sm);">
          <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-ink);margin-bottom:6px;">Historial de calibraciones</div>
          <table style="width:100%;border-collapse:collapse;font-size:var(--text-xs);">
            <thead><tr style="background:var(--color-surface);">
              <th style="padding:6px 8px;text-align:left;border-bottom:1px solid var(--color-border);">Fecha</th>
              <th style="padding:6px 8px;text-align:left;border-bottom:1px solid var(--color-border);">Resultado</th>
            </tr></thead>
            <tbody>${hist.map(h => `
              <tr><td style="padding:6px 8px;border-bottom:1px solid var(--color-border);">${new Date(h.fecha + 'T00:00:00').toLocaleDateString('es-CO')}</td>
              <td style="padding:6px 8px;border-bottom:1px solid var(--color-border);">${_escAttr(h.resultado)}${_escAttr(h.nota ? ' — ' + h.nota : '')}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>` : ''}
        <button type="button" class="btn btn-outline" style="width:auto;padding:8px 14px;margin-top:8px;display:inline-flex;align-items:center;gap:6px;"
          data-p-act="agregarEquipo">${AppIcons.row('plus', 'Agregar equipo', 14)}</button>
      </div>`;
  }

  function _renderVencimientosV2Section() {
    if (typeof VencimientosDashboard !== 'undefined') {
      return VencimientosDashboard.renderSection();
    }
    const esc = _escAttr;
    const v2Tab = _vencV2Tab || 'personal';
    const cat = VencimientosV2.getCatalog();
    return `
      ${VencimientosV2.renderDashboard(esc)}
      <div style="font-size:var(--text-xs);color:var(--color-deficiente);margin-bottom:8px;">
        Módulo dashboard no cargado — recargue la app. Tabla básica abajo.
      </div>
      <div style="overflow-x:auto;">${VencimientosV2.renderTabla(v2Tab, esc)}</div>`;
  }

  function _renderVencimientosBody() {
    if (!_venc) _venc = Vencimientos.getVencimientos(_currentEst());
    const v = _venc;
    return `
      <div style="font-size:var(--text-xs);color:var(--color-ink3);margin-bottom:var(--sp-sm);padding:8px 10px;
        background:var(--color-surface);border-radius:var(--radius-md);">
        Disponible sin inspección activa. Opcional: complete <strong>Datos Generales</strong> para identificar el establecimiento.
      </div>
      ${_renderVencimientosV2Section()}
      ${_VENC_V1_UI ? `
      <details style="margin-bottom:var(--sp-md);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:8px 12px;">
        <summary style="cursor:pointer;font-size:var(--text-xs);font-weight:700;color:var(--color-ink3);">Control v1 (trabajadores y equipos legacy)</summary>
        ${_renderVencimientosBodyLegacy(v)}
      </details>
      <button type="button" class="btn btn-primary" style="margin-top:var(--sp-sm);" data-p-act="guardarVencimientos">
        Guardar vencimientos v1</button>` : ''}`;
  }

  function _renderVencimientosBodyLegacy() {
    const v = _venc || Vencimientos.getVencimientos(_currentEst());
    const grupo = _vencTab;
    const meta  = Vencimientos.GRUPOS[grupo];
    const res   = Vencimientos.resumenGrupo(v, grupo);
    const resSt = _vencEstadoLabel(res === 'sin_registrar' ? 'sin_registrar' : res);
    const filtroVal = grupo === 'personal' ? _vencFiltroPersonal : _vencFiltroEquipos;
    const filtroPh  = grupo === 'personal' ? 'Buscar por nombre o cédula…' : 'Buscar por código o tipo…';

    return `
      <div style="display:flex;gap:8px;margin:var(--sp-md) 0;">
        ${['personal', 'equipos'].map(g => {
          const active = g === grupo;
          const m = Vencimientos.GRUPOS[g];
          return `
          <button type="button" data-p-act="vencTab" data-p-tab="${g}"
            style="flex:1;padding:10px;border-radius:var(--radius-md);cursor:pointer;
              border:2px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'};
              background:${active ? 'var(--emerald-2)' : '#fff'};
              font-size:var(--text-xs);font-weight:600;color:${active ? '#fff' : 'var(--color-ink)'};">
            ${m.label}
          </button>`;
        }).join('')}
      </div>
      <div style="font-size:var(--text-xs);color:var(--color-ink3);margin-bottom:8px;">${meta.desc}</div>
      <input class="form-input" type="search" placeholder="${filtroPh}" value="${_escAttr(filtroVal)}"
        data-p-input="vencFiltro" style="margin-bottom:8px;">
      <div style="overflow-x:auto;">${grupo === 'personal' ? _vencPersonalTable(v) : _vencEquiposTable(v)}</div>
      ${grupo === 'personal' ? _vencPersonalGestion(v) : _vencEquiposGestion(v)}`;
  }

  function vencTab(tab) {
    _vencTab = tab;
    _refreshVencBody();
    _schedulePlanificarDraft();
  }

  function vencFiltro(val) {
    if (_vencTab === 'personal') _vencFiltroPersonal = val;
    else _vencFiltroEquipos = val;
    _refreshVencBody();
    _schedulePlanificarDraft();
  }

  function toggleReqForm() {
    _vencReqFormOpen = !_vencReqFormOpen;
    _refreshVencBody();
  }

  function cancelarRequerimiento() {
    _vencReqFormOpen = false;
    _refreshVencBody();
  }

  function toggleReqSinVencNuevo(checked) {
    const wrap = document.getElementById('req-venc-wrap');
    const inp  = document.getElementById('req-venc');
    if (wrap) wrap.style.display = checked ? 'none' : '';
    if (inp && checked) inp.value = '';
  }

  function crearRequerimiento(trId) {
    if (!_venc) return;
    const nombre = (document.getElementById('req-nombre')?.value || '').trim();
    if (!nombre) { Router.toast('Ingrese el nombre del documento'); return; }
    const exp      = document.getElementById('req-exp')?.value || '';
    const venc     = document.getElementById('req-venc')?.value || '';
    const sinVenc  = !!document.getElementById('req-sin-venc')?.checked;
    _venc = Vencimientos.agregarRequerimiento(_venc, trId, nombre, exp, venc, sinVenc);
    _vencReqFormOpen = false;
    _guardarVencAuto();
    Router.toast('Requerimiento guardado');
  }

  function actualizarRequerimiento(trId, reqId, campo, valor) {
    if (!_venc) return;
    _venc = Vencimientos.actualizarRequerimiento(_venc, trId, reqId, campo, valor);
    _guardarVencAuto();
  }

  function eliminarRequerimiento(trId, reqId) {
    if (!_venc) return;
    if (!confirm('¿Eliminar este requerimiento adicional?')) return;
    _venc = Vencimientos.eliminarRequerimiento(_venc, trId, reqId);
    _guardarVencAuto();
    Router.toast('Requerimiento eliminado');
  }

  function agregarTrabajador() {
    if (!_venc) return;
    const nombre = prompt('Nombre del trabajador:');
    if (!nombre) return;
    const cedula = prompt('Cédula:') || '';
    _venc = Vencimientos.agregarTrabajador(_venc, nombre, cedula);
    _refreshVencBody();
    Router.toast('Trabajador agregado');
  }

  function actualizarTrabajador(trId, campo, valor) {
    if (!_venc) return;
    _venc = Vencimientos.actualizarTrabajador(_venc, trId, campo, valor);
    _refreshVencBody();
  }

  function agregarEquipo() {
    if (!_venc) return;
    const codigo = prompt('Código del equipo:') || 'EQ-NEW';
    const tipo   = prompt('Tipo de equipo:') || 'Equipo';
    _venc = Vencimientos.agregarEquipo(_venc, codigo, tipo);
    _refreshVencBody();
    Router.toast('Equipo agregado');
  }

  function actualizarEquipo(eqId, campo, valor) {
    if (!_venc) return;
    _venc = Vencimientos.actualizarEquipo(_venc, eqId, campo, valor);
    _refreshVencBody();
  }

  function _fmtVencFecha(d) {
    if (!d) return '—';
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  }

  function _calcDiagPct(rated) {
    const activos = rated.filter(it => it.calificacion && it.calificacion !== 'NA');
    if (!activos.length) return 0;
    const vals = { B: 1, R: 0.5, D: 0 };
    const sum  = activos.reduce((s, it) => s + (vals[it.calificacion] ?? 0), 0);
    return Math.round((sum / activos.length) * 100);
  }

  function _estadoGeneral(pct) {
    if (pct >= 80) return { label: 'BUENO', color: '#065F46', bg: '#D1FAE5', sem: 'verde' };
    if (pct >= 50) return { label: 'REGULAR', color: '#92400E', bg: '#FEF3C7', sem: 'amarillo' };
    return { label: 'DEFICIENTE', color: '#991B1B', bg: '#FEE2E2', sem: 'rojo' };
  }

  function _countVencEstados(rows) {
    return {
      vigente:       rows.filter(r => r.estado === 'vigente').length,
      por_vencer:    rows.filter(r => r.estado === 'por_vencer').length,
      vencido:       rows.filter(r => r.estado === 'vencido').length,
      sin_registrar: rows.filter(r => r.estado === 'sin_registrar').length,
    };
  }

  function _proximaVisita(v, dash) {
    const fv = _draftVal('inp-fecha-vigencia');
    if (fv) return fv;
    if (dash.proximos30?.[0]?.fecha) return dash.proximos30[0].fecha;
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  }

  function _arcSegment(cx, cy, r, ir, startDeg, endDeg) {
    const rad = d => (d * Math.PI) / 180;
    const s = rad(startDeg), e = rad(endDeg);
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
    const xi1 = cx + ir * Math.cos(e), yi1 = cy + ir * Math.sin(e);
    const xi2 = cx + ir * Math.cos(s), yi2 = cy + ir * Math.sin(s);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} `
      + `L${xi1.toFixed(2)},${yi1.toFixed(2)} A${ir},${ir} 0 ${large},0 ${xi2.toFixed(2)},${yi2.toFixed(2)}Z`;
  }

  function _pdfEstadoChip(est_) {
    const map = {
      vigente:       { label: 'Vigente',       cls: 'chip-b' },
      por_vencer:    { label: 'Por vencer',    cls: 'chip-r' },
      vencido:       { label: 'Vencido',       cls: 'chip-d' },
      sin_registrar: { label: 'Sin registrar', cls: '' },
    };
    const m = map[est_] || map.sin_registrar;
    return m.cls
      ? `<span class="chip ${m.cls}">${m.label}</span>`
      : `<span style="font-size:9px;color:#9CA3AF;">${m.label}</span>`;
  }

  function _buildPdfVencPersonalBlocks(v) {
    const rows = Vencimientos.getPersonalRows(v, '').filter(r => r.itemId !== 'cedula');
    const workers = [];
    const seen = new Set();
    rows.forEach(r => {
      if (!seen.has(r.trabajadorId)) {
        seen.add(r.trabajadorId);
        workers.push({ id: r.trabajadorId, nombre: r.nombre, cedula: r.cedula });
      }
    });
    if (!workers.length) {
      return '<div class="venc-empty">Sin trabajadores registrados</div>';
    }
    return workers.map((w, idx) => {
      const docs = rows.filter(r => r.trabajadorId === w.id);
      const docRows = docs.map(r => {
        const exp  = r.sinVencimiento && !r.expedicion ? '—' : _fmtVencFecha(r.expedicion);
        const venc = r.sinVencimiento ? '—' : _fmtVencFecha(r.vencimiento || r.vigencia);
        return `<tr>
          <td>${_escAttr(r.documento)}</td>
          <td>${exp}</td>
          <td>${venc}</td>
          <td>${_pdfEstadoChip(r.estado)}</td>
        </tr>`;
      }).join('');
      return `
        <div class="venc-entity${idx > 0 ? ' venc-entity-gap' : ''}">
          <div class="venc-entity-hdr">
            <span class="venc-entity-name">${_escAttr(w.nombre || 'Sin nombre')}</span>
            <span class="venc-entity-meta">Cédula ${_escAttr(w.cedula || '—')}</span>
          </div>
          <table class="venc-tbl">
            <thead><tr><th>Documento</th><th>Fecha expedición</th><th>Fecha vencimiento</th><th>Estado</th></tr></thead>
            <tbody>${docRows}</tbody>
          </table>
        </div>`;
    }).join('');
  }

  function _buildPdfVencEquiposBlocks(v) {
    const equipos  = Vencimientos.getEquiposRows(v, '');
    const mantItem = Vencimientos.ITEMS.find(x => x.id === 'mantenimiento_fecha');
    if (!equipos.length) {
      return '<div class="venc-empty">Sin equipos registrados</div>';
    }
    return equipos.map((eq, idx) => {
      const mantEst = Vencimientos.estado(eq.mantenimiento_programado, mantItem);
      const docs = [
        { doc: 'Certificado de calibración', exp: eq.ultima_calibracion, venc: eq.proxima_calibracion, estado: eq.estado },
        { doc: 'Mantenimiento preventivo',   exp: eq.mantenimiento_programado, venc: mantEst.proximo, estado: mantEst.estado },
      ];
      const docRows = docs.map(d => `
        <tr>
          <td>${_escAttr(d.doc)}</td>
          <td>${_fmtVencFecha(d.exp)}</td>
          <td>${_fmtVencFecha(d.venc)}</td>
          <td>${_pdfEstadoChip(d.estado)}</td>
        </tr>`).join('');
      return `
        <div class="venc-entity${idx > 0 ? ' venc-entity-gap' : ''}">
          <div class="venc-entity-hdr">
            <span class="venc-entity-name">${_escAttr(eq.codigo || 'Sin código')}</span>
            ${eq.tipo ? `<span class="venc-entity-meta">${_escAttr(eq.tipo)}</span>` : ''}
          </div>
          <table class="venc-tbl">
            <thead><tr><th>Documento / Certificado</th><th>Fecha expedición</th><th>Fecha vencimiento</th><th>Estado</th></tr></thead>
            <tbody>${docRows}</tbody>
          </table>
        </div>`;
    }).join('');
  }

  function _buildDonutSvg(counts) {
    const segs = [
      { k: 'B', color: '#065F46', label: 'Bueno' },
      { k: 'R', color: '#D97706', label: 'Regular' },
      { k: 'D', color: '#991B1B', label: 'Deficiente' },
      { k: 'NA', color: '#9CA3AF', label: 'N/A' },
    ].filter(s => counts[s.k] > 0);
    const total = segs.reduce((n, s) => n + counts[s.k], 0);
    if (!total) return '<div style="font-size:11px;color:#6B7280;text-align:center;padding:24px;">Sin aspectos evaluados</div>';
    let angle = -90;
    const paths = segs.map(s => {
      const sweep = (counts[s.k] / total) * 360;
      const d = _arcSegment(70, 70, 56, 34, angle, angle + sweep - 0.2);
      angle += sweep;
      return `<path d="${d}" fill="${s.color}"/>`;
    }).join('');
    const legend = segs.map(s => `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:10px;">
        <span style="width:10px;height:10px;border-radius:2px;background:${s.color};flex-shrink:0;"></span>
        <span style="flex:1;color:#374151;">${s.label}</span>
        <strong style="color:#0A2E23;">${counts[s.k]}</strong>
        <span style="color:#6B7280;">(${Math.round(counts[s.k] / total * 100)}%)</span>
      </div>`).join('');
    return `
      <div style="display:flex;align-items:center;gap:20px;">
        <svg width="140" height="140" viewBox="0 0 140 140" style="flex-shrink:0;">
          ${paths}
          <circle cx="70" cy="70" r="34" fill="#fff"/>
          <text x="70" y="66" text-anchor="middle" font-size="18" font-weight="800" fill="#0A2E23">${total}</text>
          <text x="70" y="82" text-anchor="middle" font-size="9" fill="#6B7280">ítems</text>
        </svg>
        <div style="flex:1;">${legend}</div>
      </div>`;
  }

  function _buildPdfResultadosDiagnostico() {
    const { rated, d, r, b, critList } = _resultadosData();
    if (!rated.length) {
      return `<div style="border:1px solid #E5E7EB;border-radius:8px;padding:16px;text-align:center;color:#6B7280;font-size:11px;">
        Aún no hay ítems calificados. Guarda el diagnóstico con al menos una calificación para ver resultados aquí.</div>`;
    }

    const estNombre = _escAttr(_draftVal('inp-nombre') || 'Establecimiento');
    const estNit    = _escAttr(_draftVal('inp-nit') || '—');
    const fecha     = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

    const resumenTable = `
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead><tr style="background:#0A7350;color:#fff;">
          <th style="padding:8px;text-align:left;">Indicador</th>
          <th style="padding:8px;text-align:center;width:90px;">Cantidad</th>
          <th style="padding:8px;text-align:left;">Estado</th>
        </tr></thead>
        <tbody>
          <tr style="background:#fff;">
            <td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;">Aspectos deficientes</td>
            <td style="padding:8px;border-bottom:1px solid #E5E7EB;text-align:center;font-weight:700;color:#991B1B;">${d.length}</td>
            <td style="padding:8px;border-bottom:1px solid #E5E7EB;"><span class="chip chip-d">Crítico</span></td>
          </tr>
          <tr style="background:#F9FAFB;">
            <td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;">Aspectos regulares</td>
            <td style="padding:8px;border-bottom:1px solid #E5E7EB;text-align:center;font-weight:700;color:#D97706;">${r.length}</td>
            <td style="padding:8px;border-bottom:1px solid #E5E7EB;"><span class="chip chip-r">Por mejorar</span></td>
          </tr>
          <tr style="background:#fff;">
            <td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;">Aspectos en buen estado</td>
            <td style="padding:8px;border-bottom:1px solid #E5E7EB;text-align:center;font-weight:700;color:#065F46;">${b.length}</td>
            <td style="padding:8px;border-bottom:1px solid #E5E7EB;"><span class="chip chip-b">Conforme</span></td>
          </tr>
        </tbody>
      </table>`;

    const docHeader = `
      <div style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;margin-bottom:12px;">
        <div style="background:#0A7350;color:#fff;padding:12px 14px;">
          <div style="font-size:9px;letter-spacing:0.1em;text-transform:uppercase;opacity:0.85;">
            ECODESA · SaniCheck · Documento oficial</div>
          <div style="font-size:14px;font-weight:700;margin-top:4px;letter-spacing:-0.01em;">
            Resultado del Diagnóstico Inicial</div>
        </div>
        <div style="padding:10px 14px;background:#F9FAFB;border-bottom:1px solid #E5E7EB;
          font-size:10px;color:#6B7280;line-height:1.6;">
          <strong style="color:#0A2E23;">Establecimiento:</strong> ${estNombre}<br>
          <strong style="color:#0A2E23;">NIT:</strong> ${estNit} ·
          <strong style="color:#0A2E23;">Fecha de consulta:</strong> ${fecha}
        </div>
        <div style="padding:12px 14px;font-size:10px;color:#6B7280;font-style:italic;
          border-bottom:1px solid #E5E7EB;">
          Resumen consolidado del perfil sanitario inicial. Los hallazgos deficientes y regulares requieren seguimiento
          según prioridad automática asignada (Alta · Media · Baja).</div>
        <div style="overflow-x:auto;">${resumenTable}</div>
      </div>`;

    if (!critList.length) {
      return docHeader + `
        <div style="border:1px solid #065F46;border-radius:8px;overflow:hidden;">
          <div style="padding:14px 16px;background:#D1FAE5;text-align:center;">
            <div style="font-size:12px;font-weight:700;color:#065F46;margin-bottom:4px;">✓ Sin hallazgos críticos</div>
            <div style="font-size:10px;color:#065F46;">
              Mantener buenas prácticas y actualizar el diagnóstico ante cambios en infraestructura o procesos.</div>
          </div>
        </div>`;
    }

    const hallazgosRows = critList.map((it, i) => {
      const isD   = it.calificacion === 'D';
      const chip  = isD ? 'chip-d' : 'chip-r';
      const label = isD ? 'Deficiente' : 'Regular';
      return `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#F9FAFB'};">
          <td style="padding:8px;border-bottom:1px solid #E5E7EB;color:#6B7280;font-weight:600;">${i + 1}</td>
          <td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;">${_escAttr(it.texto)}</td>
          <td style="padding:8px;border-bottom:1px solid #E5E7EB;"><span class="chip ${chip}">${label}</span></td>
          <td style="padding:8px;border-bottom:1px solid #E5E7EB;color:#6B7280;">${_escAttr(it.prioridad || '—')}</td>
          <td style="padding:8px;border-bottom:1px solid #E5E7EB;color:#374151;">${_escAttr(it.accion || it.condicion || '—')}</td>
        </tr>`;
    }).join('');

    const hallazgosTable = `
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead><tr style="background:#0A7350;color:#fff;">
          <th style="padding:8px;text-align:left;width:28px;">#</th>
          <th style="padding:8px;text-align:left;">Aspecto evaluado</th>
          <th style="padding:8px;text-align:left;width:88px;">Calificación</th>
          <th style="padding:8px;text-align:left;width:72px;">Prioridad</th>
          <th style="padding:8px;text-align:left;">Acción requerida</th>
        </tr></thead>
        <tbody>${hallazgosRows}</tbody>
      </table>`;

    return docHeader + `
      <div style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:space-between;
          padding:10px 12px;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">
          <span style="font-size:12px;font-weight:700;color:#0A2E23;">
            Hallazgos Prioritarios (${critList.length})</span>
          <span style="font-size:10px;color:#6B7280;">
            ${d.length} crítico${d.length !== 1 ? 's' : ''} · ${r.length} por mejorar</span>
        </div>
        <div style="overflow-x:auto;">${hallazgosTable}</div>
      </div>`;
  }

  function _buildDashboardPdfHtml() {
    const est     = _currentEst();
    const nombre  = _draftVal('inp-nombre') || 'Establecimiento';
    const nit     = _draftVal('inp-nit') || '—';
    const ciudad  = _draftVal('inp-ciudad') || '';
    const fechaGen = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const saved   = DiagnosticoInicial.getDiagnostico(est);
    const catalog = saved.catalog;
    const catMap  = Object.fromEntries(catalog.map(c => [c.id, c]));
    const rated   = saved.items
      .map(it => ({
        ...it,
        texto: catMap[it.id]?.texto || '',
        norma: catMap[it.id]?.norma || '',
      }))
      .filter(it => it.calificacion);
    const b  = rated.filter(it => it.calificacion === 'B').length;
    const r  = rated.filter(it => it.calificacion === 'R').length;
    const d  = rated.filter(it => it.calificacion === 'D').length;
    const na = rated.filter(it => it.calificacion === 'NA').length;
    const pct = _calcDiagPct(rated);
    const estG = _estadoGeneral(pct);

    const v    = _venc || Vencimientos.getVencimientos(est);
    const dash = Vencimientos.getDashboard(v);
    const persRows = Vencimientos.getPersonalRows(v, '').filter(row => row.itemId !== 'cedula');
    const eqRows   = Vencimientos.getEquiposRows(v, '');
    const persCnt  = _countVencEstados(persRows);
    const eqCnt    = _countVencEstados(eqRows);

    const responsable = _draftVal('inp-responsable') || _draftVal('inp-inspector') || '—';
    const proxVisita  = _proximaVisita(v, dash);

    const proxRows = dash.proximos30.length
      ? dash.proximos30.slice(0, 6).map(p => `
        <tr>
          <td>${_escAttr(p.grupo)}</td>
          <td>${_escAttr(p.ref)}</td>
          <td>${_escAttr(p.detalle)}</td>
          <td>${_fmtVencFecha(p.fecha)}</td>
          <td><span class="chip chip-${p.estado === 'vencido' ? 'd' : 'r'}">${p.estado === 'vencido' ? 'Vencido' : 'Por vencer'}</span></td>
        </tr>`).join('')
      : `<tr><td colspan="5" style="text-align:center;color:#065F46;padding:12px;">Sin vencimientos próximos (30 días)</td></tr>`;

    return `
      <div class="hdr">
        <div class="hdr-title">${_escAttr(nombre)}</div>
        <div class="hdr-sub">${ciudad ? _escAttr(ciudad) + ' · ' : ''}NIT ${_escAttr(nit)}</div>
        <div class="hdr-date">Dashboard Ejecutivo · Generado ${fechaGen}</div>
      </div>

      <div class="main-section">
        <div class="main-section-title">Sección 1 · Resultados del Diagnóstico Inicial</div>
        <div class="main-section-body">
          <div class="sub-section-h">Indicadores clave</div>
          <div class="kpi-grid kpi-grid-2">
            <div class="kpi" style="border-top:3px solid #0A7350;">
              <div class="kpi-lbl">Cumplimiento general</div>
              <div class="kpi-val" style="color:#0A7350;">${pct}%</div>
              <div class="kpi-sub">${estG.label}</div>
            </div>
            <div class="kpi" style="border-top:3px solid #0E86C8;">
              <div class="kpi-lbl">Aspectos evaluados</div>
              <div class="kpi-val" style="color:#0E86C8;">${rated.length}</div>
              <div class="kpi-sub">de ${catalog.length} ítems diagnóstico</div>
            </div>
          </div>

          <div class="sub-section-h">Distribución B / R / D / N·A</div>
          <div class="panel">
            ${_buildDonutSvg({ B: b, R: r, D: d, NA: na })}
          </div>

          <div class="sub-section-h">Cuadro de resultados</div>
          ${_buildPdfResultadosDiagnostico()}
        </div>
      </div>

      <div class="main-section main-section-break">
        <div class="main-section-title">Sección 2 · Control de Vencimientos</div>
        <div class="main-section-body">
          <div class="sub-section-h">Personal</div>
          <div class="venc-section-summary">
            <span class="chip chip-b">${persCnt.vigente} vigentes</span>
            <span class="chip chip-r">${persCnt.por_vencer} por vencer</span>
            <span class="chip chip-d">${persCnt.vencido} vencidos</span>
            <span style="font-size:10px;color:#6B7280;">Vigencia documental: <strong>${dash.pctPersonal}%</strong></span>
          </div>
          <div class="venc-section-body">${_buildPdfVencPersonalBlocks(v)}</div>

          <div class="sub-section-h sub-section-gap">Equipos</div>
          <div class="venc-section-summary">
            <span class="chip chip-b">${eqCnt.vigente} vigentes</span>
            <span class="chip chip-r">${eqCnt.por_vencer} por vencer</span>
            <span class="chip chip-d">${eqCnt.vencido} vencidos</span>
            <span style="font-size:10px;color:#6B7280;">Vigencia calibración: <strong>${dash.pctEquipos}%</strong></span>
          </div>
          <div class="venc-section-body">${_buildPdfVencEquiposBlocks(v)}</div>

          <div class="sub-section-h sub-section-gap">Resumen próximos vencimientos</div>
          <div class="panel" style="margin-bottom:0;">
            <table>
              <thead><tr><th>Grupo</th><th>Referencia</th><th>Documento</th><th>Fecha</th><th>Estado</th></tr></thead>
              <tbody>${proxRows}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="footer">
        <div class="footer-col">
          <div class="footer-lbl">Responsable / Profesional</div>
          <div class="footer-val">${_escAttr(responsable)}</div>
          <div class="footer-line"></div>
          <div style="font-size:9px;color:#9CA3AF;margin-top:4px;">Firma</div>
        </div>
        <div class="footer-col">
          <div class="footer-lbl">Próxima visita sugerida</div>
          <div class="footer-val">${_fmtVencFecha(proxVisita)}</div>
        </div>
        <div class="footer-col" style="text-align:right;">
          <div style="font-size:9px;color:#9CA3AF;">SaniCheck · Planificar</div>
          <div style="font-size:9px;color:#9CA3AF;margin-top:2px;">Documento consolidado — estado actual</div>
        </div>
      </div>`;
  }

  function exportarDashboardPDF() {
    if (!_venc) _venc = Vencimientos.getVencimientos(_currentEst());
    const win = window.open('', '_blank');
    if (!win) { Router.toast('Permite ventanas emergentes para exportar PDF'); return; }
    const body = _buildDashboardPdfHtml();
    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Dashboard Ejecutivo</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Segoe UI',Arial,sans-serif;padding:20px;padding-top:58px;color:#0A2E23;background:#F8FAFC;font-size:11px;}
        .hdr{background:linear-gradient(135deg,#0A2E23 0%,#0A7350 100%);color:#fff;padding:20px 24px;border-radius:12px;margin-bottom:16px;}
        .hdr-title{font-size:20px;font-weight:800;letter-spacing:-0.02em;}
        .hdr-sub{font-size:11px;opacity:0.85;margin-top:4px;}
        .hdr-date{font-size:10px;opacity:0.65;margin-top:8px;}
        .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;}
        .kpi-grid-2{grid-template-columns:repeat(2,1fr);}
        .main-section{margin-bottom:20px;}
        .main-section-title{font-size:13px;font-weight:800;color:#fff;background:linear-gradient(90deg,#0A2E23,#0A7350);
          padding:12px 16px;border-radius:10px 10px 0 0;text-transform:uppercase;letter-spacing:0.07em;}
        .main-section-body{background:#fff;border:2px solid #0A7350;border-top:none;border-radius:0 0 10px 10px;padding:16px;}
        .main-section-break{margin-top:24px;border-top:4px solid #0A7350;padding-top:0;}
        .sub-section-h{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#0A7350;
          margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid #D1FAE5;}
        .sub-section-gap{margin-top:18px;padding-top:4px;}
        .kpi{background:#fff;border-radius:10px;padding:14px;box-shadow:0 2px 8px rgba(10,46,35,0.06);}
        .kpi-lbl{font-size:9px;text-transform:uppercase;letter-spacing:0.06em;color:#6B7280;font-weight:600;}
        .kpi-val{font-size:26px;font-weight:800;line-height:1.1;margin:6px 0 2px;}
        .kpi-sub{font-size:9px;color:#9CA3AF;}
        .row-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;}
        .panel{background:#fff;border-radius:10px;padding:14px;box-shadow:0 2px 8px rgba(10,46,35,0.06);margin-bottom:12px;}
        .panel-h{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#0A7350;
          margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #E5E7EB;}
        table{width:100%;border-collapse:collapse;font-size:10px;}
        th{background:#0A7350;color:#fff;padding:7px 8px;text-align:left;font-weight:600;}
        td{padding:7px 8px;border-bottom:1px solid #E5E7EB;color:#374151;}
        tr:nth-child(even) td{background:#F9FAFB;}
        .chip{display:inline-block;padding:2px 8px;border-radius:99px;font-size:9px;font-weight:700;}
        .chip-b{background:#D1FAE5;color:#065F46;}
        .chip-r{background:#FEF3C7;color:#92400E;}
        .chip-d{background:#FEE2E2;color:#991B1B;}
        .mini-kpis{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
        .venc-section{margin-bottom:0;}
        .venc-section-title{font-size:12px;font-weight:800;color:#fff;background:linear-gradient(90deg,#0A7350,#0A2E23);
          padding:10px 14px;border-radius:8px 8px 0 0;text-transform:uppercase;letter-spacing:0.06em;}
        .venc-section-summary{font-size:10px;color:#6B7280;padding:8px 14px;background:#F9FAFB;
          border:1px solid #E5E7EB;border-bottom:none;display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:0;}
        .venc-section-body{background:#fff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 10px 10px;padding:14px;margin-bottom:14px;}
        .venc-entity{margin-bottom:4px;}
        .venc-entity-gap{margin-top:14px;padding-top:14px;border-top:1px dashed #D1D5DB;}
        .venc-entity-hdr{background:#F0FDF4;border-left:4px solid #0A7350;padding:8px 12px;margin-bottom:8px;border-radius:0 6px 6px 0;}
        .venc-entity-name{font-size:12px;font-weight:700;color:#0A2E23;display:block;}
        .venc-entity-meta{font-size:10px;color:#6B7280;}
        .venc-tbl{width:100%;border-collapse:collapse;font-size:10px;}
        .venc-tbl th{background:#E8F5F0;color:#0A2E23;padding:6px 8px;text-align:left;font-weight:600;}
        .venc-tbl td{padding:6px 8px;border-bottom:1px solid #E5E7EB;color:#374151;}
        .venc-tbl tr:nth-child(even) td{background:#F9FAFB;}
        .venc-empty{padding:16px;text-align:center;color:#6B7280;font-size:11px;}
        .footer{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:16px;padding-top:14px;
          border-top:2px solid #0A7350;}
        .footer-lbl{font-size:9px;text-transform:uppercase;color:#6B7280;letter-spacing:0.04em;}
        .footer-val{font-size:12px;font-weight:700;color:#0A2E23;margin-top:4px;}
        .footer-line{border-bottom:1px solid #9CA3AF;margin-top:28px;}
        .toolbar{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;gap:12px;
          padding:10px 16px;background:#0A2E23;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.15);}
        .toolbar button{padding:8px 18px;border:none;border-radius:6px;background:#52B788;color:#0A2E23;
          font-size:13px;font-weight:700;cursor:pointer;}
        @media print{
          .no-print{display:none!important;}
          body{padding-top:12px;background:#fff;}
          .panel,.kpi{box-shadow:none;border:1px solid #E5E7EB;}
          .main-section-break{page-break-before:always;border-top:none;margin-top:0;}
          .main-section{page-break-inside:avoid;}
          .venc-entity{page-break-inside:avoid;}
        }
      </style></head><body>
      <div class="toolbar no-print">
        <button type="button" onclick="volverDash()">← Volver</button>
        <span style="font-size:13px;font-weight:600;flex:1;">Dashboard Ejecutivo</span>
      </div>
      ${body}
      <script>
        function volverDash() {
          try { if (window.opener) window.opener.focus(); } catch (e) {}
          window.close();
        }
        setTimeout(function(){window.print();},500);
      </script></body></html>`);
    win.document.close();
  }

  function verSoporteVenc(itemId, trabajadorId) {
    if (!_venc) return;
    const arch = Vencimientos.getArchivo(_venc, itemId, trabajadorId || null);
    if (!arch || !arch.data) { Router.toast('Sin soporte adjunto'); return; }
    const win = window.open('', '_blank');
    if (!win) { Router.toast('Permite ventanas emergentes para ver el soporte'); return; }
    const isImg = (arch.tipo || '').startsWith('image/');
    if (isImg) {
      win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${_escAttr(arch.nombre)}</title>
        <style>body{margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;}
        img{max-width:100%;max-height:100vh;object-fit:contain;}</style></head>
        <body><img src="${arch.data}" alt="Soporte"></body></html>`);
    } else {
      win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${_escAttr(arch.nombre)}</title>
        <style>body{margin:0;}iframe{border:0;width:100vw;height:100vh;}</style></head>
        <body><iframe src="${arch.data}"></iframe></body></html>`);
    }
    win.document.close();
  }

  function subirSoporteVenc(itemId, trabajadorId) {
    let inp = document.getElementById('_venc-soporte-input');
    if (!inp) {
      inp = document.createElement('input');
      inp.type = 'file';
      inp.id = '_venc-soporte-input';
      inp.accept = 'image/*,application/pdf';
      inp.style.display = 'none';
      inp.addEventListener('change', _onSoporteVenc);
      document.body.appendChild(inp);
    }
    inp.dataset.itemId = itemId;
    inp.dataset.trabajadorId = trabajadorId || '';
    inp.value = '';
    inp.click();
  }

  function _onSoporteVenc(e) {
    const file         = e.target.files[0];
    const itemId       = e.target.dataset.itemId;
    const trabajadorId = e.target.dataset.trabajadorId || null;
    if (!file || !itemId || !_venc) return;
    if (file.size > 3 * 1024 * 1024) {
      Router.toast('Archivo muy grande (máx. 3 MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = function(ev) {
      Vencimientos.setArchivo(_venc, itemId, {
        nombre: file.name,
        tipo: file.type || 'application/octet-stream',
        data: ev.target.result,
        subido_en: new Date().toISOString(),
      }, trabajadorId || null);
      _guardarVencAuto();
      Router.toast('Soporte adjuntado');
    };
    reader.readAsDataURL(file);
  }

  function eliminarSoporteVenc(itemId, trabajadorId) {
    if (!_venc) return;
    Vencimientos.setArchivo(_venc, itemId, null, trabajadorId || null);
    _guardarVencAuto();
    Router.toast('Soporte eliminado');
  }

  function actualizarVenc(campo, valor) {
    if (!_venc) return;
    _venc[campo] = valor;
    const tr = (_venc.trabajadores || []).find(t => t.id === 'tr-default');
    if (tr && campo.endsWith('_fecha')) {
      if (!tr.documentos) tr.documentos = {};
      tr.documentos[campo] = valor;
    }
    _refreshVencBody();
  }

  function guardarVencimientos() {
    if (!_venc) return;
    _vencEst = _currentEst();
    _venc = Vencimientos.saveVencimientos(_vencEst, _venc);
    _vencNotified = false;
    Router.toast('Vencimientos guardados');
    _syncAccordion();
    _mostrarNotificacionesVenc();
  }

  function _renderGeneralForm() {
    return `
      <form class="form-screen" id="form-planificar" novalidate style="padding:0;">
        <div class="form-group">
          <label class="form-label" for="inp-nombre">Nombre / Razón Social *</label>
          <input class="form-input" type="text" id="inp-nombre"
            placeholder="Ej: Restaurante El Rincón Costeño" autocomplete="organization" required
            value="${_fv('inp-nombre')}">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-nit">NIT / CC Propietario *</label>
          <input class="form-input" type="text" id="inp-nit"
            placeholder="Ej: 800.123.456-7" inputmode="numeric" required
            value="${_fv('inp-nit')}">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-direccion">Dirección *</label>
          <input class="form-input" type="text" id="inp-direccion"
            placeholder="Ej: Cra. 10 # 20-30, Cartagena" required
            value="${_fv('inp-direccion')}">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-barrio">Barrio / Localidad</label>
          <input class="form-input" type="text" id="inp-barrio"
            placeholder="Ej: Bocagrande" value="${_fv('inp-barrio')}">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-ciudad">Ciudad / Municipio</label>
          <input class="form-input" type="text" id="inp-ciudad"
            placeholder="Ej: Cartagena de Indias" value="${_fv('inp-ciudad')}">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-telefono">Teléfono / WhatsApp</label>
          <input class="form-input" type="tel" id="inp-telefono"
            placeholder="Ej: 300 123 4567" inputmode="tel" value="${_fv('inp-telefono')}">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-correo">Correo electrónico</label>
          <input class="form-input" type="email" id="inp-correo"
            placeholder="Ej: contacto@empresa.com" value="${_fv('inp-correo')}">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-representante">Representante Legal</label>
          <input class="form-input" type="text" id="inp-representante"
            placeholder="Nombre del representante legal" value="${_fv('inp-representante')}">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-ciiu">Actividad Económica (CIIU)</label>
          <input class="form-input" type="text" id="inp-ciiu"
            placeholder="Ej: 5610 - Expendio a la mesa" value="${_fv('inp-ciiu')}">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-tipo">Tipo de establecimiento *</label>
          <select class="form-select" id="inp-tipo" required>
            <option value="">Seleccionar tipo…</option>
            <option value="Alimentos">Restaurante / Comedor / Alimentos</option>
            <option value="Manufactura">Planta de Manufactura</option>
            <option value="Bodega">Bodega / Almacén</option>
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
            placeholder="Ej: Mañana y tarde" value="${_fv('inp-turnos')}">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-raciones">Volumen diario de raciones servidas</label>
          <input class="form-input" type="number" id="inp-raciones"
            placeholder="Ej: 500" inputmode="numeric" min="0" value="${_fv('inp-raciones')}">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-empresa-cliente">Empresa cliente / contratante</label>
          <input class="form-input" type="text" id="inp-empresa-cliente"
            placeholder="Ej: Industrias del Caribe S.A.S." value="${_fv('inp-empresa-cliente')}">
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
          <input class="form-input" type="date" id="inp-fecha-elaboracion" value="${_fv('inp-fecha-elaboracion') || _hoy()}">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-fecha-vigencia">Fecha de vigencia</label>
          <input class="form-input" type="date" id="inp-fecha-vigencia" value="${_fv('inp-fecha-vigencia')}">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-version-doc">Versión del documento</label>
          <input class="form-input" type="text" id="inp-version-doc" value="${_fv('inp-version-doc') || '1.0'}">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-responsable-cocina">Responsable — Personal de Cocina/Manipulación</label>
          <input class="form-input" type="text" id="inp-responsable-cocina"
            placeholder="Nombre de quien vela por BPM en cocina y almacenamiento" value="${_fv('inp-responsable-cocina')}">
        </div>

        <div class="form-label" style="margin-top:var(--sp-md);font-weight:700;">Datos de la inspección</div>
        <div class="form-group">
          <label class="form-label" for="inp-responsable">Administrador / Responsable PSB</label>
          <input class="form-input" type="text" id="inp-responsable"
            placeholder="Nombre del administrador / responsable PSB" value="${_fv('inp-responsable')}">
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-inspector">Profesional *</label>
          <input class="form-input" type="text" id="inp-inspector"
            value="${_fv('inp-inspector') || 'Ing. Ambiental'}" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-fecha">Fecha de inspección</label>
          <input class="form-input" type="date" id="inp-fecha" value="${_fv('inp-fecha') || _hoy()}" required>
        </div>
      </form>`;
  }

  function _renderDiagnosticoBody(items) {
    const catalog = _diagCatalog || DiagnosticoInicial.getCatalog(_currentEst());
    const total     = catalog.length || 1;
    const idx       = Math.min(_diagIdx, total - 1);
    const def       = catalog[idx];
    const it        = items.find(x => x.id === def?.id) || items[idx];
    const evaluados = DiagnosticoInicial.contarCompletados(items);
    const pct       = Math.round((evaluados / total) * 100);
    const desc      = def?.descripcion || def?.texto || '';

    return `
      <div style="display:flex;justify-content:flex-end;margin-bottom:var(--sp-sm);">
        <button type="button" class="btn btn-outline" style="width:auto;padding:8px 14px;font-size:var(--text-xs);
          display:inline-flex;align-items:center;gap:6px;"
          data-p-act="abrirDiagItemModal">
          ${AppIcons.row('sliders', 'Editar/Agregar ítem', 12)}
        </button>
      </div>

      <div class="progress-label">
        <span>Aspecto <strong>${idx + 1}</strong> de <strong>${total}</strong></span>
        <span style="color:${pct === 100 ? 'var(--color-bueno)' : 'var(--color-ink3)'};">
          ${evaluados}/${total} evaluados · ${pct}%</span>
      </div>
      <div class="progress-bar" style="margin-bottom:var(--sp-md);">
        <div class="progress-fill" style="width:${pct || 2}%"></div>
      </div>

      <div class="aspecto-texto">${_escAttr(def?.texto || '')}</div>
      <div style="font-size:var(--text-sm);color:var(--color-ink3);line-height:1.55;margin-bottom:var(--sp-sm);text-align:justify;">
        ${_escAttr(desc)}</div>
      <div class="norma-badge">${AppIcons.icon('scale', 12)} ${_escAttr(def?.norma || '')}</div>

      <div class="eval-group">
        ${['B', 'R', 'D', 'NA'].map(v => `
          <button type="button" class="eval-btn eval-btn-${v}${it?.calificacion === v ? ' selected' : ''}"
            data-p-act="diagEvaluar" data-p-v="${v}">
            <span class="eval-letter">${v === 'NA' ? 'N/A' : v}</span>
            <span class="eval-word">${v === 'B' ? 'BUENO' : v === 'R' ? 'REGULAR' : v === 'D' ? 'DEFIC.' : 'NO APLICA'}</span>
          </button>`).join('')}
      </div>

      ${it?.calificacion === 'NA' ? `
        <div style="padding:14px;background:#F3F4F6;border-radius:var(--radius-md);
          text-align:center;color:#6B7280;font-size:13px;border:1px solid #E5E7EB;">
          ${AppIcons.row('info', 'No aplica a este establecimiento', 12)}
        </div>
      ` : it?.calificacion ? `
        ${(it.calificacion === 'R' || it.calificacion === 'D') ? `
          <label class="form-label" for="di-cond-${_escAttr(def.id)}">Condición encontrada</label>
          <input class="form-input" type="text" id="di-cond-${_escAttr(def.id)}" value="${_escAttr(it.condicion)}"
            placeholder="Describa brevemente la condición observada"
            data-p-change="actualizarDiagItem" data-p-id="${_escAttr(def.id)}" data-p-campo="condicion" style="margin-bottom:8px;">

          <label class="form-label" for="di-accion-${_escAttr(def.id)}">Acción requerida</label>
          <input class="form-input" type="text" id="di-accion-${_escAttr(def.id)}" value="${_escAttr(it.accion)}"
            placeholder="Indique la acción correctiva sugerida"
            data-p-change="actualizarDiagItem" data-p-id="${_escAttr(def.id)}" data-p-campo="accion" style="margin-bottom:8px;">` : ''}
      ` : `
        <div style="padding:20px;background:var(--color-surface);border-radius:var(--radius-md);
          text-align:center;color:var(--color-ink3);font-size:13px;
          border:1px dashed var(--color-border);">
          Seleccione B / R / D / N·A para registrar la calificación
        </div>`}

      <div class="checklist-nav" style="margin:var(--sp-md) calc(-1 * var(--sp-md)) 0;padding:var(--sp-md) 0 0;">
        <button type="button" class="btn btn-outline nav-prev" style="width:auto;padding:10px 16px;"
          data-p-act="diagNavegar" data-p-dir="-1"${idx === 0 ? ' disabled' : ''}>${AppIcons.row('arrowLeft', 'Anterior', 14)}</button>
        <div class="nav-counter">${idx + 1} / ${total}</div>
        <button type="button" class="btn ${idx === total - 1 ? 'btn-primary' : 'btn-accent'} nav-next"
          style="width:auto;padding:10px 16px;"
          data-p-act="diagNavegar" data-p-dir="1">
          ${idx === total - 1 ? AppIcons.row('check', 'Guardar', 14) : AppIcons.row('arrowRight', 'Siguiente', 14)}</button>
      </div>

      <div style="margin-top:var(--sp-sm);font-size:var(--text-xs);color:var(--color-ink3);text-align:justify;">
        Este diagnóstico debe actualizarse anualmente o tras cambios significativos en infraestructura o procesos.
      </div>`;
  }

  function _refreshDiagnosticoBody() {
    const inner = document.querySelector('#acc-body-diagnostico .acc-body-inner');
    if (inner && _diagItems) inner.innerHTML = _renderDiagnosticoBody(_diagItems);
  }

  function diagEvaluar(valor) {
    if (!_diagItems || !_diagCatalog) return;
    const def = _diagCatalog[_diagIdx];
    if (!def) return;
    const it  = _diagItems.find(x => x.id === def.id);
    if (!it) return;
    it.calificacion = valor;
    if (valor === 'NA') {
      it.condicion = '';
      it.accion    = '';
    }
    it.prioridad = DiagnosticoInicial.prioridadAuto(valor);
    _setCardState('diagnostico', _diagOpen, _diagBadgeInfo());
    _syncResultados();
    _refreshDiagnosticoBody();
    _scheduleDiagSave();
    _schedulePlanificarDraft();
  }

  function diagNavegar(dir) {
    const total = (_diagCatalog || []).length;
    const next  = _diagIdx + dir;
    if (next < 0) return;
    if (next >= total) {
      if (dir > 0) guardarDiagnostico();
      return;
    }
    _diagIdx = next;
    _refreshDiagnosticoBody();
    _schedulePlanificarDraft();
  }

  function actualizarDiagItem(id, campo, valor) {
    if (!_diagItems) return;
    if (!DiagnosticoInicial.isValidId(id)) return;
    const it = _diagItems.find(x => x.id === id);
    if (it) it[campo] = valor;
    if (campo === 'calificacion') _setCardState('diagnostico', _diagOpen, _diagBadgeInfo());
    _scheduleDiagSave();
    _schedulePlanificarDraft();
  }

  function guardarDiagnostico() {
    if (!_diagItems || !_diagCatalog) return;
    _persistDiagnostico();
    Router.toast('Diagnóstico guardado');
    _syncAccordion();
  }

  function _ensureDiagItemModal() {
    if (document.getElementById('diag-item-modal')) return;
    const el = document.createElement('div');
    el.id = 'diag-item-modal';
    el.style.cssText = 'display:none;position:fixed;inset:0;z-index:2000;align-items:center;justify-content:center;padding:var(--sp-md);';
    el.innerHTML = `
      <div data-p-act="cerrarDiagItemModal" style="position:absolute;inset:0;background:rgba(10,46,35,0.45);"></div>
      <div style="position:relative;width:100%;max-width:420px;background:var(--color-white);border-radius:var(--radius-md);
        box-shadow:var(--shadow-lg);padding:var(--sp-lg);border:1px solid var(--color-border);max-height:90vh;overflow-y:auto;">
        <div style="font-size:var(--text-md);font-weight:700;color:var(--color-ink);margin-bottom:var(--sp-sm);"
          id="diag-modal-title">Editar ítem</div>
        <div style="display:flex;gap:6px;margin-bottom:var(--sp-md);">
          <button type="button" id="diag-modal-tab-edit" class="btn btn-accent" style="flex:1;padding:8px;font-size:var(--text-xs);"
            data-p-act="setDiagItemModalMode" data-p-mode="edit">Editar actual</button>
          <button type="button" id="diag-modal-tab-add" class="btn btn-outline" style="flex:1;padding:8px;font-size:var(--text-xs);"
            data-p-act="setDiagItemModalMode" data-p-mode="add">Agregar nuevo</button>
        </div>
        <div class="form-group">
          <label class="form-label" for="diag-modal-texto">Pregunta / aspecto a evaluar</label>
          <input class="form-input" type="text" id="diag-modal-texto" placeholder="Ej: Cadena de frío en almacenamiento">
        </div>
        <div class="form-group">
          <label class="form-label" for="diag-modal-norma">Referencia normativa</label>
          <input class="form-input" type="text" id="diag-modal-norma" placeholder="Ej: Dec. 3075/1997 Art. 8">
        </div>
        <div class="form-label" style="margin-bottom:8px;">Calificación</div>
        <div class="eval-group" id="diag-modal-eval" style="margin-bottom:var(--sp-md);">
          ${['B', 'R', 'D', 'NA'].map(v => `
            <button type="button" class="eval-btn eval-btn-${v}" data-cal="${v}"
              data-p-act="diagModalEvaluar" data-p-v="${v}">
              <span class="eval-letter">${v === 'NA' ? 'N/A' : v}</span>
              <span class="eval-word">${v === 'B' ? 'BUENO' : v === 'R' ? 'REGULAR' : v === 'D' ? 'DEFIC.' : 'NO APLICA'}</span>
            </button>`).join('')}
        </div>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn btn-outline" style="flex:1;padding:10px;"
            data-p-act="cerrarDiagItemModal">Cancelar</button>
          <button type="button" class="btn btn-primary" style="flex:1;padding:10px;"
            data-p-act="guardarDiagItemModal">Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(el);
  }

  function _refreshDiagModalEvalBtns() {
    document.querySelectorAll('#diag-modal-eval .eval-btn').forEach(btn => {
      const v = btn.getAttribute('data-cal');
      btn.classList.toggle('selected', v === _diagModalCal);
    });
  }

  function setDiagItemModalMode(mode) {
    _diagModalMode = mode === 'add' ? 'add' : 'edit';
    const editTab = document.getElementById('diag-modal-tab-edit');
    const addTab  = document.getElementById('diag-modal-tab-add');
    const title   = document.getElementById('diag-modal-title');
    const texto   = document.getElementById('diag-modal-texto');
    const norma   = document.getElementById('diag-modal-norma');
    if (editTab) {
      editTab.className = _diagModalMode === 'edit' ? 'btn btn-accent' : 'btn btn-outline';
      editTab.style.cssText = 'flex:1;padding:8px;font-size:var(--text-xs);';
    }
    if (addTab) {
      addTab.className = _diagModalMode === 'add' ? 'btn btn-accent' : 'btn btn-outline';
      addTab.style.cssText = 'flex:1;padding:8px;font-size:var(--text-xs);';
    }
    if (_diagModalMode === 'add') {
      if (title) title.textContent = 'Agregar ítem';
      if (texto) texto.value = '';
      if (norma) norma.value = '';
      _diagModalCal = '';
    } else {
      if (title) title.textContent = 'Editar ítem actual';
      const def = (_diagCatalog || [])[_diagIdx];
      const it  = def ? (_diagItems || []).find(x => x.id === def.id) : null;
      if (texto) texto.value = def?.texto || '';
      if (norma) norma.value = def?.norma || '';
      _diagModalCal = it?.calificacion || '';
    }
    _refreshDiagModalEvalBtns();
  }

  function abrirDiagItemModal() {
    _ensureDiagItemModal();
    _diagModalMode = 'edit';
    setDiagItemModalMode('edit');
    document.getElementById('diag-item-modal').style.display = 'flex';
  }

  function cerrarDiagItemModal() {
    const m = document.getElementById('diag-item-modal');
    if (m) m.style.display = 'none';
  }

  function diagModalEvaluar(valor) {
    _diagModalCal = valor;
    _refreshDiagModalEvalBtns();
  }

  function guardarDiagItemModal() {
    const texto = document.getElementById('diag-modal-texto')?.value.trim();
    const norma = document.getElementById('diag-modal-norma')?.value.trim();
    if (!texto || !norma) {
      Router.toast('Complete la pregunta y la referencia normativa');
      return;
    }
    if (!_diagCatalog) _diagCatalog = DiagnosticoInicial.getCatalog(_currentEst());
    if (!_diagItems) _diagItems = DiagnosticoInicial.getDiagnostico(_currentEst()).items;

    if (_diagModalMode === 'add') {
      const id = DiagnosticoInicial.newCustomId();
      _diagCatalog.push({ id, texto, norma, descripcion: texto, custom: true });
      _diagItems.push({
        id,
        condicion: '',
        calificacion: _diagModalCal || '',
        accion: '',
        prioridad: DiagnosticoInicial.prioridadAuto(_diagModalCal || ''),
      });
      _diagIdx = _diagCatalog.length - 1;
    } else {
      const def = _diagCatalog[_diagIdx];
      if (!def || !DiagnosticoInicial.isValidId(def.id)) return;
      def.texto = texto;
      def.norma = norma;
      if (!def.descripcion || def.custom) def.descripcion = texto;
      const it = _diagItems.find(x => x.id === def.id);
      if (it && _diagModalCal) {
        it.calificacion = _diagModalCal;
        if (_diagModalCal === 'NA') {
          it.condicion = '';
          it.accion    = '';
        }
        it.prioridad = DiagnosticoInicial.prioridadAuto(_diagModalCal);
      }
    }

    cerrarDiagItemModal();
    _persistDiagnostico();
    _setCardState('diagnostico', _diagOpen, _diagBadgeInfo());
    _syncResultados();
    _refreshDiagnosticoBody();
    _schedulePlanificarDraft();
    Router.toast(_diagModalMode === 'add' ? 'Ítem agregado' : 'Ítem actualizado');
  }

  function _hydrateFormFromDraft() {
    const draft = Store.getPlanificarDraft();
    if (!draft?.form) return;
    FORM_IDS.forEach(id => {
      const el = document.getElementById(id);
      const v  = draft.form[id];
      if (el && v !== undefined && v !== '') el.value = v;
    });
  }

  let _pDelegated = false;

  function _ensurePlanificarDelegation() {
    if (_pDelegated) return;
    _pDelegated = true;

    document.addEventListener('click', e => {
      const el = e.target.closest('[data-p-act]');
      if (!el) return;
      const act = el.getAttribute('data-p-act');
      if (!act) return;

      switch (act) {
        case 'toggle':
          toggle(el.getAttribute('data-p-key') || '');
          break;
        case 'marcoSub':
          marcoSub(el.getAttribute('data-p-key') || '');
          break;
        case 'exportarDashboardPDF':
          exportarDashboardPDF();
          break;
        case 'abrirDiagItemModal':
          abrirDiagItemModal();
          break;
        case 'cerrarDiagItemModal':
          cerrarDiagItemModal();
          break;
        case 'setDiagItemModalMode':
          setDiagItemModalMode(el.getAttribute('data-p-mode') || 'edit');
          break;
        case 'diagModalEvaluar':
          diagModalEvaluar(el.getAttribute('data-p-v') || '');
          break;
        case 'guardarDiagItemModal':
          guardarDiagItemModal();
          break;
        case 'diagEvaluar':
          diagEvaluar(el.getAttribute('data-p-v') || '');
          break;
        case 'diagNavegar':
          diagNavegar(Number(el.getAttribute('data-p-dir') || 0));
          break;
        case 'verSoporteVenc':
          verSoporteVenc(el.getAttribute('data-p-item') || '', el.getAttribute('data-p-tr') || '');
          break;
        case 'eliminarSoporteVenc':
          eliminarSoporteVenc(el.getAttribute('data-p-item') || '', el.getAttribute('data-p-tr') || '');
          break;
        case 'subirSoporteVenc':
          subirSoporteVenc(el.getAttribute('data-p-item') || '', el.getAttribute('data-p-tr') || '');
          break;
        case 'eliminarRequerimiento':
          eliminarRequerimiento(el.getAttribute('data-p-tr') || '', el.getAttribute('data-p-req') || '');
          break;
        case 'crearRequerimiento':
          crearRequerimiento(el.getAttribute('data-p-tr') || '');
          break;
        case 'cancelarRequerimiento':
          cancelarRequerimiento();
          break;
        case 'toggleReqForm':
          toggleReqForm();
          break;
        case 'agregarTrabajador':
          agregarTrabajador();
          break;
        case 'agregarEquipo':
          agregarEquipo();
          break;
        case 'vencV2Tab':
        case 'v2RefreshDashboard':
        case 'v2AbrirModal':
        case 'v2CerrarModal':
        case 'v2GuardarModal':
        case 'v2Descargar':
        case 'v2Editar':
        case 'v2Eliminar':
        case 'v2Reemplazar':
          if (VencimientosDashboard.handleAction(act, el)) {
            _schedulePlanificarDraft();
          }
          break;
        case 'vencTab':
          vencTab(el.getAttribute('data-p-tab') || '');
          break;
        case 'guardarVencimientos':
          guardarVencimientos();
          break;
        default:
          break;
      }
    });

    document.addEventListener('change', e => {
      const el = e.target.closest('[data-p-change]');
      if (!el) return;
      const act = el.getAttribute('data-p-change');
      if (act === 'actualizarTrabajador') {
        actualizarTrabajador(el.getAttribute('data-p-tr') || '', el.getAttribute('data-p-campo') || '', el.value);
      } else if (act === 'actualizarRequerimiento') {
        const campo = el.getAttribute('data-p-campo') || '';
        const valor = el.type === 'checkbox' ? !!el.checked : el.value;
        actualizarRequerimiento(el.getAttribute('data-p-tr') || '', el.getAttribute('data-p-req') || '', campo, valor);
      } else if (act === 'actualizarEquipo') {
        actualizarEquipo(el.getAttribute('data-p-eq') || '', el.getAttribute('data-p-campo') || '', el.value);
      } else if (act === 'actualizarDiagItem') {
        actualizarDiagItem(el.getAttribute('data-p-id') || '', el.getAttribute('data-p-campo') || '', el.value);
      } else if (act === 'toggleReqSinVencNuevo') {
        toggleReqSinVencNuevo(!!el.checked);
      }
    });

    document.addEventListener('input', e => {
      const el = e.target.closest('[data-p-input]');
      if (!el) return;
      if (el.getAttribute('data-p-input') === 'vencFiltro') vencFiltro(el.value);
    });
  }

  function attach() {
    _ensurePlanificarDelegation();
    const form = document.getElementById('form-planificar');
    if (form) {
      form.addEventListener('submit', _submit);
      _hydrateFormFromDraft();
      const onDraft = () => _schedulePlanificarDraft();
      form.addEventListener('input', onDraft);
      form.addEventListener('change', onDraft);
    }
  }

  function _submit(e) {
    e.preventDefault();
    const val = id => document.getElementById(id)?.value.trim() || '';

    const nombre    = val('inp-nombre');
    const nit       = val('inp-nit');
    const direccion = val('inp-direccion');
    const tipo      = val('inp-tipo');

    if (!nombre || !nit || !direccion || !tipo) {
      Router.toast('Complete los campos obligatorios (*)');
      return;
    }

    const establecimiento = {
      nombre, nit, direccion, tipo,
      responsable_sanitario: val('inp-responsable'),
      responsable_cocina: val('inp-responsable-cocina'),
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
    Store.clearPlanificarDraft();
    Store.setUI({ aspectoIdx: 0, programaIdx: 0 });
    Router.toast('Establecimiento guardado');
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

  return { render, attach, toggle, openSection, actualizarDiagItem, guardarDiagnostico, diagEvaluar, diagNavegar, marcoSub,
    abrirDiagItemModal, cerrarDiagItemModal, setDiagItemModalMode, diagModalEvaluar, guardarDiagItemModal,
    actualizarVenc, guardarVencimientos, vencTab, vencFiltro, subirSoporteVenc, eliminarSoporteVenc, verSoporteVenc,
    agregarTrabajador, actualizarTrabajador, agregarEquipo, actualizarEquipo, exportarDashboardPDF,
    toggleReqForm, cancelarRequerimiento, crearRequerimiento, actualizarRequerimiento, eliminarRequerimiento, toggleReqSinVencNuevo };
})();
