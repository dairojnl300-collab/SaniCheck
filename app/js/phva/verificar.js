const Verificar = (() => {
  const _btnStyle = (bg, color) => `border:0;border-radius:7px;padding:7px 9px;background:${bg};color:${color};font-weight:700;font-size:11px;cursor:pointer`;
  let categoria = 'todas', criterio = 'todos';
  function render() {
    const inspeccion = Store.getCurrentInspeccion(); if (!inspeccion) return _vacio();
    if (typeof ScInformes !== 'undefined' && ScInformes.sincronizarHallazgosPortal) {
      ScInformes.sincronizarHallazgosPortal(inspeccion).then(cambio => {
        if (cambio) _refresh();
      }).catch(() => {});
    }
    Scores.calcular(inspeccion); Hallazgos.actualizar(inspeccion); Store.upsertInspeccion(inspeccion);
    setTimeout(() => {
      const area = document.getElementById('screen-area');
      if (area && typeof Fotos !== 'undefined' && Fotos.hidratarMiniaturas) Fotos.hidratarMiniaturas(area);
    }, 0);
    if (typeof ScInformes !== 'undefined' && ScInformes.programarBorradorActual) ScInformes.programarBorradorActual(false);
    const sc = inspeccion.score, hallazgos = inspeccion.hallazgos_criticos || [];
    const expandir = (a, p, programaIdx, criterioIdx) => [{ ...a, programa: p, programaIdx, criterioIdx, extraIdx: null }, ...(a.criterios_extra || []).map((x, i) => ({ ...x, id: `${a.id}-extra-${i + 1}`, texto: `Aspecto por verificar ${i + 2}`, norma: a.norma, fotografias: x.fotografias || [], programa: p, programaIdx, criterioIdx, extraIdx: i }))];
    const todosItems = inspeccion.programas.flatMap((p, programaIdx) => p.aspectos.flatMap((a, i) => expandir(a, p, programaIdx, i)));
    const total = todosItems.length;
    const seguimientos = todosItems.filter(a => Scores.criterio(a) && a.estado);
    const abiertos = seguimientos.filter(a => a.estado !== 'Cerrado').length, cerrados = seguimientos.filter(a => a.estado === 'Cerrado').length, sinRegistro = total - sc.A - sc.I - sc.NA;
    const abiertoDeg = Math.round(abiertos / total * 360), cerradoDeg = Math.round((abiertos + cerrados) / total * 360);
    const segmentos = `var(--coral) 0 ${abiertoDeg}deg, var(--aqua) ${abiertoDeg}deg ${cerradoDeg}deg, var(--wash-b) ${cerradoDeg}deg 360deg`;
    const items = todosItems.filter(x => (categoria === 'todas' || x.programa.id === categoria) && (criterio === 'todos' || Scores.criterio(x) === criterio));
    return `<div class="screen-header">${PhvaIcons.badge('V', 'DASHBOARD EJECUTIVO')}<div class="screen-title">${_esc(inspeccion.establecimiento.nombre || 'Inspección activa')}</div><div class="screen-subtitle">Actualización en vivo del ciclo PHVA</div></div>
      <div class="dashboard-kpis"><div><b style="color:${Scores.getColor(sc.pct_cumplimiento)}">${sc.pct_cumplimiento}%</b><span>Cumplimiento</span></div><div><b style="color:var(--color-bueno)">${sc.A}</b><span>Cumple</span></div><div><b style="color:var(--color-deficiente)">${sc.I}</b><span>Incumple</span></div><div><b style="color:var(--coral)">${abiertos}</b><span>Acciones abiertas</span></div></div>
      <section class="dashboard-card"><h3>${AppIcons.row('barChart', 'Cumplimiento por categoría', 16)}</h3>${inspeccion.programas.map(p => { const r = Scores.calcularPrograma(p); const estado = r.evaluados ? Scores.getEstado(r.pct) : null; const color = estado ? Scores.getColor(r.pct) : 'var(--ink-55)'; const etiqueta = estado ? ({ B: 'BUENO', R: 'REGULAR', D: 'DEFICIENTE' }[estado]) : 'SIN REGISTRO'; return `<div class="dash-bar"><span>${_esc(p.nombre)}<small style="display:block;margin-top:3px;color:var(--ink-55);font-size:9px;">${r.A} cumple · ${r.I} incumple · ${r.NA} N-A</small></span><div><i style="width:${r.pct}%;background:${color}"></i></div><b style="color:${color}" title="${etiqueta}">${r.pct}%</b></div>`; }).join('')}</section>
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
    return [...grupos.values()].map(({ programa, items: aspectos }) => { const programaNumero = (aspectos[0]?.programaIdx ?? 0) + 1; return `
      <div class="dash-detail-group" style="margin:14px 0 10px;">
        <div style="font-size:12px;font-weight:700;color:var(--emerald-2);margin-bottom:7px;">${programaNumero}. ${_esc(programa.nombre)}</div>
        ${[...new Set(aspectos.map(x => x.criterioIdx ?? 0))].map(criterioIdx => { const grupo = aspectos.filter(x => (x.criterioIdx ?? 0) === criterioIdx); const criterio = grupo.find(x => x.extraIdx == null) || grupo[0]; return `<div class="dash-criterion-group">${grupo.map(item => { const n = `${programaNumero}.${criterioIdx + 1}.${item.extraIdx == null ? 1 : item.extraIdx + 2}`; return _detalle({ ...item, texto: `${n}, Aspecto por verificar`, criterioTitulo: `${programaNumero}.${criterioIdx + 1} ${criterio.texto}` }); }).join('')}</div>`; }).join('')}
      </div>`; }).join('');
  }
  function _detalle(x) {
    const c = Scores.criterio(x) || '—';
    const color = c === 'A' ? 'var(--color-bueno)' : c === 'I' ? 'var(--color-deficiente)' : 'var(--ink-55)';
    const cumple = c === 'A', incumple = c === 'I', noAplica = c === 'NA';
    return `<article class="dash-detail" style="display:block;padding:10px 11px;margin-bottom:8px;border:1px solid var(--line);border-left:3px solid ${color};border-radius:var(--radius-sm);background:#fff;">
      <div class="dash-criterion-inline-title">${_esc(x.criterioTitulo || '')}</div>
      <div style="display:flex;gap:8px;align-items:flex-start;">
        <span class="criterio-chip criterio-${c}">${c === 'NA' ? 'N-A' : c}</span>
        <div style="min-width:0;flex:1;"><b>${_esc(x.texto)}</b><small>${_esc(x.norma)}</small></div>
      </div>
      ${cumple ? `<p><strong>Observaciones:</strong> ${_esc(x.obs || 'Sin observaciones registradas.')}</p><p style="padding:7px 9px;background:#f0faf5;border-radius:6px;"><strong>Recomendaciones:</strong> ${_esc(x.recomendaciones || 'Sin recomendación registrada.')}</p>` : ''}
      ${incumple ? `<p><strong>Hallazgo:</strong> ${_esc(x.hallazgo || x.obs || 'Sin hallazgo registrado.')}</p><p><strong>Acción correctiva:</strong> ${_esc(x.accion || 'Sin acción correctiva registrada.')}</p><p><strong>Estado de acción:</strong> ${_esc(x.estado || 'Abierto')}</p>` : ''}
      ${noAplica ? `<p><strong>Justificación N-A:</strong> ${_esc(x.obs || 'No aplica a este establecimiento.')}</p>` : ''}
      ${(x.fotografias || []).map(f => `<div style="display:inline-block;vertical-align:top;margin:6px 6px 0 0;"><button class="dash-photo" onclick="Verificar.mostrarFoto('${f.id}')"><img ${f.data ? `src="${f.data}"` : ''}${f.path ? `data-foto-path="${_esc(f.path)}"` : ''} alt="Foto del aspecto"></button>${f.origen === 'Cliente' ? `<small style="display:block;color:var(--ink-55);margin-top:4px;">Foto subida por el cliente${f.tomada_en ? ` · ${_esc(new Date(f.tomada_en).toLocaleString('es-CO'))}` : ''}</small>${/^verificado$|^cumple$/i.test(String(f.estado_portal || '')) ? '<strong style="display:block;color:#2E7D32;margin-top:6px;">✓ Revisado y verificado</strong>' : `<div style="display:flex;gap:5px;margin-top:5px;flex-wrap:wrap;"><button type="button" style="${_btnStyle('#2E7D32','#fff')}" onclick="event.stopPropagation();Verificar.revisarCliente('${_esc(f.id)}','cumple')">Marcar como cumple</button><button type="button" style="${_btnStyle('#B45309','#fff')}" onclick="event.stopPropagation();Verificar.revisarCliente('${_esc(f.id)}','ajustes_solicitados')">Solicitar ajustes</button></div>`}` : ''}</div>`).join('')}
    </article>`;
  }
  function filtrarCategoria(v) { categoria = v; _refresh(); } function filtrarCriterio(v) { criterio = v; _refresh(); }
  async function revisarCliente(fotoId, estado) { const inspeccion = Store.getCurrentInspeccion(); const foto = inspeccion?.programas.flatMap(p => p.aspectos.flatMap(a => [a, ...(a.criterios_extra || [])])).flatMap(a => a.fotografias || []).find(f => f.id === fotoId); if (!foto || !inspeccion.portal_informe_id || !foto.aspecto_id) return; const observacion = estado === 'ajustes_solicitados' ? prompt('Indica qué debe corregirse:') : null; if (estado === 'ajustes_solicitados' && !observacion?.trim()) return; try { await ScInformes.revisarAdminHallazgo(inspeccion.portal_informe_id, foto.aspecto_id, estado, observacion); Router.toast('Revisión actualizada'); await ScInformes.sincronizarHallazgosPortal(inspeccion); _refresh(); } catch (e) { Router.toast(e.message || 'No se pudo revisar la evidencia'); } }
  function mostrarFoto(id) { const f = Store.getCurrentInspeccion()?.programas.flatMap(p => p.aspectos.flatMap(a => [a, ...(a.criterios_extra || [])])).flatMap(a => a.fotografias || []).find(x => x.id === id); if (!f) return; const d = document.createElement('div'); d.className = 'photo-lightbox'; d.tabIndex = -1; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.innerHTML = `<button aria-label="Cerrar foto" onclick="this.parentElement.remove()">${AppIcons.icon('x', 22)}</button><img src="${f.data}" alt="Foto ampliada">`; d.addEventListener('keydown', e => { if (e.key === 'Escape') d.remove(); }); document.body.appendChild(d); d.focus(); }
  function _refresh() { const area = document.getElementById('screen-area'); if (area) { area.innerHTML = render(); if (typeof Fotos !== 'undefined' && Fotos.hidratarMiniaturas) Fotos.hidratarMiniaturas(area); } }
  function _vacio() { return `<div class="coming-soon"><div class="coming-soon-icon">${AppIcons.block('barChart', 40)}</div><div class="coming-soon-title">Sin inspección activa</div><button class="btn btn-primary mt-md" onclick="Router.go('planificar')">Ir a Planificar</button></div>`; }
  return { render, attach() {}, filtrarCategoria, filtrarCriterio, mostrarFoto, revisarCliente };
})();
