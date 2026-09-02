const Hacer = (() => {
  const ICONOS = { edificacion: 'building', equipos: 'clipboardCheck', personal: 'shieldCheck', higienicos: 'listCheck', saneamiento: 'scale' };
  let normaAbierta = false;
  function _state() {
    const inspeccion = Store.getCurrentInspeccion(); if (!inspeccion?.programas?.length) return null;
    const ui = Store.get().ui || {}; const programaIdx = Math.max(0, Math.min(ui.programaIdx || 0, inspeccion.programas.length - 1));
    const programa = inspeccion.programas[programaIdx]; const aspectoIdx = Math.max(0, Math.min(ui.aspectoIdx || 0, programa.aspectos.length - 1));
    return { inspeccion, programa, programaIdx, aspectoIdx, aspecto: programa.aspectos[aspectoIdx] };
  }
  function render() {
    const s = _state(); if (!s) return `<div class="coming-soon"><div class="coming-soon-title">Sin inspección activa</div><button class="btn btn-primary mt-md" onclick="Router.go('planificar')">Ir a Planificar</button></div>`;
    const { inspeccion, programa, programaIdx, aspectoIdx, aspecto } = s; const sc = inspeccion.score || {}; const evaluados = programa.aspectos.filter(a => Scores.criterio(a)).length;
    return `<div class="checklist-header"><div class="checklist-header-top">${PhvaIcons.badge('H', 'HACER')}<div class="checklist-score">Cumplimiento <b style="color:${Scores.getColor(sc.pct_cumplimiento || 0)}">${sc.pct_cumplimiento || 0}%</b></div></div>
      <div class="catalog-tabs">${inspeccion.programas.map((p, i) => `<button class="catalog-tab ${i === programaIdx ? 'active' : ''}" onclick="Hacer.seleccionarPrograma(${i})">${AppIcons.icon(ICONOS[p.id], 13)} ${_esc(p.codigo)}</button>`).join('')}</div>
      <div class="progress-label"><span>${_esc(programa.nombre)} · ${aspectoIdx + 1}/${programa.aspectos.length}</span><span>${evaluados}/${programa.aspectos.length}</span></div><div class="progress-bar"><div class="progress-fill" style="width:${Math.round(evaluados / programa.aspectos.length * 100)}%"></div></div></div>
      <main class="aspecto-content"><div style="font-size:var(--text-xs);font-weight:700;color:var(--color-ink3);margin-bottom:8px;">Aspecto por verificar 1</div><div class="aspecto-texto">${_esc(aspecto.texto)}</div><button type="button" class="norma-accordion" aria-expanded="${normaAbierta}" onclick="Hacer.toggleNorma()">${AppIcons.row('scale', _esc(aspecto.norma), 12)} ${AppIcons.icon(normaAbierta ? 'chevronUp' : 'chevronDown', 14)}</button><div class="norma-detalle ${normaAbierta ? 'open' : ''}"><strong>Aspectos a evaluar</strong><p>${_esc(aspecto.detalle || getPSBAspectoDetalle(aspecto.id))}</p></div>
        <div class="eval-group">${[['A','Cumple'],['I','Incumple'],['NA','No aplica']].map(([v,l]) => `<button class="eval-btn eval-btn-${v} ${Scores.criterio(aspecto) === v ? 'selected' : ''}" aria-pressed="${Scores.criterio(aspecto) === v}" onclick="Hacer.evaluar('${v}')"><span class="eval-letter">${v === 'NA' ? 'N-A' : v}</span><span class="eval-word">${l}</span></button>`).join('')}</div>
        ${_renderSeguimiento(aspecto, programaIdx, aspectoIdx)}<button class="btn btn-outline" style="width:100%;margin-top:12px" onclick="Fotos.capturar(${programaIdx},${aspectoIdx})">${AppIcons.row('camera', 'Agregar foto', 14)}</button>${Fotos.renderThumbnails(aspecto.fotografias, programaIdx, aspectoIdx)}${_renderCriteriosExtra(aspecto, programaIdx, aspectoIdx)}<button class="btn btn-outline" style="width:100%;margin-top:12px" onclick="Hacer.agregarCriterio()">${AppIcons.row('plus', 'Agregar aspecto por verificar', 14)}</button></main>
      <div class="checklist-nav"><button class="btn btn-outline" onclick="Hacer.navegar(-1)" ${programaIdx === 0 && aspectoIdx === 0 ? 'disabled' : ''}>${AppIcons.row('arrowLeft', 'Anterior', 14)}</button><button class="btn btn-primary" onclick="Hacer.navegar(1)">${AppIcons.row('arrowRight', programaIdx === inspeccion.programas.length - 1 && aspectoIdx === programa.aspectos.length - 1 ? 'Ver dashboard' : 'Siguiente', 14)}</button></div>`;
  }
  function _renderSeguimiento(aspecto, programaIdx, aspectoIdx) {
    const c = Scores.criterio(aspecto); if (!c || c === 'NA') return '';
    if (c === 'A') return `<div class="field-stack"><label for="obs-${programaIdx}-${aspectoIdx}">Observaciones</label><textarea id="obs-${programaIdx}-${aspectoIdx}" oninput="Hacer.guardar('obs',this.value)" placeholder="Registre una observación si aplica">${_esc(aspecto.obs || '')}</textarea><label for="rec-${programaIdx}-${aspectoIdx}">Recomendaciones</label><textarea id="rec-${programaIdx}-${aspectoIdx}" oninput="Hacer.guardar('recomendaciones',this.value)" placeholder="Registre una recomendación si aplica">${_esc(aspecto.recomendaciones || '')}</textarea></div>`;
    return `<div class="field-stack"><label for="hall-${programaIdx}-${aspectoIdx}">Hallazgo</label><textarea id="hall-${programaIdx}-${aspectoIdx}" oninput="Hacer.guardar('hallazgo',this.value)" placeholder="Describa la evidencia encontrada">${_esc(aspecto.hallazgo || aspecto.obs || '')}</textarea><label for="acc-${programaIdx}-${aspectoIdx}">Acción correctiva</label><textarea id="acc-${programaIdx}-${aspectoIdx}" oninput="Hacer.guardar('accion',this.value)" placeholder="Defina la acción requerida">${_esc(aspecto.accion || '')}</textarea><label for="est-${programaIdx}-${aspectoIdx}">Estado de acción</label><select id="est-${programaIdx}-${aspectoIdx}" onchange="Hacer.guardar('estado',this.value)"><option ${aspecto.estado !== 'Cerrado' ? 'selected' : ''}>Abierto</option><option ${aspecto.estado === 'Cerrado' ? 'selected' : ''}>Cerrado</option></select></div>`;
  }
  function evaluar(valor) { const s = _state(); if (!s) return; s.aspecto.criterio = valor; s.aspecto.evaluacion = valor; if (valor === 'A') { s.aspecto.estado = 'Cerrado'; s.aspecto.hallazgo = ''; s.aspecto.accion = ''; } else if (valor === 'I') { s.aspecto.estado = 'Abierto'; } else { s.aspecto.estado = 'Cerrado'; } Scores.calcular(s.inspeccion); Hallazgos.actualizar(s.inspeccion); Store.upsertInspeccion(s.inspeccion); _refresh(); }
  function guardar(campo, valor) { const s = _state(); if (!s) return; s.aspecto[campo] = valor; if (campo === 'hallazgo' || campo === 'obs') { if (campo === 'hallazgo') s.aspecto.obs = valor; s.aspecto.obs_editada = true; } Hallazgos.actualizar(s.inspeccion); Store.upsertInspeccion(s.inspeccion); }
  function _renderCriteriosExtra(aspecto, programaIdx, aspectoIdx) {
    const criterios = Array.isArray(aspecto.criterios_extra) ? aspecto.criterios_extra : [];
    return criterios.map((c, i) => `<div style="margin-top:16px;padding:14px 10px 12px;border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface);"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;"><div style="font-size:var(--text-xs);font-weight:700;color:var(--color-ink);">Aspecto por verificar ${i + 2}</div><button type="button" aria-label="Eliminar aspecto por verificar ${i + 2}" onclick="Hacer.eliminarCriterio(${i})" style="border:0;background:transparent;color:var(--color-deficiente);font-size:var(--text-xs);font-weight:700;cursor:pointer;padding:4px;">${AppIcons.row('trash', 'Eliminar', 12)}</button></div><div class="eval-group">${[['A','Cumple'],['I','Incumple'],['NA','No aplica']].map(([v,l]) => `<button class="eval-btn eval-btn-${v} ${c.criterio === v ? 'selected' : ''}" aria-pressed="${c.criterio === v}" onclick="Hacer.evaluarCriterio(${i},'${v}')"><span class="eval-letter">${v === 'NA' ? 'N-A' : v}</span><span class="eval-word">${l}</span></button>`).join('')}</div>${_renderSeguimientoExtra(c, i, programaIdx, aspectoIdx)}<button class="btn btn-outline" style="width:100%;margin-top:12px" onclick="Fotos.capturar(${programaIdx},${aspectoIdx},${i})">${AppIcons.row('camera', 'Agregar foto', 14)}</button>${Fotos.renderThumbnails(c.fotografias, programaIdx, aspectoIdx, i)}</div>`).join('');
  }
  function _renderSeguimientoExtra(c, i, programaIdx, aspectoIdx) {
    if (!c.criterio || c.criterio === 'NA') return '';
    const save = (campo) => `Hacer.guardarCriterio(${i},'${campo}',this.value)`;
    if (c.criterio === 'A') return `<div class="field-stack" style="margin-top:12px;"><label>Observaciones</label><textarea oninput="${save('obs')}" placeholder="Registre una observación si aplica">${_esc(c.obs || '')}</textarea><label>Recomendaciones</label><textarea oninput="${save('recomendaciones')}" placeholder="Registre una recomendación si aplica">${_esc(c.recomendaciones || '')}</textarea></div>`;
    return `<div class="field-stack" style="margin-top:12px;"><label>Hallazgo</label><textarea oninput="${save('hallazgo')}" placeholder="Describa la evidencia encontrada">${_esc(c.hallazgo || '')}</textarea><label>Acción correctiva</label><textarea oninput="${save('accion')}" placeholder="Defina la acción requerida">${_esc(c.accion || '')}</textarea><label>Estado de acción</label><select onchange="${save('estado')}"><option ${c.estado !== 'Cerrado' ? 'selected' : ''}>Abierto</option><option ${c.estado === 'Cerrado' ? 'selected' : ''}>Cerrado</option></select></div>`;
  }
  function agregarCriterio() {
    const s = _state(); if (!s) return;
    if (!Array.isArray(s.aspecto.criterios_extra)) s.aspecto.criterios_extra = [];
    s.aspecto.criterios_extra.push({ criterio: null });
    Store.upsertInspeccion(s.inspeccion); _refresh();
    Router.toast('Aspecto por verificar agregado');
  }
  function eliminarCriterio(index) {
    const s = _state(); if (!s || !Array.isArray(s.aspecto.criterios_extra) || !s.aspecto.criterios_extra[index]) return;
    if (!window.confirm('¿Eliminar este aspecto por verificar adicional?')) return;
    s.aspecto.criterios_extra.splice(index, 1);
    Scores.calcular(s.inspeccion); Hallazgos.actualizar(s.inspeccion); Store.upsertInspeccion(s.inspeccion); _refresh();
    Router.toast('Aspecto por verificar eliminado');
  }
  function evaluarCriterio(index, valor) { const s = _state(); if (!s || !Array.isArray(s.aspecto.criterios_extra) || !s.aspecto.criterios_extra[index]) return; s.aspecto.criterios_extra[index].criterio = valor; Store.upsertInspeccion(s.inspeccion); Scores.calcular(s.inspeccion); Hallazgos.actualizar(s.inspeccion); _refresh(); }
  function guardarCriterio(index, campo, valor) { const s = _state(); if (!s || !Array.isArray(s.aspecto.criterios_extra) || !s.aspecto.criterios_extra[index]) return; const c = s.aspecto.criterios_extra[index]; c[campo] = valor; if (campo === 'hallazgo') c.obs = valor; Store.upsertInspeccion(s.inspeccion); Hallazgos.actualizar(s.inspeccion); }
  function toggleNorma() { normaAbierta = !normaAbierta; _refresh(); }
  function seleccionarPrograma(i) { normaAbierta = false; Store.setUI({ programaIdx: i, aspectoIdx: 0 }); _refresh(); }
  function navegar(dir) { const s = _state(); if (!s) return; let p = s.programaIdx, a = s.aspectoIdx + dir; if (a < 0 && p > 0) { p--; a = s.inspeccion.programas[p].aspectos.length - 1; } else if (a >= s.programa.aspectos.length && p < s.inspeccion.programas.length - 1) { p++; a = 0; } else if (a >= s.programa.aspectos.length) { Router.go('dashboard'); return; } normaAbierta = false; Store.setUI({ programaIdx: p, aspectoIdx: a }); _refresh(); }
  function _refresh() { const area = document.getElementById('screen-area'); if (area) area.innerHTML = render(); }
  return { render, attach() {}, evaluar, guardar, agregarCriterio, eliminarCriterio, evaluarCriterio, guardarCriterio, toggleNorma, seleccionarPrograma, navegar, refresh: _refresh };
})();
