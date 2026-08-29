const Verificar = (() => {
  let categoria = 'todas', criterio = 'todos';
  function render() {
    const inspeccion = Store.getCurrentInspeccion(); if (!inspeccion) return _vacio();
    Scores.calcular(inspeccion); Hallazgos.actualizar(inspeccion); Store.upsertInspeccion(inspeccion);
    const sc = inspeccion.score, hallazgos = inspeccion.hallazgos_criticos || [], total = getPSBPrograms().flatMap(p => p.aspectos).length;
    const seguimientos = inspeccion.programas.flatMap(p => p.aspectos).filter(a => Scores.criterio(a) && a.estado);
    const abiertos = seguimientos.filter(a => a.estado !== 'Cerrado').length, cerrados = seguimientos.filter(a => a.estado === 'Cerrado').length, sinRegistro = total - sc.A - sc.I - sc.NA;
    const abiertoDeg = Math.round(abiertos / total * 360), cerradoDeg = Math.round((abiertos + cerrados) / total * 360);
    const segmentos = `var(--coral) 0 ${abiertoDeg}deg, var(--aqua) ${abiertoDeg}deg ${cerradoDeg}deg, var(--wash-b) ${cerradoDeg}deg 360deg`;
    const items = inspeccion.programas.flatMap(p => p.aspectos.map(a => ({ ...a, programa: p })) ).filter(x => (categoria === 'todas' || x.programa.id === categoria) && (criterio === 'todos' || Scores.criterio(x) === criterio));
    return `<div class="screen-header">${PhvaIcons.badge('V', 'DASHBOARD EJECUTIVO')}<div class="screen-title">${_esc(inspeccion.establecimiento.nombre || 'Inspección activa')}</div><div class="screen-subtitle">Actualización en vivo del ciclo PHVA</div></div>
      <div class="dashboard-kpis"><div><b>${sc.pct_cumplimiento}%</b><span>Cumplimiento</span></div><div><b>${sc.A}</b><span>Cumple</span></div><div><b>${sc.I}</b><span>Incumple</span></div><div><b>${abiertos}</b><span>Acciones abiertas</span></div></div>
      <section class="dashboard-card"><h3>${AppIcons.row('barChart', 'Cumplimiento por categoría', 16)}</h3>${inspeccion.programas.map(p => { const r = Scores.calcularPrograma(p); return `<div class="dash-bar"><span>${_esc(p.nombre)}</span><div><i style="width:${r.pct}%"></i></div><b>${r.pct}%</b></div>`; }).join('')}</section>
      <section class="dashboard-card dashboard-status"><div><h3>${AppIcons.row('clipboardCheck', 'Estado de acciones', 16)}</h3><p><b>${abiertos}</b> abiertas · <b>${cerrados}</b> cerradas · ${sinRegistro} sin registro</p></div><div class="dash-donut" style="background:conic-gradient(${segmentos})"><span>${total}</span></div></section>
      <section class="dashboard-card"><h3>${AppIcons.row('alertTriangle', 'Prioridades críticas', 16)}</h3>${hallazgos.length ? hallazgos.filter(h => h.estado !== 'Cerrado').slice(0, 5).map(h => `<div class="dash-priority">${AppIcons.icon(h.critico ? 'octagonAlert' : 'circleAlert', 15)}<div><b>${_esc(h.programa_nombre)}</b><span>${_esc(h.texto)}</span></div><em>${_esc(h.plazo)}</em></div>`).join('') : '<p class="dash-empty">Sin incumplimientos registrados.</p>'}</section>
      <section class="dashboard-card"><h3>${AppIcons.row('listCheck', 'Detalle de aspectos evaluados', 16)}</h3><div class="dash-filters"><select aria-label="Filtrar por categoría" onchange="Verificar.filtrarCategoria(this.value)"><option value="todas">Todas las categorías</option>${inspeccion.programas.map(p => `<option value="${p.id}" ${categoria === p.id ? 'selected' : ''}>${_esc(p.nombre)}</option>`).join('')}</select><select aria-label="Filtrar por criterio" onchange="Verificar.filtrarCriterio(this.value)"><option value="todos">Todos los criterios</option><option value="A" ${criterio === 'A' ? 'selected' : ''}>A · Cumple</option><option value="I" ${criterio === 'I' ? 'selected' : ''}>I · Incumple</option><option value="NA" ${criterio === 'NA' ? 'selected' : ''}>N-A · No aplica</option></select></div>${_detallesAgrupados(items) || '<p class="dash-empty">No hay aspectos con este filtro.</p>'}</section><div style="height:28px"></div>`;
  }
  function _detallesAgrupados(items) {
    const grupos = new Map();
    items.forEach(item => {
      if (!grupos.has(item.programa.id)) grupos.set(item.programa.id, { programa: item.programa, items: [] });
      grupos.get(item.programa.id).items.push(item);
    });
    return [...grupos.values()].map(({ programa, items: aspectos }) => `
      <div style="margin:14px 0 10px;">
        <div style="font-size:12px;font-weight:700;color:var(--emerald-2);margin-bottom:7px;">${_esc(programa.nombre)}</div>
        ${aspectos.map(_detalle).join('')}
      </div>`).join('');
  }
  function _detalle(x) {
    const c = Scores.criterio(x) || '—';
    const color = c === 'A' ? 'var(--color-bueno)' : c === 'I' ? 'var(--color-deficiente)' : 'var(--ink-55)';
    const cumple = c === 'A', incumple = c === 'I', noAplica = c === 'NA';
    return `<article class="dash-detail" style="display:block;padding:10px 11px;margin-bottom:8px;border:1px solid var(--line);border-left:3px solid ${color};border-radius:var(--radius-sm);background:#fff;">
      <div style="display:flex;gap:8px;align-items:flex-start;">
        <span class="criterio-chip criterio-${c}">${c === 'NA' ? 'N-A' : c}</span>
        <div style="min-width:0;flex:1;"><b>${_esc(x.texto)}</b><small>${_esc(x.norma)}</small></div>
      </div>
      ${cumple ? `<p><strong>Observaciones:</strong> ${_esc(x.obs || 'Sin observaciones registradas.')}</p>${x.recomendaciones ? `<p><strong>Recomendaciones:</strong> ${_esc(x.recomendaciones)}</p>` : ''}` : ''}
      ${incumple ? `<p><strong>Hallazgo:</strong> ${_esc(x.hallazgo || x.obs || 'Sin hallazgo registrado.')}</p><p><strong>Acción correctiva:</strong> ${_esc(x.accion || 'Sin acción correctiva registrada.')}</p><p><strong>Estado de acción:</strong> ${_esc(x.estado || 'Abierto')}</p>` : ''}
      ${noAplica ? `<p><strong>Justificación N-A:</strong> ${_esc(x.obs || 'No aplica a este establecimiento.')}</p>` : ''}
      ${(x.fotografias || []).map(f => `<button class="dash-photo" onclick="Verificar.mostrarFoto('${f.id}')"><img src="${f.data}" alt="Foto del aspecto"></button>`).join('')}
    </article>`;
  }
  function filtrarCategoria(v) { categoria = v; _refresh(); } function filtrarCriterio(v) { criterio = v; _refresh(); }
  function mostrarFoto(id) { const f = Store.getCurrentInspeccion()?.programas.flatMap(p => p.aspectos).flatMap(a => a.fotografias || []).find(x => x.id === id); if (!f) return; const d = document.createElement('div'); d.className = 'photo-lightbox'; d.tabIndex = -1; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.innerHTML = `<button aria-label="Cerrar foto" onclick="this.parentElement.remove()">${AppIcons.icon('x', 22)}</button><img src="${f.data}" alt="Foto ampliada">`; d.addEventListener('keydown', e => { if (e.key === 'Escape') d.remove(); }); document.body.appendChild(d); d.focus(); }
  function _refresh() { const area = document.getElementById('screen-area'); if (area) area.innerHTML = render(); }
  function _vacio() { return `<div class="coming-soon"><div class="coming-soon-icon">${AppIcons.block('barChart', 40)}</div><div class="coming-soon-title">Sin inspección activa</div><button class="btn btn-primary mt-md" onclick="Router.go('planificar')">Ir a Planificar</button></div>`; }
  return { render, attach() {}, filtrarCategoria, filtrarCriterio, mostrarFoto };
})();
