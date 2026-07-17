// about.js — Ajustes / Acerca de SaniCheck (versión, Portal Cliente, soporte)

const About = (() => {
  'use strict';

  function render() {
    setTimeout(_hydrate, 0);
    return `
      <div class="screen-header">
        <div class="screen-fase-badge" style="background:rgba(148,163,184,0.14);color:var(--color-ink3);display:inline-flex;align-items:center;gap:6px;">
          ${AppIcons.icon('settings', 12)} AJUSTES</div>
        <div class="screen-title">Acerca de SaniCheck</div>
        <div class="screen-subtitle">Versión de caché, Portal Cliente y soporte</div>
      </div>

      <div style="padding:0 var(--sp-md) var(--sp-lg);">
        <div class="card" style="padding:var(--sp-md);margin-bottom:var(--sp-md);">
          <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-ink3);
            text-transform:uppercase;letter-spacing:0.05em;margin-bottom:var(--sp-sm);">
            Versión de caché</div>
          <div id="about-cache-info" style="font-size:var(--text-sm);color:var(--color-ink3);">
            Consultando Service Worker…
          </div>
        </div>

        <div class="card" style="padding:var(--sp-md);margin-bottom:var(--sp-md);">
          <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-ink3);
            text-transform:uppercase;letter-spacing:0.05em;margin-bottom:var(--sp-sm);">
            Actualizaciones</div>
          <div id="about-update-info" style="font-size:var(--text-sm);color:var(--color-ink2);margin-bottom:var(--sp-md);">
            Verificando estado…
          </div>
          <button type="button" class="btn btn-outline" style="width:auto;padding:10px 18px;"
            onclick="About.buscarActualizacion()">
            Buscar actualizaciones
          </button>
          <button type="button" class="btn btn-accent" id="about-reload-btn"
            style="width:auto;padding:10px 18px;margin-left:8px;display:none;"
            onclick="SwUpdate.reload()">
            Recargar ahora
          </button>
        </div>

        <div class="card" style="padding:var(--sp-md);margin-bottom:var(--sp-md);position:relative;">
          <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-ink3);
            text-transform:uppercase;letter-spacing:0.05em;margin-bottom:var(--sp-sm);">
            Portal Cliente</div>
          <div id="about-portal-body" style="font-size:var(--text-sm);color:var(--color-ink2);">
            Cargando…
          </div>
        </div>

        <div class="card" style="padding:var(--sp-md);margin-bottom:var(--sp-md);">
          <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-ink3);
            text-transform:uppercase;letter-spacing:0.05em;margin-bottom:var(--sp-sm);">
            Soporte</div>
          <div style="font-size:var(--text-sm);color:var(--color-ink2);line-height:1.7;">
            ECODESA Ecología Desarrollo e Ingeniería S.A.S<br>
            Cartagena de Indias, Colombia<br>
            <a href="mailto:ecodesaingenieria@outlook.es" style="color:var(--color-accent);">ecodesaingenieria@outlook.es</a>
          </div>
        </div>

        <button type="button" class="btn btn-outline" style="width:100%;display:inline-flex;align-items:center;justify-content:center;gap:6px;"
          onclick="Router.go('home')">${AppIcons.row('arrowLeft', 'Volver al inicio', 14)}</button>
      </div>`;
  }

  async function _hydrate() {
    const cacheEl  = document.getElementById('about-cache-info');
    const updateEl = document.getElementById('about-update-info');
    const reloadBtn = document.getElementById('about-reload-btn');
    if (!cacheEl) return;

    const info    = await SwUpdate.getActiveInfo();
    const pending = SwUpdate.getPendingVersion();

    cacheEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;
        padding:10px 0;border-bottom:1px dashed var(--color-border);">
        <span>Versión activa</span>
        <strong style="font-family:var(--font-mono);color:var(--color-ink);">${_esc(info.version)}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;
        padding:10px 0;border-bottom:1px dashed var(--color-border);">
        <span>Hash de build</span>
        <strong style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-ink2);">${_esc(info.build || '—')}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;
        padding:10px 0;border-bottom:1px dashed var(--color-border);">
        <span>Nombre de caché</span>
        <strong style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-ink2);">${_esc(info.cache)}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 0;">
        <span>Service Worker</span>
        <span class="estado-chip ${info.swActive ? 'estado-B' : 'estado-R'}">${info.swActive ? 'Activo' : 'Pendiente'}</span>
      </div>`;

    if (updateEl) {
      if (pending) {
        updateEl.innerHTML =
          `<span class="estado-chip estado-R">Actualización disponible — versión ${_esc(pending)}</span>` +
          `<div style="margin-top:8px;font-size:var(--text-xs);color:var(--color-ink3);">
            Pulsa <strong>Recargar ahora</strong> para aplicar la nueva versión sin perder tus datos locales.</div>`;
        if (reloadBtn) reloadBtn.style.display = 'inline-block';
      } else {
        updateEl.textContent = 'Estás usando la última versión disponible.';
        if (reloadBtn) reloadBtn.style.display = 'none';
      }
    }

    _renderPortal();
  }

  function _renderPortal() {
    const el = document.getElementById('about-portal-body');
    if (!el || typeof PortalCliente === 'undefined') {
      if (el) el.textContent = 'Portal no disponible en esta versión.';
      return;
    }

    const meta = PortalCliente.getPortalMeta();
    if (meta.activo) {
      el.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;">
          <span class="estado-chip estado-B">Portal activo</span>
          <span style="font-size:var(--text-xs);color:var(--color-ink3);">${_esc(meta.nombre || '')}</span>
        </div>
        <div style="text-align:center;padding:16px 12px;background:var(--wash-a,#EFF9F5);
          border-radius:var(--radius-md);border:1px solid var(--color-border);margin-bottom:12px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;
            color:var(--color-ink3);margin-bottom:8px;">Código de acceso</div>
          <div id="about-portal-codigo" style="font-family:var(--font-mono);font-size:28px;font-weight:700;
            letter-spacing:0.28em;color:var(--emerald,#0C8A5F);">${_esc(meta.codigo)}</div>
        </div>
        <p style="font-size:var(--text-xs);color:var(--color-ink3);margin-bottom:12px;line-height:1.5;">
          Comparte este código con el cliente para que consulte vencimientos en el Portal.
        </p>
        <button type="button" class="btn btn-primary" style="width:100%;" onclick="About.copiarCodigoPortal()">
          Copiar código
        </button>`;
      return;
    }

    const local = PortalCliente.resolverEstablecimientoLocal();
    el.innerHTML = `
      <p style="margin-bottom:12px;line-height:1.55;color:var(--color-ink2);">
        Activa el Portal para que el establecimiento consulte Personal y Equipos con un código de 6 caracteres.
      </p>
      <div class="form-group" style="margin-bottom:10px;">
        <label class="form-label" for="portal-nombre">Nombre del establecimiento</label>
        <input class="form-input" type="text" id="portal-nombre" value="${_escAttr(local.nombre)}"
          placeholder="Razón social" autocomplete="organization">
      </div>
      <div class="form-group" style="margin-bottom:14px;">
        <label class="form-label" for="portal-nit">NIT</label>
        <input class="form-input" type="text" id="portal-nit" value="${_escAttr(local.nit)}"
          placeholder="NIT / CC" autocomplete="off">
      </div>
      <p id="about-portal-msg" style="display:none;margin-bottom:10px;font-size:var(--text-xs);"></p>
      <button type="button" class="btn btn-primary" style="width:100%;" id="about-portal-activar"
        onclick="About.activarPortal()">
        Activar Portal Cliente
      </button>`;
  }

  async function activarPortal() {
    const btn = document.getElementById('about-portal-activar');
    const msg = document.getElementById('about-portal-msg');
    const nombreEl = document.getElementById('portal-nombre');
    const nitEl = document.getElementById('portal-nit');
    if (!nombreEl || !nitEl) return;

    if (btn) btn.disabled = true;
    if (msg) {
      msg.style.display = 'none';
      msg.textContent = '';
    }

    try {
      const meta = await PortalCliente.activar(nombreEl.value, nitEl.value);
      if (typeof Router !== 'undefined' && Router.toast) {
        Router.toast('Portal activo — código ' + meta.codigo);
      }
      _renderPortal();
    } catch (err) {
      if (msg) {
        msg.style.display = 'block';
        msg.style.color = 'var(--color-deficiente,#991B1B)';
        msg.textContent = err.message || 'No se pudo activar el Portal.';
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function copiarCodigoPortal() {
    const codigo = typeof PortalCliente !== 'undefined' ? PortalCliente.getCodigoAcceso() : '';
    if (!codigo) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(codigo);
      } else {
        const ta = document.createElement('textarea');
        ta.value = codigo;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      if (typeof Router !== 'undefined' && Router.toast) Router.toast('Código copiado');
    } catch (_) {
      if (typeof Router !== 'undefined' && Router.toast) Router.toast('No se pudo copiar');
    }
  }

  async function buscarActualizacion() {
    const result = await SwUpdate.checkForUpdate();
    if (result.updated) await _hydrate();
  }

  function attach() { _hydrate(); }

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _escAttr(s) {
    return _esc(s).replace(/"/g, '&quot;');
  }

  return { render, attach, buscarActualizacion, activarPortal, copiarCodigoPortal };
})();
