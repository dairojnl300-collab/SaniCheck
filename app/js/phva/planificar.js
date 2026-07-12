// planificar.js — Pantalla PLANIFICAR: acordeón Datos Generales + Diagnóstico

const Planificar = (() => {

  const ICONS = {
    building: '<path d="M4 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16"/><path d="M13 10h5a1 1 0 0 1 1 1v10"/><path d="M2 21h20"/><path d="M7 8h1M10 8h1M7 12h1M10 12h1M7 16h1M10 16h1"/>',
    clipboardCheck: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2l4-4"/>',
    listCheck: '<path d="M3.5 5.5l1.5 1.5l2.5 -2.5"/><path d="M3.5 11.5l1.5 1.5l2.5 -2.5"/><path d="M3.5 17.5l1.5 1.5l2.5 -2.5"/><path d="M11 6l9 0"/><path d="M11 12l9 0"/><path d="M11 18l9 0"/>',
    scale: '<path d="M12 3v18"/><path d="M5 7l7 -4l7 4"/><path d="M5 7l-3 7a4 4 0 0 0 7 0z"/><path d="M19 7l-3 7a4 4 0 0 0 7 0z"/><path d="M7 21h10"/>',
    calendarTime: '<path d="M11.795 21h-6.795a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v4"/><path d="M14 18a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M15 3v4"/><path d="M7 3v4"/><path d="M3 11h16"/><path d="M18 16.496v1.504l1 1"/>',
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
  let _vencTab            = 'personal';
  let _vencFiltroPersonal = '';
  let _vencFiltroEquipos  = '';
  let _vencNotified       = false;
  let _marcoOpenSubs  = { general: true };
  let _diagItems      = null;
  let _diagEst        = null;
  let _diagIdx        = 0;
  let _venc           = null;
  let _vencEst        = null;

  function render() {
    if (!_diagItems) {
      _diagEst   = _currentEst();
      _diagItems = DiagnosticoInicial.getDiagnostico(_diagEst).items;
    }
    if (!_venc) {
      _vencEst = _currentEst();
      _venc    = Vencimientos.getVencimientos(_vencEst);
    }

    return `
      <img src="assets/icons/isotipo-transparente.png" class="watermark-bg" alt="">
      <div class="screen-header">
        <div class="screen-fase-badge badge-P">📋 PLANIFICAR</div>
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

      <div style="margin:0 var(--sp-md);">
        <button type="submit" form="form-planificar" class="btn btn-primary">
          Iniciar Ciclo PHVA →
        </button>
      </div>

      <div style="height:32px"></div>`;
  }

  function _icon(name, color) {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.6"
      stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">${ICONS[name]}</svg>`;
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
          onclick="Planificar.toggle('${key}')">
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
      Router.toast('⚠ Guarda el diagnóstico con al menos 1 ítem calificado primero');
      return;
    }
    _generalOpen    = key === 'general'      ? !_generalOpen    : false;
    _diagOpen       = key === 'diagnostico'  ? !_diagOpen       : false;
    _resultadosOpen = key === 'resultados'   ? !_resultadosOpen : false;
    _marcoOpen      = key === 'marco'        ? !_marcoOpen      : false;
    _vencOpen       = key === 'vencimientos' ? !_vencOpen       : false;
    _syncAccordion();
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
        <div onclick="Planificar.marcoSub('${key}')" style="display:flex;align-items:center;justify-content:space-between;
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
    const items = _diagItems || DiagnosticoInicial.getDiagnostico(_diagEst || _currentEst()).items;
    const completados = DiagnosticoInicial.contarCompletados(items);
    if (completados === 13) return { text: 'Completado', cls: 'estado-chip estado-B', style: '' };
    if (completados > 0)    return { text: `${completados} de 13 completados`, cls: 'estado-chip estado-R', style: '' };
    return { text: 'Pendiente', cls: '', style: _pendienteStyle() };
  }

  function _currentEst() {
    return { nombre: _val('inp-nombre'), nit: _val('inp-nit') };
  }

  function _resultadosData() {
    const saved = DiagnosticoInicial.getDiagnostico(_currentEst()).items;
    const rated = saved
      .map((it, i) => ({ ...it, texto: DiagnosticoInicial.ITEMS[i].texto }))
      .filter(it => it.calificacion);
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
            <div style="font-size:var(--text-sm);font-weight:700;color:var(--color-bueno);margin-bottom:4px;">
              ✓ Sin hallazgos críticos</div>
            <div style="font-size:var(--text-xs);color:var(--color-ink3);">
              Mantener buenas prácticas y actualizar el diagnóstico ante cambios en infraestructura o procesos.</div>
          </div>
        </div>`;
    }

    return docHeader + `
      <div style="border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:space-between;
          padding:10px 12px;background:var(--color-surface);border-bottom:1px solid var(--color-border);">
          <span style="font-size:var(--text-sm);font-weight:700;color:var(--color-ink);">
            Hallazgos prioritarios (${critList.length})</span>
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

  function _mostrarNotificacionesVenc() {
    if (!_venc || _vencNotified) return;
    const dash = Vencimientos.getDashboard(_venc);
    if (dash.notificaciones.length) {
      Router.toast(`⚠ ${dash.notificaciones.length} alerta(s) de vencimiento — revisar dashboard`);
      _vencNotified = true;
    }
  }

  function _vencBadgeInfo() {
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
        </div>` : `<div style="padding:10px 14px;font-size:var(--text-xs);color:var(--color-bueno);">✓ Sin alertas de vencimiento</div>`}
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
            const alerta = !r.sinVencimiento && r.estado === 'por_vencer' ? ' ⚠' : '';
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
        <button type="button" onclick="Planificar.verSoporteVenc('${itemId}','${trId}')"
          style="padding:2px 8px;font-size:10px;border:1px solid var(--color-border);border-radius:4px;
            background:#fff;cursor:pointer;color:var(--emerald-2);">Ver</button>
        <button type="button" onclick="Planificar.eliminarSoporteVenc('${itemId}','${trId}')"
          style="padding:2px 8px;font-size:10px;border:1px solid var(--color-border);border-radius:4px;
            background:#fff;cursor:pointer;color:var(--color-deficiente);">✕</button>
      </div>`;
    if (isImg) {
      return `<div style="margin-top:8px;border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;">
        <img src="${arch.data}" alt="Vista previa" style="width:100%;max-height:140px;object-fit:contain;background:#f8faf9;display:block;">
        ${bar}</div>`;
    }
    return `<div style="margin-top:8px;border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;">
      <div style="padding:16px 12px;text-align:center;background:#f8faf9;">
        <div style="font-size:28px;line-height:1;">📄</div>
        <div style="font-size:11px;color:var(--color-ink2);margin-top:4px;">${isPdf ? 'Documento PDF' : 'Archivo adjunto'}</div>
      </div>${bar}</div>`;
  }

  function _renderDocPersonalCard(v, tr, doc) {
    const arch = Vencimientos.getArchivo(v, doc.id, tr.id);
    const est  = Vencimientos.estadoDocPersonal(doc, tr);
    const st   = _vencEstadoLabel(est.estado);
    const docs = tr.documentos || {};
    const alerta = est.estado === 'por_vencer'
      ? `<div style="margin-top:6px;font-size:10px;color:var(--color-regular);">⚠ Vence en ${est.dias} días</div>` : '';
    const periodicidad = doc.periodicidad
      ? `<span style="font-size:10px;color:var(--color-ink3);background:var(--color-surface);padding:2px 8px;border-radius:99px;">${_escAttr(doc.periodicidad)}</span>` : '';

    let campos = '';
    if (doc.soloNumero) {
      campos = `
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:10px;">Número de cédula</label>
          <input class="form-input" type="text" inputmode="numeric" pattern="[0-9]*"
            placeholder="Solo número — sin fechas ni vencimiento" value="${_escAttr(tr.cedula)}"
            onchange="Planificar.actualizarTrabajador('${tr.id}','cedula',this.value)">
        </div>`;
    } else if (doc.soloExp) {
      campos = `
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:10px;">Fecha expedición</label>
          <input class="form-input" type="date" value="${_escAttr(docs[doc.expId] || '')}"
            onchange="Planificar.actualizarTrabajador('${tr.id}','${doc.expId}',this.value)">
        </div>`;
    } else {
      campos = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:10px;">Fecha expedición</label>
            <input class="form-input" type="date" value="${_escAttr(docs[doc.expId] || '')}"
              onchange="Planificar.actualizarTrabajador('${tr.id}','${doc.expId}',this.value)">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:10px;">Fecha vencimiento</label>
            <input class="form-input" type="date" value="${_escAttr(docs[doc.vencId] || '')}"
              onchange="Planificar.actualizarTrabajador('${tr.id}','${doc.vencId}',this.value)">
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
          <button type="button" onclick="Planificar.subirSoporteVenc('${doc.id}','${tr.id}')"
            style="margin-top:10px;width:100%;padding:10px;cursor:pointer;border:1.5px dashed var(--emerald-2);
              border-radius:var(--radius-md);background:rgba(10,115,80,0.06);color:var(--emerald-2);font-size:12px;font-weight:600;">
            📎 ${_escAttr(doc.archivoLabel)}${arch ? ' ✓' : ''}
          </button>
          ${_renderArchivoPreview(arch, doc.id, tr.id)}
        </div>
      </div>`;
  }

  function _vencPersonalGestion(v) {
    const tr = (v.trabajadores || [])[0];
    if (!tr) return '';
    return `
      <div style="margin-top:var(--sp-md);padding-top:var(--sp-md);border-top:1px dashed var(--color-border);">
        <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-ink3);text-transform:uppercase;
          letter-spacing:0.05em;margin-bottom:var(--sp-sm);">Registrar / editar — 4 documentos</div>
        <div class="form-group">
          <label class="form-label">Nombre del trabajador</label>
          <input class="form-input" type="text" value="${_escAttr(tr.nombre)}"
            onchange="Planificar.actualizarTrabajador('${tr.id}','nombre',this.value)">
        </div>
        ${Vencimientos.allDocsPersonal().map(doc => _renderDocPersonalCard(v, tr, doc)).join('')}
        <button type="button" class="btn btn-outline" style="width:auto;padding:8px 14px;margin-top:8px;"
          onclick="Planificar.agregarTrabajador()">+ Agregar trabajador</button>
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
            onchange="Planificar.actualizarEquipo('${eq.id}','codigo',this.value)">
        </div>
        <div class="form-group">
          <label class="form-label">Tipo de equipo</label>
          <input class="form-input" type="text" value="${_escAttr(eq.tipo)}"
            onchange="Planificar.actualizarEquipo('${eq.id}','tipo',this.value)">
        </div>
        <div class="form-group">
          <label class="form-label">Última calibración</label>
          <input class="form-input" type="date" value="${_escAttr(eq.ultima_calibracion || '')}"
            onchange="Planificar.actualizarEquipo('${eq.id}','ultima_calibracion',this.value)">
        </div>
        <div class="form-group">
          <label class="form-label">Próxima calibración</label>
          <input class="form-input" type="date" value="${_escAttr(eq.proxima_calibracion || '')}"
            onchange="Planificar.actualizarEquipo('${eq.id}','proxima_calibracion',this.value)">
        </div>
        <div class="form-group">
          <label class="form-label">Mantenimiento programado</label>
          <input class="form-input" type="date" value="${_escAttr(eq.mantenimiento_programado || '')}"
            onchange="Planificar.actualizarEquipo('${eq.id}','mantenimiento_programado',this.value)">
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
        <button type="button" class="btn btn-outline" style="width:auto;padding:8px 14px;margin-top:8px;"
          onclick="Planificar.agregarEquipo()">+ Agregar equipo</button>
      </div>`;
  }

  function _renderVencimientosBody() {
    if (!_venc) _venc = Vencimientos.getVencimientos(_currentEst());
    const v     = _venc;
    const grupo = _vencTab;
    const meta  = Vencimientos.GRUPOS[grupo];
    const res   = Vencimientos.resumenGrupo(v, grupo);
    const resSt = _vencEstadoLabel(res === 'sin_registrar' ? 'sin_registrar' : res);
    const filtroVal = grupo === 'personal' ? _vencFiltroPersonal : _vencFiltroEquipos;
    const filtroPh  = grupo === 'personal' ? 'Buscar por nombre o cédula…' : 'Buscar por código o tipo…';

    return `
      ${_vencDashboardHtml(v)}

      <div style="display:flex;gap:8px;margin-bottom:var(--sp-md);">
        ${['personal', 'equipos'].map(g => {
          const active = g === grupo;
          const m = Vencimientos.GRUPOS[g];
          return `
          <button type="button" onclick="Planificar.vencTab('${g}')"
            style="flex:1;padding:12px 10px;border-radius:var(--radius-md);cursor:pointer;
              border:2px solid ${active ? 'var(--color-accent)' : 'var(--emerald-2)'};
              background:${active ? 'var(--emerald-2)' : 'var(--emerald)'};
              font-size:var(--text-sm);font-weight:${active ? 700 : 600};color:#fff;">
            ${m.label}
          </button>`;
        }).join('')}
      </div>

      <div style="border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;margin-bottom:var(--sp-md);">
        <div style="background:var(--emerald-2);color:#fff;padding:10px 14px;">
          <div style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">
            ${Vencimientos.NORMA_BASE}</div>
          <div style="font-size:var(--text-sm);font-weight:700;margin-top:4px;">${meta.label}</div>
        </div>
        <div style="padding:10px 14px;background:var(--color-surface);border-bottom:1px solid var(--color-border);
          display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;">
          <span style="font-size:var(--text-xs);color:var(--color-ink3);">${meta.desc}</span>
          <span class="estado-chip ${resSt.cls}">${resSt.label}</span>
        </div>
        <div style="padding:10px 14px;border-bottom:1px solid var(--color-border);">
          <input class="form-input" type="search" placeholder="${filtroPh}" value="${_escAttr(filtroVal)}"
            oninput="Planificar.vencFiltro(this.value)" style="margin:0;">
        </div>
        <div style="overflow-x:auto;">${grupo === 'personal' ? _vencPersonalTable(v) : _vencEquiposTable(v)}</div>
      </div>

      ${grupo === 'personal' ? `
        <div style="margin-bottom:var(--sp-sm);font-size:var(--text-xs);color:var(--color-regular);padding:8px 12px;
          background:rgba(245,124,0,0.1);border-radius:var(--radius-md);border:1px solid rgba(245,124,0,0.25);">
          ⚠ Alerta automática 30 días antes del vencimiento de cada documento.</div>
        ${_vencPersonalGestion(v)}
        <button type="button" class="btn btn-accent" style="margin-top:var(--sp-md);width:100%;"
          onclick="Planificar.exportarVencPDF('personal')">📄 Exportar PDF — Personal</button>
      ` : `
        ${_vencEquiposGestion(v)}
        <button type="button" class="btn btn-accent" style="margin-top:var(--sp-md);width:100%;"
          onclick="Planificar.exportarVencPDF('equipos')">📄 Exportar PDF — Equipos</button>`}

      <button type="button" class="btn btn-primary" style="margin-top:var(--sp-md);" onclick="Planificar.guardarVencimientos()">
        Guardar vencimientos</button>`;
  }

  function vencTab(tab) {
    _vencTab = tab;
    _refreshVencBody();
  }

  function vencFiltro(val) {
    if (_vencTab === 'personal') _vencFiltroPersonal = val;
    else _vencFiltroEquipos = val;
    _refreshVencBody();
  }

  function agregarTrabajador() {
    if (!_venc) return;
    const nombre = prompt('Nombre del trabajador:');
    if (!nombre) return;
    const cedula = prompt('Cédula:') || '';
    _venc = Vencimientos.agregarTrabajador(_venc, nombre, cedula);
    _refreshVencBody();
    Router.toast('✓ Trabajador agregado');
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
    Router.toast('✓ Equipo agregado');
  }

  function actualizarEquipo(eqId, campo, valor) {
    if (!_venc) return;
    _venc = Vencimientos.actualizarEquipo(_venc, eqId, campo, valor);
    _refreshVencBody();
  }

  function exportarVencPDF(grupo) {
    if (!_venc) return;
    const v   = _venc;
    const est = _currentEst();
    const dash = Vencimientos.getDashboard(v);
    const win = window.open('', '_blank');
    if (!win) { Router.toast('Permite ventanas emergentes para exportar PDF'); return; }
    const rows = grupo === 'personal'
      ? Vencimientos.getPersonalRows(v, _vencFiltroPersonal)
      : Vencimientos.getEquiposRows(v, _vencFiltroEquipos);
    const titulo = grupo === 'personal' ? 'Control de Vencimientos — Personal' : 'Control de Vencimientos — Equipos';
    const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
    const tabla = grupo === 'personal'
      ? `<table><thead><tr><th>Trabajador</th><th>CC</th><th>Documento</th><th>Expedición</th><th>Vigencia</th><th>Estado</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td>${_escAttr(r.nombre)}</td><td>${_escAttr(r.cedula)}</td><td>${_escAttr(r.documento)}</td>
          <td>${r.expedicion || '—'}</td><td>${r.sinVencimiento ? '—' : (r.vigencia || '—')}</td><td>${_vencEstadoLabel(r.estado).label}</td></tr>`).join('')}</tbody></table>`
      : `<table><thead><tr><th>Código</th><th>Tipo</th><th>Últ. calibración</th><th>Próx. calibración</th><th>Estado</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td>${_escAttr(r.codigo)}</td><td>${_escAttr(r.tipo)}</td><td>${r.ultima_calibracion || '—'}</td>
          <td>${r.proxima_calibracion || '—'}</td><td>${_vencEstadoLabel(r.estado).label}</td></tr>`).join('')}</tbody></table>`;
    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${titulo}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#0A2E23;}h1{font-size:18px;color:#0A7350;}
      .meta{font-size:12px;color:#555;margin-bottom:16px;}table{width:100%;border-collapse:collapse;font-size:11px;margin-top:12px;}
      th{background:#0A7350;color:#fff;padding:8px;text-align:left;}td{padding:8px;border-bottom:1px solid #ddd;}
      .stats{display:flex;gap:16px;margin:12px 0;font-size:12px;}</style></head><body>
      <h1>${titulo}</h1>
      <div class="meta">ECODESA SaniCheck · ${fecha}<br>Establecimiento: ${_escAttr(est.nombre || '—')} · NIT: ${_escAttr(est.nit || '—')}<br>
      Normativa: ${Vencimientos.NORMA_BASE}</div>
      <div class="stats"><span>Vigencia personal: <strong>${dash.pctPersonal}%</strong></span>
      <span>Vigencia equipos: <strong>${dash.pctEquipos}%</strong></span>
      <span>Alertas 30 días: <strong>${dash.alertas30}</strong></span></div>
      ${tabla}
      <p style="margin-top:24px;font-size:10px;color:#888;">Documento generado por SaniCheck · ECODESA Ing. S.A.S</p>
      <script>setTimeout(function(){window.print();},400);</script></body></html>`);
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
      Router.toast('⚠ Archivo muy grande (máx. 3 MB)');
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
      _refreshVencBody();
      Router.toast('📎 Soporte adjuntado');
    };
    reader.readAsDataURL(file);
  }

  function eliminarSoporteVenc(itemId, trabajadorId) {
    if (!_venc) return;
    Vencimientos.setArchivo(_venc, itemId, null, trabajadorId || null);
    _refreshVencBody();
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
    Router.toast('✓ Vencimientos guardados');
    _syncAccordion();
    _mostrarNotificacionesVenc();
  }

  function _renderGeneralForm() {
    return `
      <form class="form-screen" id="form-planificar" novalidate style="padding:0;">
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
        <div class="form-group">
          <label class="form-label" for="inp-responsable-cocina">Responsable — Personal de Cocina/Manipulación</label>
          <input class="form-input" type="text" id="inp-responsable-cocina"
            placeholder="Nombre de quien vela por BPM en cocina y almacenamiento">
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
      </form>`;
  }

  function _renderDiagnosticoBody(items) {
    const total     = DiagnosticoInicial.ITEMS.length;
    const idx       = Math.min(_diagIdx, total - 1);
    const def       = DiagnosticoInicial.ITEMS[idx];
    const it        = items[idx];
    const evaluados = DiagnosticoInicial.contarCompletados(items);
    const pct       = Math.round((evaluados / total) * 100);

    return `
      <div class="progress-label">
        <span>Aspecto <strong>${idx + 1}</strong> de <strong>${total}</strong></span>
        <span style="color:${pct === 100 ? 'var(--color-bueno)' : 'var(--color-ink3)'};">
          ${evaluados}/${total} evaluados · ${pct}%</span>
      </div>
      <div class="progress-bar" style="margin-bottom:var(--sp-md);">
        <div class="progress-fill" style="width:${pct || 2}%"></div>
      </div>

      <div class="aspecto-texto">${_escAttr(def.texto)}</div>
      <div style="font-size:var(--text-sm);color:var(--color-ink3);line-height:1.55;margin-bottom:var(--sp-sm);text-align:justify;">
        ${_escAttr(def.descripcion)}</div>
      <div class="norma-badge">📋 ${_escAttr(def.norma)}</div>

      <div class="eval-group">
        ${['B', 'R', 'D', 'NA'].map(v => `
          <button type="button" class="eval-btn eval-btn-${v}${it.calificacion === v ? ' selected' : ''}"
            onclick="Planificar.diagEvaluar('${v}')">
            <span class="eval-letter">${v === 'NA' ? 'N/A' : v}</span>
            <span class="eval-word">${v === 'B' ? 'BUENO' : v === 'R' ? 'REGULAR' : v === 'D' ? 'DEFIC.' : 'NO APLICA'}</span>
          </button>`).join('')}
      </div>

      ${it.calificacion === 'NA' ? `
        <div style="padding:14px;background:#F3F4F6;border-radius:var(--radius-md);
          text-align:center;color:#6B7280;font-size:13px;border:1px solid #E5E7EB;">
          ℹ️ No aplica a este establecimiento
        </div>
      ` : it.calificacion ? `
        ${(it.calificacion === 'R' || it.calificacion === 'D') ? `
          <label class="form-label" for="di-cond-${def.id}">Condición encontrada</label>
          <input class="form-input" type="text" id="di-cond-${def.id}" value="${_escAttr(it.condicion)}"
            placeholder="Describa brevemente la condición observada"
            onchange="Planificar.actualizarDiagItem('${def.id}','condicion',this.value)" style="margin-bottom:8px;">

          <label class="form-label" for="di-accion-${def.id}">Acción requerida</label>
          <input class="form-input" type="text" id="di-accion-${def.id}" value="${_escAttr(it.accion)}"
            placeholder="Indique la acción correctiva sugerida"
            onchange="Planificar.actualizarDiagItem('${def.id}','accion',this.value)" style="margin-bottom:8px;">` : ''}
      ` : `
        <div style="padding:20px;background:var(--color-surface);border-radius:var(--radius-md);
          text-align:center;color:var(--color-ink3);font-size:13px;
          border:1px dashed var(--color-border);">
          Seleccione B / R / D / N·A para registrar la calificación
        </div>`}

      <div class="checklist-nav" style="margin:var(--sp-md) calc(-1 * var(--sp-md)) 0;padding:var(--sp-md) 0 0;">
        <button type="button" class="btn btn-outline nav-prev" style="width:auto;padding:10px 16px;"
          onclick="Planificar.diagNavegar(-1)"${idx === 0 ? ' disabled' : ''}>← Anterior</button>
        <div class="nav-counter">${idx + 1} / ${total}</div>
        <button type="button" class="btn ${idx === total - 1 ? 'btn-primary' : 'btn-accent'} nav-next"
          style="width:auto;padding:10px 16px;"
          onclick="Planificar.diagNavegar(1)">
          ${idx === total - 1 ? 'Guardar →' : 'Siguiente →'}</button>
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
    if (!_diagItems) return;
    const def = DiagnosticoInicial.ITEMS[_diagIdx];
    const it  = _diagItems.find(x => x.id === def.id);
    if (!it) return;
    it.calificacion = valor;
    if (valor === 'NA') {
      it.condicion = '';
      it.accion    = '';
    }
    it.prioridad = DiagnosticoInicial.prioridadAuto(valor);
    _diagEst = _currentEst();
    DiagnosticoInicial.saveDiagnostico(_diagEst, _diagItems);
    _setCardState('diagnostico', _diagOpen, _diagBadgeInfo());
    _syncResultados();
    _refreshDiagnosticoBody();
  }

  function diagNavegar(dir) {
    const total = DiagnosticoInicial.ITEMS.length;
    const next  = _diagIdx + dir;
    if (next < 0) return;
    if (next >= total) {
      if (dir > 0) guardarDiagnostico();
      return;
    }
    _diagIdx = next;
    _refreshDiagnosticoBody();
  }

  function actualizarDiagItem(id, campo, valor) {
    if (!_diagItems) return;
    const it = _diagItems.find(x => x.id === id);
    if (it) it[campo] = valor;
    if (campo === 'calificacion') _setCardState('diagnostico', _diagOpen, _diagBadgeInfo());
  }

  function guardarDiagnostico() {
    if (!_diagItems) return;
    _diagEst = _currentEst();
    DiagnosticoInicial.saveDiagnostico(_diagEst, _diagItems);
    Router.toast('✓ Diagnóstico guardado');
    _syncAccordion();
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

  return { render, attach, toggle, actualizarDiagItem, guardarDiagnostico, diagEvaluar, diagNavegar, marcoSub,
    actualizarVenc, guardarVencimientos, vencTab, vencFiltro, subirSoporteVenc, eliminarSoporteVenc, verSoporteVenc,
    agregarTrabajador, actualizarTrabajador, agregarEquipo, actualizarEquipo, exportarVencPDF };
})();
