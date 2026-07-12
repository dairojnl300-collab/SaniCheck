// about.js — Ajustes / Acerca de SaniCheck (versión de caché y actualizaciones)

const About = (() => {
  'use strict';

  function render() {
    setTimeout(_hydrate, 0);
    return `
      <div class="screen-header">
        <div class="screen-fase-badge" style="background:rgba(148,163,184,0.14);color:var(--color-ink3);">⚙ AJUSTES</div>
        <div class="screen-title">Acerca de SaniCheck</div>
        <div class="screen-subtitle">Versión de caché, actualizaciones y soporte</div>
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

        <button type="button" class="btn btn-outline" style="width:100%;"
          onclick="Router.go('home')">← Volver al inicio</button>
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
  }

  async function buscarActualizacion() {
    const result = await SwUpdate.checkForUpdate();
    if (result.updated) await _hydrate();
  }

  function attach() { _hydrate(); }

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { render, attach, buscarActualizacion };
})();
