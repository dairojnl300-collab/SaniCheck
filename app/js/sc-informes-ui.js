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
    document.removeEventListener('keydown', _onKeydown);
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

  function _fmtHora(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '—'; }
  }

  function _metaInforme(f) {
    const local = (typeof Store !== 'undefined' && Store.get)
      ? Store.get().inspecciones.find(i => i.id === f.local_id) : null;
    if (local) {
      const score = Scores.calcular(local);
      const aspectosTotal = (local.programas || []).reduce((total, p) => total
        + (p.aspectos || []).reduce((subtotal, a) => subtotal + 1 + (a.criterios_extra || []).length, 0), 0);
      const estado = score.total ? ({ B: 'BUENO', R: 'REGULAR', D: 'DEFICIENTE' }[Scores.getEstado(score.pct_cumplimiento)] || 'PENDIENTE') : 'PENDIENTE';
      return { aspectos: score.total, aspectosTotal, estado, porcentaje: score.pct_cumplimiento };
    }
    const aspectos = Number.isFinite(Number(f.aspectos_evaluados)) ? Number(f.aspectos_evaluados) : null;
    const porcentaje = Number.isFinite(Number(f.porcentaje_cumplimiento)) ? Number(f.porcentaje_cumplimiento) : null;
    const estado = f.nivel_cumplimiento || (porcentaje !== null
      ? ({ B: 'BUENO', R: 'REGULAR', D: 'DEFICIENTE' }[Scores.getEstado(porcentaje)] || 'PENDIENTE')
      : 'PENDIENTE');
    return { aspectos, aspectosTotal: f.aspectos_total || null, estado, porcentaje };
  }

  function _htmlEditableSeguro(html) {
    return String(html || '')
      .replace(/<button\b[^>]*>[\s\S]*?(?:guardar|imprimir)[\s\S]*?pdf[\s\S]*?<\/button>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<\s*(iframe|object|embed|base|form|link|meta)\b[\s\S]*?<\/\s*\1\s*>/gi, '')
      .replace(/<\s*(iframe|object|embed|base|form|link|meta)\b[^>]*\/?>/gi, '')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/javascript\s*:/gi, '');
  }

  function _cerrarSesion() {
    ScInformes.clearSesion();
    const bloque = document.getElementById('sc-registro-portada');
    if (bloque) bloque.remove();
    if (typeof Router !== 'undefined' && Router.toast) Router.toast('Sesión cerrada');
    // Después de cerrar, la aplicación queda en la portada y solicita
    // nuevamente las credenciales de acceso.
    if (typeof Router !== 'undefined' && Router.go) Router.go('home');
    setTimeout(() => { _requiereSesion(); }, 0);
  }

  function _abrirCambiarPassword() {
    _abrirOverlay('Cambiar contraseña', `<p style="margin:0 0 12px;font-size:.85rem;color:#52635d;">Escribe una nueva contraseña numérica de 4 dígitos.</p><input id="sc-change-password" class="form-input" type="password" inputmode="numeric" maxlength="4" placeholder="Ej: 1234" style="width:100%;box-sizing:border-box;margin-bottom:10px;"><p id="sc-change-error" style="display:none;color:#B91C1C;font-size:.8rem;margin:0 0 10px;"></p><button type="button" id="sc-change-save" style="${_btnStyle('#1B4332','#fff')};width:100%;">Guardar contraseña</button>`);
    document.getElementById('sc-change-save').addEventListener('click', async () => {
      const value = document.getElementById('sc-change-password').value;
      const error = document.getElementById('sc-change-error');
      if (!/^\d{4}$/.test(value)) { error.textContent = 'La contraseña debe tener exactamente 4 dígitos.'; error.style.display = 'block'; return; }
      try { await ScInformes.cambiarPassword(value); _cerrar(); Router.toast('Contraseña actualizada'); }
      catch (e) { error.textContent = e.message || 'No se pudo actualizar la contraseña.'; error.style.display = 'block'; }
    });
  }

  // ── Login (usuario y contraseña) ─────────────────────────────────────────

  function _requiereSesion() {
    return new Promise(resolve => {
      const sesion = ScInformes.getSesionCache();
      if (sesion && sesion.usuario && ScInformes.getCodigo()) { resolve(sesion); return; }
      _abrirOverlay('Inicio de sesión', `
        <p style="margin:0 0 12px;font-size:0.86rem;color:#374151;">
          Ingresa tu usuario y contraseña para consultar tus informes respaldados.
        </p>
        <label class="form-label" for="sc-login-usuario">Usuario</label>
        <input class="form-input" id="sc-login-usuario" type="text" autocomplete="username"
          placeholder="Ej: katerin" style="margin-bottom:10px;width:100%;box-sizing:border-box;">
        <label class="form-label" for="sc-login-password">Contraseña numérica de 4 dígitos</label>
        <input class="form-input" id="sc-login-password" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" autocomplete="current-password"
          style="margin-bottom:10px;width:100%;box-sizing:border-box;">
        <details style="margin:0 0 12px;font-size:0.8rem;color:#52635d;">
          <summary style="cursor:pointer;font-weight:700;">¿No recuerdas tu contraseña?</summary>
          <div style="padding-top:8px;">
            <p style="margin:0 0 8px;">Crea una nueva contraseña usando tu código de respaldo.</p>
            <input class="form-input" id="sc-login-code" type="text" autocomplete="one-time-code"
              placeholder="Código de respaldo" style="margin-bottom:8px;width:100%;box-sizing:border-box;">
            <button type="button" id="sc-login-setup" style="${_btnStyle('#0F766E', '#fff')};width:100%;">Configurar contraseña</button>
          </div>
        </details>
        <p id="sc-login-error" role="alert" style="display:none;color:#b91c1c;font-size:0.8rem;margin:0 0 10px;"></p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" id="sc-login-ok" style="${_btnStyle('#1B4332', '#fff')}">Ingresar</button>
          <button type="button" data-sc-cerrar style="${_btnStyle('#E5E7EB', '#374151')}">Cancelar</button>
        </div>`);
      const input = document.getElementById('sc-login-usuario');
      const password = document.getElementById('sc-login-password');
      const code = document.getElementById('sc-login-code');
      const errEl = document.getElementById('sc-login-error');
      document.getElementById('sc-login-setup').addEventListener('click', async () => {
        if (!input.value.trim() || !code.value.trim() || !/^\d{4}$/.test(password.value)) {
          errEl.textContent = 'Escribe usuario, código y una contraseña numérica de exactamente 4 dígitos.';
          errEl.style.display = 'block';
          return;
        }
        try {
          await ScInformes.configurarPasswordInicial(input.value, code.value, password.value);
          errEl.textContent = 'Contraseña actualizada. Ahora presiona Ingresar.';
          errEl.style.color = '#047857';
          errEl.style.display = 'block';
        } catch (e) {
          errEl.textContent = 'No se pudo configurar. Verifica usuario y código.';
          errEl.style.color = '#b91c1c';
          errEl.style.display = 'block';
        }
      });
      const intentar = async () => {
        const usuario = (input.value || '').trim();
        if (!usuario || !password.value) { errEl.textContent = 'Escribe usuario y contraseña.'; errEl.style.display = 'block'; return; }
        let sesion = null;
        try { sesion = await ScInformes.loginUsuario(usuario, password.value); } catch (e) { sesion = null; }
        if (!sesion) {
          errEl.textContent = 'Usuario o contraseña incorrectos.';
          errEl.style.display = 'block';
          ScInformes.clearSesion();
          return;
        }
        _cerrar();
        // La sesión queda disponible en la portada, donde viven los accesos
        // a los informes técnicos y al panel administrativo.
        if (window.Router && Router.go) {
          Router.go('home');
          setTimeout(() => mostrarEnPortada(sesion), 0);
        }
        resolve(sesion);
      };
      document.getElementById('sc-login-ok').addEventListener('click', intentar);
      input.addEventListener('keydown', ev => { if (ev.key === 'Enter') intentar(); });
      password.addEventListener('keydown', ev => { if (ev.key === 'Enter') intentar(); });
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
  // El informe remoto se trata como contenido no confiable. El documento
  // contenedor es propio de SaniCheck y el HTML ajeno vive solo en un iframe
  // sandbox sin scripts ni same-origin; nunca se inserta en el overlay.
  function _verHtml(html) {
    const overlay = _abrirOverlay('Ver informe / PDF', `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <iframe id="sc-viewer" title="Contenido del informe" sandbox="allow-modals"
          style="width:100%;height:65vh;min-height:360px;border:1px solid #DDE7E2;border-radius:8px;background:#fff;"></iframe>
        <button type="button" id="sc-print-btn" style="${_btnStyle('#1B4332','#fff')};width:100%;">Imprimir / Guardar como PDF</button>
      </div>`);
    const iframe = overlay.querySelector('#sc-viewer');
    const print = overlay.querySelector('#sc-print-btn');
    const htmlSeguro = _htmlEditableSeguro(html);
    if (iframe) iframe.srcdoc = htmlSeguro;
    if (print) print.addEventListener('click', () => {
      const esMovil = window.matchMedia?.('(max-width: 600px)').matches
        || (navigator.maxTouchPoints > 1 && window.innerWidth < 900);
      if (esMovil) {
        // En navegadores móviles, imprimir un iframe invisible de 1x1 produce
        // un PDF vacío. Abrir el documento visible permite que el motor móvil
        // calcule correctamente el tamaño de papel elegido (A4, carta, etc.).
        const win = window.open('', '_blank');
        if (!win) { Router.toast('Permite ventanas emergentes para guardar el PDF'); return; }
        try {
          win.document.open();
          win.document.write(htmlSeguro);
          win.document.close();
          setTimeout(() => {
            try { win.focus(); win.print(); } catch (e) { Router.toast('No se pudo abrir la impresión'); }
          }, 700);
        } catch (e) {
          try { win.close(); } catch (ignore) {}
          Router.toast('No se pudo preparar el PDF');
        }
        return;
      }
      let printFrame = null;
      let limpiarlo = () => {
        if (printFrame && printFrame.parentNode) printFrame.parentNode.removeChild(printFrame);
        printFrame = null;
      };
      try {
        // Se imprime en un iframe propio e invisible para que Chrome/Edge no
        // ignoren print() cuando el documento visible está sandboxed.
        printFrame = document.createElement('iframe');
        printFrame.setAttribute('title', 'Impresión del informe');
        printFrame.setAttribute('aria-hidden', 'true');
        printFrame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;';
        printFrame.srcdoc = htmlSeguro;
        printFrame.onload = () => {
          try {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.onafterprint = limpiarlo;
            printFrame.contentWindow.print();
            setTimeout(limpiarlo, 3000);
          } catch (e) {
            limpiarlo();
            Router.toast('No se pudo abrir la impresión');
          }
        };
        document.body.appendChild(printFrame);
      } catch (e) {
        limpiarlo();
        Router.toast('No se pudo preparar el PDF');
      }
    });
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
    return `<div style="max-height:60vh;overflow:auto;display:grid;gap:10px;">
      ${filas.map(f => `<article data-sc-id="${_esc(f.id)}" data-sc-editar-tarjeta="true" title="Toca la tarjeta para editar este informe" style="border:1px solid #DDE7E2;border-left:3px solid #0C8A5F;border-radius:12px;padding:13px;background:#fff;box-shadow:0 3px 12px rgba(10,46,35,.07);cursor:pointer;">
        ${(() => { const m = _metaInforme(f); const color = m.estado === 'BUENO' ? 'var(--color-bueno)' : m.estado === 'DEFICIENTE' ? 'var(--color-deficiente)' : m.estado === 'REGULAR' ? 'var(--color-regular)' : 'var(--ink-55)'; const aspectos = m.aspectos === null ? '—' : m.aspectos; return `<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;"><strong style="font-size:.95rem;color:var(--color-ink);">${_esc((f.establecimiento && f.establecimiento.nombre) || '—')}</strong><span style="font-size:.75rem;color:var(--color-ink3);white-space:nowrap;">${_esc(_fmtFecha(f.fecha))}</span></div><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:6px;font-size:.78rem;color:var(--color-ink2);"><span>${aspectos} aspectos evaluados</span><span style="display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;background:${color};color:#fff;font-size:.7rem;font-weight:800;white-space:nowrap;box-shadow:0 2px 5px rgba(10,46,35,.18);"><span style="width:6px;height:6px;border-radius:50%;background:#fff;"></span>${_esc(m.estado)}</span></div>`; })()}
        <div style="margin-top:7px;display:grid;gap:3px;font-size:.78rem;color:#6B7280;">
          <span><strong style="color:#52635d;">Fecha:</strong> ${_esc(_fmtFecha(f.fecha))} · <strong style="color:#52635d;">Hora:</strong> ${_esc(_fmtHora(f.actualizado_en || f.creado_en))}</span>
          <span>${opts.admin ? `Profesional: ${_esc(f.tecnico_nombre || '—')} · ` : ''}Acta: ${_esc(f.numero_acta || '—')}</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:11px;"><button type="button" data-sc-ver style="${_btnStyle('#1B4332','#fff')}">Ver / PDF</button><button type="button" data-sc-eliminar style="${_btnStyle('#FFF1F2','#B91C1C')}">Eliminar</button></div>
      </article>`).join('')}
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
      </div>`;
  }

  function _wireAccionesTabla(opts, root) {
    const get = opts.admin ? ScInformes.getAdminInforme : ScInformes.getInforme;
    const upd = opts.admin ? ScInformes.updateAdminInforme : ScInformes.updateInforme;
    const del = opts.admin ? ScInformes.deleteAdminInforme : ScInformes.deleteInforme;
    const recargar = opts.admin
      ? () => _renderAdmin()
      : () => _renderMisInformes(ScInformes.getSesionCache());

    const contenedor = root || _overlayEl;
    if (!contenedor) return;
    const recargarVista = opts.portada ? () => mostrarEnPortada(ScInformes.getSesionCache()) : recargar;
    contenedor.querySelectorAll('[data-sc-ver]').forEach(btn => {
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
    contenedor.querySelectorAll('[data-sc-editar-tarjeta]').forEach(article => {
      article.addEventListener('click', async ev => {
        if (ev.target.closest('button')) return;
        const id = article.getAttribute('data-sc-id');
        try {
          const row = await get(id);
          const localId = row.local_id || id;
          const local = Store.get().inspecciones.find(i => i.id === localId);
          if (!local) {
            Router.toast('Este informe no está disponible en este equipo para editarlo en Hacer.');
            return;
          }
          Store.set({currentId: local.id});
          if (Router && Router.go) Router.go('hacer');
        } catch (e) { Router.toast(e.message || 'No se pudo abrir el informe'); }
      });
    });
    contenedor.querySelectorAll('[data-sc-eliminar]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('[data-sc-id]').getAttribute('data-sc-id');
        if (!confirm('¿Eliminar este informe respaldado? Esta acción no se puede deshacer.')) return;
        try {
          await del(id);
          await recargarVista();
        } catch (e) {
          window.Router && Router.toast && Router.toast('No se pudo eliminar: ' + e.message);
        }
      });
    });
    const btnCerrarSesion = contenedor.querySelector('[data-sc-cerrar-sesion]');
    if (btnCerrarSesion) {
      btnCerrarSesion.addEventListener('click', () => {
        ScInformes.clearSesion();
        if (opts.portada) {
          const bloque = document.getElementById('sc-registro-portada');
          if (bloque) bloque.remove();
        } else _cerrar();
      });
    }
  }

  async function mostrarEnPortada(sesion) {
    if (!sesion) return;
    let filas;
    let usuarios = [];
    try {
      filas = sesion.rol === 'admin' ? await ScInformes.listAdminInformes() : await ScInformes.listMisInformes();
      if (sesion.rol === 'admin') usuarios = await ScInformes.listUsuarios();
    } catch (e) {
      Router.toast('No se pudieron cargar los informes: ' + (e.message || 'error'));
      return;
    }
    // Aunque la PWA se reabra directamente en una fase PHVA, la consulta
    // anterior actualiza el historial confirmado de la sesión. La portada
    // solo se dibuja cuando está presente en la pantalla actual.
    const contenido = document.querySelector('.home-content');
    if (!contenido) return;
    const anterior = document.getElementById('sc-registro-portada');
    if (anterior) anterior.remove();
    const bloque = document.createElement('section');
    bloque.id = 'sc-registro-portada';
    bloque.style.cssText = 'margin-top:var(--sp-lg);';
    const rolTexto = sesion.rol === 'admin' ? 'admin' : 'profesional';
    const tarjetas = _tablaInformes(filas || [], {admin: sesion.rol === 'admin'})
      .replace(/^<div style="max-height:60vh;overflow:auto;display:grid;gap:10px;">/, '')
      .replace(/<\/div>\s*<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">[\s\S]*?<\/div>\s*$/, '');
    let contenidoInformes = `<div style="display:grid;gap:10px;">${tarjetas}</div>`;
    if (sesion.rol === 'admin') {
      const profesionales = (usuarios || []).filter(u => u.activo && u.rol === 'tecnico');
      const activosIds = new Set(profesionales.map(u => u.id));
      const historicos = [...new Map((filas || [])
        .filter(f => f.tecnico_id && !activosIds.has(f.tecnico_id) && f.tecnico_id !== sesion.id)
        .map(f => [f.tecnico_id, { id: f.tecnico_id, nombre: f.tecnico_nombre || 'Profesional eliminado' }])).values()];
      const propiosAdmin = (filas || []).filter(f => f.tecnico_id === sesion.id);
      const misTarjetas = _tablaInformes(propiosAdmin, {admin:true})
        .replace(/^<div style="max-height:60vh;overflow:auto;display:grid;gap:10px;">/, '')
        .replace(/<\/div>\s*<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">[\s\S]*?<\/div>\s*$/, '');
      contenidoInformes = `<div class="home-section-title" style="margin-top:0;">Mis informes</div>
        <div data-sc-mis-admin="true" style="display:grid;gap:10px;margin-bottom:16px;">${misTarjetas}</div>
        <div class="home-section-title">Informes de profesionales</div>
        <p style="margin:0 0 10px;color:#52635d;font-size:.82rem;">Selecciona un profesional para ver sus informes sincronizados.</p>
        <div style="display:grid;gap:8px;">${profesionales.map(u => {
          const propios = (filas || []).filter(f => f.tecnico_id === u.id);
          const html = _tablaInformes(propios, {admin:true})
            .replace(/^<div style="max-height:60vh;overflow:auto;display:grid;gap:10px;">/, '')
            .replace(/<\/div>\s*<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">[\s\S]*?<\/div>\s*$/, '');
          return `<div><button type="button" data-sc-profesional="${_esc(u.id)}" style="width:100%;text-align:left;padding:15px;border:1px solid #DDE7E2;border-radius:12px;background:#fff;color:#0A2E23;font-size:.95rem;font-weight:700;cursor:pointer;">${_esc(u.nombre)}</button><div data-sc-reportes-prof="${_esc(u.id)}" style="display:none;margin:8px 0 4px 10px;gap:10px;">${html}</div></div>`;
        }).join('')}${historicos.map(u => {
          const propios = (filas || []).filter(f => f.tecnico_id === u.id);
          const html = _tablaInformes(propios, {admin:true})
            .replace(/^<div style="max-height:60vh;overflow:auto;display:grid;gap:10px;">/, '')
            .replace(/<\/div>\s*<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">[\s\S]*?<\/div>\s*$/, '');
          return `<div><button type="button" data-sc-profesional="${_esc(u.id)}" style="width:100%;text-align:left;padding:15px;border:1px solid #DDE7E2;border-radius:12px;background:#FBF7ED;color:var(--color-ink);font-size:.95rem;font-weight:700;cursor:pointer;">Histórico · ${_esc(u.nombre)}</button><div data-sc-reportes-prof="${_esc(u.id)}" style="display:none;margin:8px 0 4px 10px;gap:10px;">${html}</div></div>`;
        }).join('') || '<p style="font-size:.82rem;color:var(--color-ink3);">No hay informes de profesionales para consultar.</p>'}</div>`;
    }
    bloque.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;
        padding:12px 14px;margin-bottom:12px;background:var(--emerald-2);color:#fff;border-radius:10px;">
        <span style="font-size:.82rem;">Sesión: <strong>${_esc(sesion.nombre)}</strong> · ${rolTexto}</span>
        <span style="font-size:.78rem;white-space:nowrap;">Sesión activa</span>
      </div>
      <div class="home-section-title">${sesion.rol === 'admin' ? 'Panel administrador' : 'Mis informes'}</div>
      ${contenidoInformes}
      ${sesion.rol === 'admin' ? '<button type="button" data-sc-usuarios style="margin-top:12px;width:100%;' + _btnStyle('#0C8A5F','#fff') + '">Gestionar usuarios y códigos</button>' : ''}`;
    contenido.appendChild(bloque);
    if (sesion.rol === 'admin') {
      const misAdmin = bloque.querySelector('[data-sc-mis-admin]');
      if (misAdmin) _wireAccionesTabla({admin: true, portada: true}, misAdmin);
      bloque.querySelectorAll('[data-sc-reportes-prof]').forEach(panel => {
        _wireAccionesTabla({admin: true, portada: true}, panel);
      });
      bloque.querySelectorAll('[data-sc-profesional]').forEach(btn => {
        btn.addEventListener('click', () => {
          const panel = bloque.querySelector(`[data-sc-reportes-prof="${btn.getAttribute('data-sc-profesional')}"]`);
          if (panel) panel.style.display = panel.style.display === 'none' ? 'grid' : 'none';
        });
      });
    } else {
      _wireAccionesTabla({admin: false, portada: true}, bloque);
    }
    const btnUsuarios = bloque.querySelector('[data-sc-usuarios]');
    if (btnUsuarios) btnUsuarios.addEventListener('click', abrirGestionUsuarios);
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
    const cuerpo = _tablaInformes(filas || [], { admin: true }) + `
      <button type="button" data-sc-usuarios style="${_btnStyle('#0C8A5F','#fff')};margin-top:10px;width:100%;">Gestionar usuarios y códigos</button>`;
    _abrirOverlay('Panel de informes (todos)', cuerpo);
    _wireAccionesTabla({ admin: true });
    _overlayEl.querySelector('[data-sc-usuarios]').addEventListener('click', abrirGestionUsuarios);
  }

  async function abrirRegistroInformes() {
    const sesion = await _requiereSesion();
    if (!sesion) return;
    await mostrarEnPortada(sesion);
  }

  // Al abrir la PWA se solicita la sesión una sola vez. Si ya existe una
  // sesión válida en la caché, se conserva hasta que el usuario cierre sesión
  // y el Registro de Informes queda disponible directamente en la portada.
  async function iniciarSesionAutomatica() {
    const sesion = ScInformes.getSesionCache();
    if (sesion && sesion.usuario && ScInformes.getCodigo()) {
      await mostrarEnPortada(sesion);
      if (ScInformes.revisarBorradoresRemotos) await ScInformes.revisarBorradoresRemotos();
      return sesion;
    }
    const nuevaSesion = await _requiereSesion();
    if (nuevaSesion && ScInformes.revisarBorradoresRemotos) {
      await ScInformes.revisarBorradoresRemotos();
    }
    return nuevaSesion;
  }

  async function abrirGestionUsuarios() {
    _abrirOverlay('Usuarios y códigos', '<p style="font-size:.8rem;color:#6b7280;">Cargando…</p>');
    try {
      const usuarios = await ScInformes.listUsuarios();
      const filas = (usuarios || []).map(u => `<tr style="border-bottom:1px solid #F3F4F6;"><td style="padding:6px 4px;">${_esc(u.nombre)}</td><td style="padding:6px 4px;">${_esc(u.usuario || '—')}</td><td style="padding:6px 4px;">${_esc(u.rol)}</td><td style="padding:6px 4px;font-family:monospace;">${_esc(u.codigo_acceso)}</td><td style="padding:6px 4px;">Activo</td><td style="padding:6px 4px;">${u.id !== ScInformes.getSesionCache()?.id ? `<button type="button" data-sc-eliminar-usuario="${_esc(u.id)}" style="border:0;background:#FFF1F2;color:#B91C1C;border-radius:6px;padding:5px 8px;font-size:.72rem;font-weight:700;cursor:pointer;">Eliminar</button>` : '—'}</td></tr>`).join('');
      _abrirOverlay('Usuarios y códigos', `<div style="overflow:auto;"><table style="width:100%;border-collapse:collapse;font-size:.8rem;"><thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Código</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${filas || '<tr><td colspan="6">No hay usuarios</td></tr>'}</tbody></table></div><hr style="margin:16px 0;border:0;border-top:1px solid #E5E7EB;"><h3 style="font-size:.9rem;margin:0 0 10px;">Crear usuario</h3><label class="form-label" for="sc-new-nombre">Nombre y apellido</label><input class="form-input" id="sc-new-nombre" placeholder="Ej: Nuevo Profesional" style="width:100%;box-sizing:border-box;margin-bottom:8px;"><label class="form-label" for="sc-new-password">Contraseña numérica de 4 dígitos</label><input class="form-input" id="sc-new-password" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="Ej: 1234" style="width:100%;box-sizing:border-box;margin-bottom:10px;"><button type="button" data-sc-crear style="${_btnStyle('#1B4332','#fff')};width:100%;">Crear usuario y generar código</button>`);
      _overlayEl.querySelectorAll('[data-sc-eliminar-usuario]').forEach(btn => btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este usuario? Sus informes históricos se conservarán.')) return;
        try { await ScInformes.eliminarUsuario(btn.getAttribute('data-sc-eliminar-usuario')); await abrirGestionUsuarios(); }
        catch (e) { Router.toast(e.message || 'No se pudo eliminar el usuario'); }
      }));
      _overlayEl.querySelector('[data-sc-crear]').addEventListener('click', async () => {
        const d = { nombre: document.getElementById('sc-new-nombre').value.trim(), usuario: document.getElementById('sc-new-nombre').value.trim(), rol: 'tecnico', password: document.getElementById('sc-new-password').value };
        if (d.nombre.split(/\s+/).filter(Boolean).length < 2 || !/^\d{4}$/.test(d.password)) { Router.toast('Escribe nombre y apellido y una contraseña numérica de 4 dígitos'); return; }
        try { await ScInformes.crearUsuario(d); Router.toast('Usuario creado y código generado'); await abrirGestionUsuarios(); } catch (e) { Router.toast(e.message || 'No se pudo crear el usuario'); }
      });
    } catch (e) { _abrirOverlay('Usuarios y códigos', `<p role="alert" style="color:#b91c1c;">No se pudo cargar: ${_esc(e.message)}</p>`); }
  }

  return {
    abrirMisInformes,
    abrirAdmin,
    abrirRegistroInformes,
    abrirGestionUsuarios,
    mostrarEnPortada,
    iniciarSesionAutomatica,
    abrirCambiarPassword: _abrirCambiarPassword,
    cerrarSesion: _cerrarSesion,
  };
})();
