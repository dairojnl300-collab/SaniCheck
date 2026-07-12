// actuar.js — Pantalla ACTUAR: Acta de Inspección PSB completa (Semana 3)

const Actuar = (() => {

  const C = { verde:'#1B4332', acento:'#52B788', naranja:'#F57C00', rojo:'#A32D2D', gris:'#888780' };
  const LOGO_B64 = 'data:image/png;base64,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';
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
        ${PhvaIcons.badge('A', 'ACTUAR', 'font-size:11px;padding:3px 8px;margin-bottom:6px;')}
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
          <img src="${LOGO_B64}" alt="SaniCheck"
            style="height:42px;width:auto;flex-shrink:0;">
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
      ['Barrio / Localidad', e.barrio],
      ['Ciudad / Municipio', e.ciudad],
      ['Correo electrónico', e.correo],
      ['Actividad Económica (CIIU)', e.actividad_ciiu],
      ['Tipo', e.tipo],
      ['Turnos de producción', e.turnos_produccion],
      ['Volumen diario de raciones', e.volumen_raciones],
      ['Empresa cliente / contratante', e.empresa_cliente],
      ['Concepto sanitario vigente', e.concepto_sanitario],
      ['Fecha de elaboración', e.fecha_elaboracion],
      ['Fecha de vigencia', e.fecha_vigencia],
      ['Versión del documento', e.version_documento],
      ['Administrador / Responsable PSB', e.responsable_sanitario || '—'],
      ['Responsable — Personal de Cocina/Manipulación', e.responsable_cocina || '—'],
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
      ['Aprobó',   e.representante_legal || '________________',   'Representante Legal'],
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
