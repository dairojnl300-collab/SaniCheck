/**
 * vencimientos-dashboard.js — UI dashboard Vencimientos v2 (tabs, tabla, modal CRUD)
 */
const VencimientosDashboard = (() => {
  'use strict';

  let _tab = 'personal';
  let _establecimientoId = '';
  let _onRefresh = null;

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function loadDashboard(establecimientoId, onRefresh) {
    _establecimientoId = establecimientoId || '';
    _onRefresh = typeof onRefresh === 'function' ? onRefresh : null;
    await VencimientosV2.loadCatalog();
    if (_establecimientoId && typeof PortalCliente !== 'undefined' && PortalCliente.isActivo()) {
      try {
        await VencimientosV2.fetchFromSupabase(_establecimientoId);
      } catch (e) {
        console.warn('[VencimientosDashboard] fetch remoto', e);
      }
    }
    refresh();
  }

  function refresh() {
    if (_onRefresh) _onRefresh();
  }

  function setTab(tab) {
    _tab = tab || 'personal';
    refresh();
  }

  function getTab() {
    return _tab;
  }

  function renderSection() {
    const esc = _esc;
    const cat = VencimientosV2.getCatalog();
    const v2Tab = _tab;

    return `
      ${VencimientosV2.renderDashboard(esc)}
      <div style="display:flex;gap:8px;margin-bottom:var(--sp-md);flex-wrap:wrap;align-items:center;">
        ${['personal', 'equipos', 'establecimiento'].map(g => {
          const active = g === v2Tab;
          const label = cat.categorias[g]?.label || g;
          return `<button type="button" data-p-act="vencV2Tab" data-p-tab="${g}"
            style="flex:1;min-width:90px;padding:12px 10px;border-radius:var(--radius-md);cursor:pointer;
              border:2px solid ${active ? 'var(--color-accent)' : 'var(--emerald-2)'};
              background:${active ? 'var(--emerald-2)' : 'var(--emerald)'};
              font-size:var(--text-sm);font-weight:${active ? 700 : 600};color:#fff;">${label}</button>`;
        }).join('')}
        <button type="button" data-p-act="v2RefreshDashboard" class="btn btn-outline"
          style="padding:8px 12px;font-size:11px;white-space:nowrap;">Actualizar</button>
      </div>
      <div style="border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;margin-bottom:var(--sp-md);">
        <div style="background:var(--emerald-2);color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <div style="font-size:var(--text-sm);font-weight:700;">Documentos · ${esc(cat.categorias[v2Tab]?.label || v2Tab)}</div>
          <button type="button" data-p-act="v2AbrirModal" style="padding:6px 12px;border:none;border-radius:var(--radius-md);
            background:#fff;color:var(--emerald-2);font-size:11px;font-weight:700;cursor:pointer;">+ Agregar Documento</button>
        </div>
        <div id="v2-tabla-wrap" style="overflow-x:auto;">${VencimientosV2.renderTabla(v2Tab, esc)}</div>
      </div>`;
  }

  function abrirModal(editId) {
    const overlay = document.createElement('div');
    overlay.innerHTML = VencimientosV2.renderModal(_esc, editId);
    document.body.appendChild(overlay.firstElementChild);
    const edit = editId ? VencimientosV2.obtenerVencimientos().find(it => it.id === editId) : null;
    const catEl = document.getElementById('v2-categoria');
    if (catEl && edit) {
      catEl.disabled = true;
      catEl.value = edit.categoria;
    }
    const tipoEl = document.getElementById('v2-tipo');
    if (tipoEl && edit) {
      tipoEl.disabled = true;
    }
    const cat = catEl?.value || _tab;
    VencimientosV2.populateTipoSelect(cat, edit ? edit.tipo : null);
    catEl?.addEventListener('change', e => {
      if (!editId) VencimientosV2.populateTipoSelect(e.target.value);
    });
  }

  function _showModalError(msg) {
    const el = document.getElementById('v2-modal-error');
    if (el) el.textContent = msg || '';
    else if (msg && typeof Router !== 'undefined') Router.toast(msg);
  }

  function cerrarModal() {
    document.getElementById('v2-modal-overlay')?.remove();
  }

  async function guardarModal(editId) {
    try {
      _showModalError('');
      const payload = VencimientosV2.readModalPayload();
      const file = document.getElementById('v2-archivo')?.files?.[0] || null;
      VencimientosV2.validateData(payload, file, !!editId, editId);
      if (editId) {
        VencimientosV2.editarVencimiento(editId, payload, file);
        if (typeof Router !== 'undefined') Router.toast('Documento actualizado');
      } else {
        payload.establecimiento_id = _establecimientoId;
        VencimientosV2.guardarVencimiento(payload, file);
        if (typeof Router !== 'undefined') Router.toast('Documento guardado');
      }
      cerrarModal();
      refresh();
    } catch (e) {
      _showModalError(e.message || 'Error al guardar');
      if (typeof Router !== 'undefined') Router.toast(e.message || 'Error al guardar');
      throw e;
    }
  }

  async function descargar(id) {
    await VencimientosV2.descargarDocumento(id);
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este documento y su archivo en Storage?')) return;
    await VencimientosV2.eliminarVencimiento(id);
    if (typeof Router !== 'undefined') Router.toast('Documento eliminado');
    refresh();
  }

  function reemplazar(id) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.webp';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        VencimientosV2.validateData({}, file, true, id);
        VencimientosV2.editarVencimiento(id, {}, file);
        if (typeof Router !== 'undefined') Router.toast('Archivo reemplazado');
        refresh();
      } catch (e) {
        if (typeof Router !== 'undefined') Router.toast(e.message);
      }
    };
    input.click();
  }

  function handleAction(act, el) {
    switch (act) {
      case 'vencV2Tab':
        setTab(el.getAttribute('data-p-tab') || 'personal');
        break;
      case 'v2RefreshDashboard':
        loadDashboard(_establecimientoId, _onRefresh).catch(() => refresh());
        break;
      case 'v2AbrirModal':
        abrirModal('');
        break;
      case 'v2CerrarModal':
        cerrarModal();
        break;
      case 'v2GuardarModal':
        guardarModal(el.getAttribute('data-p-edit') || '').catch(e => {
          if (typeof Router !== 'undefined') Router.toast(e.message || 'Error al guardar');
        });
        break;
      case 'v2Descargar':
        descargar(el.getAttribute('data-p-id') || '').catch(e => {
          if (typeof Router !== 'undefined') Router.toast(e.message || 'Error al descargar');
        });
        break;
      case 'v2Editar':
        abrirModal(el.getAttribute('data-p-id') || '');
        break;
      case 'v2Eliminar':
        eliminar(el.getAttribute('data-p-id') || '').catch(e => {
          if (typeof Router !== 'undefined') Router.toast(e.message || 'Error al eliminar');
        });
        break;
      case 'v2Reemplazar':
        reemplazar(el.getAttribute('data-p-id') || '');
        break;
      default:
        return false;
    }
    return true;
  }

  return {
    loadDashboard,
    refresh,
    setTab,
    getTab,
    renderSection,
    abrirModal,
    cerrarModal,
    guardarModal,
    handleAction,
  };
})();
