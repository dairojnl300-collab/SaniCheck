// actuar.js — Pantalla ACTUAR: Acta de Inspección PSB completa (Semana 3)

const Actuar = (() => {

  function render() {
    const inspeccion = Store.getCurrentInspeccion();
    if (!inspeccion) return _sinInspeccion();

    if (!inspeccion.numero_acta) {
      inspeccion.numero_acta = _generarNumeroActa();
      Store.upsertInspeccion(inspeccion);
    }

    return `
      <style>
        .acta-logo { height: 48px; width: auto; flex-shrink: 0; }
        @media print {
          .phva-topbar, .acta-actions, #app-toast { display: none !important; }
          #app { max-width: 100% !important; box-shadow: none !important; }
          #screen-area { overflow: visible !important; }
          body { background: #fff !important; }
          @page { size: A4; margin: 1.5cm; }
          .acta-seccion { page-break-inside: avoid; }
          .acta-firmas  { page-break-before: always; }
          * { -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important; }
        }
      </style>

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
        ${_renderHeader(inspeccion)}
        ${_renderDatosEstablecimiento(inspeccion)}
        ${_renderResumenCumplimiento(inspeccion)}
        ${_renderHallazgos(inspeccion)}
        ${_renderNoAplicables(inspeccion)}
        ${_renderPlanAcciones(inspeccion)}
        ${_renderObservacionesPorPrograma(inspeccion)}
        ${_renderFotografias(inspeccion)}
        ${_renderFirmas(inspeccion)}
        ${_renderFooter()}
      </div>`;
  }

  /* ── Header ECODESA ────────────────────────────── */
  function _renderHeader(inspeccion) {
    return `
      <div class="acta-seccion" style="border-bottom:2.5px solid #1B4332;
        padding-bottom:14px;margin-bottom:14px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="assets/icons/logotipo-sanicheck.png" alt="SaniCheck" class="acta-logo">
            <div>
              <div style="font-size:18px;font-weight:900;color:#1B4332;letter-spacing:-0.02em;line-height:1.1;">
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
            <div style="font-size:14px;font-weight:800;color:#1B4332;">
              ACTA DE INSPECCIÓN PSB</div>
            <div style="font-size:11px;color:#6B7280;margin-top:2px;">
              N° <strong>${_esc(inspeccion.numero_acta)}</strong></div>
            <div style="font-size:11px;color:#6B7280;">
              Fecha: ${inspeccion.inspeccion.fecha}</div>
          </div>
        </div>
      </div>`;
  }

  /* ── Datos establecimiento ─────────────────────── */
  function _renderDatosEstablecimiento(inspeccion) {
    const e = inspeccion.establecimiento;
    const i = inspeccion.inspeccion;
    const filas = [
      ['Establecimiento', e.nombre],
      ['NIT / CC', e.nit],
      ['Dirección', e.direccion],
      ['Tipo', e.tipo],
      ['Responsable Sanitario', e.responsable_sanitario || '—'],
      ['Inspector ECODESA', i.inspector],
      ['Fecha de Inspección', i.fecha],
      ['N° Acta', inspeccion.numero_acta],
    ];
    return `
      <div class="acta-seccion" style="margin-bottom:14px;">
        ${_secTitle('Datos del Establecimiento', '#1B4332')}
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

  /* ── Resumen de cumplimiento ───────────────────── */
  function _renderResumenCumplimiento(inspeccion) {
    const score = inspeccion.score || {};
    const pct   = score.pct_cumplimiento || 0;
    const estado = inspeccion.estado_general;
    const color = pct >= 70 ? '#2E7D32' : pct >= 40 ? '#F57C00' : '#D32F2F';
    const LABEL = { B:'BUENO', R:'REGULAR', D:'DEFICIENTE' };

    return `
      <div class="acta-seccion" style="margin-bottom:14px;">
        ${_secTitle('Resumen de Cumplimiento', '#1B4332')}
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
            <tr style="background:#1B4332;color:#fff;">
              <th style="padding:6px 8px;text-align:left;">Programa</th>
              <th style="padding:6px 8px;text-align:center;">Evaluados</th>
              <th style="padding:6px 8px;text-align:center;">Cumplimiento</th>
              <th style="padding:6px 8px;text-align:center;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${inspeccion.programas.map((p, idx) => {
              const sc  = Scores.calcularPrograma(p);
              const est = p.estado_general;
              const c   = est==='B'?'#2E7D32':est==='R'?'#F57C00':est==='D'?'#D32F2F':'#6B7280';
              return `
                <tr style="border-bottom:1px solid #E5E7EB;background:${idx%2===0?'#fff':'#F9FAFB'};">
                  <td style="padding:6px 8px;font-weight:600;">${_esc(p.nombre)}</td>
                  <td style="padding:6px 8px;text-align:center;">${sc.evaluados}/${sc.total}</td>
                  <td style="padding:6px 8px;text-align:center;font-weight:700;color:${c};">
                    ${sc.pct}%</td>
                  <td style="padding:6px 8px;text-align:center;">
                    ${est
                      ? `<span style="background:${c};color:#fff;padding:2px 8px;
                          border-radius:999px;font-size:10px;font-weight:700;">${est}</span>`
                      : '—'}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
        <div style="font-size:9px;color:#9CA3AF;margin-top:6px;font-style:italic;">
          * Score ponderado por criticidad normativa: Agua/PLD peso 3 (alto) · Plagas/Residuos peso 2 (medio) · Infraestructura peso 1 (bajo). Aspectos N/A excluidos del cálculo.
        </div>
      </div>`;
  }

  /* ── Hallazgos D y R ───────────────────────────── */
  function _renderHallazgos(inspeccion) {
    const todos = (inspeccion.hallazgos_criticos || []);
    if (!todos.length) return '';
    const criticos  = todos.filter(h => h.critico);
    const ordenados = [...criticos, ...todos.filter(h => !h.critico)];

    return `
      <div class="acta-seccion" style="margin-bottom:14px;">
        ${_secTitle(`Hallazgos (${todos.length}) · Críticos: ${criticos.length}`, '#D32F2F')}
        ${ordenados.map((h, idx) => `
          <div style="padding:8px;border-radius:6px;margin-bottom:6px;
            background:${h.evaluacion==='D'?'#FEF2F2':'#FFFBEB'};
            border-left:3px solid ${h.evaluacion==='D'?'#D32F2F':'#F57C00'};">
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

  /* ── Aspectos No Aplicables ───────────────────── */
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

  /* ── Plan de acciones correctivas ─────────────── */
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
        ${_secTitle('Plan de Acciones Correctivas', '#1B4332')}
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="background:#1B4332;color:#fff;">
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
                  <td style="padding:6px 8px;">${ACCIONES[prog]||'Implementar correcciones según normativa vigente.'}</td>
                  <td style="padding:6px 8px;text-align:center;font-weight:700;color:${c};
                    white-space:nowrap;">${plazo}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  /* ── Observaciones por programa ────────────────── */
  function _renderObservacionesPorPrograma(inspeccion) {
    const conEval = inspeccion.programas.filter(p => p.aspectos.some(a => a.evaluacion));
    if (!conEval.length) return '';

    return `
      <div class="acta-seccion" style="margin-bottom:14px;">
        ${_secTitle('Observaciones por Programa', '#1B4332')}
        ${conEval.map(p => {
          const ev = p.aspectos.filter(a => a.evaluacion);
          return `
            <div style="margin-bottom:10px;">
              <div style="font-size:11px;font-weight:700;color:#1B4332;margin-bottom:5px;">
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
                        ? `<div style="color:#6B7280;font-size:10px;margin-top:1px;">${_esc(a.obs)}</div>`
                        : ''}
                    </div>
                  </div>`;
              }).join('')}
            </div>`;
        }).join('')}
      </div>`;
  }

  /* ── Registro fotográfico ──────────────────────── */
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
        ${_secTitle('Registro Fotográfico', '#1B4332')}
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
          ${fotos.map(f => `
            <div style="border-radius:6px;overflow:hidden;border:1px solid #E5E7EB;">
              <img src="${f.data}" alt="evidencia"
                style="width:100%;height:110px;object-fit:cover;display:block;">
              <div style="padding:4px 6px;background:#F9FAFB;">
                <div style="font-size:9px;font-weight:700;color:#1B4332;">
                  ${_esc(f.programa)}</div>
                <div style="font-size:9px;color:#6B7280;overflow:hidden;
                  text-overflow:ellipsis;white-space:nowrap;">${_esc(f.aspecto)}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  /* ── Firmas ────────────────────────────────────── */
  function _renderFirmas(inspeccion) {
    const e = inspeccion.establecimiento;
    const cols = [
      ['Elaboró',  inspeccion.inspeccion.inspector,            'Inspector ECODESA'],
      ['Revisó',   e.responsable_sanitario || '________________', 'Responsable Sanitario'],
      ['Aprobó',   '________________',                           'Representante Legal'],
    ];
    return `
      <div class="acta-firmas" style="margin-top:40px;margin-bottom:14px;">
        ${_secTitle('Firmas', '#1B4332')}
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:48px;">
          ${cols.map(([rol, nombre, cargo]) => `
            <div style="text-align:center;">
              <div style="border-top:1.5px solid #111827;padding-top:8px;">
                <div style="font-size:11px;font-weight:700;color:#111827;">${_esc(nombre)}</div>
                <div style="font-size:10px;color:#6B7280;margin-top:2px;">${cargo}</div>
                <div style="font-size:10px;font-weight:600;color:#1B4332;margin-top:2px;">${rol}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  /* ── Footer normativo ──────────────────────────── */
  function _renderFooter() {
    return `
      <div style="border-top:1.5px solid #1B4332;padding-top:10px;text-align:center;margin-top:16px;">
        <div style="font-size:9px;color:#6B7280;line-height:1.7;">
          Normativa aplicada: Ley 9/1979 (Código Sanitario) · Decreto 3075/1997 (BPM) ·
          Resolución 2674/2013 · Decreto 1575/2007 (Agua) · Resolución 2115/2007 ·
          Resolución 2184/2019 (Residuos)
        </div>
        <div style="font-size:9px;color:#1B4332;font-weight:700;margin-top:4px;">
          Cartagena de Indias · ECODESA Ecología Desarrollo e Ingeniería S.A.S · ecodesa.org
        </div>
      </div>`;
  }

  /* ── Helpers ───────────────────────────────────── */
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

  function _esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function attach() {}

  return { render, attach, compartir };
})();
