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
      .acta-logo { height: 48px; width: auto; flex-shrink: 0; }
      .wm-root   { display: none; }
      @media print {
        .phva-topbar, .acta-actions, #app-toast { display: none !important; }
        #app { max-width: 100% !important; box-shadow: none !important; }
        #screen-area { overflow: visible !important; }
        body { background: #fff !important; orphans: 4; widows: 4; }
        @page { size: A4; margin: 1.5cm; }
        .acta-seccion    { page-break-inside: avoid; break-inside: avoid; }
        .acta-card       { page-break-inside: avoid; break-inside: avoid; }
        .acta-hallazgo   { page-break-inside: avoid; break-inside: avoid; }
        .acta-chart-wrap { page-break-inside: avoid; break-inside: avoid; }
        .acta-firmas     { page-break-inside: avoid; break-inside: avoid;
                           -webkit-column-break-inside: avoid; }
        * { -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important; }
        #acta-doc  { position: relative !important; }
        .wm-content { position: relative !important; z-index: 1 !important; }
        .wm-root {
          display: block !important;
          position: absolute !important;
          top: 50% !important; left: 50% !important;
          transform: translate(-50%, -50%) !important;
          width: 55% !important; max-width: 320px !important;
          opacity: 0.08 !important; z-index: 0 !important;
          pointer-events: none !important;
        }
      }
    `;

    return `
      <img src="assets/icons/isotipo-transparente.png" class="watermark-bg" alt="">

      <div class="acta-actions" style="padding:var(--sp-md);display:flex;
        flex-direction:column;gap:var(--sp-sm);background:var(--color-white);
        border-bottom:1px solid var(--color-border);position:sticky;top:0;z-index:10;">
        <div style="font-size:11px;font-weight:700;color:var(--color-ink3);
          text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">
          📄 ${_esc(inspeccion.numero_acta)} · ${_esc(inspeccion.establecimiento.nombre)}</div>
        <div style="display:flex;gap:var(--sp-sm);">
          <button class="btn btn-primary" style="flex:1;min-height:44px;"
            onclick="window.print()">📄 DESCARGAR PDF</button>
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
        <img src="assets/icons/isotipo-transparente.png" class="wm-root" alt="">
        <div class="wm-content">
          ${_renderHeader(inspeccion)}
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
        </div>
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
      s.src = 'js/chart.umd.min.js';
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

  /* ── Tortas por programa ── */
  function _initPieCharts(inspeccion) {
    inspeccion.programas.forEach(prog => {
      const canvas = document.getElementById('chart-pie-' + prog.id);
      if (!canvas) return;
      const sc = Scores.calcularPrograma(prog);
      if (!sc.evaluados) return;

      const chart = new Chart(canvas, {
        type: 'pie',
        data: {
          labels: ['Bueno', 'Regular', 'Deficiente', 'N/A'],
          datasets: [{
            data: [sc.B, sc.R, sc.D, sc.na],
            backgroundColor: [C.acento, C.naranja, C.rojo, C.gris + 'AA'],
            borderColor: '#fff',
            borderWidth: 2,
          }]
        },
        options: {
          responsive: false,
          animation: { duration: 0 },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}` }
            }
          }
        }
      });
      _charts.push(chart);
    });
  }

  /* ── Barras horizontales comparativo ── */
  function _initComparativoChart(inspeccion) {
    const canvas = document.getElementById('chart-comparativo');
    if (!canvas) return;

    const sorted = [...inspeccion.programas]
      .map(p => ({ nombre: _shortName(p.nombre), ...Scores.calcularPrograma(p) }))
      .filter(p => p.evaluados > 0)
      .sort((a, b) => b.pct - a.pct);

    if (!sorted.length) return;

    const pctInsidePlugin = {
      id: 'pctInside',
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(0);
        meta.data.forEach((bar, j) => {
          const val = sorted[j]?.pct;
          if (!val) return;
          const barW = bar.x - bar.base;
          if (barW < 30) return;
          ctx.save();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'right';
          ctx.fillText(val + '%', bar.x - 6, bar.y);
          ctx.restore();
        });
      }
    };

    const chart = new Chart(canvas, {
      type: 'bar',
      plugins: [pctInsidePlugin],
      data: {
        labels: sorted.map(p => p.nombre),
        datasets: [{
          data: sorted.map(p => p.pct),
          backgroundColor: sorted.map(p => _colorPct(p.pct) + 'DD'),
          borderColor:     sorted.map(p => _colorPct(p.pct)),
          borderWidth: 1,
          borderRadius: 4,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: false,
        animation: { duration: 0 },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          x: { min: 0, max: 100, ticks: { display: false }, grid: { display: false }, border: { display: false } },
          y: { ticks: { font: { size: 10 }, color: C.verde }, grid: { display: false }, border: { display: false } }
        }
      }
    });
    _charts.push(chart);
  }

  /* ── Gráficas históricas ── */
  function _initHistoricoCharts(inspeccion) {
    const historial = _getHistorial(inspeccion);
    if (historial.length < 2) return;

    const prev = historial[historial.length - 2];

    /* Barras agrupadas: anterior vs actual por programa */
    const canvasBar = document.getElementById('chart-historico-bar');
    if (canvasBar) {
      const prevData = inspeccion.programas.map(p => {
        const pp = (prev.programas || []).find(x => x.id === p.id);
        return pp ? Scores.calcularPrograma(pp).pct : 0;
      });
      const currData = inspeccion.programas.map(p => Scores.calcularPrograma(p).pct);

      const chart = new Chart(canvasBar, {
        type: 'bar',
        data: {
          labels: inspeccion.programas.map(p => _shortName(p.nombre)),
          datasets: [
            {
              label: 'Anterior · ' + prev.inspeccion.fecha,
              data: prevData,
              backgroundColor: C.gris + '99',
              borderColor: C.gris,
              borderWidth: 1,
              borderRadius: 3,
            },
            {
              label: 'Actual · ' + inspeccion.inspeccion.fecha,
              data: currData,
              backgroundColor: C.acento + 'BB',
              borderColor: C.acento,
              borderWidth: 1,
              borderRadius: 3,
            }
          ]
        },
        options: {
          responsive: false,
          animation: { duration: 0 },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: { font: { size: 9 }, color: C.verde, boxWidth: 12, padding: 8 }
            },
            tooltip: { enabled: false }
          },
          scales: {
            y: {
              min: 0, max: 100,
              ticks: { font: { size: 9 }, color: '#555', callback: v => v + '%' },
              grid: { color: '#eee' }
            },
            x: {
              ticks: { font: { size: 9 }, color: '#555' },
              grid: { display: false }
            }
          }
        }
      });
      _charts.push(chart);
    }

    /* Línea de tendencia histórica */
    const canvasTrend = document.getElementById('chart-historico-trend');
    if (canvasTrend && historial.length >= 2) {
      const trendData = historial.map(h => h.score?.pct_cumplimiento || 0);
      const trendLabels = historial.map(h => h.inspeccion?.fecha || '—');

      const chart = new Chart(canvasTrend, {
        type: 'line',
        data: {
          labels: trendLabels,
          datasets: [{
            label: 'Cumplimiento general',
            data: trendData,
            borderColor: C.verde,
            borderWidth: 2,
            borderDash: [6, 4],
            pointBackgroundColor: C.acento,
            pointBorderColor: C.verde,
            pointRadius: 5,
            tension: 0.3,
            fill: false,
          }]
        },
        options: {
          responsive: false,
          animation: { duration: 0 },
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          },
          scales: {
            y: {
              min: 0, max: 100,
              ticks: { font: { size: 9 }, callback: v => v + '%' },
              grid: { color: '#eee' }
            },
            x: {
              ticks: { font: { size: 9 } },
              grid: { display: false }
            }
          }
        }
      });
      _charts.push(chart);
    }
  }

  /* ── Header ECODESA ──────────────────────────────── */
  function _renderHeader(inspeccion) {
    return `
      <div class="acta-seccion" style="border-bottom:2.5px solid ${C.verde};
        padding-bottom:14px;margin-bottom:14px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="assets/icons/logotipo-sanicheck.png" alt="SaniCheck" class="acta-logo">
            <div>
              <div style="font-size:18px;font-weight:900;color:${C.verde};letter-spacing:-0.02em;line-height:1.1;">
                SaniCheck</div>
              <div style="font-size:9px;font-weight:700;color:#2D6A4F;letter-spacing:0.04em;margin-top:1px;">
                by ECODESA</div>
              <div style="font-size:8px;color:#6B7280;margin-top:3px;">
                Ecología Desarrollo e Ingeniería S.A.S</div>
              <div style="font-size:8px;color:#6B7280;">
                ecodesaingenieria@outlook.es · WhatsApp 301 365 3273</div>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:14px;font-weight:800;color:${C.verde};">
              ACTA DE INSPECCIÓN PSB</div>
            <div style="font-size:11px;color:#6B7280;margin-top:2px;">
              N° <strong>${_esc(inspeccion.numero_acta)}</strong></div>
            <div style="font-size:11px;color:#6B7280;">
              Fecha: ${inspeccion.inspeccion.fecha}</div>
          </div>
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

  /* ── Gráficas torta por programa ─────────────────── */
  function _renderGraficasPorPrograma(inspeccion) {
    const LABEL = { B:'Bueno', R:'Regular', D:'Deficiente' };

    const cards = inspeccion.programas.map(prog => {
      const sc = Scores.calcularPrograma(prog);
      if (!sc.evaluados) return '';

      const color = _colorPct(sc.pct);
      const est   = Scores.getEstado(sc.pct);
      return `
        <div class="acta-card" style="border:1px solid #E5E7EB;border-radius:8px;
          padding:10px;break-inside:avoid;page-break-inside:avoid;
          display:flex;gap:10px;align-items:center;">
          <canvas id="chart-pie-${prog.id}" width="90" height="90"
            style="flex-shrink:0;"></canvas>
          <div style="flex:1;min-width:0;">
            <div style="font-size:10px;font-weight:700;color:${C.verde};margin-bottom:3px;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"
              title="${_esc(prog.nombre)}">${_esc(prog.nombre)}</div>
            <div style="font-size:22px;font-weight:900;color:${color};line-height:1.1;">
              ${sc.pct}%</div>
            <div style="font-size:9px;color:#6B7280;margin-bottom:5px;">
              ${sc.evaluados}/${sc.total} eval.${sc.na > 0 ? ` · ${sc.na} N/A` : ''}</div>
            <div style="display:flex;flex-wrap:wrap;gap:3px;">
              ${[['B', sc.B, C.acento], ['R', sc.R, C.naranja], ['D', sc.D, C.rojo]]
                .filter(([,n]) => n > 0)
                .map(([k,n,c]) =>
                  `<span style="background:${c};color:#fff;padding:2px 5px;
                    border-radius:4px;font-size:8px;font-weight:700;">${n} ${LABEL[k]}</span>`
                ).join('')}
            </div>
          </div>
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

    const barH = Math.max(sorted.length * 34 + 44, 80);

    return `
      <div class="acta-seccion" style="margin-bottom:14px;">
        ${_secTitle('Ranking de Programas', C.verde)}
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px;">
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
        <div class="acta-chart-wrap" style="break-inside:avoid;page-break-inside:avoid;">
          <canvas id="chart-comparativo" width="520" height="${barH}"
            style="max-width:100%;display:block;"></canvas>
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

        <div class="acta-chart-wrap" style="break-inside:avoid;page-break-inside:avoid;margin-bottom:8px;">
          <div style="font-size:9px;color:${C.gris};font-weight:600;margin-bottom:4px;text-transform:uppercase;">
            Comparación por programa</div>
          <canvas id="chart-historico-bar" width="520" height="160"
            style="max-width:100%;display:block;"></canvas>
        </div>

        <div class="acta-chart-wrap" style="break-inside:avoid;page-break-inside:avoid;">
          <div style="font-size:9px;color:${C.gris};font-weight:600;margin-bottom:4px;text-transform:uppercase;">
            Tendencia histórica · ${historial.length} inspecciones</div>
          <canvas id="chart-historico-trend" width="520" height="90"
            style="max-width:100%;display:block;"></canvas>
        </div>
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
                return `
                  <div style="display:flex;gap:8px;padding:4px 0;
                    border-bottom:1px dotted #E5E7EB;font-size:11px;">
                    <span style="font-weight:800;color:${c};flex-shrink:0;">[${a.evaluacion}]</span>
                    <div>
                      <div style="color:#111827;">${_esc(a.texto)}</div>
                      ${a.obs
                        ? `<div style="color:#6B7280;font-size:10px;margin-top:1px;text-align:justify;hyphens:auto;">${_esc(a.obs)}</div>`
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
      <div class="acta-seccion" style="margin-bottom:14px;page-break-before:always;">
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
      <div class="acta-firmas" style="margin-top:16px;margin-bottom:14px;">
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

  return { render, attach, compartir };
})();
