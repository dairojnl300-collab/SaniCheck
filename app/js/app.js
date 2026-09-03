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
  Router.register('dashboard',    Verificar.render);
  Router.register('actuar',       Actuar.render);

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
    const informesHome = typeof ScInformesUI !== 'undefined' ? `
        <div class="home-section-title">Informes guardados</div>
        <button type="button" class="btn btn-outline" style="width:100%;min-height:42px;display:inline-flex;align-items:center;justify-content:center;gap:6px;"
          onclick="ScInformesUI.abrirRegistroInformes()">
          ${AppIcons.row('fileText', 'Registro de Informes', 14)}
        </button>` : '';

    const phvaGrid = `<div class="phva-grid">${['P', 'H', 'V', 'A'].map(k => {
      const m = FASE_META[k];
      return `<div class="phva-tile phva-tile-${k} card-fixed-tile" onclick="Router.go('${m.screen}')">
        <div class="phva-tile-icon">${FASE_ICONS[k]}</div>
        <div class="phva-tile-text">
          <span class="phva-tile-fase">${m.fase}</span>
          <span class="phva-tile-label card-text-clamp card-text-clamp-2">${m.label}</span>
        </div>
      </div>`;
    }).join('')}</div>`;

    return `
      <div class="home-hero">
        <div class="home-hero-logo"><img src="assets/icons/logotipo-sanicheck.png" alt="" width="64" height="64" decoding="async"></div>
        <div class="home-hero-title">SaniCheck</div>
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
        <div class="home-section-title">Fases del proceso</div>
        ${phvaGrid}
        ${informesHome}
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

  /* ── Indicador de fotos pendientes de sincronizar ──────────────────────
   * FotosStorage encola en IndexedDB las fotos que no pudo subir y las
   * reintenta sola al volver la conexión (bindAutoRetry). Sin señal visible el
   * técnico no sabe que hay evidencia sin respaldar todavía. Píldora fija,
   * visible solo mientras haya pendientes, más un toast en las transiciones
   * 0 → >0 y >0 → 0 (consistente con Router.toast en el resto de la app).   */
  let _fotosPendientesPrevio = null;

  function _pillFotosPendientes() {
    let el = document.getElementById('fotos-pendientes-badge');
    if (!el) {
      el = document.createElement('div');
      el.id = 'fotos-pendientes-badge';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9000;display:none;'
        + 'align-items:center;gap:6px;padding:7px 11px;border-radius:999px;'
        + 'background:#B45309;color:#fff;font-size:12px;font-weight:700;'
        + "font-family:'Instrument Sans',Arial,sans-serif;box-shadow:0 3px 10px rgba(10,46,35,.28);"
        + 'pointer-events:none;';
      document.body.appendChild(el);
    }
    return el;
  }

  function _bindFotosPendientes() {
    if (typeof FotosStorage === 'undefined' || !FotosStorage.onCambioPendientes) return;
    FotosStorage.onCambioPendientes(n => {
      const total = Number(n) || 0;
      const el = _pillFotosPendientes();
      el.textContent = total === 1 ? '1 foto por sincronizar' : `${total} fotos por sincronizar`;
      el.style.display = total > 0 ? 'inline-flex' : 'none';
      const previo = _fotosPendientesPrevio;
      _fotosPendientesPrevio = total;
      if (previo === null || !Router || !Router.toast) return;
      if (previo === 0 && total > 0) Router.toast('Fotos pendientes de sincronizar: ' + total);
      else if (previo > 0 && total === 0) Router.toast('Todas las fotos quedaron sincronizadas');
    });
  }

  function _bindTopbarScroll() {
    const topbar = document.querySelector('.phva-topbar');
    const area = document.getElementById('screen-area');
    if (!topbar || !area) return;

    const update = () => topbar.classList.toggle('is-scrolled', area.scrollTop > 24);
    area.addEventListener('scroll', update, { passive: true });
    update();
  }


  async function init() {
    if (typeof window.SaniCheckVersionInit === 'function') {
      await window.SaniCheckVersionInit();
    }
    Store.load();
    await Store.recoverFromIdb();
    if (Store.needsRecovery && Store.needsRecovery()) {
      location.replace('recuperar.html');
      return;
    }
    Store.bindLifecycleFlush();
    SwUpdate.init();
    if (typeof ScInformes !== 'undefined') ScInformes.bindAutoRetry();
    if (typeof FotosStorage !== 'undefined') FotosStorage.bindAutoRetry();
    _bindFotosPendientes();
    if (typeof PortalCliente !== 'undefined') PortalCliente.bindOnlineRetry();
    if (typeof VencimientosV2 !== 'undefined') {
      VencimientosV2.loadCatalog().catch(() => {});
      VencimientosV2.bindOnlineRetry();
    }
    _ensureDeleteModal();
    _bindTopbarScroll();
    // TEMPORAL: gate de licencia deshabilitado a pedido de Dairo (2026-08-27) para que la
    // app cargue directo en la portada sin pedir código de acceso. Para reactivar el gate,
    // poner SKIP_LICENCIA_GATE en false — Licencias.esValida()/activar()/etc. siguen intactos.
    const SKIP_LICENCIA_GATE = true;
    if (SKIP_LICENCIA_GATE || Licencias.esValida()) {
      const ui = Store.get().ui || {};
      const screens = ['home', 'about', 'planificar', 'personalizar', 'hacer', 'verificar', 'dashboard', 'actuar'];
      const screen  = screens.includes(ui.screen) ? ui.screen : 'home';
      Router.go(screen);
      if (typeof ScInformesUI !== 'undefined' && ScInformesUI.iniciarSesionAutomatica) {
        setTimeout(() => ScInformesUI.iniciarSesionAutomatica().catch(() => {}), 0);
      }
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
