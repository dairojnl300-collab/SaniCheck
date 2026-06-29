// hacer.js — Pantalla HACER: checklist 5 programas PSB (Semana 2)

const Hacer = (() => {

  function _state() {
    const inspeccion = Store.getCurrentInspeccion();
    if (!inspeccion) return null;
    const ui          = Store.get().ui;
    const programaIdx = Math.min(ui.programaIdx || 0, inspeccion.programas.length - 1);
    const programa    = inspeccion.programas[programaIdx];
    const aspectoIdx  = Math.min(ui.aspectoIdx || 0, programa.aspectos.length - 1);
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

    return `
      <div class="checklist-header">
        ${_renderTopBar(inspeccion)}
        ${_renderProgramTabs(inspeccion.programas, programaIdx)}
        ${_renderProgress(programa, aspectoIdx)}
      </div>

      <div class="aspecto-content">
        ${_renderAspecto(aspecto, programaIdx, aspectoIdx)}
        ${_renderResumen(programa)}
      </div>

      <div class="checklist-nav">
        <button class="btn btn-outline nav-prev" style="width:auto;padding:10px 16px;"
          onclick="Hacer.navegar(-1)"${aspectoIdx === 0 ? ' disabled' : ''}>← Anterior</button>
        <div class="nav-counter">${aspectoIdx + 1} / ${programa.aspectos.length}</div>
        <button class="btn ${aspectoIdx === programa.aspectos.length - 1 ? 'btn-primary' : 'btn-accent'} nav-next"
          style="width:auto;padding:10px 16px;"
          onclick="Hacer.navegar(1)">
          ${aspectoIdx === programa.aspectos.length - 1 ? 'Finalizar →' : 'Siguiente →'}</button>
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
      <div style="font-size:11px;color:var(--color-ink3);margin-bottom:8px;overflow:hidden;
        text-overflow:ellipsis;white-space:nowrap">
        ${_esc(inspeccion.establecimiento.nombre)}</div>`;
  }

  function _renderProgramTabs(programas, activeIdx) {
    const ICONS = { infra: '🏗️', pld: '🧹', pcip: '🐛', residuos: '♻️', agua: '💧' };
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
              style="flex:0 0 auto;padding:6px 10px;border-radius:20px;cursor:pointer;
                border:1.5px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'};
                background:${isActive ? 'var(--color-primary-bg)' : 'var(--color-surface)'};
                font-size:11px;font-weight:${isActive ? 700 : 500};
                color:${isActive ? 'var(--color-primary)' : 'var(--color-ink2)'};">
              ${ICONS[p.id] || '📋'} ${p.codigo}
              <span style="color:${dotColor}">●</span>
            </button>`;
        }).join('')}
      </div>`;
  }

  function _renderProgress(programa, aspectoIdx) {
    const total    = programa.aspectos.length;
    const evaluados = programa.aspectos.filter(a => a.evaluacion).length;
    const pct      = Math.round((evaluados / total) * 100);
    return `
      <div style="font-size:13px;font-weight:700;color:var(--color-ink);margin-bottom:8px;">
        ${programa.nombre}</div>
      <div class="progress-label">
        <span>Aspecto <strong>${aspectoIdx + 1}</strong> de <strong>${total}</strong></span>
        <span style="color:${pct === 100 ? 'var(--color-bueno)' : 'var(--color-ink3)'};">
          ${evaluados}/${total} evaluados</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${pct || 2}%"></div>
      </div>`;
  }

  function _renderAspecto(aspecto, programaIdx, aspectoIdx) {
    return `
      <div class="aspecto-texto">${aspecto.texto}</div>
      <div class="norma-badge">📋 ${aspecto.norma}</div>

      <div class="eval-group">
        ${['B', 'R', 'D'].map(v => `
          <button class="eval-btn eval-btn-${v}${aspecto.evaluacion === v ? ' selected' : ''}"
            onclick="Hacer.evaluar('${v}')">
            <span class="eval-letter">${v}</span>
            <span class="eval-word">${v === 'B' ? 'BUENO' : v === 'R' ? 'REGULAR' : 'DEFIC.'}</span>
          </button>`).join('')}
      </div>

      ${aspecto.evaluacion ? `
        <div class="obs-label">Observación</div>
        <textarea class="obs-area" id="obs-area" rows="3"
          onchange="Hacer.guardarObs(this.value)"
          onblur="Hacer.guardarObs(this.value)">${_esc(aspecto.obs)}</textarea>

        <button onclick="Fotos.capturar(${programaIdx},${aspectoIdx})"
          style="margin-top:10px;width:100%;padding:10px;cursor:pointer;
            border:1.5px dashed var(--color-border);border-radius:var(--radius-md);
            background:var(--color-surface);color:var(--color-ink2);font-size:13px;">
          📷 Añadir fotografía${aspecto.fotografias && aspecto.fotografias.length
            ? ' (' + aspecto.fotografias.length + ')' : ''}
        </button>

        ${Fotos.renderThumbnails(aspecto.fotografias || [], programaIdx, aspectoIdx)}

        ${aspecto.hallazgo_critico ? `
          <div style="margin-top:10px;padding:10px 14px;
            background:var(--color-deficiente-bg);
            border-left:3px solid var(--color-deficiente);
            border-radius:0 8px 8px 0;font-size:12px;">
            ⛔ <strong>HALLAZGO CRÍTICO</strong> · Plazo: ${aspecto.plazo}
          </div>` : ''}
      ` : `
        <div style="padding:20px;background:var(--color-surface);border-radius:var(--radius-md);
          text-align:center;color:var(--color-ink3);font-size:13px;
          border:1px dashed var(--color-border);">
          Seleccione B / R / D para registrar la calificación
        </div>`}`;
  }

  function _renderResumen(programa) {
    const ev = programa.aspectos.filter(a => a.evaluacion);
    if (!ev.length) return '';
    const c = { B: 0, R: 0, D: 0 };
    ev.forEach(a => c[a.evaluacion]++);
    const score = Scores.calcularPrograma(programa);
    return `
      <div style="margin-top:var(--sp-md);padding:var(--sp-md);background:var(--color-surface);
        border-radius:var(--radius-md);border:1px solid var(--color-border);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-size:10px;font-weight:700;color:var(--color-ink3);
            text-transform:uppercase;letter-spacing:0.04em;">Resumen del programa</div>
          <div style="font-size:16px;font-weight:900;color:${Scores.getColor(score.pct)}">
            ${score.pct}%</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
          ${['B', 'R', 'D'].map(v => `
            <div style="text-align:center;padding:8px;border-radius:6px;
              background:${v === 'B' ? 'var(--color-bueno-bg)' : v === 'R' ? 'var(--color-regular-bg)' : 'var(--color-deficiente-bg)'}">
              <div style="font-size:22px;font-weight:900;
                color:${v === 'B' ? 'var(--color-bueno)' : v === 'R' ? 'var(--color-regular)' : 'var(--color-deficiente)'}">
                ${c[v]}</div>
              <div style="font-size:9px;color:var(--color-ink3);">
                ${v === 'B' ? 'BUENO' : v === 'R' ? 'REGULAR' : 'DEFIC.'}</div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  function evaluar(valor) {
    const s = _state();
    if (!s) return;
    const { inspeccion, programa, aspectoIdx } = s;
    const aspecto = programa.aspectos[aspectoIdx];

    aspecto.evaluacion = valor;
    if (!aspecto.obs_editada) {
      aspecto.obs = Observaciones.getObs(programa.id, valor);
    }
    aspecto.hallazgo_critico = valor === 'D' && programa.peso_critico;
    aspecto.plazo = Hallazgos.calcularPlazo(programa, valor);

    const evaluados = programa.aspectos.filter(a => a.evaluacion);
    if (evaluados.some(a => a.evaluacion === 'D'))      programa.estado_general = 'D';
    else if (evaluados.some(a => a.evaluacion === 'R')) programa.estado_general = 'R';
    else if (evaluados.length)                          programa.estado_general = 'B';
    else                                                programa.estado_general = null;

    Hallazgos.actualizar(inspeccion);
    Scores.calcular(inspeccion);
    Store.upsertInspeccion(inspeccion);
    _refresh();
  }

  function guardarObs(texto) {
    const s = _state();
    if (!s) return;
    const { inspeccion, programa, aspectoIdx } = s;
    programa.aspectos[aspectoIdx].obs         = texto;
    programa.aspectos[aspectoIdx].obs_editada = true;
    Store.upsertInspeccion(inspeccion);
  }

  function seleccionarPrograma(programaIdx) {
    Store.setUI({ programaIdx, aspectoIdx: 0 });
    _refresh();
  }

  function navegar(dir) {
    const s = _state();
    if (!s) return;
    const { programa, aspectoIdx } = s;
    const next = aspectoIdx + dir;
    if (next < 0) return;
    if (next >= programa.aspectos.length) {
      _finalizarPrograma(programa);
      return;
    }
    Store.setUI({ aspectoIdx: next });
    _refresh();
  }

  function _finalizarPrograma(programa) {
    const noEval = programa.aspectos.filter(a => !a.evaluacion).length;
    if (noEval > 0 && !confirm(`${noEval} aspecto(s) sin evaluar. ¿Continuar de todas formas?`)) return;
    const ui          = Store.get().ui;
    const inspeccion  = Store.getCurrentInspeccion();
    const siguienteIdx = (ui.programaIdx || 0) + 1;
    Router.toast(`✓ ${programa.nombre} completado`);
    if (siguienteIdx < inspeccion.programas.length) {
      Store.setUI({ programaIdx: siguienteIdx, aspectoIdx: 0 });
      _refresh();
    } else {
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

  return { render, attach, evaluar, navegar, guardarObs, seleccionarPrograma, refresh };
})();
