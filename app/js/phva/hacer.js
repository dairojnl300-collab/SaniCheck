// hacer.js — HACER: 5 programas PSB con fotos (Semana 2)

const Hacer = (() => {
  const CRITICOS  = ['infra', 'pcip', 'agua'];
  const MAX_FOTOS = 3;

  function _state() {
    const inspeccion = Store.getCurrentInspeccion();
    if (!inspeccion) return null;
    const ui      = Store.get().ui;
    const progIdx = typeof ui.programaIdx === 'number' ? ui.programaIdx : 0;
    const programa = inspeccion.programas[progIdx];
    const aspIdx  = Math.min(typeof ui.aspectoIdx === 'number' ? ui.aspectoIdx : 0, programa.aspectos.length - 1);
    return { inspeccion, programa, progIdx, idx: aspIdx, aspecto: programa.aspectos[aspIdx] };
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

    const { inspeccion, programa, progIdx, idx, aspecto } = s;
    const total     = programa.aspectos.length;
    const evaluados = programa.aspectos.filter(a => a.evaluacion).length;
    const pct       = Math.round((evaluados / total) * 100);
    const numFotos  = (aspecto.fotografias || []).length;
    const esUltimo  = progIdx >= inspeccion.programas.length - 1;

    return `
      <div class="checklist-header">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div class="screen-fase-badge badge-H" style="font-size:11px;padding:3px 8px;">🔍 HACER</div>
          <span style="font-size:11px;color:var(--color-ink3);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${_esc(inspeccion.establecimiento.nombre)}</span>
        </div>

        <div class="prog-tabs">
          ${inspeccion.programas.map((p, i) => {
            const ev  = p.aspectos.filter(a => a.evaluacion).length;
            const tot = p.aspectos.length;
            const est = p.estado_general;
            return `<button class="prog-tab${i === progIdx ? ' active' : ''}"
              onclick="Hacer.seleccionarPrograma(${i})">
              <span class="prog-tab-code">${p.codigo}</span>
              ${est
                ? `<span class="prog-tab-dot dot-${est}"></span>`
                : ev > 0
                  ? `<span class="prog-tab-cnt">${ev}/${tot}</span>`
                  : ''}
            </button>`;
          }).join('')}
        </div>

        <div style="font-size:12px;font-weight:700;color:var(--color-ink);margin-top:8px;margin-bottom:6px;">
          ${programa.nombre}</div>
        <div class="progress-label">
          <span>Aspecto <strong>${idx + 1}</strong> de <strong>${total}</strong></span>
          <span style="color:${pct === 100 ? 'var(--color-bueno)' : 'var(--color-ink3)'};">
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

        <div class="fotos-section">
          <div class="obs-label">Evidencias fotográficas (${numFotos}/${MAX_FOTOS})</div>
          <div class="fotos-grid" id="fotos-grid-${aspecto.id}">
            <span class="fotos-vacio">Cargando...</span>
          </div>
          ${numFotos < MAX_FOTOS ? `
            <label class="btn-foto" for="foto-input-${aspecto.id}">📷 Agregar foto</label>
            <input type="file" accept="image/*" capture="environment"
              id="foto-input-${aspecto.id}"
              style="display:none"
              onchange="Hacer.agregarFoto(this, '${aspecto.id}')">
          ` : `
            <div style="font-size:11px;color:var(--color-ink3);padding-top:4px;">
              Máximo ${MAX_FOTOS} fotos por aspecto</div>`}
        </div>

        ${_renderResumen(programa)}
      </div>

      <div class="checklist-nav">
        <button class="btn btn-outline nav-prev" style="width:auto;padding:10px 16px;"
          onclick="Hacer.navegar(-1)"${idx === 0 ? ' disabled' : ''}>← Anterior</button>
        <div class="nav-counter">${idx + 1} / ${total}</div>
        <button class="btn ${idx === total - 1 ? 'btn-primary' : 'btn-accent'} nav-next"
          style="width:auto;padding:10px 16px;"
          onclick="Hacer.navegar(1)">
          ${idx === total - 1
            ? (esUltimo ? 'Finalizar →' : 'Sig. programa →')
            : 'Siguiente →'}
        </button>
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

  function seleccionarPrograma(progIdx) {
    Store.setUI({ programaIdx: progIdx, aspectoIdx: 0 });
    _refresh();
  }

  function evaluar(valor) {
    const s = _state();
    if (!s) return;
    const { inspeccion, programa, idx } = s;
    const aspecto = programa.aspectos[idx];

    aspecto.evaluacion = valor;
    if (!aspecto.obs_editada) {
      aspecto.obs = generarObservacion(programa.id, valor);
    }
    const urgencia = clasificarUrgencia(valor, programa.id);
    aspecto.hallazgo_critico = urgencia ? urgencia.dias === 0 : false;
    aspecto.plazo = urgencia ? urgencia.plazo : null;

    programa.estado_general = calcularEstadoPrograma(programa);
    inspeccion.estado_general = calcularEstadoGeneral(inspeccion.programas);
    inspeccion.score = calcularScore(inspeccion.programas);

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
    const { inspeccion, programa, progIdx, idx } = s;
    const next = idx + dir;
    if (next < 0) return;
    if (next >= programa.aspectos.length) {
      _finalizarPrograma(inspeccion, programa, progIdx);
      return;
    }
    Store.setUI({ aspectoIdx: next });
    _refresh();
  }

  function _finalizarPrograma(inspeccion, programa, progIdx) {
    const noEval = programa.aspectos.filter(a => !a.evaluacion).length;
    if (noEval > 0 && !confirm(`${noEval} aspecto(s) sin evaluar en "${programa.nombre}". ¿Continuar de todas formas?`)) return;
    const sigIdx = progIdx + 1;
    if (sigIdx < inspeccion.programas.length) {
      Router.toast(`✓ ${programa.nombre} completado`);
      Store.setUI({ programaIdx: sigIdx, aspectoIdx: 0 });
      _refresh();
    } else {
      Router.toast('✓ Todos los programas evaluados');
      Router.go('verificar');
    }
  }

  async function agregarFoto(input, aspectoId) {
    const file = input.files[0];
    if (!file) return;
    const s = _state();
    if (!s) return;
    const aspecto = s.programa.aspectos.find(a => a.id === aspectoId);
    if (!aspecto) return;
    if ((aspecto.fotografias || []).length >= MAX_FOTOS) {
      Router.toast(`Máximo ${MAX_FOTOS} fotos por aspecto`);
      return;
    }
    try {
      const id = await IDBFotos.guardar(aspectoId, file);
      if (!aspecto.fotografias) aspecto.fotografias = [];
      aspecto.fotografias.push({ id });
      Store.upsertInspeccion(s.inspeccion);
      _refresh();
      Router.toast('✓ Foto agregada');
    } catch (e) {
      Router.toast('Error al guardar la foto');
    }
  }

  async function eliminarFoto(fotoId, aspectoId) {
    const s = _state();
    if (!s) return;
    const aspecto = s.programa.aspectos.find(a => a.id === aspectoId);
    if (!aspecto) return;
    try {
      await IDBFotos.eliminar(fotoId);
      aspecto.fotografias = (aspecto.fotografias || []).filter(f => f.id !== fotoId);
      Store.upsertInspeccion(s.inspeccion);
      _refresh();
      Router.toast('✓ Foto eliminada');
    } catch (e) {
      Router.toast('Error al eliminar la foto');
    }
  }

  async function _cargarFotos(aspectoId) {
    const grid = document.getElementById('fotos-grid-' + aspectoId);
    if (!grid) return;
    try {
      const fotos = await IDBFotos.obtenerPorAspecto(aspectoId);
      if (!fotos.length) {
        grid.innerHTML = '<span class="fotos-vacio">Sin fotos aún</span>';
        return;
      }
      grid.innerHTML = fotos.map(f => `
        <div class="foto-thumb">
          <img src="${f.dataUrl}" alt="Foto evidencia" loading="lazy">
          <button class="foto-del" onclick="Hacer.eliminarFoto('${f.id}','${aspectoId}')">×</button>
        </div>`).join('');
    } catch (e) {
      if (grid) grid.innerHTML = '<span class="fotos-vacio">Error al cargar fotos</span>';
    }
  }

  function _refresh() {
    const area = document.getElementById('screen-area');
    if (area) { area.innerHTML = render(); attach(); }
  }

  function _esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function attach() {
    const s = _state();
    if (s) _cargarFotos(s.aspecto.id);
  }

  return { render, attach, evaluar, navegar, guardarObs, seleccionarPrograma, agregarFoto, eliminarFoto };
})();
