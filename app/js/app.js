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
  Router.register('dadis',        DadisSimulador.render);

  /* ── Pantalla de activación ──────────────────────── */
  function renderLicencia() {
    return `
      <div style="padding:var(--sp-lg);display:flex;flex-direction:column;
        align-items:center;justify-content:center;min-height:70vh;gap:var(--sp-md);">
        <div style="display:flex;justify-content:center;margin-bottom:var(--sp-md);color:var(--color-accent);">
          ${AppIcons.icon('lock', 48)}
        </div>
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
            style="font-size:11px;color:var(--color-brand);text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
            Ver planes y precios ${AppIcons.icon('arrowRight', 12)}
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
    P: PhvaIcons.tileSvg('P'),
    H: PhvaIcons.tileSvg('H'),
    V: PhvaIcons.tileSvg('V'),
    A: PhvaIcons.tileSvg('A'),
  };
  const FASE_META = {
    P: { fase: 'Fase 1', label: 'Planificar', screen: 'planificar' },
    H: { fase: 'Fase 2', label: 'Hacer',      screen: 'hacer' },
    V: { fase: 'Fase 3', label: 'Verificar',  screen: 'verificar' },
    A: { fase: 'Fase 4', label: 'Actuar',     screen: 'actuar' },
  };
  const ESTADO_COLOR = { B: 'var(--color-bueno)', R: 'var(--color-regular)', D: 'var(--color-deficiente)' };

  const TRASH_ICON = AppIcons.icon('trash', 14);

  let _pendingDeleteId = null;

  function _ensureDeleteModal() {
    if (document.getElementById('insp-delete-modal')) return;
    const el = document.createElement('div');
    el.id = 'insp-delete-modal';
    el.style.cssText = 'display:none;position:fixed;inset:0;z-index:2000;align-items:center;justify-content:center;padding:var(--sp-md);';
    el.innerHTML = `
      <div onclick="_cerrarModalEliminar()" style="position:absolute;inset:0;background:rgba(10,46,35,0.45);"></div>
      <div style="position:relative;width:100%;max-width:340px;background:var(--color-white);border-radius:var(--radius-md);
        box-shadow:var(--shadow-lg);padding:var(--sp-lg);border:1px solid var(--color-border);">
        <div style="width:40px;height:40px;border-radius:50%;background:rgba(163,45,45,0.1);color:var(--color-deficiente);
          display:flex;align-items:center;justify-content:center;margin-bottom:var(--sp-md);">
          ${AppIcons.icon('trash', 20)}
        </div>
        <div style="font-size:var(--text-md);font-weight:700;color:var(--color-ink);margin-bottom:6px;">¿Estás seguro?</div>
        <div style="font-size:var(--text-sm);color:var(--color-ink3);line-height:1.5;margin-bottom:var(--sp-sm);">
          Esta acción no se puede deshacer.</div>
        <div id="insp-delete-nombre" style="font-size:var(--text-sm);font-weight:600;color:var(--color-ink);
          padding:8px 10px;background:var(--color-surface);border-radius:var(--radius-md);margin-bottom:var(--sp-md);"></div>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn btn-outline" style="flex:1;padding:10px;" onclick="_cerrarModalEliminar()">Cancelar</button>
          <button type="button" style="flex:1;padding:10px;border:none;border-radius:var(--radius-md);cursor:pointer;
            background:rgba(163,45,45,0.12);color:var(--color-deficiente);font-weight:700;font-size:var(--text-sm);"
            onclick="_confirmarEliminarInsp()">Eliminar</button>
        </div>
      </div>`;
    document.body.appendChild(el);
  }

  window._pedirEliminarInsp = function (id) {
    const ins = Store.get().inspecciones.find(i => i.id === id);
    if (!ins) return;
    _ensureDeleteModal();
    _pendingDeleteId = id;
    const nom = document.getElementById('insp-delete-nombre');
    if (nom) nom.textContent = ins.establecimiento?.nombre || 'Inspección';
    document.getElementById('insp-delete-modal').style.display = 'flex';
  };

  window._cerrarModalEliminar = function () {
    _pendingDeleteId = null;
    const m = document.getElementById('insp-delete-modal');
    if (m) m.style.display = 'none';
  };

  window._confirmarEliminarInsp = function () {
    if (!_pendingDeleteId) return;
    const id = _pendingDeleteId;
    _cerrarModalEliminar();
    Store.deleteInspeccion(id);
    Router.toast('Inspección eliminada');
    Router.go('home');
  };

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
           <div class="empty-state-icon" style="display:flex;justify-content:center;color:var(--color-ink3);">${AppIcons.block('clipboardList', 40)}</div>
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
            <button type="button" onclick="event.stopPropagation();_pedirEliminarInsp('${ins.id}')"
              style="margin-top:10px;width:100%;display:flex;align-items:center;justify-content:center;gap:6px;
                padding:8px;border:1px solid rgba(163,45,45,0.25);border-radius:var(--radius-md);
                background:rgba(163,45,45,0.06);color:var(--color-deficiente);font-size:11px;font-weight:600;cursor:pointer;">
              ${TRASH_ICON} Eliminar
            </button>
          </div>`;
        }).join('');

    return `
      <div class="home-hero">
        <div class="home-hero-icon" style="display:flex;justify-content:center;color:rgba(255,255,255,0.95);">${AppIcons.block('shieldCheck', 40)}</div>
        <div class="home-hero-title">SaneamientoApp</div>
        <div class="home-hero-sub">Inspección PSB móvil · Normativa colombiana real<br>ECODESA Ing. S.A.S</div>
      </div>
      <div class="home-content">
        ${esDemo ? `
          <div style="background:rgba(245,158,11,0.12);border:0.5px solid #F59E0B;border-radius:10px;
            padding:10px 14px;margin-bottom:var(--sp-md);font-size:12px;
            color:#FBBF24;display:flex;align-items:center;gap:8px;">
            <span style="display:inline-flex;align-items:center;">${AppIcons.icon('zap', 14)}</span>
            <span>Versión Demo · máx. ${limiteMax} establecimiento.
              <a href="../../index.html" style="color:#FBBF24;font-weight:700;display:inline-flex;align-items:center;gap:3px;">
                Actualizar ${AppIcons.icon('arrowRight', 11)}</a></span>
          </div>` : ''}
        <button class="home-nueva-btn" onclick="_nuevaInspeccion()"
          style="display:inline-flex;align-items:center;justify-content:center;gap:8px;${topeFull ? 'opacity:0.5;cursor:not-allowed;' : ''}">
          ${AppIcons.row('plus', 'Nueva Inspección PSB', 16)}
        </button>
        <button type="button" onclick="Router.go('dadis')"
          style="margin-top:10px;width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;
            background:linear-gradient(135deg,rgba(27,67,50,0.08),rgba(82,183,136,0.12));
            border:1px solid rgba(82,183,136,0.35);border-radius:var(--radius-md);cursor:pointer;text-align:left;">
          <span style="width:40px;height:40px;border-radius:10px;background:rgba(27,67,50,0.12);color:var(--color-brand);
            display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${AppIcons.icon('shieldCheck', 20)}
          </span>
          <span style="flex:1;min-width:0;">
            <span style="display:block;font-size:14px;font-weight:800;color:var(--color-brand);">Simulador DADIS</span>
            <span style="display:block;font-size:11px;color:var(--color-ink3);margin-top:2px;">Simulación técnica · inspección sanitaria con enfoque de riesgo</span>
          </span>
          <span style="color:var(--color-ink3);">${AppIcons.icon('clipboardCheck', 18)}</span>
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
          ${AppIcons.row('settings', `Acerca de SaniCheck · versión ${SwUpdate.APP_VERSION}`, 14)}
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

  async function init() {
    Store.load();
    Store.bindLifecycleFlush();
    await Store.recoverFromIdb();
    SwUpdate.init();
    if (typeof PortalCliente !== 'undefined') PortalCliente.bindOnlineRetry();
    if (typeof VencimientosV2 !== 'undefined') {
      VencimientosV2.loadCatalog().catch(() => {});
      VencimientosV2.bindOnlineRetry();
    }
    if (typeof InvimaCrud !== 'undefined') {
      InvimaCrud.loadBaseChecklist().catch(() => {});
      InvimaCrud.bindOnlineRetry();
    }
    _ensureDeleteModal();
    if (Licencias.esValida()) {
      const ui = Store.get().ui || {};
      const screens = ['home', 'about', 'planificar', 'personalizar', 'hacer', 'verificar', 'actuar', 'dadis'];
      const screen  = screens.includes(ui.screen) ? ui.screen : 'home';
      Router.go(screen);
    } else {
      Router.go('licencia');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { init(); });
  } else {
    init();
  }
})();
