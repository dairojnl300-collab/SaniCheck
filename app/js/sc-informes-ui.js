/**
 * sc-informes-ui.js — Paneles "Mis informes" (técnico) y "Panel admin" (Dairo).
 * Usa ScInformes (RPC + outbox) y el helper global _esc() para escapar HTML.
 * Nunca usa la palabra "Inspector" en textos de UI — se usa "profesional".
 */
const ScInformesUI = (() => {
  'use strict';

  let _overlayEl = null;
  let _lastFocus = null;

  function _cerrar() {
    if (_overlayEl && _overlayEl.parentNode) _overlayEl.parentNode.removeChild(_overlayEl);
    _overlayEl = null;
    if (_lastFocus && _lastFocus.focus) { try { _lastFocus.focus(); } catch (e) {} }
  }

  function _onKeydown(ev) {
    if (ev.key === 'Escape') _cerrar();
  }

  function _abrirOverlay(titulo, cuerpoHtml) {
    _cerrar();
    _lastFocus = document.activeElement;
    const overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', titulo);
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,46,35,.55);z-index:10070;'
      + 'display:flex;align-items:flex-start;justify-content:center;padding:16px;box-sizing:border-box;overflow-y:auto;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:14px;max-width:560px;width:100%;margin:24px auto;
        box-shadow:0 12px 40px rgba(0,0,0,.25);font-family:'Instrument Sans',Arial,sans-serif;">
        <div style="display:flex;align-items:center;justify-content:space-between;
          padding:16px 18px;border-bottom:1px solid #E5E7EB;">
          <h2 style="margin:0;font-size:1rem;color:#0A2E23;">${_esc(titulo)}</h2>
          <button type="button" data-sc-cerrar aria-label="Cerrar"
            style="background:none;border:none;font-size:1.3rem;line-height:1;cursor:pointer;color:#374151;padding:4px 8px;">×</button>
        </div>
        <div style="padding:16px 18px;">${cuerpoHtml}</div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', ev => { if (ev.target === overlay) _cerrar(); });
    overlay.querySelector('[data-sc-cerrar]').addEventListener('click', _cerrar);
    document.addEventListener('keydown', _onKeydown);
    _overlayEl = overlay;
    const foco = overlay.querySelector('input, button, textarea, select');
    if (foco) foco.focus();
    return overlay;
  }

  function _btnStyle(bg, color) {
    return `flex:1;min-width:110px;padding:10px 14px;background:${bg};color:${color};`
      + 'border:none;border-radius:8px;font-size:0.84rem;font-weight:700;cursor:pointer;';
  }

  function _fmtFecha(iso) {
    if (!iso) return '—';
    return String(iso).slice(0, 10);
  }

  // ── Login (código de acceso) ─────────────────────────────────────────────

  function _requiereSesion() {
    return new Promise(resolve => {
      const sesion = ScInformes.getSesionCache();
      if (sesion && ScInformes.getCodigo()) { resolve(sesion); return; }
      _abrirOverlay('Ingresar código de acceso', `
        <p style="margin:0 0 12px;font-size:0.86rem;color:#374151;">
          Ingresa el código de acceso que te entregó tu administrador para ver tus informes respaldados.
        </p>
        <label class="form-label" for="sc-login-codigo">Código de acceso</label>
        <input class="form-input" id="sc-login-codigo" type="text" autocomplete="off"
          placeholder="Ej: AB12CD" style="margin-bottom:10px;width:100%;box-sizing:border-box;">
        <p id="sc-login-error" role="alert" style="display:none;color:#b91c1c;font-size:0.8rem;margin:0 0 10px;"></p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" id="sc-login-ok" style="${_btnStyle('#1B4332', '#fff')}">Ingresar</button>
          <button type="button" data-sc-cerrar style="${_btnStyle('#E5E7EB', '#374151')}">Cancelar</button>
        </div>`);
      const input = document.getElementById('sc-login-codigo');
      const errEl = document.getElementById('sc-login-error');
      const intentar = async () => {
        const codigo = (input.value || '').trim();
        if (!codigo) { errEl.textContent = 'Escribe tu código de acceso.'; errEl.style.display = 'block'; return; }
        ScInformes.setCodigo(codigo);
        const sesion = await ScInformes.whoami();
        if (!sesion) {
          errEl.textContent = 'Código inválido. Verifica con tu administrador.';
          errEl.style.display = 'block';
          ScInformes.clearSesion();
          return;
        }
        _cerrar();
        resolve(sesion);
      };
      document.getElementById('sc-login-ok').addEventListener('click', intentar);
      input.addEventListener('keydown', ev => { if (ev.key === 'Enter') intentar(); });
    });
  }

  // ── Ver / exportar PDF ───────────────────────────────────────────────────
  //
  // informe_html puede venir de OTRO técnico (o de un técnico comprometido) y
  // el admin lo abre sin poder revisarlo antes — es contenido cruzado entre
  // usuarios, no autogenerado en la sesión actual. NUNCA se ejecuta con
  // document.write en la ventana (eso sería same-origin y correría cualquier
  // <script>/onerror/javascript: como el propio SaniCheck, robando el código
  // de acceso guardado en localStorage). Se aísla en un <iframe sandbox>
  // sin allow-scripts ni allow-same-origin, cargado vía srcdoc. El botón de
  // imprimir vive en la página envolvente (confiable, no en el HTML ajeno) y
  // llama a iframe.contentWindow.print(), que funciona aunque el iframe esté
  // sandboxeado. Limitación conocida: el gráfico comparativo (Chart.js, con
  // <script> inline) no se renderiza dentro de esta vista — es el costo
  // aceptado de bloquear scripts del HTML no confiable.
  function _verHtml(html) {
    const win = window.open('about:blank', '_blank', 'noopener');
    if (!win) { window.Router && Router.toast && Router.toast('Permite ventanas emergentes para ver el informe'); return; }
    try { win.opener = null; } catch (e) {}

    const doc = win.document;
    doc.open();
    doc.write(
      '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<title>Informe SaniCheck</title>'
      + '<style>'
      + 'html,body{margin:0;padding:0;height:100%;font-family:Arial,sans-serif;}'
      + '.sc-toolbar{position:sticky;top:0;z-index:1;background:#1B4332;padding:10px;text-align:center;'
      + 'box-shadow:0 2px 6px rgba(0,0,0,.15);}'
      + '.sc-toolbar button{padding:9px 18px;font-weight:700;font-size:0.9rem;border:none;'
      + 'border-radius:8px;background:#fff;color:#1B4332;cursor:pointer;}'
      + '.sc-frame-wrap{height:calc(100% - 52px);}'
      + 'iframe{width:100%;height:100%;border:none;display:block;background:#fff;}'
      + '</style></head><body>'
      + '<div class="sc-toolbar">'
      + '<button type="button" id="sc-print-btn">Imprimir / Guardar como PDF</button>'
      + '</div>'
      + '<div class="sc-frame-wrap">'
      + '<iframe id="sc-viewer" title="Contenido del informe" sandbox="allow-modals"></iframe>'
      + '</div>'
      + '<script>'
      + 'document.getElementById("sc-print-btn").addEventListener("click", function () {'
      + '  var f = document.getElementById("sc-viewer");'
      + '  try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {}'
      + '});'
      + '</script>'
      + '</body></html>'
    );
    doc.close();

    // El HTML no confiable se asigna DESPUÉS, directo al iframe sandboxeado —
    // nunca pasa por document.write del documento contenedor.
    const iframe = doc.getElementById('sc-viewer');
    if (iframe) iframe.srcdoc = html;
  }

  // ── Editor simple de HTML (técnico: solo el suyo · admin: cualquiera) ───

  function _abrirEditor(id, htmlActual, onGuardar) {
    _abrirOverlay('Editar informe', `
      <label class="form-label" for="sc-edit-html">HTML del Acta (avanzado)</label>
      <textarea id="sc-edit-html" rows="10"
        style="width:100%;box-sizing:border-box;font-family:monospace;font-size:11px;padding:8px;
        border:1px solid #E5E7EB;border-radius:8px;">${_esc(htmlActual)}</textarea>
      <p id="sc-edit-error" role="alert" style="display:none;color:#b91c1c;font-size:0.8rem;margin:8px 0 0;"></p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
        <button type="button" id="sc-edit-guardar" style="${_btnStyle('#1B4332', '#fff')}">Guardar cambios</button>
        <button type="button" data-sc-cerrar style="${_btnStyle('#E5E7EB', '#374151')}">Cancelar</button>
      </div>`);
    document.getElementById('sc-edit-guardar').addEventListener('click', async () => {
      const btn = document.getElementById('sc-edit-guardar');
      const errEl = document.getElementById('sc-edit-error');
      const html = document.getElementById('sc-edit-html').value;
      btn.disabled = true; btn.textContent = 'Guardando…';
      try {
        await onGuardar(html);
        _cerrar();
      } catch (e) {
        errEl.textContent = e.message || 'No se pudo guardar.';
        errEl.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Guardar cambios';
      }
    });
  }

  // ── Panel "Mis informes" (técnico) ───────────────────────────────────────

  async function abrirMisInformes() {
    const sesion = await _requiereSesion();
    if (!sesion) return;
    await _renderMisInformes(sesion);
  }

  async function _renderMisInformes(sesion) {
    const pendientesEl = '<p style="font-size:0.8rem;color:#6b7280;">Cargando…</p>';
    _abrirOverlay('Mis informes · ' + sesion.nombre, pendientesEl);
    let filas;
    try {
      filas = await ScInformes.listMisInformes();
    } catch (e) {
      _abrirOverlay('Mis informes', `<p role="alert" style="color:#b91c1c;">No se pudo cargar: ${_esc(e.message)}</p>`);
      return;
    }
    const cuerpo = _tablaInformes(filas || [], { admin: false });
    _abrirOverlay('Mis informes · ' + sesion.nombre, cuerpo);
    _wireAccionesTabla({ admin: false });
  }

  function _tablaInformes(filas, opts) {
    if (!filas.length) {
      return '<p style="font-size:0.86rem;color:#6b7280;">Todavía no hay informes respaldados en la nube.</p>';
    }
    return `
      <div style="max-height:60vh;overflow:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
          <thead>
            <tr style="text-align:left;border-bottom:2px solid #E5E7EB;">
              <th scope="col" style="padding:6px 4px;">Establecimiento</th>
              ${opts.admin ? '<th scope="col" style="padding:6px 4px;">Técnico</th>' : ''}
              <th scope="col" style="padding:6px 4px;">Fecha</th>
              <th scope="col" style="padding:6px 4px;">Acta</th>
              <th scope="col" style="padding:6px 4px;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${filas.map(f => `
              <tr style="border-bottom:1px solid #F3F4F6;" data-sc-id="${_esc(f.id)}">
                <td style="padding:6px 4px;">${_esc((f.establecimiento && f.establecimiento.nombre) || '—')}</td>
                ${opts.admin ? `<td style="padding:6px 4px;">${_esc(f.tecnico_nombre || '—')}</td>` : ''}
                <td style="padding:6px 4px;">${_esc(_fmtFecha(f.fecha))}</td>
                <td style="padding:6px 4px;">${_esc(f.numero_acta || '—')}</td>
                <td style="padding:6px 4px;white-space:nowrap;">
                  <button type="button" data-sc-ver style="padding:4px 8px;font-size:0.76rem;margin-right:4px;border:1px solid #D1D5DB;border-radius:6px;background:#fff;cursor:pointer;">Ver / PDF</button>
                  <button type="button" data-sc-editar style="padding:4px 8px;font-size:0.76rem;margin-right:4px;border:1px solid #D1D5DB;border-radius:6px;background:#fff;cursor:pointer;">Editar</button>
                  <button type="button" data-sc-eliminar style="padding:4px 8px;font-size:0.76rem;border:1px solid #FCA5A5;color:#b91c1c;border-radius:6px;background:#fff;cursor:pointer;">Eliminar</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" data-sc-cerrar-sesion style="${_btnStyle('#E5E7EB', '#374151')}">Cerrar sesión</button>
      </div>`;
  }

  function _wireAccionesTabla(opts) {
    const get = opts.admin ? ScInformes.getAdminInforme : ScInformes.getInforme;
    const upd = opts.admin ? ScInformes.updateAdminInforme : ScInformes.updateInforme;
    const del = opts.admin ? ScInformes.deleteAdminInforme : ScInformes.deleteInforme;
    const recargar = opts.admin
      ? () => _renderAdmin()
      : () => _renderMisInformes(ScInformes.getSesionCache());

    if (!_overlayEl) return;
    _overlayEl.querySelectorAll('[data-sc-ver]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('[data-sc-id]').getAttribute('data-sc-id');
        try {
          const row = await get(id);
          _verHtml(row.informe_html);
        } catch (e) {
          window.Router && Router.toast && Router.toast('No se pudo abrir: ' + e.message);
        }
      });
    });
    _overlayEl.querySelectorAll('[data-sc-editar]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('[data-sc-id]').getAttribute('data-sc-id');
        const row = await get(id);
        _abrirEditor(id, row.informe_html, async html => {
          await upd(id, html);
          await recargar();
        });
      });
    });
    _overlayEl.querySelectorAll('[data-sc-eliminar]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('[data-sc-id]').getAttribute('data-sc-id');
        if (!confirm('¿Eliminar este informe respaldado? Esta acción no se puede deshacer.')) return;
        try {
          await del(id);
          await recargar();
        } catch (e) {
          window.Router && Router.toast && Router.toast('No se pudo eliminar: ' + e.message);
        }
      });
    });
    const btnCerrarSesion = _overlayEl.querySelector('[data-sc-cerrar-sesion]');
    if (btnCerrarSesion) {
      btnCerrarSesion.addEventListener('click', () => {
        ScInformes.clearSesion();
        _cerrar();
      });
    }
  }

  // ── Panel admin ───────────────────────────────────────────────────────────

  async function abrirAdmin() {
    const sesion = await _requiereSesion();
    if (!sesion) return;
    if (sesion.rol !== 'admin') {
      _abrirOverlay('Acceso restringido', '<p role="alert" style="color:#b91c1c;">Este panel es solo para administradores.</p>');
      return;
    }
    await _renderAdmin();
  }

  async function _renderAdmin() {
    _abrirOverlay('Panel de informes (todos)', '<p style="font-size:0.8rem;color:#6b7280;">Cargando…</p>');
    let filas;
    try {
      filas = await ScInformes.listAdminInformes();
    } catch (e) {
      _abrirOverlay('Panel de informes (todos)', `<p role="alert" style="color:#b91c1c;">No se pudo cargar: ${_esc(e.message)}</p>`);
      return;
    }
    const cuerpo = _tablaInformes(filas || [], { admin: true });
    _abrirOverlay('Panel de informes (todos)', cuerpo);
    _wireAccionesTabla({ admin: true });
  }

  return { abrirMisInformes, abrirAdmin };
})();
