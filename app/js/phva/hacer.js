const Hacer = (() => {
  const ICONOS = { edificacion: 'building', equipos: 'clipboardCheck', personal: 'shieldCheck', higienicos: 'listCheck', saneamiento: 'scale' };
  function _state() {
    const inspeccion = Store.getCurrentInspeccion(); if (!inspeccion?.programas?.length) return null;
    const ui = Store.get().ui || {}; const programaIdx = Math.max(0, Math.min(ui.programaIdx || 0, inspeccion.programas.length - 1));
    const programa = inspeccion.programas[programaIdx]; const aspectoIdx = Math.max(0, Math.min(ui.aspectoIdx || 0, programa.aspectos.length - 1));
    return { inspeccion, programa, programaIdx, aspectoIdx, aspecto: programa.aspectos[aspectoIdx] };
  }
  function render() {
    const s = _state(); if (!s) return `<div class="coming-soon"><div class="coming-soon-title">Sin inspección activa</div><button class="btn btn-primary mt-md" onclick="Router.go('planificar')">Ir a Planificar</button></div>`;
    const { inspeccion, programa, programaIdx, aspectoIdx, aspecto } = s; const sc = inspeccion.score || {}; const evaluados = programa.aspectos.filter(a => Scores.criterio(a)).length;
    return `<div class="checklist-header">${PhvaIcons.badge('H', 'HACER')}<div class="checklist-score">Cumplimiento <b style="color:${Scores.getColor(sc.pct_cumplimiento || 0)}">${sc.pct_cumplimiento || 0}%</b></div>
      <div class="catalog-tabs">${inspeccion.programas.map((p, i) => `<button class="catalog-tab ${i === programaIdx ? 'active' : ''}" onclick="Hacer.seleccionarPrograma(${i})">${AppIcons.icon(ICONOS[p.id], 13)} ${_esc(p.codigo)}</button>`).join('')}</div>
      <div class="progress-label"><span>${_esc(programa.nombre)} · ${aspectoIdx + 1}/${programa.aspectos.length}</span><span>${evaluados}/${programa.aspectos.length}</span></div><div class="progress-bar"><div class="progress-fill" style="width:${Math.round(evaluados / programa.aspectos.length * 100)}%"></div></div></div>
      <main class="aspecto-content"><div class="aspecto-texto">${_esc(aspecto.texto)}</div><div class="norma-badge">${AppIcons.row('scale', _esc(aspecto.norma), 12)}</div>
        <div class="eval-group">${[['A','Cumple'],['I','Incumple'],['NA','No aplica']].map(([v,l]) => `<button class="eval-btn eval-btn-${v} ${Scores.criterio(aspecto) === v ? 'selected' : ''}" onclick="Hacer.evaluar('${v}')"><span class="eval-letter">${v === 'NA' ? 'N-A' : v}</span><span class="eval-word">${l}</span></button>`).join('')}</div>
        ${Scores.criterio(aspecto) === 'I' ? `<div class="field-stack"><label>Hallazgo</label><textarea oninput="Hacer.guardar('hallazgo',this.value)" placeholder="Describa la evidencia encontrada">${_esc(aspecto.hallazgo || aspecto.obs || '')}</textarea><label>Acción correctiva</label><textarea oninput="Hacer.guardar('accion',this.value)" placeholder="Defina la acción requerida">${_esc(aspecto.accion || '')}</textarea><label>Estado de acción</label><select onchange="Hacer.guardar('estado',this.value)"><option ${aspecto.estado !== 'Cerrado' ? 'selected' : ''}>Abierto</option><option ${aspecto.estado === 'Cerrado' ? 'selected' : ''}>Cerrado</option></select></div>` : ''}
        <button class="btn btn-outline" style="width:100%;margin-top:12px" onclick="Fotos.capturar(${programaIdx},${aspectoIdx})">${AppIcons.row('camera', 'Agregar foto', 14)}</button>${Fotos.renderThumbnails(aspecto.fotografias, programaIdx, aspectoIdx)}</main>
      <div class="checklist-nav"><button class="btn btn-outline" onclick="Hacer.navegar(-1)" ${programaIdx === 0 && aspectoIdx === 0 ? 'disabled' : ''}>${AppIcons.row('arrowLeft', 'Anterior', 14)}</button><button class="btn btn-primary" onclick="Hacer.navegar(1)">${AppIcons.row('arrowRight', programaIdx === inspeccion.programas.length - 1 && aspectoIdx === programa.aspectos.length - 1 ? 'Ver dashboard' : 'Siguiente', 14)}</button></div>`;
  }
  function evaluar(valor) { const s = _state(); if (!s) return; s.aspecto.criterio = valor; s.aspecto.evaluacion = valor; if (valor !== 'I') { s.aspecto.hallazgo = ''; s.aspecto.accion = ''; } Scores.calcular(s.inspeccion); Hallazgos.actualizar(s.inspeccion); Store.upsertInspeccion(s.inspeccion); _refresh(); }
  function guardar(campo, valor) { const s = _state(); if (!s) return; s.aspecto[campo] = valor; if (campo === 'hallazgo') { s.aspecto.obs = valor; s.aspecto.obs_editada = true; } Hallazgos.actualizar(s.inspeccion); Store.upsertInspeccion(s.inspeccion); }
  function seleccionarPrograma(i) { Store.setUI({ programaIdx: i, aspectoIdx: 0 }); _refresh(); }
  function navegar(dir) { const s = _state(); if (!s) return; let p = s.programaIdx, a = s.aspectoIdx + dir; if (a < 0 && p > 0) { p--; a = s.inspeccion.programas[p].aspectos.length - 1; } else if (a >= s.programa.aspectos.length && p < s.inspeccion.programas.length - 1) { p++; a = 0; } else if (a >= s.programa.aspectos.length) { Router.go('dashboard'); return; } Store.setUI({ programaIdx: p, aspectoIdx: a }); _refresh(); }
  function _refresh() { const area = document.getElementById('screen-area'); if (area) area.innerHTML = render(); }
  return { render, attach() {}, evaluar, guardar, seleccionarPrograma, navegar, refresh: _refresh };
})();
