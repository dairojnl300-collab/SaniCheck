// verificar.js — Dashboard Ejecutivo en vivo (reemplaza el dashboard anterior).
// Replica el diseño validado (Dashboard_PSB_La_Bodega_de_Sancho.html) alimentado
// 100% desde la inspección activa: 4 KPIs, barras por bloque, dona de estados,
// prioridades críticas automáticas, filtros y detalle de hallazgos.

const Verificar = (() => {
  let _activeBloque = 'all';
  let _activeCriterio = 'all';

  function render() {
    const insp = Store.getCurrentInspeccion();
    if (!insp) return `
      <div class="coming-soon">
        <div class="coming-soon-icon">📊</div>
        <div class="coming-soon-title">Sin inspección activa</div>
        <div class="coming-soon-desc">Primero configure el establecimiento en PLANIFICAR.</div>
        <button class="btn btn-primary mt-md" style="width:auto;padding:12px 24px"
          onclick="Router.go('planificar')">Ir a Planificar</button>
      </div>`;

    Hallazgos.actualizar(insp);
    Scores.calcular(insp);
    Store.upsertInspeccion(insp);

    const todos = insp.programas.flatMap(p => p.aspectos.filter(a => !a._disabled).map(a => ({ ...a, bloque_id: p.id, bloque_nombre: p.nombre, peso: p.peso })));
    const evaluados = todos.filter(a => a.criterio === 'A' || a.criterio === 'I');
    const totalA = todos.filter(a => a.criterio === 'A').length;
    const totalI = todos.filter(a => a.criterio === 'I').length;
    const totalFotos = todos.filter(a => a.fotografias && a.fotografias.length).length;

    return `
      <div class="dashboard-ejecutivo">
        <div class="screen-header">
          <div class="screen-fase-badge badge-V" style="font-size:11px;padding:3px 8px;">📊 VERIFICAR</div>
          <div class="screen-title" style="font-size:17px;">Dashboard Ejecutivo</div>
          <div class="screen-subtitle">${_esc(insp.establecimiento.nombre)} · ${insp.inspeccion.fecha}</div>
        </div>

        ${_renderKpis(insp, evaluados, totalA, totalI, totalFotos)}
        ${_renderBarras(insp)}
        ${_renderDonut(todos)}
        ${_renderPrioridades(insp)}
        ${_renderFiltrosYHallazgos(todos)}

        <button class="btn btn-outline" style="width:100%;padding:14px;font-size:15px;font-weight:700;margin-top:6px;"
          onclick="Router.go('actuar')">Continuar a Actuar</button>
        <div style="height:32px;"></div>
      </div>
      <div class="dash-lightbox" id="dash-lightbox" onclick="this.classList.remove('open')">
        <img id="dash-lightbox-img" src="" alt="">
      </div>`;
  }

  function _renderKpis(insp, evaluados, totalA, totalI, totalFotos) {
    const pct = insp.score.pct_cumplimiento || 0;
    return `
      <div class="dash-kpis">
        <div class="dash-kpi ${pct >= 80 ? 'good' : pct < 50 ? 'risk' : ''}">
          <div class="lbl">Cumplimiento General</div>
          <div class="val">${pct}%</div>
        </div>
        <div class="dash-kpi">
          <div class="lbl">Ítems Evaluados</div>
          <div class="val">${evaluados.length}</div>
        </div>
        <div class="dash-kpi risk">
          <div class="lbl">Inaceptable (I)</div>
          <div class="val">${totalI}</div>
        </div>
        <div class="dash-kpi good">
          <div class="lbl">Aceptable (A)</div>
          <div class="val">${totalA}</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--color-ink3);margin:-4px 0 14px;">📷 ${totalFotos} ítem(s) con foto registrada</div>`;
  }

  function _renderBarras(insp) {
    return `
      <div class="dash-panel">
        <h2>Cumplimiento por Bloque</h2>
        <div class="desc">% de cumplimiento ponderado dentro de cada bloque oficial</div>
        ${insp.programas.map(bloque => {
          const sc = Scores.calcularPrograma(bloque);
          return `
            <div class="dash-bar-row">
              <span>${_esc(bloque.nombre)}</span>
              <div class="dash-bar-track"><div class="dash-bar-fill"
                style="width:${sc.pct}%;background:var(--block-${bloque.id})"></div></div>
              <span class="mono" style="text-align:right;">${sc.pct}%</span>
            </div>`;
        }).join('')}
      </div>`;
  }

  function _renderDonut(todos) {
    const abierto = todos.filter(a => a.estado === 'Abierto').length;
    const cerrado = todos.filter(a => a.estado === 'Cerrado').length;
    const total   = todos.length;
    const sinDato = total - abierto - cerrado;
    const a1 = total ? (abierto / total) * 360 : 0;
    const a2 = total ? (cerrado / total) * 360 : 0;
    return `
      <div class="dash-panel">
        <h2>Estado de Hallazgos</h2>
        <div class="desc">Seguimiento de acciones correctivas (Abierto / Cerrado / Sin registro)</div>
        <div class="dash-donut-wrap">
          <div class="dash-donut" style="background:conic-gradient(
            var(--color-deficiente) 0deg ${a1}deg,
            var(--color-bueno) ${a1}deg ${a1 + a2}deg,
            var(--color-border) ${a1 + a2}deg 360deg)">
            <div class="dash-donut-hole"><div class="n">${total}</div><div class="lbl">Ítems</div></div>
          </div>
          <div class="dash-legend">
            <div><span class="dot" style="background:var(--color-deficiente)"></span>Abierto · ${abierto}</div>
            <div><span class="dot" style="background:var(--color-bueno)"></span>Cerrado · ${cerrado}</div>
            <div><span class="dot" style="background:var(--color-border)"></span>Sin registro · ${sinDato}</div>
          </div>
        </div>
      </div>`;
  }

  function _renderPrioridades(insp) {
    const criticos = (insp.hallazgos_criticos || [])
      .slice()
      .sort((a, b) => b.peso - a.peso)
      .slice(0, 5);
    if (!criticos.length) return `
      <div class="dash-panel">
        <h2>Prioridades Críticas</h2>
        <div class="desc">Sin hallazgos Inaceptables registrados todavía.</div>
      </div>`;
    return `
      <div class="dash-panel">
        <h2>Prioridades Críticas — Atender primero</h2>
        <div class="desc">Hallazgos Inaceptables (I) ordenados por peso normativo del bloque</div>
        ${criticos.map((h, i) => `
          <div style="display:flex;gap:10px;padding:8px 0;${i > 0 ? 'border-top:1px solid var(--color-border);' : ''}">
            <div class="mono" style="font-size:11px;color:var(--color-ink3);flex-shrink:0;">${String(i + 1).padStart(2, '0')}</div>
            <div style="font-size:12px;">
              <strong>${_esc(h.bloque_nombre)} · ${_esc(h.texto)}</strong>
              ${h.hallazgo ? `<div style="color:var(--color-ink2);margin-top:2px;">${_esc(h.hallazgo)}</div>` : ''}
              <div style="color:var(--color-ink3);font-size:10px;margin-top:2px;">Plazo: ${h.plazo}</div>
            </div>
          </div>`).join('')}
      </div>`;
  }

  function _renderFiltrosYHallazgos(todos) {
    const insp = Store.getCurrentInspeccion();
    const bloqueChips = [{ id: 'all', nombre: 'Todas las categorías' }, ...insp.programas.map(p => ({ id: p.id, nombre: p.nombre }))];
    const critChips = [
      { id: 'all', label: 'Todos' },
      { id: 'I', label: 'I · Inaceptable', bad: true },
      { id: 'A', label: 'A · Aceptable' },
      { id: 'NA', label: 'N/A' },
    ];

    const filtrados = todos.filter(a =>
      (_activeBloque === 'all' || a.bloque_id === _activeBloque) &&
      (_activeCriterio === 'all' || a.criterio === _activeCriterio) &&
      a.criterio // solo ítems evaluados en el detalle
    );

    return `
      <div class="dash-panel">
        <h2>Detalle de Hallazgos</h2>
        <div class="dash-chips">
          ${bloqueChips.map(c => `<button class="dash-chip${_activeBloque === c.id ? ' active' : ''}"
            onclick="Verificar.filtrarBloque('${c.id}')">${_esc(c.nombre)}</button>`).join('')}
        </div>
        <div class="dash-chips">
          ${critChips.map(c => `<button class="dash-chip${_activeCriterio === c.id ? ' active' + (c.bad ? ' bad' : '') : ''}"
            onclick="Verificar.filtrarCriterio('${c.id}')">${_esc(c.label)}</button>`).join('')}
        </div>
        <div id="dash-findings">
          ${filtrados.length ? filtrados.map(a => _renderFinding(a)).join('') : `
            <div style="text-align:center;padding:20px;color:var(--color-ink3);font-size:12px;">
              Sin ítems para este filtro.</div>`}
        </div>
      </div>`;
  }

  function _renderFinding(a) {
    const badgeCls = a.criterio === 'A' ? 'a' : a.criterio === 'I' ? 'i' : 'na';
    const statusCls = a.estado === 'Abierto' ? 'abierto' : a.estado === 'Cerrado' ? 'cerrado' : 'sin';
    const foto = a.fotografias && a.fotografias[0];
    return `
      <div class="dash-finding${foto ? ' has-photo' : ''}">
        <div class="f-badge ${badgeCls}">${a.criterio === 'NA' ? 'N/A' : a.criterio}</div>
        ${foto ? `<img class="f-photo" src="${foto.data}" onclick="Verificar.abrirFoto('${foto.data}')">` : ''}
        <div style="cursor:pointer;" onclick="Verificar.irAHacer('${a.bloque_id}','${a.id}')">
          <div class="f-cat">${_esc(a.bloque_nombre)}</div>
          <details class="f-aspecto"><summary>${_esc(a.texto)}</summary>
            <div style="margin-top:4px;">${_esc(a.norma)}</div></details>
          ${a.hallazgo ? `<div class="f-hallazgo">${_esc(a.hallazgo)}</div>` : ''}
          ${a.accion ? `<div class="f-accion"><b>Acción correctiva:</b> ${_esc(a.accion)}</div>` : ''}
        </div>
        <div class="f-status ${statusCls}">${a.estado || 'Sin registro'}</div>
      </div>`;
  }

  function filtrarBloque(id) { _activeBloque = id; _refresh(); }
  function filtrarCriterio(id) { _activeCriterio = id; _refresh(); }

  function abrirFoto(src) {
    const img = document.getElementById('dash-lightbox-img');
    const box = document.getElementById('dash-lightbox');
    if (img && box) { img.src = src; box.classList.add('open'); }
  }

  function irAHacer(bloqueId, itemId) {
    const insp = Store.getCurrentInspeccion();
    if (!insp) return;
    const programaIdx = insp.programas.findIndex(p => p.id === bloqueId);
    if (programaIdx < 0) return;
    const aspectoIdx = insp.programas[programaIdx].aspectos.findIndex(a => a.id === itemId);
    Store.setUI({ programaIdx, aspectoIdx: Math.max(aspectoIdx, 0) });
    Router.go('hacer');
  }

  function _refresh() {
    const area = document.getElementById('screen-area');
    if (area) { area.innerHTML = render(); attach(); }
  }

  function attach() {}

  function _esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { render, attach, filtrarBloque, filtrarCriterio, abrirFoto, irAHacer };
})();
