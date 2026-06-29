// app.js — Punto de entrada SaneamientoApp ECODESA

(function () {
  'use strict';

  Router.register('home', renderHome);
  Router.register('planificar', Planificar.render);
  Router.register('hacer', Hacer.render);

  function renderHome() {
    const { inspecciones } = Store.get();
    const lista = inspecciones.length === 0
      ? `<div class="empty-state">
           <div class="empty-state-icon">📋</div>
           <div class="empty-state-text">Aún no hay inspecciones registradas.<br>
             Crea la primera con el botón de arriba.</div>
         </div>`
      : inspecciones.map(ins => {
          const ev = ins.programas.flatMap(p => p.aspectos.filter(a => a.evaluacion));
          const est = ins.estado_general;
          return `<div class="inspeccion-card" onclick="_abrirInsp('${ins.id}')">
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
          </div>`;
        }).join('');

    return `
      <div class="home-hero">
        <div class="home-hero-icon">🌿</div>
        <div class="home-hero-title">SaneamientoApp</div>
        <div class="home-hero-sub">Inspección PSB móvil · Normativa colombiana real<br>ECODESA Ing. S.A.S</div>
      </div>
      <div class="home-content">
        <button class="home-nueva-btn" onclick="Router.go('planificar')">
          + Nueva Inspección PSB
        </button>
        <div class="home-section-title">Inspecciones</div>
        ${lista}
      </div>`;
  }

  window._abrirInsp = function(id) {
    Store.set({ currentId: id });
    Store.setUI({ programaIdx: 0, aspectoIdx: 0 });
    Router.go('hacer');
  };

  function _esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function init() {
    Store.load();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
    Router.go('home');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
