// verificar.js — Pantalla VERIFICAR: dashboard de resultados PSB (Semana 3)

const Verificar = (() => {
  const PROG_ICONS = {
    infra:    { color: '#1E40AF', light: '#93C5FD', svg: '<path d="M4 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16"/><path d="M13 10h5a1 1 0 0 1 1 1v10"/><path d="M2 21h20"/><path d="M7 8h1M10 8h1M7 12h1M10 12h1M7 16h1M10 16h1"/>' },
    pld:      { color: '#0891B2', light: '#67E8F9', svg: '<path d="M12 3c-3.2 4-6 7.6-6 10.6a6 6 0 0 0 12 0C18 10.6 15.2 7 12 3z"/>' },
    pcip:     { color: '#D97706', light: '#FCD34D', svg: '<ellipse cx="12" cy="14" rx="4.5" ry="6"/><path d="M12 8v12"/><path d="M9 5.5 7.5 4M15 5.5 16.5 4"/><circle cx="12" cy="6" r="1.5"/>' },
    residuos: { color: '#059669', light: '#6EE7B7', svg: '<path d="M4 12a8 8 0 0 1 14.5-4.5M20 12a8 8 0 0 1-14.5 4.5"/><path d="M17 4v4h-4"/><path d="M7 20v-4h4"/>' },
    agua:     { color: '#0284C7', light: '#7DD3FC', svg: '<path d="M3 17c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/><path d="M3 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/>' },
  };
  function _progIcon(id, size) {
    const p = PROG_ICONS[id] || PROG_ICONS.infra;
    size = size || 20;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${p.color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0;">${p.svg}</svg>`;
  }

  function render() {
    const inspeccion = Store.getCurrentInspeccion();
    if (!inspeccion) return _sinInspeccion();

    Scores.calcular(inspeccion);
    Hallazgos.actualizar(inspeccion);
    Store.upsertInspeccion(inspeccion);

    const score    = inspeccion.score || { pct_cumplimiento: 0, B: 0, R: 0, D: 0, total: 0 };
    const hallazgos = inspeccion.hallazgos_criticos || [];
    const historico = _getHistorico(inspeccion);

    return `
      <img src="assets/icons/isotipo-transparente.png" class="watermark-bg" alt="">
      <div style="padding:var(--sp-md);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-md);">
          ${PhvaIcons.badge('V', 'VERIFICAR')}
          <span style="font-size:11px;color:var(--color-ink3);max-width:190px;
            overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${_esc(inspeccion.establecimiento.nombre)}</span>
        </div>

        ${_renderScoreCircular(score, inspeccion.estado_general)}
        ${_renderRadar(inspeccion.programas)}
        ${_renderBarras(inspeccion.programas)}
        ${hallazgos.length ? _renderHallazgos(hallazgos) : ''}
        ${historico ? _renderHistorico(historico, inspeccion) : ''}

        <button class="btn btn-primary" style="margin-top:var(--sp-lg);display:inline-flex;align-items:center;justify-content:center;gap:6px;"
          onclick="Router.go('actuar')">
          ${AppIcons.row('fileText', 'GENERAR ACTA PSB', 14)}
        </button>
        <button class="btn btn-outline" style="margin-top:var(--sp-sm);display:inline-flex;align-items:center;justify-content:center;gap:6px;"
          onclick="Router.go('hacer')">
          ${AppIcons.row('arrowLeft', 'Volver a HACER', 14)}
        </button>
        <div style="height:32px;"></div>
      </div>`;
  }

  /* ── Score circular ────────────────────────────── */
  function _renderScoreCircular(score, estadoGeneral) {
    const pct   = score.pct_cumplimiento || 0;
    const color = Scores.getColor(pct);
    const cls   = Scores.getEstado(pct);
    const label = cls === 'B' ? 'BUENO' : cls === 'R' ? 'REGULAR' : 'DEFICIENTE';

    const R = 54, C = 2 * Math.PI * R;
    const dash = ((pct / 100) * C).toFixed(1);
    const gap  = (C - dash).toFixed(1);

    return `
      <div style="display:flex;flex-direction:column;align-items:center;
        padding:var(--sp-lg) 0 var(--sp-md);background:var(--color-white);
        border-radius:var(--radius-lg);border:1px solid var(--color-border);
        margin-bottom:var(--sp-md);box-shadow:var(--shadow-sm);">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="${R}" fill="none" stroke="#E5E7EB" stroke-width="12"/>
          <circle cx="70" cy="70" r="${R}" fill="none" stroke="${color}" stroke-width="12"
            stroke-linecap="round"
            stroke-dasharray="${dash} ${gap}"
            transform="rotate(-90 70 70)"/>
          <text x="70" y="66" text-anchor="middle" dominant-baseline="middle"
            font-family="Inter,sans-serif" font-size="26" font-weight="900"
            fill="${color}">${pct}%</text>
          <text x="70" y="87" text-anchor="middle"
            font-family="Inter,sans-serif" font-size="10" fill="#6B7280">Cumplimiento</text>
        </svg>
        <span class="estado-chip estado-${cls}" style="margin-top:4px;">${label}</span>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--sp-sm);
          width:100%;padding:var(--sp-sm) var(--sp-lg) 0;margin-top:var(--sp-sm);">
          ${[['B','BUENO',score.B||0,'var(--color-bueno)'],
             ['R','REGULAR',score.R||0,'var(--color-regular)'],
             ['D','DEFIC.',score.D||0,'var(--color-deficiente)']].map(([,l,n,c]) => `
            <div style="text-align:center;">
              <div style="font-size:24px;font-weight:900;color:${c};">${n}</div>
              <div style="font-size:10px;color:var(--color-ink3);">${l}</div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  /* ── Radar pentagonal SVG ──────────────────────── */
  function _renderRadar(programas) {
    const CX = 120, CY = 120, R = 72;
    const LABELS = ['INFRA','PLD','PCIP','RS','AGUA'];
    // Pentagon: top vertex first, clockwise
    const ANGLES = [-90, -18, 54, 126, 198];

    function pt(angleDeg, radius) {
      const a = (angleDeg * Math.PI) / 180;
      return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
    }

    function poly(r) {
      return ANGLES.map(a => pt(a, r).map(v => v.toFixed(1)).join(',')).join(' ');
    }

    const scores = programas.map(p => (Scores.calcularPrograma(p).pct || 0) / 100);
    const dataPts = ANGLES.map((a, i) => pt(a, R * scores[i]));
    const dataPoly = dataPts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');

    const axisLines = ANGLES.map(a => {
      const [x, y] = pt(a, R);
      return `<line x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"
        stroke="#E5E7EB" stroke-width="1"/>`;
    }).join('');

    const labelEls = ANGLES.map((a, i) => {
      const [x, y] = pt(a, R + 22);
      const sc = Math.round(scores[i] * 100);
      const color = sc >= 70 ? '#2E7D32' : sc >= 40 ? '#F57C00' : sc > 0 ? '#D32F2F' : '#9CA3AF';
      return `
        <text x="${x.toFixed(1)}" y="${(y - 6).toFixed(1)}"
          text-anchor="middle" font-family="Inter,sans-serif"
          font-size="10" font-weight="700" fill="#374151">${LABELS[i]}</text>
        <text x="${x.toFixed(1)}" y="${(y + 7).toFixed(1)}"
          text-anchor="middle" font-family="Inter,sans-serif"
          font-size="9" font-weight="600" fill="${color}">${sc}%</text>`;
    }).join('');

    return `
      <div style="background:var(--color-white);border-radius:var(--radius-lg);
        border:1px solid var(--color-border);padding:var(--sp-md);
        margin-bottom:var(--sp-md);box-shadow:var(--shadow-sm);">
        <div style="font-size:11px;font-weight:700;color:var(--color-ink3);
          text-transform:uppercase;letter-spacing:0.06em;margin-bottom:var(--sp-sm);">
          Radar de Cumplimiento PSB</div>
        <div style="display:flex;justify-content:center;">
          <svg width="240" height="240" viewBox="0 0 240 240">
            ${[0.25,0.5,0.75,1].map((l, i) => `
              <polygon points="${poly(R*l)}" fill="none"
                stroke="#E5E7EB" stroke-width="${i===3?1.5:0.7}"/>`).join('')}
            ${axisLines}
            <polygon points="${dataPoly}"
              fill="rgba(46,125,50,0.18)" stroke="#2E7D32" stroke-width="2"
              stroke-linejoin="round"/>
            ${dataPts.map(([x,y]) => `
              <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"
                fill="#2E7D32" stroke="#fff" stroke-width="1.5"/>`).join('')}
            ${labelEls}
          </svg>
        </div>
      </div>`;
  }

  /* ── Barras por programa ───────────────────────── */
  function _renderBarras(programas) {
    const PLAZOS = { B:'', R:'30 días', D:'Inmediato' };

    return `
      <div style="background:var(--color-white);border-radius:var(--radius-lg);
        border:1px solid var(--color-border);padding:var(--sp-md);
        margin-bottom:var(--sp-md);box-shadow:var(--shadow-sm);">
        <div style="font-size:11px;font-weight:700;color:var(--color-ink3);
          text-transform:uppercase;letter-spacing:0.06em;margin-bottom:var(--sp-md);">
          Cumplimiento por Programa</div>
        ${programas.map(p => {
          const sc  = Scores.calcularPrograma(p);
          const est = sc.evaluados ? Scores.getEstado(sc.pct) : null;
          const clr = sc.evaluados ? Scores.getColor(sc.pct) : 'var(--color-muted)';
          const plazo = est ? PLAZOS[est] : '';
          const pi = PROG_ICONS[p.id] || PROG_ICONS.infra;
          return `
            <div style="margin-bottom:var(--sp-sm);padding:10px 12px;border-radius:8px;
              background:var(--color-surface);border-left:4px solid ${pi.color};">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                <div style="display:flex;align-items:center;gap:6px;">
                  ${_progIcon(p.id, 20)}
                  <span style="font-size:12px;font-weight:600;color:var(--color-ink2);">
                    ${p.nombre}</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                  ${plazo ? `<span style="font-size:10px;color:${clr};">${plazo}</span>` : ''}
                  ${est
                    ? `<span class="estado-chip estado-${est}" style="font-size:10px;padding:2px 8px;">${est}</span>`
                    : '<span style="font-size:10px;color:var(--color-muted)">—</span>'}
                </div>
              </div>
              <div style="height:8px;background:var(--color-border);border-radius:8px;overflow:hidden;">
                <div style="height:100%;width:${sc.pct||2}%;
                  background:linear-gradient(90deg, ${pi.light} 0%, ${pi.color} 100%);
                  border-radius:8px;"></div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:3px;">
                <span style="font-size:10px;color:var(--color-ink3);">${sc.evaluados}/${sc.total} aspectos</span>
                <span style="font-size:11px;font-weight:700;color:${clr};">${sc.pct}%</span>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  /* ── Hallazgos críticos ────────────────────────── */
  function _renderHallazgos(hallazgos) {
    const criticos = hallazgos.filter(h => h.critico);
    const ordenados = [...criticos, ...hallazgos.filter(h => !h.critico)];

    return `
      <div style="background:var(--color-white);border-radius:var(--radius-lg);
        border:1px solid var(--color-border);padding:var(--sp-md);
        margin-bottom:var(--sp-md);box-shadow:var(--shadow-sm);">
        <div style="font-size:11px;font-weight:700;color:var(--color-ink3);
          text-transform:uppercase;letter-spacing:0.06em;margin-bottom:var(--sp-md);">
          Hallazgos (${hallazgos.length}) · Críticos: ${criticos.length}</div>
        ${ordenados.map(h => `
          <div style="padding:10px;border-radius:var(--radius-md);margin-bottom:8px;
            background:${h.evaluacion==='D'?'var(--color-deficiente-bg)':'var(--color-regular-bg)'};
            border-left:3px solid ${h.evaluacion==='D'?'var(--color-deficiente)':'var(--color-regular)'};">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;
              gap:8px;margin-bottom:4px;">
              <span style="font-size:11px;font-weight:600;color:var(--color-ink2);
                line-height:1.4;flex:1;">${_esc(h.texto)}</span>
              <span style="flex-shrink:0;font-size:10px;font-weight:700;padding:2px 8px;
                border-radius:var(--radius-full);color:#fff;
                background:${h.evaluacion==='D'?'var(--color-deficiente)':'var(--color-regular)'};">
                ${h.critico
                  ? `<span style="display:inline-flex;align-items:center;gap:3px;">${AppIcons.icon('zap', 10)} INMEDIATO</span>`
                  : h.plazo}</span>
            </div>
            <div style="font-size:10px;color:var(--color-ink3);display:flex;align-items:center;gap:4px;">
              ${AppIcons.icon('scale', 10)} ${_esc(h.norma)} · ${_esc(h.programa_nombre)}</div>
          </div>`).join('')}
      </div>`;
  }

  /* ── Comparación histórica ─────────────────────── */
  function _renderHistorico(anterior, actual) {
    const IDS    = ['infra','pld','pcip','residuos','agua'];
    const LABELS = { infra:'INFRA', pld:'PLD', pcip:'PCIP', residuos:'RS', agua:'AGUA' };

    return `
      <div style="background:var(--color-white);border-radius:var(--radius-lg);
        border:1px solid var(--color-border);padding:var(--sp-md);
        margin-bottom:var(--sp-md);box-shadow:var(--shadow-sm);">
        <div style="font-size:11px;font-weight:700;color:var(--color-ink3);
          text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">
          Comparación Histórica</div>
        <div style="font-size:10px;color:var(--color-ink3);margin-bottom:var(--sp-sm);">
          vs. inspección del ${anterior.inspeccion.fecha}</div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="border-bottom:1.5px solid var(--color-border);">
              <th style="text-align:left;padding:4px 6px;color:var(--color-ink3);font-weight:600;">Prog.</th>
              <th style="text-align:center;padding:4px;color:var(--color-ink3);font-weight:600;">Anterior</th>
              <th style="text-align:center;padding:4px;color:var(--color-ink3);font-weight:600;">Actual</th>
              <th style="text-align:center;padding:4px;color:var(--color-ink3);font-weight:600;">Δ</th>
            </tr>
          </thead>
          <tbody>
            ${IDS.map(id => {
              const pA = anterior.programas.find(p => p.id === id);
              const pB = actual.programas.find(p => p.id === id);
              if (!pA || !pB) return '';
              const scA   = Scores.calcularPrograma(pA).pct;
              const scB   = Scores.calcularPrograma(pB).pct;
              const delta = scB - scA;
              const arrow = AppIcons.delta(delta, 11);
              const clr   = delta > 0 ? 'var(--color-bueno)'
                          : delta < 0 ? 'var(--color-deficiente)'
                          :             'var(--color-ink3)';
              return `
                <tr style="border-bottom:1px solid var(--color-border);">
                  <td style="padding:6px;font-weight:600;">${LABELS[id]}</td>
                  <td style="text-align:center;padding:6px;color:var(--color-ink3);">${scA}%</td>
                  <td style="text-align:center;padding:6px;font-weight:700;">${scB}%</td>
                  <td style="text-align:center;padding:6px;font-weight:800;color:${clr};">
                    <span style="display:inline-flex;align-items:center;justify-content:center;gap:3px;">
                      ${arrow} ${Math.abs(delta)}%</span></td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function _getHistorico(actual) {
    const todas = Store.get().inspecciones;
    const mismo = todas.filter(i =>
      i.id !== actual.id &&
      i.establecimiento.nombre === actual.establecimiento.nombre
    );
    if (!mismo.length) return null;
    return mismo.sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))[0];
  }

  function _sinInspeccion() {
    return `<div class="coming-soon">
      <div class="coming-soon-icon" style="display:flex;justify-content:center;color:var(--color-ink3);">${AppIcons.block('circleAlert', 40)}</div>
      <div class="coming-soon-title">Sin inspección activa</div>
      <div class="coming-soon-desc" style="max-width:320px;margin:0 auto;line-height:1.5;">
        El dashboard PSB requiere una inspección iniciada (Planificar → Iniciar ciclo → HACER).
        El Control de Vencimientos v2 no depende del checklist.
      </div>
      ${_renderVencimientosSinInspBlock()}
      <button class="btn btn-primary mt-md" style="width:auto;padding:12px 24px;margin-top:var(--sp-md);"
        onclick="Router.go('planificar')">Ir a Planificar</button>
      <button class="btn btn-outline mt-sm" style="width:auto;padding:12px 24px;margin-top:var(--sp-sm);"
        onclick="Router.go('hacer')">Ir a HACER</button>
    </div>`;
  }

  function _renderVencimientosSinInspBlock() {
    return `
      <div style="margin:var(--sp-md) auto;padding:var(--sp-md);max-width:400px;background:var(--color-white);
        border-radius:var(--radius-lg);border:1px solid var(--color-border);text-align:left;">
        <div style="font-size:13px;font-weight:700;color:var(--color-brand);margin-bottom:6px;">Control de Vencimientos v2</div>
        <div style="font-size:12px;color:var(--color-ink3);margin-bottom:var(--sp-sm);">
          Disponible en Planificar sin completar HACER. Agregue documentos, fechas y archivos adjuntos.
        </div>
        <button type="button" class="btn btn-accent" style="width:100%;"
          onclick="Router.go('planificar');setTimeout(function(){Planificar.openSection('vencimientos');},200);">
          Ir a Control de Vencimientos
        </button>
      </div>`;
  }

  function attach() {}

  return { render, attach };
})();
