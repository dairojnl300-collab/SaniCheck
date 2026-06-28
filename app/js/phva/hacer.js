// hacer.js — Pantalla HACER: checklist Infraestructura (Semana 1)

const Hacer = (() => {
  const PROGRAMA_IDX = 0; // Semana 1: solo Infraestructura

  const OBS_AUTO = {
    infra: {
      B: 'Conforme. Cumple con Decreto 3075/1997 Anexo I.',
      R: 'Parcialmente conforme. Se observan deficiencias menores. Corrección requerida en 30 días conforme Decreto 3075/1997 Anexo I.',
      D: 'DEFICIENTE. Riesgo sanitario documentado. ACCIÓN INMEDIATA requerida conforme Ley 9/1979 y Decreto 3075/1997 Anexo I.',
    },
  };

  function _state() {
    const inspeccion = Store.getCurrentInspeccion();
    if (!inspeccion) return null;
    const programa  = inspeccion.programas[PROGRAMA_IDX];
    const idx       = Math.min(Store.get().ui.aspectoIdx || 0, programa.aspectos.length - 1);
    return { inspeccion, programa, idx, aspecto: programa.aspectos[idx] };
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

    const { inspeccion, programa, idx, aspecto } = s;
    const total    = programa.aspectos.length;
    const evaluados = programa.aspectos.filter(a => a.evaluacion).length;
    const pct      = Math.round((evaluados / total) * 100);

    return `
      <div class="checklist-header">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <div class="screen-fase-badge badge-H" style="font-size:11px;padding:3px 8px;">🔍 HACER</div>
          <span style="font-size:11px;color:var(--color-ink3);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${_esc(inspeccion.establecimiento.nombre)}</span>
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--color-ink);margin-bottom:8px;">
          ${programa.nombre}</div>
        <div class="progress-label">
          <span>Aspecto <strong>${idx + 1}</strong> de <strong>${total}</strong></span>
          <span style="color:${pct===100?'var(--color-bueno)':'var(--color-ink3)'};">
            ${evaluados}/${total} evaluados</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct || 2}%"></div>
        </div>
      </div>

      <div class="aspecto-content">
        <div class="aspecto-texto">${aspecto.texto}</div>
        <div class="norma-badge">📋 ${aspecto.norma}</div>

        <div class="eval-group">
          ${['B','R','D'].map(v => `
            <button class="eval-btn eval-btn-${v}${aspecto.evaluacion===v?' selected':''}"
              onclick="Hacer.evaluar('${v}')">
              <span class="eval-letter">${v}</span>
              <span class="eval-word">${v==='B'?'BUENO':v==='R'?'REGULAR':'DEFIC.'}</span>
            </button>`).join('')}
        </div>

        ${aspecto.evaluacion ? `
          <div class="obs-label">Observación</div>
          <textarea class="obs-area" id="obs-area" rows="3"
            onchange="Hacer.guardarObs(this.value)"
            onblur="Hacer.guardarObs(this.value)">${_esc(aspecto.obs)}</textarea>
          ${aspecto.hallazgo_critico ? `
            <div style="margin-top:10px;padding:10px 14px;background:var(--color-deficiente-bg);
              border-left:3px solid var(--color-deficiente);border-radius:0 8px 8px 0;font-size:12px;">
              ⛔ <strong>HALLAZGO CRÍTICO</strong> · Plazo: ${aspecto.plazo}
            </div>` : ''}
        ` : `
          <div style="padding:20px;background:var(--color-surface);border-radius:var(--radius-md);
            text-align:center;color:var(--color-ink3);font-size:13px;
            border:1px dashed var(--color-border);">
            Seleccione B / R / D para registrar la calificación
          </div>`}

        ${_renderResumen(programa)}
      </div>

      <div class="checklist-nav">
        <button class="btn btn-outline nav-prev" style="width:auto;padding:10px 16px;"
          onclick="Hacer.navegar(-1)"${idx===0?' disabled':''}>← Anterior</button>
        <div class="nav-counter">${idx+1} / ${total}</div>
        <button class="btn ${idx===total-1?'btn-primary':'btn-accent'} nav-next"
          style="width:auto;padding:10px 16px;"
          onclick="Hacer.navegar(1)">
          ${idx===total-1?'Finalizar →':'Siguiente →'}</button>
      </div>`;
  }

  function _renderResumen(programa) {
    const ev = programa.aspectos.filter(a => a.evaluacion);
    if (!ev.length) return '';
    const c = { B: 0, R: 0, D: 0 };
    ev.forEach(a => c[a.evaluacion]++);
    return `
      <div style="margin-top:var(--sp-md);padding:var(--sp-md);background:var(--color-surface);
        border-radius:var(--radius-md);border:1px solid var(--color-border);">
        <div style="font-size:10px;font-weight:700;color:var(--color-ink3);margin-bottom:8px;
          text-transform:uppercase;letter-spacing:0.04em;">Resumen del programa</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
          ${['B','R','D'].map(v => `
            <div style="text-align:center;padding:8px;border-radius:6px;
              background:${v==='B'?'var(--color-bueno-bg)':v==='R'?'var(--color-regular-bg)':'var(--color-deficiente-bg)'}">
              <div style="font-size:22px;font-weight:900;
                color:${v==='B'?'var(--color-bueno)':v==='R'?'var(--color-regular)':'var(--color-deficiente)'}">
                ${c[v]}</div>
              <div style="font-size:9px;color:var(--color-ink3);">
                ${v==='B'?'BUENO':v==='R'?'REGULAR':'DEFIC.'}</div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  function evaluar(valor) {
    const s = _state();
    if (!s) return;
    const { inspeccion, programa, idx } = s;
    const aspecto = programa.aspectos[idx];
    aspecto.evaluacion = valor;
    if (!aspecto.obs_editada) {
      aspecto.obs = OBS_AUTO[programa.id]?.[valor] || '';
    }
    const criticos = ['infra','pcip','agua'];
    aspecto.hallazgo_critico = valor==='D' && criticos.includes(programa.id);
    aspecto.plazo = valor==='D' && criticos.includes(programa.id) ? 'Inmediato' :
                    valor==='D' ? '7 días' : valor==='R' ? '30 días' : null;

    const evaluados = programa.aspectos.filter(a => a.evaluacion);
    if (evaluados.some(a => a.evaluacion==='D')) programa.estado_general = 'D';
    else if (evaluados.some(a => a.evaluacion==='R')) programa.estado_general = 'R';
    else if (evaluados.length) programa.estado_general = 'B';

    Store.upsertInspeccion(inspeccion);
    _refresh();
  }

  function guardarObs(texto) {
    const s = _state();
    if (!s) return;
    const { inspeccion, programa, idx } = s;
    programa.aspectos[idx].obs = texto;
    programa.aspectos[idx].obs_editada = true;
    Store.upsertInspeccion(inspeccion);
  }

  function navegar(dir) {
    const s = _state();
    if (!s) return;
    const { programa, idx } = s;
    const next = idx + dir;
    if (next < 0) return;
    if (next >= programa.aspectos.length) {
      _finalizar(programa);
      return;
    }
    Store.setUI({ aspectoIdx: next });
    _refresh();
  }

  function _finalizar(programa) {
    const noEval = programa.aspectos.filter(a => !a.evaluacion).length;
    if (noEval > 0 && !confirm(`${noEval} aspecto(s) sin evaluar. ¿Continuar de todas formas?`)) return;
    Router.toast(`✓ ${programa.nombre} completado`);
    Router.go('verificar');
  }

  function _refresh() {
    const area = document.getElementById('screen-area');
    if (area) { area.innerHTML = render(); attach(); }
  }

  function _esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function attach() {}

  return { render, attach, evaluar, navegar, guardarObs };
})();
