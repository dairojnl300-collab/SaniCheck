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
  let _marcoOpenSubs  = { general: true };
  let _diagItems      = null;
  let _diagEst        = null;
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
    const header = `
      <div style="font-size:var(--text-sm);font-weight:700;color:var(--color-ink);margin-bottom:var(--sp-md);">
        ${d.length} aspecto${d.length !== 1 ? 's' : ''} crítico${d.length !== 1 ? 's' : ''} ·
        ${r.length} aspecto${r.length !== 1 ? 's' : ''} por mejorar ·
        ${b.length} en buen estado</div>`;
    if (!critList.length) {
      return header + `
        <div style="padding:16px;background:var(--color-bueno-bg);border-radius:var(--radius-md);
          color:var(--color-bueno);font-weight:600;text-align:center;">
          ✓ Sin hallazgos críticos — mantener buenas prácticas.</div>`;
    }
    const rows = critList.map(it => {
      const cls   = it.calificacion === 'D' ? 'estado-D' : 'estado-R';
      const label = it.calificacion === 'D' ? 'Deficiente' : 'Regular';
      return `
        <div style="padding:12px 0;border-bottom:1px dashed var(--color-border);">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
            <span class="estado-chip ${cls}">${label}</span>
            ${it.prioridad ? `<span class="norma-badge" style="margin:0;">Prioridad: ${_escAttr(it.prioridad)}</span>` : ''}
          </div>
          <div style="font-size:var(--text-sm);font-weight:700;color:var(--color-ink);">${_escAttr(it.texto)}</div>
          ${it.accion ? `<div style="font-size:var(--text-xs);color:var(--color-ink3);margin-top:4px;">
            Acción requerida: ${_escAttr(it.accion)}</div>` : ''}
        </div>`;
    }).join('');
    return header + rows;
  }

  function _vencBadgeInfo() {
    const v = _venc || Vencimientos.getVencimientos(_currentEst());
    const estados = Vencimientos.ITEMS.map(it => Vencimientos.estado(v[it.id], it.meses).estado);
    if (estados.includes('vencido'))       return { text: 'Vencido', cls: 'estado-chip estado-D', style: '' };
    if (estados.includes('por_vencer'))    return { text: 'Por vencer', cls: 'estado-chip estado-R', style: '' };
    if (estados.includes('sin_registrar')) return { text: 'Pendiente', cls: '', style: _pendienteStyle() };
    return { text: 'Vigente', cls: 'estado-chip estado-B', style: '' };
  }

  function _vencDetalle(fecha, meses) {
    const e = Vencimientos.estado(fecha, meses);
    if (e.estado === 'sin_registrar') {
      return `<div style="font-size:var(--text-xs);color:var(--color-ink3);margin-top:6px;">Sin registrar aún.</div>`;
    }
    const cls   = e.estado === 'vencido' ? 'estado-D' : e.estado === 'por_vencer' ? 'estado-R' : 'estado-B';
    const label = e.estado === 'vencido' ? 'Vencido' : e.estado === 'por_vencer' ? 'Por vencer' : 'Vigente';
    const proximoTexto = new Date(e.proximo + 'T00:00:00').toLocaleDateString('es-CO');
    return `
      <div style="font-size:var(--text-sm);color:var(--color-ink);margin-top:6px;">
        Próximo vencimiento: <strong>${proximoTexto}</strong>
      </div>
      <span class="estado-chip ${cls}" style="margin-top:4px;">${label}</span>`;
  }

  function _renderVencimientosBody() {
    const v = _venc || Vencimientos.getVencimientos(_currentEst());
    const secciones = Vencimientos.ITEMS.map((it, i) => {
      const esUltima = i === Vencimientos.ITEMS.length - 1;
      return `
      <div style="${esUltima ? '' : 'padding-bottom:var(--sp-md);margin-bottom:var(--sp-md);border-bottom:1px dashed var(--color-border);'}">
        <div style="font-size:var(--text-sm);font-weight:700;color:var(--color-ink);margin-bottom:6px;">
          ${_escAttr(it.label)}</div>
        <span class="norma-badge">${_escAttr(it.norma)}</span>
        <div class="form-group" style="margin-top:8px;">
          <label class="form-label" for="inp-venc-${it.id}">${_escAttr(it.campoLabel)}</label>
          <input class="form-input" type="date" id="inp-venc-${it.id}" value="${_escAttr(v[it.id])}"
            onchange="Planificar.actualizarVenc('${it.id}', this.value)">
        </div>
        ${_vencDetalle(v[it.id], it.meses)}
      </div>`;
    }).join('');
    return secciones + `
      <button type="button" class="btn btn-primary" style="margin-top:var(--sp-md);" onclick="Planificar.guardarVencimientos()">
        Guardar</button>`;
  }

  function actualizarVenc(campo, valor) {
    if (!_venc) return;
    _venc[campo] = valor;
    const inner = document.querySelector('#acc-body-vencimientos .acc-body-inner');
    if (inner) inner.innerHTML = _renderVencimientosBody();
    _setCardState('vencimientos', _vencOpen, _vencBadgeInfo());
  }

  function guardarVencimientos() {
    if (!_venc) return;
    _vencEst = _currentEst();
    Vencimientos.saveVencimientos(_vencEst, _venc);
    Router.toast('✓ Vencimientos guardados');
    _syncAccordion();
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
    return `
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
      </div>`;
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

  return { render, attach, toggle, actualizarDiagItem, guardarDiagnostico, marcoSub, actualizarVenc, guardarVencimientos };
})();
