// actuar.js — Pantalla ACTUAR: Acta de Inspección PSB completa (Semana 3)

const Actuar = (() => {

  const C = { verde:'#1B4332', acento:'#52B788', naranja:'#F57C00', rojo:'#A32D2D', gris:'#888780' };
  const LOGO_B64 = 'data:image/png;base64,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';
  const LOGO_ECODESA_FOOTER_B64 = 'data:image/png;base64,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';
  let _charts = [];
  let _forceCaptura = false;
  let _firmaData = {};
  let _firmaState = {};
  const FIRMANTES = [
    { key: 'elaboro',  rol: 'Elaboró',            cargo: 'Asesor externo' },
    { key: 'presente', rol: 'Presente en visita', cargo: 'Administrador / Responsable PSB' },
  ];

  function render() {
    const inspeccion = Store.getCurrentInspeccion();
    if (!inspeccion) return _sinInspeccion();

    if (_sincronizarNumeroActa(inspeccion)) {
      Store.upsertInspeccion(inspeccion);
    }

    const f = inspeccion.firmas || {};
    const firmasCompletas = f.elaboro?.firma && f.elaboro?.cedula && f.presente?.firma && f.presente?.cedula;
    if (!firmasCompletas || _forceCaptura) {
      return _renderCapturaFirmas(inspeccion);
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
          text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;display:flex;align-items:center;gap:6px;">
          ${AppIcons.icon('fileText', 12)} ${_esc(inspeccion.numero_acta)} · ${_esc(inspeccion.establecimiento.nombre)}</div>
        <div style="display:flex;gap:var(--sp-sm);">
          <button class="btn btn-primary" style="flex:1;min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:6px;"
            onclick="Actuar.abrirPDF()">${AppIcons.row('download', 'DESCARGAR PDF', 14)}</button>
          <button class="btn btn-accent" style="flex:1;min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:6px;"
            onclick="Actuar.compartir()">${AppIcons.row('share', 'COMPARTIR', 14)}</button>
        </div>
        <div style="display:flex;gap:var(--sp-sm);">
          <button class="btn btn-outline" style="flex:1;min-height:40px;display:inline-flex;align-items:center;justify-content:center;gap:6px;"
            onclick="Router.go('verificar')">${AppIcons.row('arrowLeft', 'VERIFICAR', 14)}</button>
          <button class="btn btn-outline" style="flex:1;min-height:40px;display:inline-flex;align-items:center;justify-content:center;gap:6px;"
            onclick="Router.go('home')">${AppIcons.row('refresh', 'NUEVA', 14)}</button>
        </div>
        <button class="btn btn-outline" style="width:100%;min-height:36px;font-size:11px;display:inline-flex;align-items:center;justify-content:center;gap:6px;"
          onclick="Actuar.editarFirmas()">${AppIcons.row('refresh', 'Editar firmas', 12)}</button>
      </div>

      <div id="acta-doc" style="background:#fff;padding:20px 20px 40px;">
        ${_renderPrintHeader(inspeccion)}
        ${_renderDatosEstablecimiento(inspeccion)}
        ${_renderResumenCumplimiento(inspeccion)}
        ${_renderGraficasPorPrograma(inspeccion)}
        ${_renderResumenComparativo(inspeccion)}
        ${_renderComparacionHistorica(inspeccion)}
        ${_renderMetodologia()}
        ${_renderDetallePorItem(inspeccion)}
        ${_renderFirmas(inspeccion)}
        ${_renderFooter()}
      </div>`;
  }

  /* ── attach: carga Chart.js e inicializa gráficas ── */
  function attach() {
    const inspeccion = Store.getCurrentInspeccion();
    if (!inspeccion) return;

    const f = inspeccion.firmas || {};
    const firmasCompletas = f.elaboro?.firma && f.elaboro?.cedula && f.presente?.firma && f.presente?.cedula;
    if (!firmasCompletas || _forceCaptura) {
      FIRMANTES.forEach(ft => _bindFirmaCanvas(ft.key, f[ft.key]?.firma));
      return;
    }

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
        align-items:center;padding:10px 16px;
        border-bottom:2px solid ${C.verde};margin-bottom:16px;background:#fff;">
        <div style="display:flex;align-items:center;gap:10px;min-height:68px;">
          <div style="width:68px;height:68px;flex:0 0 68px;display:flex;align-items:center;justify-content:center;
            border-radius:20px;background:#EFF9F5;border:1px solid rgba(12,138,95,.22);box-shadow:var(--shadow-sticker);">
            <img src="${LOGO_B64}" alt="SaniCheck"
              style="height:60px;width:auto;max-width:60px;object-fit:contain;">
          </div>
          <div style="font-family:'Instrument Sans',Arial,sans-serif;line-height:1.35;">
            <div style="font-family:'Bricolage Grotesque',Arial,sans-serif;font-weight:800;font-size:15px;letter-spacing:-0.02em;color:${C.verde};">SaniCheck</div>
            <div style="font-size:8.5px;font-weight:600;letter-spacing:0.04em;color:${C.acento};">by ECODESA</div>
            <div style="font-size:8.5px;font-weight:400;color:${C.gris};margin-top:2px;">Ecología Desarrollo e Ingeniería S.A.S</div>
            <div style="font-size:8.5px;font-weight:400;color:${C.gris};">ecodesaingenieria@outlook.es</div>
            <div style="font-size:8.5px;font-weight:500;color:${C.gris};">WhatsApp 324 688 6824</div>
          </div>
        </div>
        <div style="display:flex;min-height:68px;flex-direction:column;justify-content:center;text-align:right;font-family:'Instrument Sans',Arial,sans-serif;">
          <div style="font-family:'Bricolage Grotesque',Arial,sans-serif;font-weight:800;font-size:12px;letter-spacing:0.01em;color:${C.verde};">ACTA DE INSPECCIÓN PSB</div>
          <div style="font-size:9px;line-height:1.45;color:#6B7280;">N° <strong>${_esc(inspeccion.numero_acta)}</strong></div>
          <div style="font-size:9px;line-height:1.45;color:#6B7280;">${inspeccion.inspeccion.fecha}</div>
        </div>
      </div>`;
  }

  /* ── Datos establecimiento ───────────────────────── */
  function _renderDatosEstablecimiento(inspeccion) {
    const e = inspeccion.establecimiento;
    const i = inspeccion.inspeccion;
    const filas = [
      ['Establecimiento', e.nombre],
      ['NIT', e.nit],
      ['Dirección', e.direccion],
      ['Asesor externo', i.inspector],
      ['Administrador / Responsable PSB', e.responsable_sanitario],
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
              <td style="padding:5px 8px;color:#111827;text-align:center;">${_esc(v||'—')}</td>
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
              ${[['Cumple',score.A||0,'#2E7D32'],['Incumple',score.I||0,'#D32F2F'],['N-A',score.NA||0,'#6B7280']]
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
              <th style="padding:6px 6px;text-align:center;width:64px;white-space:nowrap;">Estado</th>
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
                  <td style="padding:6px 4px;text-align:center;white-space:nowrap;">
                    ${est
                      ? `<span style="background:${c};color:#fff;padding:2px 6px;
                          border-radius:999px;font-size:9px;font-weight:700;white-space:nowrap;">${LABEL[est]}</span>`
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
      const peso  = prog.peso || (typeof PSB_PESOS !== 'undefined' ? PSB_PESOS[prog.id] : null) || 1;

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
            <span style="background:${color}22;color:${color};border:1px solid ${color}44;
              padding:1px 5px;border-radius:4px;font-size:8px;font-weight:700;">${ESTADO_LABEL[est]}</span>
            <span style="background:#0E86C822;color:#0E86C8;border:1px solid #0E86C844;
              padding:1px 5px;border-radius:4px;font-size:8px;font-weight:700;">Evaluados: ${sc.evaluados}</span>
            <span style="background:${C.gris}22;color:${C.gris};border:1px solid ${C.gris}44;
              padding:1px 5px;border-radius:4px;font-size:8px;font-weight:700;">No aplica: ${sc.NA}</span>
          </div>
          <div style="font-size:8.5px;color:#9CA3AF;">Peso: ${PESO_LABEL[peso] || peso}</div>
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
          <td style="padding:6px 4px;text-align:center;white-space:nowrap;">
            <span style="background:${color};color:#fff;padding:2px 8px;
              border-radius:999px;font-size:9px;font-weight:700;white-space:nowrap;">${ESTADO_LABEL[est]}</span>
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
    const prev = _getInspeccionAnterior(inspeccion);
    if (!prev) return '';
    const curr = inspeccion;

    const prevPct = prev.score?.pct_cumplimiento || 0;
    const currPct = curr.score?.pct_cumplimiento || 0;
    const delta   = currPct - prevPct;
    const dColor  = delta > 0 ? C.acento : delta < 0 ? C.rojo : C.gris;
    const dSign   = delta > 0 ? '+' : '';
    const dIcon   = AppIcons.delta(delta, 14);

    const kpiBase = `flex:1;text-align:center;padding:10px 8px;background:#F9FAFB;
      border-radius:8px;border:1px solid #E5E7EB;`;

    const comparativos = inspeccion.programas.map(p => {
      const pp       = (prev.programas || []).find(x => x.id === p.id);
      const prevPctP = pp ? Scores.calcularPrograma(pp).pct : null;
      const currPctP = Scores.calcularPrograma(p).pct;
      if (prevPctP === null || !Scores.calcularPrograma(p).evaluados) return '';
      const d = currPctP - prevPctP;
      const bc = d > 2 ? '#065F46' : d < -2 ? '#991B1B' : '#6B7280';
      const bi = d > 2 ? AppIcons.icon('chevronUp', 9) : d < -2 ? AppIcons.icon('chevronDown', 9) : AppIcons.icon('equal', 9);
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;
        min-width:0;padding:7px 8px;border:1px solid ${bc}33;border-left:3px solid ${bc};
        border-radius:6px;background:${bc}0D;font-size:9px;font-weight:700;line-height:1.3;">
          <span style="min-width:0;color:#0A2E23;white-space:normal;">${_esc(p.nombre)}</span>
          <span style="display:inline-flex;align-items:center;gap:2px;color:${bc};white-space:nowrap;flex-shrink:0;">${bi}${d > 0 ? '+' : ''}${d}%</span>
        </div>`;
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
            <div style="font-size:9px;color:#6B7280;margin-top:2px;">${_esc(prev.numero_acta || prev.inspeccion?.numero_acta || 'Sin acta')} · ${_esc(prev.inspeccion?.fecha || '')}</div>
          </div>
          <div style="${kpiBase}">
            <div style="font-size:9px;color:${C.gris};font-weight:700;text-transform:uppercase;
              letter-spacing:0.05em;margin-bottom:4px;">Reciente</div>
            <div style="font-size:26px;font-weight:900;color:${_colorPct(currPct)};line-height:1.1;">
              ${currPct}%</div>
            <div style="font-size:9px;color:#6B7280;margin-top:2px;">${_esc(curr.numero_acta || curr.inspeccion?.numero_acta || 'Sin acta')} · ${_esc(curr.inspeccion?.fecha || '')}</div>
          </div>
          <div style="${kpiBase}">
            <div style="font-size:9px;color:${C.gris};font-weight:700;text-transform:uppercase;
              letter-spacing:0.05em;margin-bottom:4px;">Variación</div>
            <div style="font-size:26px;font-weight:900;color:${dColor};line-height:1.1;display:flex;align-items:center;justify-content:center;gap:4px;">
              ${dSign}${delta} ${dIcon}</div>
            <div style="font-size:9px;color:#6B7280;margin-top:2px;">puntos</div>
          </div>
        </div>

        ${comparativos ? `<div style="margin-bottom:10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px;">${comparativos}</div>` : ''}
      </div>`;
  }

  /* ── Metodología de evaluación ──────────────────── */
  function _renderMetodologia() {
    return `
      <div style="margin-bottom:14px;padding:10px 12px;background:#F8FAFC;
        border-radius:8px;border:1px solid #E2E8F0;
        break-inside:avoid;page-break-inside:avoid;">
        <div style="display:flex;gap:8px;align-items:flex-start;">
          <span style="flex-shrink:0;margin-top:1px;color:${C.gris};">${AppIcons.icon('info', 14)}</span>
          <div style="font-size:9px;color:#374151;line-height:1.5;text-align:justify;hyphens:auto;">
            <strong style="font-size:9.5px;color:${C.verde};display:block;margin-bottom:3px;">
              METODOLOGÍA DE EVALUACIÓN
            </strong>
            El porcentaje de cumplimiento se calcula ponderando los cinco bloques del catálogo
            operativo: <strong>Edificación e instalaciones (11,1%)</strong>,
            <strong>Equipos y utensilios (11,1%)</strong>,
            <strong>Personal manipulador (22,2%)</strong>,
            <strong>Requisitos higiénicos (22,2%)</strong> y
            <strong>Saneamiento (33,3%)</strong>; no es un promedio simple de ítems.
            Cada aspecto se califica como <strong>A</strong> (cumple), <strong>I</strong>
            (incumple) o <strong>N-A</strong> (no aplica); los N-A se excluyen del denominador.
            El estado general (<strong>Bueno ≥80% / Regular 50–79% / Deficiente &lt;50%</strong>)
            refleja ese resultado ponderado. Esta metodología es una adaptación operativa propia
            de ECODESA basada en 20 aspectos del instructivo, no una transcripción literal de un
            instrumento externo.
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
            background:${h.evaluacion==='I'?'#FEF2F2':'#FFFBEB'};
            border-left:3px solid ${h.evaluacion==='I'?'#D32F2F':'#F57C00'};
            break-inside:avoid;page-break-inside:avoid;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
              <div style="flex:1;">
                <div style="font-size:11px;font-weight:700;color:#111827;margin-bottom:3px;">
                  ${idx+1}. ${_esc(h.texto)}</div>
                <div style="font-size:10px;color:#6B7280;display:flex;align-items:center;gap:4px;">
                  ${AppIcons.icon('scale', 10)} ${_esc(h.norma)} · ${_esc(h.programa_nombre)}</div>
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <div style="font-size:10px;font-weight:800;
                  color:${h.evaluacion==='I'?'#D32F2F':'#F57C00'};">${h.evaluacion}</div>
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
        'Ejecutar mantenimiento correctivo y preventivo de instalaciones físicas según Resolución 2674/2013. Registrar actividades.',
      'Limpieza y Desinfección':
        'Actualizar POE de L&D, verificar concentraciones de desinfectantes y capacitar personal según Resolución 2674/2013.',
      'Control Integrado de Plagas':
        'Implementar medidas correctivas estructurales de control de plagas según Resolución 2674/2013.',
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
                            : items.some(i => i.evaluacion==='I') ? '30 días' : '30 días';
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

  /* ── Evidencia y seguimiento por ítem ────────────── */
  function _renderDetallePorItem(inspeccion) {
    const conEval = inspeccion.programas.map((p, programaIdx) => ({ p, programaIdx })).filter(({ p }) => p.aspectos.some(a => a.evaluacion || a.criterio || (a.fotografias || []).length || (a.criterios_extra || []).some(x => x.criterio || (x.fotografias || []).length)));
    if (!conEval.length) return '';

    const tarjeta = (a, numero, criterioTitulo) => {
      const criterio = typeof Scores !== 'undefined' ? Scores.criterio(a) : a.evaluacion;
      const c = criterio === 'A' ? '#2E7D32' : criterio === 'I' ? '#D32F2F' : '#6B7280';
      const cumple = criterio === 'A', incumple = criterio === 'I';
      return `<div class="acta-card" style="padding:9px 10px;border:1px solid #E5E7EB;border-left:3px solid ${c};border-radius:6px;background:#fff;break-inside:avoid;page-break-inside:avoid;">
        <div class="acta-criterion-inline-title">${_esc(criterioTitulo || '')}</div>
        <div style="display:flex;gap:8px;align-items:flex-start;"><span style="font-weight:800;color:${c};flex-shrink:0;font-size:11px;">[${_esc(criterio || '')}]</span><div style="flex:1;min-width:0;"><div class="acta-aspect-title">${numero}, Aspecto por verificar</div><div class="acta-aspect-norm">${_esc(a.norma || '')}</div></div></div>
        ${cumple ? `<div style="margin-top:7px;font-size:10px;color:#374151;text-align:justify;hyphens:auto;"><strong>Observaciones:</strong> ${_esc(a.obs || 'Sin observaciones registradas.')}</div><div style="margin-top:4px;padding:5px 7px;background:#F0FAF5;border-radius:4px;font-size:10px;color:#374151;text-align:justify;hyphens:auto;"><strong>Recomendaciones:</strong> ${_esc(a.recomendaciones || 'Sin recomendación registrada.')}</div>` : ''}
        ${incumple ? `<div style="margin-top:7px;font-size:10px;color:#374151;text-align:justify;hyphens:auto;"><strong>Hallazgo:</strong> ${_esc(a.hallazgo || a.obs || 'Sin hallazgo registrado.')}</div><div style="margin-top:4px;font-size:10px;color:#374151;text-align:justify;hyphens:auto;"><strong>Acción correctiva:</strong> ${_esc(a.accion || 'Sin acción correctiva registrada.')}</div><div style="margin-top:4px;font-size:10px;color:#374151;"><strong>Estado de acción:</strong> ${_esc(a.estado || 'Abierto')}</div>` : ''}
        ${criterio === 'NA' ? `<div style="margin-top:7px;font-size:10px;color:#6B7280;text-align:justify;hyphens:auto;"><strong>Justificación N-A:</strong> ${_esc(a.obs || 'No aplica a este establecimiento.')}</div>` : ''}
        ${_renderFotosAspecto(a)}</div>`;
    };

    const tarjetas = [];
    const detalleDesktop = conEval.map(({ p, programaIdx }) => {
      const criterios = p.aspectos.map((base, criterioIdx) => ({ base, criterioIdx, aspectos: [{ ...base, extraIdx: null }, ...(base.criterios_extra || []).map((x, i) => ({ ...x, norma: base.norma, fotografias: x.fotografias || [], extraIdx: i }))].filter(x => x.evaluacion || x.criterio || (x.fotografias || []).length) })).filter(x => x.aspectos.length);
      criterios.forEach(({ base, criterioIdx, aspectos }) => aspectos.forEach(a => {
        const numero = `${programaIdx + 1}.${criterioIdx + 1}.${a.extraIdx == null ? 1 : a.extraIdx + 2}`;
        tarjetas.push({ html: tarjeta(a, numero, `${programaIdx + 1}.${criterioIdx + 1} ${base.texto}`), programa: `${programaIdx + 1}. ${p.nombre}` });
      }));
      return `
        <div class="acta-programa" style="margin-bottom:14px;">
          <div class="acta-programa-title">${programaIdx + 1}. ${_esc(p.nombre)}</div>
          <div class="acta-criteria-grid">${criterios.map(({ base, criterioIdx, aspectos }) => `<section class="acta-criterion-group"><div class="acta-aspectos-stack${aspectos.length > 1 ? ' has-consecutivos' : ''}">${aspectos.map(a => tarjeta(a, `${programaIdx + 1}.${criterioIdx + 1}.${a.extraIdx == null ? 1 : a.extraIdx + 2}`, `${programaIdx + 1}.${criterioIdx + 1} ${base.texto}`)).join('')}</div></section>`).join('')}</div>
        </div>`;
    }).join('');
    const paginasMovil = [];
    for (let i = 0; i < tarjetas.length; i += 6) {
      paginasMovil.push(`<div class="acta-mobile-page"><div class="acta-mobile-grid">${tarjetas.slice(i, i + 6).map(x => x.html).join('')}</div></div>`);
    }

    return `
      <div class="acta-seccion" style="margin-bottom:14px;">
        ${_secTitle('Detalle de aspectos evaluados', C.verde)}
        <div class="acta-desktop-detail">${detalleDesktop}</div>
        <div class="acta-mobile-detail">${paginasMovil.join('')}</div>
      </div>`;
  }

  function _renderFotosAspecto(aspecto) {
    const fotos = aspecto.fotografias || [];
    if (!fotos.length) return '';
    return `
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:8px;">
        ${fotos.map((foto, idx) => `
          <figure style="margin:0;border:1px solid #E5E7EB;border-radius:5px;overflow:hidden;">
            <img src="${foto.data}" alt="Evidencia ${idx + 1} del aspecto evaluado"
              style="width:100%;height:auto;max-height:280px;object-fit:contain;background:#F8FAF9;display:block;">
            <figcaption style="padding:3px 5px;background:#F9FAFB;font-size:9px;color:#6B7280;">Evidencia ${idx + 1}</figcaption>
          </figure>`).join('')}
      </div>`;
  }

  /* ── Registro fotográfico ────────────────────────── */
  function _renderFotografias(inspeccion) {
    const fotos = [];
    inspeccion.programas.forEach(p => {
      p.aspectos.forEach(a => {
        [a, ...(a.criterios_extra || [])].forEach((item, i) => (item.fotografias || []).forEach(f => {
          fotos.push({ ...f, programa: p.nombre, aspecto: i ? `Aspecto por verificar ${i + 1}` : a.texto });
        }));
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
                style="width:100%;height:auto;max-height:280px;object-fit:contain;background:#F8FAF9;display:block;">
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
    const f = inspeccion.firmas || {};
    const nombres = { elaboro: inspeccion.inspeccion.inspector, presente: e.responsable_sanitario || '________________' };
    return `
      <div class="acta-firmas" style="margin-bottom:14px;">
        ${_secTitle('Firmas', C.verde)}
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-top:24px;">
          ${FIRMANTES.map(ft => {
            const datos = f[ft.key];
            return `
            <div style="text-align:center;">
              ${datos?.firma ? `<img src="${datos.firma}" alt="Firma" style="height:50px;max-width:100%;object-fit:contain;display:block;margin:0 auto;">` : ''}
              <div style="border-top:1.5px solid #111827;padding-top:8px;">
                <div style="font-size:11px;font-weight:700;color:#111827;">${_esc(nombres[ft.key])}</div>
                <div style="font-size:10px;color:#6B7280;margin-top:2px;">${ft.cargo}</div>
                <div style="font-size:10px;font-weight:600;color:${C.verde};margin-top:2px;">${ft.rol}</div>
                ${ft.key === 'elaboro' && (datos?.profesion || datos?.cursos_certificaciones || datos?.posgrado || datos?.empresa)
                  ? `<div style="font-size:9px;color:#6B7280;margin-top:2px;">${[_esc(datos?.profesion), _esc(datos?.cursos_certificaciones), _esc(datos?.posgrado), _esc(datos?.empresa)].filter(Boolean).join(', ')}</div>`
                  : ''}
                ${datos?.cedula ? `<div style="font-size:9px;color:#6B7280;margin-top:2px;">C.C. ${_esc(datos.cedula)}</div>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  /* ── Captura de firma + cédula (antes de generar el Acta) ── */
  function _renderCapturaFirmas(inspeccion) {
    const e = inspeccion.establecimiento;
    const f = inspeccion.firmas || {};
    const nombres = { elaboro: inspeccion.inspeccion.inspector, presente: e.responsable_sanitario || '________________' };
    return `
      <div class="acta-actions" style="padding:var(--sp-md);background:var(--color-white);
        border-bottom:1px solid var(--color-border);">
        ${PhvaIcons.badge('A', 'ACTUAR', 'font-size:11px;padding:3px 8px;margin-bottom:6px;')}
        <div style="font-size:13px;font-weight:700;color:var(--color-ink);margin-bottom:4px;">Firmas del Acta</div>
        <div style="font-size:11px;color:var(--color-ink3);">Cada firmante registra su cédula y dibuja su firma antes de generar el PDF.</div>
      </div>
      <div style="padding:var(--sp-md);display:flex;flex-direction:column;gap:var(--sp-md);">
        ${FIRMANTES.map(ft => {
          const datos = f[ft.key];
          return `
          <div style="border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--sp-md);">
            <div style="font-weight:700;font-size:13px;color:var(--color-ink);">${_esc(nombres[ft.key])}</div>
            <div style="font-size:11px;color:var(--color-ink3);margin-bottom:10px;">${ft.cargo} · ${ft.rol}</div>
            <label class="form-label" for="cedula-${ft.key}">Cédula</label>
            <input class="form-input" id="cedula-${ft.key}" type="text" inputmode="numeric" autocomplete="off"
              placeholder="Ej: 1047123456" value="${_esc(datos?.cedula || '')}" style="margin-bottom:10px;">
            ${ft.key === 'elaboro' ? `
            <label class="form-label" for="profesion-${ft.key}">Profesión</label>
            <input class="form-input" id="profesion-${ft.key}" type="text" autocomplete="off"
              placeholder="Ej: Ingeniero Ambiental" value="${_esc(datos?.profesion || '')}" style="margin-bottom:10px;">
            <label class="form-label" for="cursos-${ft.key}">Cursos o certificaciones (opcional)</label>
            <input class="form-input" id="cursos-${ft.key}" type="text" autocomplete="off"
              placeholder="Ej: Auditor interno ISO 14001" value="${_esc(datos?.cursos_certificaciones || '')}" style="margin-bottom:10px;">
            <label class="form-label" for="posgrado-${ft.key}">Posgrado (opcional)</label>
            <input class="form-input" id="posgrado-${ft.key}" type="text" autocomplete="off"
              placeholder="Ej: Esp. en Gestión Ambiental" value="${_esc(datos?.posgrado || '')}" style="margin-bottom:10px;">
            <label class="form-label" for="empresa-${ft.key}">Empresa</label>
            <input class="form-input" id="empresa-${ft.key}" type="text" autocomplete="off"
              placeholder="Ej: ECODESA Ingeniería S.A.S" value="${_esc(datos?.empresa || '')}" style="margin-bottom:10px;">
            ` : ''}
            <label class="form-label">Firma</label>
            <canvas id="firma-${ft.key}" style="width:100%;height:140px;border:1px dashed var(--color-border);
              border-radius:var(--radius-sm);background:#fff;touch-action:none;display:block;"></canvas>
            <button type="button" class="btn btn-outline" style="width:100%;margin-top:8px;"
              onclick="Actuar.limpiarFirma('${ft.key}')">${AppIcons.row('trash', 'Limpiar firma', 14)}</button>
          </div>`;
        }).join('')}
        <button type="button" class="btn btn-primary" style="width:100%;min-height:48px;"
          onclick="Actuar.guardarFirmas()">${AppIcons.row('check', 'Guardar firmas y generar Acta', 16)}</button>
        ${_forceCaptura ? `<button type="button" class="btn btn-outline" style="width:100%;"
          onclick="Actuar.cancelarEdicionFirmas()">Cancelar</button>` : ''}
      </div>`;
  }

  /* ── Footer normativo ────────────────────────────── */
  function _renderFooter() {
    return `
      <div style="border-top:1.5px solid ${C.verde};padding:14px 12px 0;text-align:center;margin-top:16px;">
        <div style="font-size:8.5px;color:#6B7280;line-height:1.55;text-align:center;max-width:620px;margin:0 auto;">
          Normativa aplicada: Ley 9/1979 (Código Sanitario) · Resolución 2674/2013 ·
          Resolución 1229/2013 · Decreto 1575/2007 y Resolución 2115/2007, cuando aplique.
        </div>
        <div style="font-size:9px;color:${C.verde};font-weight:700;line-height:1.45;margin:10px auto 0;text-align:center;">
          Cartagena de Indias · ECODESA Ecología Desarrollo e Ingeniería S.A.S · ecodesa.co
        </div>
      </div>`;
  }

  /* ── Helpers ─────────────────────────────────────── */

  // Las inspecciones antiguas guardaban el acta dentro de `inspeccion`;
  // las actuales la conservan también en la raíz. Se sincronizan al abrir
  // Actuar para que el documento siempre represente la inspección activa.
  function _sincronizarNumeroActa(inspeccion) {
    const existente = inspeccion.numero_acta || inspeccion.inspeccion?.numero_acta;
    const numero = existente || _generarNumeroActa();
    const cambio = inspeccion.numero_acta !== numero || inspeccion.inspeccion?.numero_acta !== numero;
    inspeccion.numero_acta = numero;
    if (!inspeccion.inspeccion) inspeccion.inspeccion = {};
    inspeccion.inspeccion.numero_acta = numero;
    return cambio;
  }

  function _getInspeccionAnterior(actual) {
    const ordenActual = _ordenInspeccion(actual);
    return (Store.get().inspecciones || [])
      .filter(i => i.id !== actual.id)
      .filter(i => _mismoEstablecimiento(i, actual))
      .filter(i => (i.score?.total || 0) > 0)
      .filter(i => _ordenInspeccion(i) < ordenActual)
      .sort((a, b) => _ordenInspeccion(b).localeCompare(_ordenInspeccion(a)))[0] || null;
  }

  function _mismoEstablecimiento(a, b) {
    const normalizar = valor => String(valor || '').trim().toLowerCase();
    const aId = normalizar(a.establecimiento?.establecimiento_id);
    const bId = normalizar(b.establecimiento?.establecimiento_id);
    if (aId || bId) return Boolean(aId && bId && aId === bId);
    const aNit = normalizar(a.establecimiento?.nit), bNit = normalizar(b.establecimiento?.nit);
    if (aNit && bNit) return aNit === bNit;
    const mismoNombre = normalizar(a.establecimiento?.nombre) === normalizar(b.establecimiento?.nombre);
    const aDireccion = normalizar(a.establecimiento?.direccion), bDireccion = normalizar(b.establecimiento?.direccion);
    return Boolean(mismoNombre && aDireccion && bDireccion && aDireccion === bDireccion);
  }

  function _ordenInspeccion(inspeccion) {
    const fecha = inspeccion.inspeccion?.fecha || '0000-00-00';
    const hora = inspeccion.inspeccion?.hora_inicio || '00:00';
    const creada = inspeccion.creado_en || '';
    return `${fecha}T${hora}|${creada}`;
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
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@10..48,500;10..48,600;10..48,700;10..48,800&family=Instrument+Sans:wght@400;500;600;700;800&display=swap');
    :root { --shadow-sticker: 0 1px 0 rgba(255,255,255,.65) inset, 0 4px 0 rgba(10,46,35,.08), 0 10px 22px -6px rgba(10,46,35,.16); }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Instrument Sans', Arial, sans-serif; font-size: 11px; color: #111827; background: #fff; }
    .acta-wrap { width: min(100%, 800px); margin: 0 auto; padding: 16px; }
    .acta-seccion, .acta-card, .acta-hallazgo, .acta-chart-wrap, .acta-firmas {
      page-break-inside: avoid; break-inside: avoid; }
    .acta-criteria-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; align-items:start; }
    /* Una sola rejilla de dos columnas para todos los aspectos del criterio. */
    .acta-criteria-grid .acta-criterion-group { display:contents; }
    .acta-criteria-grid .acta-criterion-title { grid-column:1 / -1; }
    .acta-criteria-grid .acta-aspectos-stack { display:contents; }
    .acta-criteria-grid .acta-card {
      align-self:stretch;
      box-sizing:border-box;
      min-height:320px;
    }
    .acta-mobile-detail { display:none; }
    .acta-mobile-grid {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:12px;
      align-items:stretch;
    }
    .acta-mobile-page { break-inside:avoid; page-break-inside:avoid; }
    .acta-criterion-group { min-width:0; break-inside:avoid; page-break-inside:avoid; }
    .acta-programa-title { font-size:13px; font-weight:800; color:#0A7350; margin-bottom:8px; }
    .acta-criterion-title { font-size:11px; font-weight:700; color:#0A2E23; margin:0 0 6px; }
    .acta-criterion-inline-title { color:#0A7350; font-size:10px; line-height:1.3; font-weight:800; margin-bottom:7px; text-align:left !important; }
    .acta-aspectos-stack { display:grid; gap:8px; align-items:start; }
    .acta-aspectos-stack.has-consecutivos {
      grid-template-columns:repeat(2,minmax(0,1fr));
    }
    .acta-aspect-title { color:#111827; font-size:11px; font-weight:700; line-height:1.3; }
    .acta-aspect-norm { color:#6B7280; font-size:9px; line-height:1.4; margin-top:2px; }
    .acta-aspectos-stack .acta-card { min-height:0; height:auto; box-sizing:border-box; overflow:visible; }
    .acta-aspectos-stack .acta-card figure { max-width:220px; }
    .acta-aspectos-stack .acta-card figure img { max-height:116px !important; object-fit:contain !important; }
    .acta-card, .acta-card div { min-width:0; max-width:100%; overflow-wrap:anywhere; word-break:break-word; white-space:normal; }
    .acta-card div { text-align:justify; hyphens:auto; }
    table { border-collapse: collapse; width: 100%; }
    .btn-save {
      display: block; width: 100%; padding: 12px; margin-bottom: 16px;
      background: #1B4332; color: #fff; border: none; border-radius: 8px;
      font-size: 14px; font-weight: 700; cursor: pointer; font-family: Arial, sans-serif;
      letter-spacing: 0.02em; }
    .btn-save:hover { background: #2D6A4F; }
    @media print {
      html, body { width: 210mm; min-height: 297mm; background: #fff; }
      body { margin: 0; }
      .acta-wrap { width: 180mm; max-width: 180mm; margin: 0 auto; padding: 0; }
      .acta-seccion { margin-bottom: 14px; }
      .acta-programa { break-inside: auto; page-break-inside: auto; }
      /* Chrome/iOS puede ignorar break-inside en hijos de CSS Grid al paginar.
         El PDF usa flujo de bloques para que una tarjeta nunca se fragmente. */
      .acta-criteria-grid {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        align-items: start;
        grid-auto-flow: row;
      }
      .acta-aspectos-stack {
        display: contents !important;
      }
      .acta-criterion-group {
        display: contents !important;
        width: auto;
        min-width: 0;
        margin: 0 0 12px;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .acta-criterion-title { break-after: avoid; page-break-after: avoid; }
      .acta-card { height: auto !important; min-height: 0 !important; }
      .acta-aspectos-stack .acta-card {
        display: block; min-height: 0; height: auto; overflow: visible;
        break-inside: avoid; page-break-inside: avoid;
      }
      .acta-card figure, .acta-card img, table tr {
        break-inside: avoid; page-break-inside: avoid;
      }
      thead { display: table-header-group; }
      h1, h2, h3, .acta-programa-title, .acta-seccion > .section-title {
        break-after: avoid; page-break-after: avoid;
      }
      .acta-card, .acta-card > div, .acta-card figure, .acta-card img { max-width: 100%; }
      .acta-card { overflow-wrap: anywhere; word-break: break-word; }
      /* En teléfonos, cada página es un bloque independiente. Chrome móvil
         no respeta de forma fiable los saltos aplicados a hijos de Grid. */
      .mobile-phone .acta-desktop-detail { display:none !important; }
      .mobile-phone .acta-mobile-detail { display:block !important; }
      .mobile-phone .acta-mobile-page {
        display:block;
        break-after:page;
        page-break-after:always;
        break-inside:avoid;
        page-break-inside:avoid;
      }
      .mobile-phone .acta-mobile-page:last-child {
        break-after:auto;
        page-break-after:auto;
      }
      .mobile-phone .acta-mobile-grid {
        display:grid !important;
        grid-template-columns:repeat(2,minmax(0,1fr)) !important;
        gap:12px;
        align-items:stretch;
      }
      .mobile-phone .acta-mobile-grid .acta-card {
        min-width:0;
        height:auto !important;
        min-height:0 !important;
        break-inside:avoid;
        page-break-inside:avoid;
      }
      .btn-save { display: none !important; }
      @page { margin: 1.5cm 1.5cm 1.8cm; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
  ${chartScript}
</head>
<body>
<main class="acta-wrap">
  <button class="btn-save" onclick="window.print()">&#128190; Guardar como PDF</button>
  ${_renderPrintHeader(inspeccion)}
  ${_renderDatosEstablecimiento(inspeccion)}
  ${_renderResumenCumplimiento(inspeccion)}
  ${_renderGraficasPorPrograma(inspeccion)}
  ${_renderGraficoComparativo(inspeccion)}
  ${_renderRankingTabla(inspeccion)}
  ${_renderComparacionHistorica(inspeccion)}
  ${_renderMetodologia()}
  ${_renderDetallePorItem(inspeccion)}
  ${_renderFirmas(inspeccion)}
  ${_renderFooter()}
</main>
<script>
  if (Math.min(window.innerWidth || 9999, window.screen?.width || 9999) <= 600) {
    document.body.classList.add('mobile-phone');
  }
</script>
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
        .then(() => Router.toast('Copiado al portapapeles'));
    }
  }

  /* ── Canvas de firma táctil (pointer events: dedo, mouse o lápiz) ── */
  function _bindFirmaCanvas(key, existingDataUrl) {
    const canvas = document.getElementById('firma-' + key);
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';

    _firmaState[key] = { hasStroke: false };
    _firmaData[key] = existingDataUrl || null;

    if (existingDataUrl) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, rect.width, rect.height); _firmaState[key].hasStroke = true; };
      img.src = existingDataUrl;
    }

    let drawing = false;
    function pos(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function start(e) {
      drawing = true;
      _firmaState[key].hasStroke = true;
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      e.preventDefault();
    }
    function move(e) {
      if (!drawing) return;
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      e.preventDefault();
    }
    function end() {
      if (!drawing) return;
      drawing = false;
      _firmaData[key] = canvas.toDataURL('image/png');
    }
    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointerleave', end);
    canvas.addEventListener('pointercancel', end);
  }

  function limpiarFirma(key) {
    const canvas = document.getElementById('firma-' + key);
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    _firmaData[key] = null;
    if (_firmaState[key]) _firmaState[key].hasStroke = false;
  }

  function guardarFirmas() {
    const inspeccion = Store.getCurrentInspeccion();
    if (!inspeccion) return;
    const cedulas = {};
    for (const ft of FIRMANTES) {
      const val = (document.getElementById('cedula-' + ft.key)?.value || '').trim();
      if (!/^[0-9]{5,15}$/.test(val)) {
        Router.toast('Cédula inválida (' + ft.cargo + ') — solo números, 5 a 15 dígitos');
        return;
      }
      cedulas[ft.key] = val;
    }
    const empresaElaboro = (document.getElementById('empresa-elaboro')?.value || '').trim();
    if (!empresaElaboro) {
      Router.toast('Falta la empresa del Asesor externo');
      return;
    }
    for (const ft of FIRMANTES) {
      if (!_firmaData[ft.key] || !_firmaState[ft.key]?.hasStroke) {
        Router.toast('Falta la firma de ' + ft.cargo);
        return;
      }
    }
    inspeccion.firmas = {};
    FIRMANTES.forEach(ft => {
      const datos = { cedula: cedulas[ft.key], firma: _firmaData[ft.key] };
      if (ft.key === 'elaboro') {
        datos.profesion = (document.getElementById('profesion-elaboro')?.value || '').trim();
        datos.cursos_certificaciones = (document.getElementById('cursos-elaboro')?.value || '').trim();
        datos.posgrado  = (document.getElementById('posgrado-elaboro')?.value || '').trim();
        datos.empresa   = empresaElaboro;
      }
      inspeccion.firmas[ft.key] = datos;
    });
    Store.upsertInspeccion(inspeccion);
    _forceCaptura = false;
    Router.toast('Firmas guardadas');
    _refresh();
  }

  function editarFirmas() {
    _forceCaptura = true;
    _refresh();
  }

  function cancelarEdicionFirmas() {
    _forceCaptura = false;
    _refresh();
  }

  function _refresh() {
    const area = document.getElementById('screen-area');
    if (!area) return;
    area.innerHTML = render();
    attach();
  }

  function _sinInspeccion() {
    return `<div class="coming-soon">
      <div class="coming-soon-icon" style="display:flex;justify-content:center;color:var(--color-ink3);">${AppIcons.block('fileText', 40)}</div>
      <div class="coming-soon-title">Sin inspección activa</div>
      <div class="coming-soon-desc">Complete una inspección PSB para generar el acta.</div>
      <button class="btn btn-primary mt-md" style="width:auto;padding:12px 24px"
        onclick="Router.go('planificar')">Ir a Planificar</button>
    </div>`;
  }

  function _colorPct(pct) {
    return pct >= 80 ? '#2E7D32' : pct >= 50 ? '#F57C00' : '#D32F2F';
  }


  return { render, attach, compartir, abrirPDF, limpiarFirma, guardarFirmas, editarFirmas, cancelarEdicionFirmas };
})();
