// app.js — Punto de entrada SaneamientoApp ECODESA

(function () {
  'use strict';

  Router.register('licencia',     renderLicencia);
  Router.register('home',         renderHome);
  Router.register('about',       About.render);
  Router.register('planificar',   Planificar.render);
  Router.register('personalizar', Personalizar.render);
  Router.register('hacer',        Hacer.render);
  Router.register('verificar',    Verificar.render);
  Router.register('actuar',       Actuar.render);

  /* ── Pantalla de activación ──────────────────────── */
  function renderLicencia() {
    return `
      <div style="padding:var(--sp-lg);display:flex;flex-direction:column;
        align-items:center;justify-content:center;min-height:70vh;gap:var(--sp-md);">
        <div style="font-size:64px;text-align:center;">🔐</div>
        <div style="font-size:22px;font-weight:900;color:var(--color-brand);
          letter-spacing:-0.02em;text-align:center;">Activar SaniCheck</div>
        <div style="font-size:13px;color:var(--color-ink3);text-align:center;
          max-width:280px;line-height:1.5;">
          Ingresa tu código de licencia para continuar.<br>
          Prueba gratis con <strong>DEMO2026</strong>
        </div>
        <div style="width:100%;max-width:340px;margin-top:var(--sp-sm);">
          <input id="lic-input" type="text" class="form-input"
            placeholder="Ej: DEMO2026"
            style="text-transform:uppercase;letter-spacing:0.05em;
              font-size:16px;text-align:center;font-weight:700;"
            onkeydown="if(event.key==='Enter')_activarLicencia()">
          <button id="lic-btn" class="btn btn-primary"
            style="margin-top:var(--sp-sm);"
            onclick="_activarLicencia()">
            Activar licencia
          </button>
          <div id="lic-error"
            style="margin-top:var(--sp-sm);font-size:12px;color:var(--color-deficiente);
              text-align:center;min-height:18px;"></div>
        </div>
        <div style="margin-top:var(--sp-lg);text-align:center;">
          <div style="font-size:10px;color:var(--color-ink3);margin-bottom:8px;">
            ECODESA Ecología Desarrollo e Ingeniería S.A.S
          </div>
          <a href="../../index.html"
            style="font-size:11px;color:var(--color-brand);text-decoration:none;">
            Ver planes y precios →
          </a>
        </div>
      </div>`;
  }

  window._activarLicencia = async function () {
    const btn   = document.getElementById('lic-btn');
    const err   = document.getElementById('lic-error');
    const input = document.getElementById('lic-input');
    const codigo = (input?.value || '').trim();
    if (!codigo) { if (err) err.textContent = 'Ingresa un código.'; return; }
    if (btn) { btn.disabled = true; btn.textContent = 'Verificando…'; }
    if (err) err.textContent = '';
    const result = await Licencias.activar(codigo);
    if (result) {
      Router.go('home');
    } else {
      if (err) err.textContent = 'Código no válido. Verifica e intenta de nuevo.';
      if (btn) { btn.disabled = false; btn.textContent = 'Activar licencia'; }
    }
  };

  /* ── Home ────────────────────────────────────────── */
  const FASE_ICONS = {
    P: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/><path d="M8 4h8a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M6 6h-.5A1.5 1.5 0 0 0 4 7.5v12A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-12A1.5 1.5 0 0 0 18.5 6H18"/><path d="M9 12h6M9 16h6"/></svg>',
    H: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 5.5l1.5 1.5l2.5-2.5"/><path d="M3.5 12.5l1.5 1.5l2.5-2.5"/><path d="M3.5 19.5l1.5 1.5l2.5-2.5"/><path d="M11 6h9M11 13h9M11 20h9"/></svg>',
    V: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7"/><path d="M4 20h16"/></svg>',
    A: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9.5 15l1.5 1.5l3-3.5"/></svg>',
  };
  const FASE_META = {
    P: { fase: 'Fase 1', label: 'Planificar', screen: 'planificar' },
    H: { fase: 'Fase 2', label: 'Hacer',      screen: 'hacer' },
    V: { fase: 'Fase 3', label: 'Verificar',  screen: 'verificar' },
    A: { fase: 'Fase 4', label: 'Actuar',     screen: 'actuar' },
  };
  const ESTADO_COLOR = { B: 'var(--color-bueno)', R: 'var(--color-regular)', D: 'var(--color-deficiente)' };

  function renderHome() {
    const { inspecciones } = Store.get();
    const esDemo    = Licencias.esDemo();
    const limiteMax = Licencias.maxEstab();
    const topeFull  = esDemo && inspecciones.length >= limiteMax;

    const phvaGrid = `<div class="phva-grid">${['P', 'H', 'V', 'A'].map(k => {
      const m = FASE_META[k];
      return `<div class="phva-tile phva-tile-${k}" onclick="Router.go('${m.screen}')">
        <div class="phva-tile-icon">${FASE_ICONS[k]}</div>
        <div class="phva-tile-text">
          <span class="phva-tile-fase">${m.fase}</span>
          <span class="phva-tile-label">${m.label}</span>
        </div>
      </div>`;
    }).join('')}</div>`;

    const lista = inspecciones.length === 0
      ? `<div class="empty-state">
           <div class="empty-state-icon">📋</div>
           <div class="empty-state-text">Aún no hay inspecciones registradas.<br>
             Crea la primera con el botón de arriba.</div>
         </div>`
      : inspecciones.map(ins => {
          const ev    = ins.programas.flatMap(p => p.aspectos.filter(a => a.evaluacion));
          const total = ins.programas.flatMap(p => p.aspectos).length;
          const pct   = total ? Math.round((ev.length / total) * 100) : 0;
          const est   = ins.estado_general;
          const barColor = ESTADO_COLOR[est] || 'var(--color-border)';
          return `<div class="inspeccion-card" style="border-left-color:${barColor}" onclick="_abrirInsp('${ins.id}')">
            <div class="inspeccion-card-header">
              <div class="inspeccion-card-nombre">${_esc(ins.establecimiento.nombre)}</div>
              <div class="inspeccion-card-fecha">${ins.inspeccion.fecha}</div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <span class="inspeccion-card-meta">
                ${_esc(ins.establecimiento.tipo)} · ${ev.length} aspectos evaluados</span>
              ${est
                ? `<span class="estado-chip estado-${est}">${{B:'BUENO',R:'REGULAR',D:'DEFICIENTE'}[est]}</span>`
                : `<span style="font-size:10px;color:var(--color-ink3)">En progreso</span>`}
            </div>
            <div class="inspeccion-card-progress">
              <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
            </div>
          </div>`;
        }).join('');

    return `
      <div class="home-hero">
        <div class="home-hero-icon">🌿</div>
        <div class="home-hero-title">SaneamientoApp</div>
        <div class="home-hero-sub">Inspección PSB móvil · Normativa colombiana real<br>ECODESA Ing. S.A.S</div>
      </div>
      <div class="home-content">
        ${esDemo ? `
          <div style="background:rgba(245,158,11,0.12);border:0.5px solid #F59E0B;border-radius:10px;
            padding:10px 14px;margin-bottom:var(--sp-md);font-size:12px;
            color:#FBBF24;display:flex;align-items:center;gap:8px;">
            <span>⚡</span>
            <span>Versión Demo · máx. ${limiteMax} establecimiento.
              <a href="../../index.html" style="color:#FBBF24;font-weight:700;">Actualizar →</a></span>
          </div>` : ''}
        <button class="home-nueva-btn" onclick="_nuevaInspeccion()"
          ${topeFull ? 'style="opacity:0.5;cursor:not-allowed;"' : ''}>
          + Nueva Inspección PSB
        </button>
        <div class="home-section-title">Fases del proceso</div>
        ${phvaGrid}
        <div class="home-section-title">Inspecciones</div>
        ${lista}
        <button type="button" onclick="Router.go('about')"
          style="margin-top:var(--sp-lg);width:100%;padding:12px;
            background:transparent;border:1px dashed var(--color-border);
            border-radius:var(--radius-md);color:var(--color-ink3);
            font-size:var(--text-sm);cursor:pointer;">
          ⚙ Acerca de SaniCheck · versión ${SwUpdate.APP_VERSION}
        </button>
        <div style="height:32px;"></div>
      </div>`;
  }

  window._nuevaInspeccion = function () {
    const { inspecciones } = Store.get();
    if (Licencias.esDemo() && inspecciones.length >= Licencias.maxEstab()) {
      Router.toast('Versión Demo: máximo 1 establecimiento. Adquiere una licencia completa.');
      return;
    }
    Router.go('planificar');
  };

  window._abrirInsp = function (id) {
    Store.set({ currentId: id });
    Store.setUI({ aspectoIdx: 0, programaIdx: 0 });
    Router.go('hacer');
  };

  function _esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function init() {
    Store.load();
    SwUpdate.init();
    if (Licencias.esValida()) {
      Router.go('home');
    } else {
      Router.go('licencia');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
