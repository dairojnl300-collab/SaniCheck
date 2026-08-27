// hacer.js — Pantalla HACER: checklist oficial 5 bloques / 20 ítems, escala A/I/N-A

const Hacer = (() => {
  const PROG_ICONS = {
    edificacion: { color: '#1E40AF', svg: '<path d="M4 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16"/><path d="M13 10h5a1 1 0 0 1 1 1v10"/><path d="M2 21h20"/><path d="M7 8h1M10 8h1M7 12h1M10 12h1M7 16h1M10 16h1"/>' },
    equipos:     { color: '#0891B2', svg: '<path d="M12 3c-3.2 4-6 7.6-6 10.6a6 6 0 0 0 12 0C18 10.6 15.2 7 12 3z"/>' },
    personal:    { color: '#D97706', svg: '<ellipse cx="12" cy="14" rx="4.5" ry="6"/><path d="M12 8v12"/><path d="M9 5.5 7.5 4M15 5.5 16.5 4"/><circle cx="12" cy="6" r="1.5"/>' },
    higienicos:  { color: '#059669', svg: '<path d="M4 12a8 8 0 0 1 14.5-4.5M20 12a8 8 0 0 1-14.5 4.5"/><path d="M17 4v4h-4"/><path d="M7 20v-4h4"/>' },
    saneamiento: { color: '#0284C7', svg: '<path d="M3 17c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/><path d="M3 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/>' },
  };
  function _progIcon(id, size, strokeOverride) {
    const p = PROG_ICONS[id] || PROG_ICONS.edificacion;
    size = size || 20;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeOverride || p.color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0;">${p.svg}</svg>`;
  }

  function _state() {
    const inspeccion = Store.getCurrentInspeccion();
    if (!inspeccion) return null;
    const ui          = Store.get().ui;
    const programaIdx = Math.min(ui.programaIdx || 0, inspeccion.programas.length - 1);
    const programa    = inspeccion.programas[programaIdx];
    let aspectoIdx    = Math.min(ui.aspectoIdx || 0, programa.aspectos.length - 1);
    if (aspectoIdx < 0) aspectoIdx = 0;
    // Si el índice guardado quedó sobre un ítem desactivado, salta al primer activo del bloque.
    // aspectoIdx sigue siendo SIEMPRE un índice real sobre programa.aspectos (Fotos.capturar lo usa así).
    if (programa.aspectos[aspectoIdx] && programa.aspectos[aspectoIdx]._disabled) {
      const primerActivo = programa.aspectos.findIndex(a => !a._disabled);
      if (primerActivo !== -1) aspectoIdx = primerActivo;
    }
    return { inspeccion, programa, programaIdx, aspectoIdx, aspecto: programa.aspectos[aspectoIdx] };
  }

  function render() {
    const s = _state();
    if (!s) return `
      <div class="coming-soon">
        <div class="coming-soon-icon">⚠️</div>
        <div class="coming-soon-title">Sin inspección activa</div>
        <div class="coming-soon-desc">Primero configure el establecimiento en PLANIFICAR.</div>
        <button class="btn btn-primary mt-md" style="width:auto;padding:12px 24px"
          onclick="Router.go('planificar')">Ir a Planificar</button>
      </div>`;

    const { inspeccion, programa, programaIdx, aspectoIdx, aspecto } = s;
    // Índices reales de los ítems activos; la navegación y los contadores solo ven estos.
    const idxActivos = _indicesActivos(programa);
    const pos        = idxActivos.indexOf(aspectoIdx);   // posición dentro de los activos (-1 si no hay ninguno)
    const esPrimero  = pos <= 0;
    const esUltimo   = pos === idxActivos.length - 1;

    return `
      <img src="assets/icons/isotipo-transparente.png" class="watermark-bg" alt="">
      <div class="checklist-header">
        ${_renderTopBar(inspeccion)}
        ${_renderProgramTabs(inspeccion.programas, programaIdx)}
        ${_renderProgress(programa, pos)}
      </div>

      <div class="aspecto-content">
        ${idxActivos.length ? _renderAspecto(aspecto, programaIdx, aspectoIdx) : _renderSinItems()}
        ${_renderResumen(programa)}
      </div>

      <div class="checklist-nav">
        <button class="btn btn-outline nav-prev" style="width:auto;padding:10px 16px;"
          onclick="Hacer.navegar(-1)"${esPrimero ? ' disabled' : ''}>← Anterior</button>
        <div class="nav-counter">${Math.max(pos + 1, 0)} / ${idxActivos.length}</div>
        <button class="btn ${esUltimo ? 'btn-primary' : 'btn-accent'} nav-next"
          style="width:auto;padding:10px 16px;"
          onclick="Hacer.navegar(1)">
          ${esUltimo ? 'Finalizar →' : 'Siguiente →'}</button>
      </div>`;
  }

  function _renderTopBar(inspeccion) {
    const sc = inspeccion.score || {};
    const pct = sc.pct_cumplimiento || 0;
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div class="screen-fase-badge badge-H" style="font-size:11px;padding:3px 8px;">🔍 HACER</div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:11px;color:var(--color-ink3)">Cumplimiento:</span>
          <span style="font-size:14px;font-weight:900;color:${Scores.getColor(pct)}">${pct}%</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:8px;">
        <div style="font-size:11px;color:var(--color-ink3);overflow:hidden;
          text-overflow:ellipsis;white-space:nowrap">${_esc(inspeccion.establecimiento.nombre)}</div>
        <button onclick="Router.go('personalizar')"
          style="flex-shrink:0;border:none;background:none;cursor:pointer;
            font-size:10px;color:var(--color-primary);font-weight:700;white-space:nowrap;">
          ⚙ Editar ítems
        </button>
      </div>`;
  }

  function _renderProgramTabs(programas, activeIdx) {
    return `
      <div style="display:flex;gap:4px;overflow-x:auto;padding-bottom:6px;margin-bottom:8px;
        scrollbar-width:none;-ms-overflow-style:none;">
        ${programas.map((p, i) => {
          const isActive = i === activeIdx;
          const dotColor = p.estado_general === 'B' ? 'var(--color-bueno)'
                         : p.estado_general === 'R' ? 'var(--color-regular)'
                         : p.estado_general === 'D' ? 'var(--color-deficiente)'
                         : 'transparent';
          return `
            <button onclick="Hacer.seleccionarPrograma(${i})"
              style="flex:0 0 auto;display:inline-flex;align-items:center;gap:5px;padding:6px 10px;border-radius:20px;cursor:pointer;
                border:1.5px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'};
                background:${isActive ? 'var(--color-primary-bg)' : 'var(--color-surface)'};
                font-size:11px;font-weight:${isActive ? 700 : 500};
                color:${isActive ? 'var(--color-primary)' : 'var(--color-ink2)'};">
              ${_progIcon(p.id, 14, isActive ? '#fff' : null)} ${Math.round(p.peso / 9 * 100)}%
              <span style="color:${dotColor}">●</span>
            </button>`;
        }).join('')}
      </div>`;
  }

  function _renderProgress(programa, pos) {
    const activos   = programa.aspectos.filter(a => !a._disabled);
    const total     = activos.length;
    const evaluados = activos.filter(a => a.criterio).length;
    const pct       = total ? Math.round((evaluados / total) * 100) : 0;
    return `
      <div style="font-size:13px;font-weight:700;color:var(--color-ink);margin-bottom:8px;">
        ${programa.nombre}</div>
      <div class="progress-label">
        <span>Aspecto <strong>${Math.max(pos + 1, 0)}</strong> de <strong>${total}</strong></span>
        <span style="color:${pct === 100 ? 'var(--color-bueno)' : 'var(--color-ink3)'};">
          ${evaluados}/${total} evaluados</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${pct || 2}%"></div>
      </div>`;
  }

  function _renderSinItems() {
    return `
      <div style="padding:20px;background:var(--color-surface);border-radius:var(--radius-md);
        text-align:center;color:var(--color-ink3);font-size:13px;border:1px dashed var(--color-border);">
        Todos los ítems de este bloque están desactivados.
        <button onclick="Router.go('personalizar')" class="btn btn-outline mt-md"
          style="width:auto;padding:8px 16px;margin-top:10px;">⚙ Editar ítems</button>
      </div>`;
  }

  function _renderAspecto(aspecto, programaIdx, aspectoIdx) {
    return `
      <div class="aspecto-texto">${_esc(aspecto.texto)}</div>
      <div class="norma-badge">📋 ${_esc(aspecto.norma)}</div>

      <div class="eval-group">
        ${['A', 'I', 'NA'].map(v => `
          <button class="eval-btn eval-btn-${v}${aspecto.criterio === v ? ' selected' : ''}"
            onclick="Hacer.evaluar('${v}')">
            <span class="eval-letter">${v === 'NA' ? 'N/A' : v}</span>
            <span class="eval-word">${v === 'A' ? 'ACEPTABLE' : v === 'I' ? 'INACEPTABLE' : 'NO APLICA'}</span>
          </button>`).join('')}
      </div>

      ${aspecto.criterio === 'NA' ? `
        <div class="obs-label">Justificación del No Aplica</div>
        <textarea class="obs-area" id="hallazgo-area" rows="2"
          placeholder="Explique por qué este ítem no aplica al establecimiento"
          onchange="Hacer.guardarHallazgo(this.value)"
          onblur="Hacer.guardarHallazgo(this.value)">${_esc(aspecto.hallazgo)}</textarea>
      ` : aspecto.criterio === 'I' ? `
        <div class="obs-label">Hallazgo</div>
        <textarea class="obs-area" id="hallazgo-area" rows="3"
          placeholder="Describa el hallazgo encontrado"
          onchange="Hacer.guardarHallazgo(this.value)"
          onblur="Hacer.guardarHallazgo(this.value)">${_esc(aspecto.hallazgo)}</textarea>

        <div class="obs-label" style="margin-top:8px;">Acción correctiva</div>
        <textarea class="obs-area" id="accion-area" rows="2"
          placeholder="Describa la acción correctiva propuesta"
          onchange="Hacer.guardarAccion(this.value)"
          onblur="Hacer.guardarAccion(this.value)">${_esc(aspecto.accion)}</textarea>

        <div style="display:flex;gap:8px;margin-top:8px;">
          ${['Abierto', 'Cerrado'].map(v => `
            <button onclick="Hacer.setEstado('${v}')"
              style="flex:1;padding:8px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;
                border:1.5px solid ${aspecto.estado === v ? (v === 'Cerrado' ? 'var(--color-bueno)' : 'var(--color-deficiente)') : 'var(--color-border)'};
                background:${aspecto.estado === v ? (v === 'Cerrado' ? 'var(--color-bueno-bg)' : 'var(--color-deficiente-bg)') : 'var(--color-surface)'};
                color:${aspecto.estado === v ? (v === 'Cerrado' ? 'var(--color-bueno)' : 'var(--color-deficiente)') : 'var(--color-ink2)'};">
              ${v}</button>`).join('')}
        </div>

        <button onclick="Fotos.capturar(${programaIdx},${aspectoIdx})"
          style="margin-top:10px;width:100%;padding:10px;cursor:pointer;
            border:1.5px dashed var(--color-border);border-radius:var(--radius-md);
            background:var(--color-surface);color:var(--color-ink2);font-size:13px;">
          📷 Añadir fotografía${aspecto.fotografias && aspecto.fotografias.length
            ? ' (' + aspecto.fotografias.length + ')' : ''}
        </button>

        ${Fotos.renderThumbnails(aspecto.fotografias || [], programaIdx, aspectoIdx)}

        <div style="margin-top:10px;padding:10px 14px;
          background:var(--color-deficiente-bg);
          border-left:3px solid var(--color-deficiente);
          border-radius:0 8px 8px 0;font-size:12px;">
          ⛔ <strong>HALLAZGO</strong> · Plazo: ${aspecto.plazo}
        </div>
      ` : aspecto.criterio === 'A' ? `
        <div class="obs-label">Evidencia (opcional)</div>
        <textarea class="obs-area" id="hallazgo-area" rows="2"
          placeholder="Observación opcional"
          onchange="Hacer.guardarHallazgo(this.value)"
          onblur="Hacer.guardarHallazgo(this.value)">${_esc(aspecto.hallazgo)}</textarea>

        <button onclick="Fotos.capturar(${programaIdx},${aspectoIdx})"
          style="margin-top:10px;width:100%;padding:10px;cursor:pointer;
            border:1.5px dashed var(--color-border);border-radius:var(--radius-md);
            background:var(--color-surface);color:var(--color-ink2);font-size:13px;">
          📷 Añadir fotografía${aspecto.fotografias && aspecto.fotografias.length
            ? ' (' + aspecto.fotografias.length + ')' : ''}
        </button>

        ${Fotos.renderThumbnails(aspecto.fotografias || [], programaIdx, aspectoIdx)}
      ` : `
        <div style="padding:20px;background:var(--color-surface);border-radius:var(--radius-md);
          text-align:center;color:var(--color-ink3);font-size:13px;
          border:1px dashed var(--color-border);">
          Seleccione A / I / N-A para registrar la calificación
        </div>`}`;
  }

  // Índices reales (sobre programa.aspectos) de los ítems no desactivados.
  function _indicesActivos(programa) {
    const out = [];
    programa.aspectos.forEach((a, i) => { if (!a._disabled) out.push(i); });
    return out;
  }

  function _renderResumen(programa) {
    const ev = programa.aspectos.filter(a => !a._disabled && a.criterio);
    if (!ev.length) return '';
    const c = { A: 0, I: 0, NA: 0 };
    ev.forEach(a => { if (c[a.criterio] !== undefined) c[a.criterio]++; });
    const score = Scores.calcularPrograma(programa);
    return `
      <div style="margin-top:var(--sp-md);padding:var(--sp-md);background:var(--color-surface);
        border-radius:var(--radius-md);border:1px solid var(--color-border);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-size:10px;font-weight:700;color:var(--color-ink3);
            text-transform:uppercase;letter-spacing:0.04em;">Resumen del bloque</div>
          <div style="font-size:16px;font-weight:900;color:${Scores.getColor(score.pct)}">
            ${score.pct}%</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
          ${[['A','ACEPTABLE','var(--color-bueno-bg)','var(--color-bueno)'],
             ['I','INACEPT.','var(--color-deficiente-bg)','var(--color-deficiente)'],
             ['NA','N/A','#F3F4F6','#6B7280']].map(([v, label, bg, color]) => `
            <div style="text-align:center;padding:8px;border-radius:6px;background:${bg}">
              <div style="font-size:22px;font-weight:900;color:${color}">${c[v]}</div>
              <div style="font-size:9px;color:var(--color-ink3);">${label}</div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  function evaluar(valor) {
    const s = _state();
    if (!s) return;
    const { inspeccion, programa, aspectoIdx } = s;
    const aspecto = programa.aspectos[aspectoIdx];

    aspecto.criterio = valor;
    if (valor === 'A') {
      aspecto.accion = '';
      aspecto.estado = null;
    } else if (valor === 'I') {
      if (!aspecto.estado) aspecto.estado = 'Abierto';
    } else { // NA
      aspecto.accion = '';
      aspecto.estado = null;
    }
    aspecto.plazo = Hallazgos.calcularPlazo(programa, valor);

    const scProg = Scores.calcularPrograma(programa);
    programa.estado_general = scProg.evaluados ? Scores.getEstado(scProg.pct) : null;

    Hallazgos.actualizar(inspeccion);
    Scores.calcular(inspeccion);
    Store.upsertInspeccion(inspeccion);
    _refresh();
  }

  function guardarHallazgo(texto) {
    const s = _state();
    if (!s) return;
    s.programa.aspectos[s.aspectoIdx].hallazgo = texto;
    Store.upsertInspeccion(s.inspeccion);
  }

  function guardarAccion(texto) {
    const s = _state();
    if (!s) return;
    s.programa.aspectos[s.aspectoIdx].accion = texto;
    Store.upsertInspeccion(s.inspeccion);
  }

  function setEstado(valor) {
    const s = _state();
    if (!s) return;
    s.programa.aspectos[s.aspectoIdx].estado = valor;
    Hallazgos.actualizar(s.inspeccion);
    Store.upsertInspeccion(s.inspeccion);
    _refresh();
  }

  function seleccionarPrograma(programaIdx) {
    Store.setUI({ programaIdx, aspectoIdx: 0 });
    _refresh();
  }

  function navegar(dir) {
    const s = _state();
    if (!s) return;
    const { programa, aspectoIdx } = s;
    // Salta los ítems desactivados en la dirección del movimiento; si no queda
    // ninguno activo por delante/atrás, se comporta como final/inicio del bloque.
    let next = aspectoIdx + dir;
    while (next >= 0 && next < programa.aspectos.length && programa.aspectos[next]._disabled) {
      next += dir;
    }
    if (next < 0) return;
    if (next >= programa.aspectos.length) {
      _finalizarPrograma(programa);
      return;
    }
    Store.setUI({ aspectoIdx: next });
    _refresh();
  }

  function _finalizarPrograma(programa) {
    const noEval = programa.aspectos.filter(a => !a._disabled && !a.criterio).length;
    if (noEval > 0 && !confirm(`${noEval} aspecto(s) sin evaluar. ¿Continuar de todas formas?`)) return;
    const ui          = Store.get().ui;
    const inspeccion  = Store.getCurrentInspeccion();
    const siguienteIdx = (ui.programaIdx || 0) + 1;
    Router.toast(`✓ ${programa.nombre} completado`);
    if (siguienteIdx < inspeccion.programas.length) {
      Store.setUI({ programaIdx: siguienteIdx, aspectoIdx: 0 });
      _refresh();
    } else {
      Scores.calcular(inspeccion);
      Hallazgos.actualizar(inspeccion);
      Store.upsertInspeccion(inspeccion);
      Router.go('verificar');
    }
  }

  function refresh() { _refresh(); }

  function _refresh() {
    const area = document.getElementById('screen-area');
    if (area) { area.innerHTML = render(); attach(); }
  }

  function _esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function attach() {}

  return { render, attach, evaluar, navegar, guardarHallazgo, guardarAccion, setEstado, seleccionarPrograma, refresh };
})();
