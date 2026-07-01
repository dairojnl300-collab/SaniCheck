// actuar.js — Pantalla ACTUAR: Acta de Inspección PSB completa (Semana 3)

const Actuar = (() => {

  const C = { verde:'#1B4332', acento:'#52B788', naranja:'#F57C00', rojo:'#A32D2D', gris:'#888780' };
  let _charts = [];

  function render() {
    const inspeccion = Store.getCurrentInspeccion();
    if (!inspeccion) return _sinInspeccion();

    if (!inspeccion.numero_acta) {
      inspeccion.numero_acta = _generarNumeroActa();
      Store.upsertInspeccion(inspeccion);
    }

    let ps = document.getElementById('acta-print-style');
    if (!ps) {
      ps = document.createElement('style');
      ps.id = 'acta-print-style';
      document.head.appendChild(ps);
    }
    ps.textContent = `
      @media print {
        .phva-topbar, .acta-actions, #app-toast { display: none !important; }
        #app { max-width: 100% !important; box-shadow: none !important; }
        #screen-area { overflow: visible !important; }
        body { background: #fff !important; orphans: 4; widows: 4; }
        @page { margin: 1.5cm; }
        .acta-seccion    { page-break-inside: avoid; break-inside: avoid; }
        .acta-card       { page-break-inside: avoid; break-inside: avoid; }
        .acta-hallazgo   { page-break-inside: avoid; break-inside: avoid; }
        .acta-chart-wrap { page-break-inside: avoid; break-inside: avoid; }
        .acta-firmas     { page-break-inside: avoid; break-inside: avoid; }
        * { -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important; }
      }
    `;

    return `
      <div class="acta-actions" style="padding:var(--sp-md);display:flex;
        flex-direction:column;gap:var(--sp-sm);background:var(--color-white);
        border-bottom:1px solid var(--color-border);position:sticky;top:0;z-index:10;">
        <div style="font-size:11px;font-weight:700;color:var(--color-ink3);
          text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">
          📄 ${_esc(inspeccion.numero_acta)} · ${_esc(inspeccion.establecimiento.nombre)}</div>
        <div style="display:flex;gap:var(--sp-sm);">
          <button class="btn btn-primary" style="flex:1;min-height:44px;"
            onclick="Actuar.abrirPDF()">📄 DESCARGAR PDF</button>
          <button class="btn btn-accent" style="flex:1;min-height:44px;"
            onclick="Actuar.compartir()">📤 COMPARTIR</button>
        </div>
        <div style="display:flex;gap:var(--sp-sm);">
          <button class="btn btn-outline" style="flex:1;min-height:40px;"
            onclick="Router.go('verificar')">← VERIFICAR</button>
          <button class="btn btn-outline" style="flex:1;min-height:40px;"
            onclick="Router.go('home')">🔁 NUEVA</button>
        </div>
      </div>

      <div id="acta-doc" style="background:#fff;padding:20px 20px 40px;">
        ${_renderPrintHeader(inspeccion)}
        ${_renderDatosEstablecimiento(inspeccion)}
        ${_renderResumenCumplimiento(inspeccion)}
        ${_renderGraficasPorPrograma(inspeccion)}
        ${_renderResumenComparativo(inspeccion)}
        ${_renderComparacionHistorica(inspeccion)}
        ${_renderMetodologia()}
        ${_renderHallazgos(inspeccion)}
        ${_renderNoAplicables(inspeccion)}
        ${_renderPlanAcciones(inspeccion)}
        ${_renderObservacionesPorPrograma(inspeccion)}
        ${_renderFotografias(inspeccion)}
        ${_renderFirmas(inspeccion)}
        ${_renderFooter()}
      </div>`;
  }

  /* ── attach: carga Chart.js e inicializa gráficas ── */
  function attach() {
    const inspeccion = Store.getCurrentInspeccion();
    if (!inspeccion) return;

    _charts.forEach(c => { try { c.destroy(); } catch(e) {} });
    _charts = [];

    if (typeof Chart === 'undefined') {
      const s = document.createElement('script');
      s.src = 'assets/vendor/chart.umd.min.js';
      s.onload = () => _initCharts(inspeccion);
      document.head.appendChild(s);
    } else {
      _initCharts(inspeccion);
    }
  }

  function _initCharts(inspeccion) {
    _initPieCharts(inspeccion);
    _initComparativoChart(inspeccion);
    _initHistoricoCharts(inspeccion);
  }

  /* ── Tortas eliminadas — reemplazadas por KPI cards ── */
  function _initPieCharts() {}

  /* ── Barras horizontales comparativo ── */
  function _initComparativoChart(inspeccion) {
    const canvas = document.getElementById('chart-comparativo');
    if (!canvas) return;

    const sorted = [...inspeccion.programas]
      .map(p => ({ nombre: _shortName(p.nombre), ...Scores.calcularPrograma(p) }))
      .filter(p => p.evaluados > 0)
      .sort((a, b) => b.pct - a.pct);

    if (!sorted.length) {
      const wrap = document.getElementById('chart-comparativo-wrap');
      if (wrap) { wrap.style.height = '0'; wrap.style.overflow = 'hidden'; }
      return;
    }

    const _chartColor = pct => pct >= 80 ? '#1B4332' : pct >= 50 ? '#F57C00' : '#A32D2D';

    const pctLabelPlugin = {
      id: 'pctLabel',
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(0);
        meta.data.forEach((bar, j) => {
          const val = sorted[j]?.pct;
          if (val === undefined) return;
          ctx.save();
          ctx.font = 'bold 12px sans-serif';
          ctx.textBaseline = 'middle';
          if (val >= 15) {
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'right';
            ctx.fillText(val + '%', bar.x - 6, bar.y);
          } else {
            ctx.fillStyle = _chartColor(val);
            ctx.textAlign = 'left';
            ctx.fillText(val + '%', bar.x + 4, bar.y);
          }
          ctx.restore();
        });
      }
    };

    const metaLinePlugin = {
      id: 'metaLine',
      afterDraw(chart) {
        const { ctx, scales: { x, y } } = chart;
        const xPos = x.getPixelForValue(80);
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#888780';
        ctx.lineWidth = 1.5;
        ctx.moveTo(xPos, y.top);
        ctx.lineTo(xPos, y.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#888780';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Meta 80%', xPos, y.top - 6);
        ctx.restore();
      }
    };

    const chart = new Chart(canvas, {
      type: 'bar',
      plugins: [pctLabelPlugin, metaLinePlugin],
      data: {
        labels: sorted.map(p => p.nombre),
        datasets: [{
          data: sorted.map(p => p.pct),
          backgroundColor: sorted.map(p => _chartColor(p.pct)),
          borderWidth: 0,
          borderRadius: 3,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: false,
        animation: { duration: 0 },
        layout: { padding: { top: 16 } },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          x: {
            min: 0, max: 100,
            ticks: { stepSize: 20, font: { size: 9 }, color: '#888780', callback: v => v + '%' },
            grid: { color: '#eee' },
            border: { display: false }
          },
          y: {
            ticks: { font: { size: 10 }, color: C.verde },
            grid: { display: false },
            border: { display: false }
          }
        }
      }
    });
    _charts.push(chart);
    const wrap = document.getElementById('chart-comparativo-wrap');
    if (wrap) wrap.style.display = 'block';
  }

  /* ── Gráficas históricas ── */
  function _initHistoricoCharts() {}

  /* ── Header de acta (flujo normal, no fijo) ─────── */
  function _renderPrintHeader(inspeccion) {
    return `
      <div id="acta-print-header" style="display:flex;justify-content:space-between;
        align-items:center;padding:8px 16px;
        border-bottom:2px solid ${C.verde};margin-bottom:16px;background:#fff;">
        <div style="display:flex;align-items:center;gap:8px;">
          <img src="assets/icons/logotipo-sanicheck.png" alt="SaniCheck"
            style="height:32px;width:auto;flex-shrink:0;">
          <div style="line-height:1.5;">
            <div style="font-weight:800;font-size:11px;color:${C.verde};">SaniCheck</div>
            <div style="font-size:8px;color:${C.acento};">by ECODESA</div>
            <div style="font-size:8px;color:${C.gris};">Ecología Desarrollo e Ingeniería S.A.S</div>
            <div style="font-size:8px;color:${C.gris};">ecodesaingenieria@outlook.es · WhatsApp 301 365 3273</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:800;font-size:11px;color:${C.verde};">ACTA DE INSPECCIÓN PSB</div>
          <div style="font-size:9px;color:#6B7280;">N° <strong>${_esc(inspeccion.numero_acta)}</strong></div>
          <div style="font-size:9px;color:#6B7280;">${inspeccion.inspeccion.fecha}</div>
        </div>
      </div>`;
  }

  /* ── Datos establecimiento ───────────────────────── */
  function _renderDatosEstablecimiento(inspeccion) {
    const e = inspeccion.establecimiento;
    const i = inspeccion.inspeccion;
    const filas = [
      ['Establecimiento', e.nombre],
      ['NIT / CC', e.nit],
      ['Dirección', e.direccion],
      ['Tipo', e.tipo],
      ['Administrador / Responsable PSB', e.responsable_sanitario || '—'],
      ['Profesional', i.inspector],
      ['Fecha de Inspección', i.fecha],
      ['N° Acta', inspeccion.numero_acta],
    ];
    return `
      <div class="acta-seccion" style="margin-bottom:14px;">
        ${_secTitle('Datos del Establecimiento', C.verde)}
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          ${filas.map(([k,v], idx) => `
            <tr style="background:${idx%2===0?'#fff':'#F9FAFB'};
              border-bottom:1px solid #E5E7EB;">
              <td style="padding:5px 8px;color:#6B7280;font-weight:600;width:38%;">${k}</td>
              <td style="padding:5px 8px;color:#111827;">${_esc(v||'—')}</td>
            </tr>`).join('')}
        </table>
      </div>`;
  }

  /* ── Resumen de cumplimiento ─────────────────────── */
  function _renderResumenCumplimiento(inspeccion) {
    const score  = inspeccion.score || {};
    const pct    = score.pct_cumplimiento || 0;
    const estado = Scores.getEstado(pct);
    const color  = _colorPct(pct);
    const LABEL  = { B:'BUENO', R:'REGULAR', D:'DEFICIENTE' };

    return `
      <div class="acta-seccion" style="margin-bottom:14px;">
        ${_secTitle('Resumen de Cumplimiento', C.verde)}
        <div style="display:flex;align-items:center;gap:16px;padding:12px;
          background:#F0FDF4;border-radius:8px;margin-bottom:10px;">
          <div style="text-align:center;min-width:72px;">
            <div style="font-size:32px;font-weight:900;color:${color};line-height:1;">${pct}%</div>
            <div style="font-size:9px;color:#6B7280;letter-spacing:0.04em;">CUMPLIMIENTO</div>
          </div>
          <div>
            <div style="font-size:16px;font-weight:800;color:${color};margin-bottom:4px;">
              ${estado ? LABEL[estado] : '—'}</div>
            <div style="display:flex;gap:12px;">
              ${[['Bueno',score.B||0,'#2E7D32'],['Regular',score.R||0,'#F57C00'],['Defic.',score.D||0,'#D32F2F']]
                .map(([l,n,c]) => `<span style="font-size:11px;font-weight:700;color:${c};">${n} ${l}</span>`).join('')}
            </div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="background:${C.verde};color:#fff;">
              <th style="padding:6px 8px;text-align:left;">Programa</th>
              <th style="padding:6px 8px;text-align:center;">Evaluados</th>
              <th style="padding:6px 8px;text-align:center;">Cumplimiento</th>
              <th style="padding:6px 8px;text-align:center;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${inspeccion.programas.map((p, idx) => {
              const sc  = Scores.calcularPrograma(p);
              const est = sc.evaluados ? Scores.getEstado(sc.pct) : null;
              const c   = sc.evaluados ? _colorPct(sc.pct) : '#6B7280';
              return `
                <tr style="border-bottom:1px solid #E5E7EB;background:${idx%2===0?'#fff':'#F9FAFB'};">
                  <td style="padding:6px 8px;font-weight:600;">${_esc(p.nombre)}</td>
                  <td style="padding:6px 8px;text-align:center;">${sc.evaluados}/${sc.total}</td>
                  <td style="padding:6px 8px;text-align:center;font-weight:700;color:${c};">
                    ${sc.pct}%</td>
                  <td style="padding:6px 8px;text-align:center;">
                    ${est
                      ? `<span style="background:${c};color:#fff;padding:2px 8px;
                          border-radius:999px;font-size:10px;font-weight:700;">${LABEL[est]}</span>`
                      : '—'}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  /* ── KPI cards Power BI por programa (sin tortas) ── */
  function _renderGraficasPorPrograma(inspeccion) {
    const ESTADO_LABEL = { B:'BUENO', R:'REGULAR', D:'DEFICIENTE' };
    const PESO_LABEL   = { 1:'Bajo (1)', 2:'Medio (2)', 3:'Alto (3)' };

    const cards = inspeccion.programas.map(prog => {
      const sc   = Scores.calcularPrograma(prog);
      if (!sc.evaluados) return '';

      const color = _colorPct(sc.pct);
      const est   = Scores.getEstado(sc.pct);
      const peso  = (typeof PSB_PESOS !== 'undefined' ? PSB_PESOS[prog.id] : null) || 1;

      return `
        <div class="acta-card" style="
          border:1px solid #E5E7EB;border-left:3px solid ${color};
          border-radius:8px;padding:10px 12px;background:#fff;
          break-inside:avoid;page-break-inside:avoid;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;
            gap:6px;margin-bottom:6px;">
            <div style="font-size:10px;font-weight:700;color:${C.verde};line-height:1.3;
              flex:1;min-width:0;">${_esc(prog.nombre)}</div>
            <span style="background:${color};color:#fff;padding:2px 7px;border-radius:999px;
              font-size:8px;font-weight:800;white-space:nowrap;flex-shrink:0;">
              ${ESTADO_LABEL[est]}</span>
          </div>
          <div style="font-size:28px;font-weight:900;color:${color};line-height:1;
            margin-bottom:5px;">${sc.pct}%</div>
          <div style="height:4px;background:#E5E7EB;border-radius:2px;margin-bottom:8px;">
            <div style="height:4px;width:${sc.pct}%;background:${color};border-radius:2px;"></div>
          </div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
            <span style="background:${C.acento}22;color:${C.acento};border:1px solid ${C.acento}44;
              padding:1px 5px;border-radius:4px;font-size:8px;font-weight:700;">B:${sc.B}</span>
            <span style="background:${C.naranja}22;color:${C.naranja};border:1px solid ${C.naranja}44;
              padding:1px 5px;border-radius:4px;font-size:8px;font-weight:700;">R:${sc.R}</span>
            <span style="background:${C.rojo}22;color:${C.rojo};border:1px solid ${C.rojo}44;
              padding:1px 5px;border-radius:4px;font-size:8px;font-weight:700;">D:${sc.D}</span>
            <span style="background:${C.gris}22;color:${C.gris};border:1px solid ${C.gris}44;
              padding:1px 5px;border-radius:4px;font-size:8px;font-weight:700;">N/A:${sc.na}</span>
          </div>
          <div style="font-size:8.5px;color:#9CA3AF;">Peso: ${PESO_LABEL[peso]}</div>
        </div>`;
    }).filter(Boolean);

    if (!cards.length) return '';

    return `
      <div class="acta-seccion" style="margin-bottom:14px;">
        ${_secTitle('Análisis Detallado por Programa', C.verde)}
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
          ${cards.join('')}
        </div>
      </div>`;
  }

  /* ── Ranking comparativo con barras horizontales ── */
  function _renderResumenComparativo(inspeccion) {
    return _renderRankingTabla(inspeccion) + _renderGraficoComparativo(inspeccion);
  }

  function _renderRankingTabla(inspeccion) {
    const RANK = ['🥇','🥈','🥉'];
    const ESTADO_LABEL = { B:'BUENO', R:'REGULAR', D:'DEFICIENTE' };

    const sorted = [...inspeccion.programas]
      .map(p => ({ p, sc: Scores.calcularPrograma(p) }))
      .filter(({ sc }) => sc.evaluados > 0)
      .sort((a, b) => b.sc.pct - a.sc.pct);

    if (!sorted.length) return '';

    const rows = sorted.map(({ p, sc }, idx) => {
      const color = _colorPct(sc.pct);
      const est   = Scores.getEstado(sc.pct);
      const rank  = idx < 3 ? RANK[idx] : `${idx + 1}°`;
      return `
        <tr style="border-bottom:1px solid #E5E7EB;background:${idx%2===0?'#fff':'#F9FAFB'};">
          <td style="padding:6px 8px;text-align:center;font-size:13px;">${rank}</td>
          <td style="padding:6px 8px;font-weight:600;font-size:11px;">${_esc(p.nombre)}</td>
          <td style="padding:6px 8px;text-align:center;font-weight:700;
            color:${color};font-size:12px;">${sc.pct}%</td>
          <td style="padding:6px 8px;text-align:center;">
            <span style="background:${color};color:#fff;padding:2px 8px;
              border-radius:999px;font-size:9px;font-weight:700;">${ESTADO_LABEL[est]}</span>
          </td>
        </tr>`;
    }).join('');

    return `
      <div class="acta-seccion" style="margin-bottom:14px;">
        ${_secTitle('Ranking de Programas', C.verde)}
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="background:${C.verde};color:#fff;">
              <th style="padding:6px 8px;text-align:center;width:32px;">#</th>
              <th style="padding:6px 8px;text-align:left;">Programa</th>
              <th style="padding:6px 8px;text-align:center;width:60px;">%</th>
              <th style="padding:6px 8px;text-align:center;">Estado</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function _renderGraficoComparativo(inspeccion) {
    const hayDatos = inspeccion.programas.some(p => Scores.calcularPrograma(p).evaluados > 0);
    if (!hayDatos) return '';
    return `
      <div class="acta-seccion" style="margin-bottom:14px;">
        ${_secTitle('Gráfico Comparativo', C.verde)}
        <div id="chart-comparativo-wrap" class="acta-chart-wrap"
          style="display:none;break-inside:avoid;page-break-inside:avoid;">
          <canvas id="chart-comparativo" width="520" height="220"
            style="max-width:100%;display:block;-webkit-print-color-adjust:exact;"></canvas>
        </div>
      </div>`;
  }

  /* ── Comparación con inspección anterior ─────────── */
  function _renderComparacionHistorica(inspeccion) {
    const historial = _getHistorial(inspeccion);
    if (historial.length < 2) return '';

    const prev = historial[historial.length - 2];
    const curr = historial[historial.length - 1];

    const prevPct = prev.score?.pct_cumplimiento || 0;
    const currPct = curr.score?.pct_cumplimiento || 0;
    const delta   = currPct - prevPct;
    const dColor  = delta > 0 ? C.acento : delta < 0 ? C.rojo : C.gris;
    const dSign   = delta > 0 ? '+' : '';
    const dIcon   = delta > 0 ? '▲' : delta < 0 ? '▼' : '→';

    const kpiBase = `flex:1;text-align:center;padding:10px 8px;background:#F9FAFB;
      border-radius:8px;border:1px solid #E5E7EB;`;

    /* Badges por programa */
    const badges = inspeccion.programas.map(p => {
      const pp       = (prev.programas || []).find(x => x.id === p.id);
      const prevPctP = pp ? Scores.calcularPrograma(pp).pct : null;
      const currPctP = Scores.calcularPrograma(p).pct;
      if (prevPctP === null || !Scores.calcularPrograma(p).evaluados) return '';
      const d = currPctP - prevPctP;
      const bc = d > 2 ? C.acento : d < -2 ? C.rojo : C.gris;
      const bi = d > 2 ? '↑' : d < -2 ? '↓' : '=';
      return `<span style="background:${bc};color:#fff;padding:2px 7px;border-radius:999px;
        font-size:9px;font-weight:700;margin:2px;">${_shortName(p.nombre)} ${bi}${d > 0 ? '+' : ''}${d}%</span>`;
    }).filter(Boolean).join('');

    return `
      <div class="acta-seccion" style="margin-bottom:14px;">
        ${_secTitle('Comparación con Inspección Anterior', C.verde)}

        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <div style="${kpiBase}">
            <div style="font-size:9px;color:${C.gris};font-weight:700;text-transform:uppercase;
              letter-spacing:0.05em;margin-bottom:4px;">Anterior</div>
            <div style="font-size:26px;font-weight:900;color:${_colorPct(prevPct)};line-height:1.1;">
              ${prevPct}%</div>
            <div style="font-size:9px;color:#6B7280;margin-top:2px;">${prev.inspeccion.fecha}</div>
          </div>
          <div style="${kpiBase}">
            <div style="font-size:9px;color:${C.gris};font-weight:700;text-transform:uppercase;
              letter-spacing:0.05em;margin-bottom:4px;">Reciente</div>
            <div style="font-size:26px;font-weight:900;color:${_colorPct(currPct)};line-height:1.1;">
              ${currPct}%</div>
            <div style="font-size:9px;color:#6B7280;margin-top:2px;">${curr.inspeccion.fecha}</div>
          </div>
          <div style="${kpiBase}">
            <div style="font-size:9px;color:${C.gris};font-weight:700;text-transform:uppercase;
              letter-spacing:0.05em;margin-bottom:4px;">Variación</div>
            <div style="font-size:26px;font-weight:900;color:${dColor};line-height:1.1;">
              ${dSign}${delta} ${dIcon}</div>
            <div style="font-size:9px;color:#6B7280;margin-top:2px;">puntos</div>
          </div>
        </div>

        ${badges ? `<div style="margin-bottom:10px;display:flex;flex-wrap:wrap;gap:2px;">${badges}</div>` : ''}
      </div>`;
  }

  /* ── Metodología de evaluación ──────────────────── */
  function _renderMetodologia() {
    return `
      <div style="margin-bottom:14px;padding:10px 12px;background:#F8FAFC;
        border-radius:8px;border:1px solid #E2E8F0;
        break-inside:avoid;page-break-inside:avoid;">
        <div style="display:flex;gap:8px;align-items:flex-start;">
          <span style="font-size:14px;flex-shrink:0;margin-top:1px;">ℹ️</span>
          <div style="font-size:9px;color:#374151;line-height:1.5;text-align:justify;hyphens:auto;">
            <strong style="font-size:9.5px;color:${C.verde};display:block;margin-bottom:3px;">
              METODOLOGÍA DE EVALUACIÓN
            </strong>
            El porcentaje de cumplimiento se calcula ponderando cada programa según su criticidad
            sanitaria, no como promedio simple de ítems.
            <strong>Agua Potable y Limpieza/Desinfección</strong> tienen peso alto (3) por su
            relación directa con riesgo de salud (Dec. 1575/2007, Res. 2674/2013).
            <strong>Control de Plagas y Residuos Sólidos</strong> tienen peso medio (2).
            <strong>Infraestructura Física</strong> tiene peso bajo (1) por ser de naturaleza
            estructural, no inmediata. Los aspectos marcados <em>No Aplica</em> se excluyen del
            cálculo. El estado general
            (<strong>Bueno ≥80% / Regular 50–79% / Deficiente &lt;50%</strong>)
            refleja este mismo porcentaje ponderado.
          </div>
        </div>
      </div>`;
  }

  /* ── Hallazgos D y R ─────────────────────────────── */
  function _renderHallazgos(inspeccion) {
    const todos = (inspeccion.hallazgos_criticos || []);
    if (!todos.length) return '';
    const criticos  = todos.filter(h => h.critico);
    const ordenados = [...criticos, ...todos.filter(h => !h.critico)];

    return `
      <div class="acta-seccion" style="margin-bottom:14px;">
        ${_secTitle(`Hallazgos (${todos.length}) · Críticos: ${criticos.length}`, '#D32F2F')}
        ${ordenados.map((h, idx) => `
          <div class="acta-hallazgo" style="padding:8px;border-radius:6px;margin-bottom:6px;
            background:${h.evaluacion==='D'?'#FEF2F2':'#FFFBEB'};
            border-left:3px solid ${h.evaluacion==='D'?'#D32F2F':'#F57C00'};
            break-inside:avoid;page-break-inside:avoid;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
              <div style="flex:1;">
                <div style="font-size:11px;font-weight:700;color:#111827;margin-bottom:3px;">
                  ${idx+1}. ${_esc(h.texto)}</div>
                <div style="font-size:10px;color:#6B7280;">
                  📋 ${_esc(h.norma)} · ${_esc(h.programa_nombre)}</div>
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <div style="font-size:10px;font-weight:800;
                  color:${h.evaluacion==='D'?'#D32F2F':'#F57C00'};">${h.evaluacion}</div>
                <div style="font-size:9px;color:#6B7280;">${h.plazo||''}</div>
              </div>
            </div>
          </div>`).join('')}
      </div>`;
  }

  /* ── Aspectos No Aplicables ──────────────────────── */
  function _renderNoAplicables(inspeccion) {
    const na = [];
    inspeccion.programas.forEach(prog => {
      prog.aspectos.forEach(asp => {
        if (asp.evaluacion === 'NA') {
          na.push({ programa: prog.nombre, texto: asp.texto, norma: asp.norma });
        }
      });
    });
    if (!na.length) return '';
    return `
      <div class="acta-seccion" style="margin-bottom:14px;">
        ${_secTitle(`No Aplicables (${na.length})`, '#6B7280')}
        <div style="border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;">
          ${na.map((n, idx) => `
            <div style="padding:6px 10px;font-size:10px;
              background:${idx % 2 === 0 ? '#fff' : '#F9FAFB'};
              border-bottom:${idx < na.length - 1 ? '1px solid #F3F4F6' : 'none'};">
              <span style="color:#6B7280;font-weight:600;">${idx + 1}. </span>
              <span style="color:#374151;">${_esc(n.texto)}</span>
              <span style="color:#9CA3AF;"> · ${_esc(n.programa)}</span>
            </div>`).join('')}
        </div>
      </div>`;
  }

  /* ── Plan de acciones correctivas ────────────────── */
  function _renderPlanAcciones(inspeccion) {
    const byProg = {};
    (inspeccion.hallazgos_criticos || []).forEach(h => {
      if (!byProg[h.programa_nombre]) byProg[h.programa_nombre] = [];
      byProg[h.programa_nombre].push(h);
    });
    if (!Object.keys(byProg).length) return '';

    const ACCIONES = {
      'Infraestructura Física':
        'Ejecutar mantenimiento correctivo y preventivo de instalaciones físicas según Decreto 3075/1997 Anexo I. Registrar actividades.',
      'Limpieza y Desinfección':
        'Actualizar POE de L&D, verificar concentraciones de desinfectantes y capacitar personal según Resolución 2674/2013.',
      'Control Integrado de Plagas':
        'Contratar empresa certificada de fumigación e implementar medidas correctivas estructurales según Decreto 3075/1997 Anexo III.',
      'Residuos Sólidos':
        'Implementar código de colores, capacitar en separación en la fuente y actualizar registros según Resolución 2184/2019.',
      'Control de Agua Potable':
        'Realizar análisis fisicoquímico-microbiológico en laboratorio certificado. Limpiar tanque según Decreto 1575/2007.',
    };

    return `
      <div class="acta-seccion" style="margin-bottom:14px;">
        ${_secTitle('Plan de Acciones Correctivas', C.verde)}
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="background:${C.verde};color:#fff;">
              <th style="padding:6px 8px;text-align:left;width:28%;">Programa</th>
              <th style="padding:6px 8px;text-align:left;">Acción Correctiva</th>
              <th style="padding:6px 8px;text-align:center;white-space:nowrap;">Plazo</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(byProg).map(([prog, items], idx) => {
              const urgente = items.some(i => i.critico);
              const plazo   = urgente ? 'Inmediato'
                            : items.some(i => i.evaluacion==='D') ? '7 días' : '30 días';
              const c = urgente ? '#D32F2F' : '#F57C00';
              return `
                <tr style="border-bottom:1px solid #E5E7EB;background:${idx%2===0?'#fff':'#F9FAFB'};">
                  <td style="padding:6px 8px;font-weight:600;">${_esc(prog)}</td>
                  <td style="padding:6px 8px;text-align:justify;hyphens:auto;">${ACCIONES[prog]||'Implementar correcciones según normativa vigente.'}</td>
                  <td style="padding:6px 8px;text-align:center;font-weight:700;color:${c};
                    white-space:nowrap;">${plazo}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  /* ── Observaciones por programa ─────────────────── */
  function _renderObservacionesPorPrograma(inspeccion) {
    const conEval = inspeccion.programas.filter(p => p.aspectos.some(a => a.evaluacion));
    if (!conEval.length) return '';

    return `
      <div class="acta-seccion" style="margin-bottom:14px;">
        ${_secTitle('Observaciones por Programa', C.verde)}
        ${conEval.map(p => {
          const ev = p.aspectos.filter(a => a.evaluacion);
          return `
            <div style="margin-bottom:10px;">
              <div style="font-size:11px;font-weight:700;color:${C.verde};margin-bottom:5px;">
                ${_esc(p.nombre)}</div>
              ${ev.map(a => {
                const c = a.evaluacion==='B'?'#2E7D32':a.evaluacion==='R'?'#F57C00':'#D32F2F';
                const autoObs = (typeof Observaciones !== 'undefined')
                  ? Observaciones.getObs(p.id, a.evaluacion, a) : '';
                const obsTexto = (a.obs_editada && a.obs) ? a.obs : (a.obs || autoObs);
                return `
                  <div style="display:flex;gap:8px;padding:4px 0;
                    border-bottom:1px dotted #E5E7EB;font-size:11px;">
                    <span style="font-weight:800;color:${c};flex-shrink:0;">[${a.evaluacion}]</span>
                    <div>
                      <div style="color:#111827;">${_esc(a.texto)}</div>
                      ${obsTexto
                        ? `<div style="color:#6B7280;font-size:10px;margin-top:1px;text-align:justify;hyphens:auto;">${_esc(obsTexto)}</div>`
                        : ''}
                    </div>
                  </div>`;
              }).join('')}
            </div>`;
        }).join('')}
      </div>`;
  }

  /* ── Registro fotográfico ────────────────────────── */
  function _renderFotografias(inspeccion) {
    const fotos = [];
    inspeccion.programas.forEach(p => {
      p.aspectos.forEach(a => {
        (a.fotografias || []).forEach(f => {
          fotos.push({ ...f, programa: p.nombre, aspecto: a.texto });
        });
      });
    });
    if (!fotos.length) return '';

    return `
      <div class="acta-seccion" style="margin-bottom:14px;">
        ${_secTitle('Registro Fotográfico', C.verde)}
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
          ${fotos.map(f => `
            <div style="border-radius:6px;overflow:hidden;border:1px solid #E5E7EB;
              break-inside:avoid;page-break-inside:avoid;">
              <img src="${f.data}" alt="evidencia"
                style="width:100%;height:110px;object-fit:cover;display:block;">
              <div style="padding:4px 6px;background:#F9FAFB;">
                <div style="font-size:9px;font-weight:700;color:${C.verde};">
                  ${_esc(f.programa)}</div>
                <div style="font-size:9px;color:#6B7280;overflow:hidden;
                  text-overflow:ellipsis;white-space:nowrap;">${_esc(f.aspecto)}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  /* ── Firmas ──────────────────────────────────────── */
  function _renderFirmas(inspeccion) {
    const e = inspeccion.establecimiento;
    const cols = [
      ['Elaboró',  inspeccion.inspeccion.inspector,            'Profesional'],
      ['Revisó',   e.responsable_sanitario || '________________', 'Administrador / Responsable PSB'],
      ['Aprobó',   '________________',                           'Representante Legal'],
    ];
    return `
      <div class="acta-firmas" style="margin-bottom:14px;">
        ${_secTitle('Firmas', C.verde)}
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:24px;">
          ${cols.map(([rol, nombre, cargo]) => `
            <div style="text-align:center;">
              <div style="border-top:1.5px solid #111827;padding-top:8px;">
                <div style="font-size:11px;font-weight:700;color:#111827;">${_esc(nombre)}</div>
                <div style="font-size:10px;color:#6B7280;margin-top:2px;">${cargo}</div>
                <div style="font-size:10px;font-weight:600;color:${C.verde};margin-top:2px;">${rol}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  /* ── Footer normativo ────────────────────────────── */
  function _renderFooter() {
    return `
      <div style="border-top:1.5px solid ${C.verde};padding-top:10px;text-align:center;margin-top:16px;">
        <div style="font-size:9px;color:#6B7280;line-height:1.7;text-align:justify;">
          Normativa aplicada: Ley 9/1979 (Código Sanitario) · Decreto 3075/1997 (BPM) ·
          Resolución 2674/2013 · Decreto 1575/2007 (Agua) · Resolución 2115/2007 ·
          Resolución 2184/2019 (Residuos)
        </div>
        <div style="font-size:9px;color:${C.verde};font-weight:700;margin-top:4px;">
          Cartagena de Indias · ECODESA Ecología Desarrollo e Ingeniería S.A.S · ecodesa.org
        </div>
      </div>`;
  }

  /* ── Helpers ─────────────────────────────────────── */

  function _getHistorial(inspeccion) {
    const nit    = inspeccion.establecimiento?.nit;
    const nombre = inspeccion.establecimiento?.nombre;
    return (Store.get().inspecciones || [])
      .filter(i => i.score && i.inspeccion?.fecha)
      .filter(i =>
        (nit    && i.establecimiento?.nit    === nit) ||
        (!nit   && i.establecimiento?.nombre === nombre)
      )
      .sort((a, b) => a.inspeccion.fecha.localeCompare(b.inspeccion.fecha));
  }

  function _shortName(nombre) {
    const MAP = {
      'Infraestructura Física':    'Infra.',
      'Limpieza y Desinfección':   'L&D',
      'Control Integrado de Plagas': 'PCIP',
      'Residuos Sólidos':          'Residuos',
      'Control de Agua Potable':   'Agua',
    };
    return MAP[nombre] || (nombre.length > 12 ? nombre.slice(0, 11) + '…' : nombre);
  }

  function _secTitle(text, color) {
    return `<div style="font-size:11px;font-weight:700;color:${color};text-transform:uppercase;
      letter-spacing:0.06em;margin-bottom:8px;border-left:3px solid ${color};
      padding-left:8px;">${text}</div>`;
  }

  function _generarNumeroActa() {
    const year = new Date().getFullYear();
    const KEY  = 'psb_acta_counter';
    const data = JSON.parse(localStorage.getItem(KEY) || '{}');
    const n    = (data[year] || 0) + 1;
    data[year] = n;
    localStorage.setItem(KEY, JSON.stringify(data));
    return `PSB-${year}-${String(n).padStart(3, '0')}`;
  }

  /* ── Abrir ventana HTML dedicada para PDF (regla iOS: window.open('','_blank') + document.write) ── */
  function abrirPDF() {
    const inspeccion = Store.getCurrentInspeccion();
    if (!inspeccion) { Router.toast('Sin inspección activa'); return; }
    const win = window.open('', '_blank');
    if (!win) { Router.toast('Permite ventanas emergentes para generar el acta'); return; }
    const base = location.origin + location.pathname.replace(/\/[^\/]*$/, '/');
    const sorted = [...inspeccion.programas]
      .map(p => ({ nombre: _shortName(p.nombre), ...Scores.calcularPrograma(p) }))
      .filter(p => p.evaluados > 0)
      .sort((a, b) => b.pct - a.pct);
    // La ventana emergente (about:blank) no queda bajo control del Service Worker,
    // así que Chart.js se incrusta inline en vez de cargarse con <script src> para que
    // funcione sin conexión.
    const chartJsPromise = sorted.length
      ? fetch('assets/vendor/chart.umd.min.js').then(r => r.ok ? r.text() : '').catch(() => '')
      : Promise.resolve('');
    chartJsPromise.then(chartJs => {
      const html = _buildActaHTML(inspeccion, base, sorted, chartJs);
      win.document.open();
      win.document.write(html);
      win.document.close();
    });
  }

  function _buildActaHTML(inspeccion, base, sorted, chartJs) {
    const D = JSON.stringify(sorted.map(p => ({ nombre: p.nombre, pct: p.pct })));

    const chartLib = chartJs
      ? `<script>${chartJs.replace(/<\/script/gi, '<\\/script')}</script>`
      : `<script src="/app/assets/vendor/chart.umd.min.js"></script>`;

    const chartScript = sorted.length ? `
${chartLib}
<script>
window.addEventListener('load', function() {
  setTimeout(function() {
    var d = ${D};
    var wrap = document.getElementById('chart-comparativo-wrap');
    var canvas = document.getElementById('chart-comparativo');
    if (!wrap) return;
    function fallo() { wrap.style.height = '0'; wrap.style.overflow = 'hidden'; }
    if (!d.length || !canvas || typeof Chart === 'undefined') { fallo(); return; }
    wrap.style.display = 'block';
    function cc(p) { return p >= 80 ? '#1B4332' : p >= 50 ? '#F57C00' : '#A32D2D'; }
    try {
    new Chart(canvas, {
      type: 'bar',
      plugins: [{
        id: 'pl',
        afterDatasetsDraw: function(ch) {
          var ctx = ch.ctx, m = ch.getDatasetMeta(0);
          m.data.forEach(function(bar, j) {
            var v = d[j] && d[j].pct;
            if (v === undefined) return;
            ctx.save(); ctx.font = 'bold 12px sans-serif'; ctx.textBaseline = 'middle';
            if (v >= 15) { ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(v + '%', bar.x - 6, bar.y); }
            else { ctx.fillStyle = cc(v); ctx.textAlign = 'left'; ctx.fillText(v + '%', bar.x + 4, bar.y); }
            ctx.restore();
          });
        }
      }, {
        id: 'ml',
        afterDraw: function(ch) {
          var x = ch.scales.x, y = ch.scales.y, ctx = ch.ctx, xp = x.getPixelForValue(80);
          ctx.save(); ctx.beginPath(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#888780';
          ctx.lineWidth = 1.5; ctx.moveTo(xp, y.top); ctx.lineTo(xp, y.bottom); ctx.stroke();
          ctx.setLineDash([]); ctx.fillStyle = '#888780'; ctx.font = '9px sans-serif';
          ctx.textAlign = 'center'; ctx.fillText('Meta 80%', xp, y.top - 6); ctx.restore();
        }
      }],
      data: {
        labels: d.map(function(p) { return p.nombre; }),
        datasets: [{ data: d.map(function(p) { return p.pct; }),
          backgroundColor: d.map(function(p) { return cc(p.pct); }),
          borderWidth: 0, borderRadius: 3 }]
      },
      options: {
        indexAxis: 'y', responsive: false, animation: { duration: 0 },
        layout: { padding: { top: 16 } },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { min: 0, max: 100, ticks: { stepSize: 20, font: { size: 9 }, color: '#888780',
              callback: function(v) { return v + '%'; } },
            grid: { color: '#eee' }, border: { display: false } },
          y: { ticks: { font: { size: 10 }, color: '#1B4332' },
            grid: { display: false }, border: { display: false } }
        }
      }
    });
    } catch (e) { fallo(); }
  }, 500);
});
</script>` : '';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Acta ${_esc(inspeccion.numero_acta)} — ${_esc(inspeccion.establecimiento.nombre)}</title>
  <base href="${base}">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111827; background: #fff; }
    .acta-wrap { max-width: 800px; margin: 0 auto; padding: 16px; }
    .acta-seccion, .acta-card, .acta-hallazgo, .acta-chart-wrap, .acta-firmas {
      page-break-inside: avoid; break-inside: avoid; }
    table { border-collapse: collapse; width: 100%; }
    .btn-save {
      display: block; width: 100%; padding: 12px; margin-bottom: 16px;
      background: #1B4332; color: #fff; border: none; border-radius: 8px;
      font-size: 14px; font-weight: 700; cursor: pointer; font-family: Arial, sans-serif;
      letter-spacing: 0.02em; }
    .btn-save:hover { background: #2D6A4F; }
    @media print {
      .btn-save { display: none !important; }
      @page { margin: 1.5cm; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
  ${chartScript}
</head>
<body>
<div class="acta-wrap">
  <button class="btn-save" onclick="window.print()">&#128190; Guardar como PDF</button>
  ${_renderPrintHeader(inspeccion)}
  ${_renderDatosEstablecimiento(inspeccion)}
  ${_renderResumenCumplimiento(inspeccion)}
  ${_renderGraficasPorPrograma(inspeccion)}
  ${_renderGraficoComparativo(inspeccion)}
  ${_renderRankingTabla(inspeccion)}
  ${_renderComparacionHistorica(inspeccion)}
  ${_renderMetodologia()}
  ${_renderHallazgos(inspeccion)}
  ${_renderNoAplicables(inspeccion)}
  ${_renderObservacionesPorPrograma(inspeccion)}
  ${_renderFotografias(inspeccion)}
  ${_renderPlanAcciones(inspeccion)}
  ${_renderFirmas(inspeccion)}
  ${_renderFooter()}
</div>
</body>
</html>`;
  }

  function compartir() {
    const insp = Store.getCurrentInspeccion();
    if (!insp) return;
    const texto = `Acta ${insp.numero_acta} · ${insp.establecimiento.nombre} · ` +
                  `Cumplimiento: ${insp.score?.pct_cumplimiento || 0}% · ECODESA`;
    if (navigator.share) {
      navigator.share({ title: 'Acta PSB ECODESA', text: texto }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(texto)
        .then(() => Router.toast('✓ Copiado al portapapeles'));
    }
  }

  function _sinInspeccion() {
    return `<div class="coming-soon">
      <div class="coming-soon-icon">📄</div>
      <div class="coming-soon-title">Sin inspección activa</div>
      <div class="coming-soon-desc">Complete una inspección PSB para generar el acta.</div>
      <button class="btn btn-primary mt-md" style="width:auto;padding:12px 24px"
        onclick="Router.go('planificar')">Ir a Planificar</button>
    </div>`;
  }

  function _colorPct(pct) {
    return pct >= 80 ? '#2E7D32' : pct >= 50 ? '#F57C00' : '#D32F2F';
  }

  function _esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { render, attach, compartir, abrirPDF };
})();
