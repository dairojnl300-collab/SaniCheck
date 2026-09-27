// Notificaciones Web Push y pendientes de evidencia del Portal.
const PushNotifications = (() => {
  'use strict';

  const VAPID_PUBLIC_KEY = 'BL7WLPVdUTB8Zm7TyLp2xlrsxbsI8rr5533oczAlSP5eKd_ZPRGtEH6t5rc8vu4c9zk3fG947fi9kALWwzJt1vA';
  let porInforme = new Map();
  let total = 0;
  let refrescoEnCurso = null;
  let eventosConectados = false;
  const LAST_PUSH_KEY = 'sanicheck_push_last_received_at';
  let ultimoRpc = { estado: 'sin ejecutar', total: null, error: '' };

  function _idKey(value) { return String(value || '').trim().toLowerCase(); }

  function _esc(value) {
    return String(value || '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[ch]);
  }

  function _claveUint8Array(base64url) {
    const base64 = String(base64url).replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    return Uint8Array.from(atob(padded), caracter => caracter.charCodeAt(0));
  }

  function _codigoDisponible() {
    return typeof ScInformes !== 'undefined' && ScInformes.getCodigo && ScInformes.getCodigo();
  }

  function _mostrarConteo(el, cantidad) {
    if (!el) return;
    const n = Number(cantidad) || 0;
    el.textContent = n > 9 ? '9+' : String(n);
    el.hidden = n < 1;
    el.setAttribute('aria-label', `${n} evidencias por revisar`);
  }

  function _pintarConteos() {
    document.querySelectorAll('[data-push-informe-id]').forEach(el => {
      const n = porInforme.get(_idKey(el.getAttribute('data-push-informe-id')))?.pendientes || 0;
      _mostrarConteo(el, n);
    });
    const tab = document.querySelector('.phva-step[data-fase="V"] [data-push-tab-badge]');
    const inspeccion = typeof Store !== 'undefined' ? Store.getCurrentInspeccion() : null;
    _mostrarConteo(tab, inspeccion?.portal_informe_id ? porInforme.get(_idKey(inspeccion.portal_informe_id))?.pendientes : 0);
  }

  async function _actualizarBadgeOS(n) {
    if (typeof navigator === 'undefined') return;
    try {
      if (n > 0 && typeof navigator.setAppBadge === 'function') await navigator.setAppBadge(n);
      else if (n === 0 && typeof navigator.clearAppBadge === 'function') await navigator.clearAppBadge();
    } catch (error) {
      console.error('[Push] No se pudo actualizar el badge de la app', error);
    }
  }

  function refrescar() {
    if (refrescoEnCurso) return refrescoEnCurso;
    if (!_codigoDisponible() || typeof ScInformes.pushPendientes !== 'function') {
      ultimoRpc = { estado: 'error', total: null, error: 'Sin sesión o código de técnico' };
      _renderDiagnostico();
      return Promise.resolve(null);
    }
    refrescoEnCurso = ScInformes.pushPendientes().then(resultado => {
      if (!resultado || resultado.ok !== true) throw new Error(resultado?.error || 'No se pudieron consultar las evidencias pendientes');
      porInforme = new Map((resultado.informes || []).map(item => [_idKey(item.informe_id), {
        pendientes: Number(item.pendientes) || 0,
        aspectos: new Set((item.aspectos || []).map(String)),
      }]));
      total = Number(resultado.total) || 0;
      ultimoRpc = { estado: 'correcto', total, error: '' };
      _pintarConteos();
      _renderDiagnostico();
      return _actualizarBadgeOS(total).then(() => {
        window.dispatchEvent(new CustomEvent('sanicheck:pendientes-updated'));
        return { total, informes: porInforme };
      });
    }).catch(error => {
      ultimoRpc = { estado: 'error', total: null, error: error?.message || String(error) };
      _renderDiagnostico();
      console.error('[Push] No se pudieron actualizar los conteos de evidencia', error);
      throw error;
    }).finally(() => { refrescoEnCurso = null; });
    return refrescoEnCurso;
  }

  function pendientesDeInforme(informeId) {
    return porInforme.get(_idKey(informeId))?.pendientes || 0;
  }

  function aspectoPendiente(informeId, aspectoId) {
    return porInforme.get(_idKey(informeId))?.aspectos.has(String(aspectoId || '')) || false;
  }

  function badgeHtml(informeId) {
    return `<span data-push-informe-id="${_esc(informeId)}" class="push-count-badge" hidden aria-label="0 evidencias por revisar"></span>`;
  }

  function _conectarEventos() {
    if (eventosConectados || !('serviceWorker' in navigator)) return;
    eventosConectados = true;
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'SANICHECK_PUSH_RECEIVED') {
        _manejarPushRecibido(event.data).catch(error => console.error('[Push] Falló el manejo del push recibido', error));
      }
    });
    const refrescarVisible = () => {
      if (document.visibilityState === 'visible') {
        refrescar().catch(error => console.error('[Push] Falló la actualización al volver a primer plano', error));
      }
    };
    document.addEventListener('visibilitychange', refrescarVisible);
    window.addEventListener('focus', refrescarVisible);
    window.addEventListener('pageshow', refrescarVisible);
    window.addEventListener('sanicheck:pendientes-updated', () => {
      if (typeof Router !== 'undefined' && Router.current?.() === 'verificar' && typeof Verificar !== 'undefined') {
        Verificar.refrescarPendientes();
      }
    });
  }

  async function _manejarPushRecibido(data) {
    const recibido = data.received_at || new Date().toISOString();
    try { localStorage.setItem(LAST_PUSH_KEY, recibido); }
    catch (error) { console.error('[Push] No se pudo guardar la hora del último push', error); }
    _renderDiagnostico();
    if (Number.isFinite(Number(data.total_pendientes))) await _actualizarBadgeOS(Number(data.total_pendientes));

    if (data.informe_id && typeof ScInformes !== 'undefined' && typeof ScInformes.abrirInformeParaPush === 'function') {
      try {
        await ScInformes.abrirInformeParaPush(data.informe_id);
        Router.go('verificar');
        if (data.aspecto_id && typeof Verificar !== 'undefined') {
          requestAnimationFrame(() => requestAnimationFrame(() => Verificar.irAAspecto(data.aspecto_id)));
        }
      } catch (error) {
        console.error('[Push] No se pudo abrir el hallazgo notificado', error);
        if (typeof Router !== 'undefined' && Router.toast) Router.toast(error.message || 'No se pudo abrir el hallazgo notificado.');
      }
    }
    await refrescar();
  }

  async function _obtenerSuscripcion() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
    const registro = await navigator.serviceWorker.ready;
    return { registro, suscripcion: await registro.pushManager.getSubscription() };
  }

  async function activar() {
    if (!_codigoDisponible()) {
      Router.toast('Inicia sesión en Registro de Informes antes de activar notificaciones.');
      if (typeof ScInformesUI !== 'undefined') ScInformesUI.abrirRegistroInformes();
      return;
    }
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      Router.toast('Este navegador no admite notificaciones push.');
      return;
    }
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') {
        Router.toast(permiso === 'denied' ? 'Notificaciones bloqueadas. Las subidas del Portal seguirán funcionando.' : 'No se activaron las notificaciones.');
        actualizarAjustes();
        return;
      }
      const { registro } = await _obtenerSuscripcion();
      let suscripcion = await registro.pushManager.getSubscription();
      if (!suscripcion) {
        suscripcion = await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: _claveUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const datos = suscripcion.toJSON();
      const resultado = await ScInformes.pushRegistrar({
        endpoint: datos.endpoint,
        p256dh: datos.keys?.p256dh,
        auth: datos.keys?.auth,
      });
      if (!resultado?.ok) throw new Error(resultado?.error || 'No se pudo guardar la suscripción');
      Router.toast('Notificaciones activadas');
      await refrescar();
      actualizarAjustes();
    } catch (error) {
      console.error('[Push] No se pudo activar la suscripción', error);
      Router.toast(error.message || 'No se pudieron activar las notificaciones');
      actualizarAjustes();
    }
  }

  async function desactivar() {
    if (!_codigoDisponible()) return;
    try {
      const actual = await _obtenerSuscripcion();
      if (!actual?.suscripcion) return;
      const resultado = await ScInformes.pushBaja(actual.suscripcion.endpoint);
      if (!resultado?.ok) throw new Error(resultado?.error || 'No se pudo dar de baja la suscripción');
      await actual.suscripcion.unsubscribe();
      await refrescar();
      Router.toast('Notificaciones desactivadas');
      actualizarAjustes();
    } catch (error) {
      console.error('[Push] No se pudo desactivar la suscripción', error);
      Router.toast(error.message || 'No se pudieron desactivar las notificaciones');
    }
  }

  async function actualizarAjustes() {
    const contenedor = document.getElementById('push-settings-control');
    if (!contenedor) return;
    let permiso = 'default';
    let activa = false;
    try {
      permiso = 'Notification' in window ? Notification.permission : 'unsupported';
      const actual = await _obtenerSuscripcion();
      activa = !!actual?.suscripcion;
    } catch (error) {
      console.error('[Push] No se pudo leer el estado de la suscripción', error);
    }
    const accion = activa ? 'desactivar' : 'activar';
    const titulo = activa ? 'Desactivar notificaciones' : 'Activar notificaciones';
    const estado = permiso === 'denied'
      ? 'Permiso denegado. La carga de evidencias del Portal no se afecta.'
      : activa ? 'Recibirás un aviso cuando un cliente suba evidencia.' : 'El permiso se solicitará solo al tocar el botón.';
    contenedor.innerHTML = `<p style="margin:0 0 10px;color:var(--color-ink2);line-height:1.5;">${estado}</p><button type="button" class="btn ${activa ? 'btn-outline' : 'btn-primary'}" style="width:100%;min-height:44px;" onclick="PushNotifications.${accion}()">${titulo}</button>`;
    await _renderDiagnostico();
  }

  async function _renderDiagnostico() {
    const el = document.getElementById('push-diagnostic-control');
    if (!el) return;
    const versionApp = typeof AppVersion !== 'undefined' ? AppVersion.VERSION : 'No disponible';
    let swInfo = { version: 'No activo', swActive: false };
    let permiso = 'no compatible';
    let suscrita = 'No';
    try {
      if ('Notification' in window) permiso = Notification.permission;
      if ('serviceWorker' in navigator) {
        const registro = await navigator.serviceWorker.getRegistration();
        const worker = registro?.active || navigator.serviceWorker.controller;
        if (worker && typeof SwUpdate !== 'undefined') swInfo = await SwUpdate.getActiveInfo();
        const actual = await _obtenerSuscripcion();
        suscrita = actual?.suscripcion ? 'Sí' : 'No';
      }
    } catch (error) {
      console.error('[Push] No se pudo completar el diagnóstico', error);
    }
    let ultimoPush = 'Nunca';
    try {
      const valor = localStorage.getItem(LAST_PUSH_KEY);
      if (valor) ultimoPush = new Date(valor).toLocaleString('es-CO');
    } catch (error) { console.error('[Push] No se pudo leer la hora del último push', error); }
    const rpc = ultimoRpc.estado === 'correcto'
      ? `Correcto · ${ultimoRpc.total} pendientes`
      : ultimoRpc.estado === 'error' ? `Error · ${ultimoRpc.error}` : ultimoRpc.estado;
    const fila = (label, value) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:4px 0;"><span>${_esc(label)}</span><strong style="text-align:right;overflow-wrap:anywhere;">${_esc(value)}</strong></div>`;
    el.innerHTML = `<div style="border-top:1px solid var(--color-border);padding-top:10px;margin-top:12px;font-size:12px;line-height:1.45;"><strong>Diagnóstico de notificaciones (solo lectura)</strong>${fila('Versión de la app', versionApp)}${fila('Service Worker activo', swInfo.swActive ? swInfo.version : 'No activo')}${fila('Permiso', permiso)}${fila('Suscripción', suscrita)}${fila('Último push recibido', ultimoPush)}${fila('RPC de pendientes', rpc)}</div>`;
  }

  function iniciar() {
    _conectarEventos();
    refrescar().catch(error => console.error('[Push] Error al cargar los pendientes al iniciar', error));
  }

  return { iniciar, activar, desactivar, refrescar, actualizarAjustes, actualizarDiagnostico: _renderDiagnostico, pintarConteos: _pintarConteos, pendientesDeInforme, aspectoPendiente, badgeHtml };
})();
