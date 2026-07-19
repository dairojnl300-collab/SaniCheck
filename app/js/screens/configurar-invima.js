/**
 * configurar-invima.js — Modal Configurar INVIMA (6 categorías, ítems custom)
 */
const ConfigurarInvima = (() => {
  'use strict';

  let _cats = [];
  let _tab = 'cat_01';
  let _editId = null;

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _estId() {
    return (typeof PortalCliente !== 'undefined' && PortalCliente.getEstablecimientoId()) || 'local-pending';
  }

  async function _ensureBase() {
    const base = await InvimaCrud.loadBaseChecklist();
    _cats = base.categorias || [];
    InvimaCrud.getConfigINVIMA(_estId());
  }

  function _catLabel(id) {
    const c = _cats.find(x => x.id === id);
    if (!c) return id;
    const short = { cat_01: 'Edificación', cat_02: 'Saneamiento', cat_03: 'Personal',
      cat_04: 'Equipos', cat_05: 'Almacenamiento', cat_06: 'Verificación' };
    return short[id] || c.nombre.slice(0, 14);
  }

  function _itemsTab(catId) {
    return InvimaCrud.getConfigINVIMA(_estId()).filter(it => it.categoria_id === catId);
  }

  function _renderTable(catId) {
    const rows = _itemsTab(catId);
    if (!rows.length) {
      return '<p style="font-size:12px;color:var(--color-ink3);padding:8px 0;">Sin ítems en esta categoría.</p>';
    }
    return `
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:var(--color-brand);color:#fff;">
              <th style="padding:8px;text-align:left;">Código</th>
              <th style="padding:8px;text-align:left;">Nombre</th>
              <th style="padding:8px;text-align:left;">Normativa</th>
              <th style="padding:8px;text-align:center;">Custom</th>
              <th style="padding:8px;text-align:right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(it => {
              const ro = !it.custom;
              const bg = ro ? 'background:#f3f4f6;color:#6b7280;' : '';
              return `<tr style="border-bottom:1px solid var(--color-border);${bg}">
                <td style="padding:8px;font-weight:700;">${_esc(it.codigo)}</td>
                <td style="padding:8px;">${_esc(it.nombre)}</td>
                <td style="padding:8px;font-size:11px;">${_esc(it.normativa)}</td>
                <td style="padding:8px;text-align:center;">${it.custom ? '✓' : '—'}</td>
                <td style="padding:8px;text-align:right;white-space:nowrap;">
                  ${ro ? '' : `
                    <button type="button" class="btn btn-outline" style="padding:4px 8px;font-size:11px;margin-left:4px;"
                      onclick="ConfigurarInvima.editar('${_esc(it.id)}')">✏️</button>
                    <button type="button" class="btn btn-outline" style="padding:4px 8px;font-size:11px;margin-left:4px;color:var(--color-deficiente);"
                      onclick="ConfigurarInvima.eliminar('${_esc(it.id)}')">🗑️</button>`}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function _renderBody() {
    const r = InvimaCrud.resumen(_estId());
    return `
      <div style="font-size:12px;color:var(--color-ink3);margin-bottom:var(--sp-sm);padding:8px 12px;
        background:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;">
        <strong>${r.base}</strong> ítems normativos + <strong>${r.custom}</strong> ítems custom
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:var(--sp-sm);">
        ${_cats.map(c => `
          <button type="button" class="btn ${ _tab === c.id ? 'btn-accent' : 'btn-outline' }"
            style="padding:6px 10px;font-size:11px;flex:1;min-width:90px;"
            onclick="ConfigurarInvima.setTab('${_esc(c.id)}')">${_esc(_catLabel(c.id))}</button>
        `).join('')}
      </div>
      <div id="invima-tab-body">${_renderTable(_tab)}</div>
      <button type="button" class="btn btn-accent" style="width:100%;margin-top:var(--sp-sm);"
        onclick="ConfigurarInvima.agregar('${_esc(_tab)}')">➕ Agregar Custom</button>`;
  }

  function _ensureModal() {
    if (document.getElementById('invima-config-modal')) return;
    const el = document.createElement('div');
    el.id = 'invima-config-modal';
    el.style.cssText = 'display:none;position:fixed;inset:0;z-index:2100;align-items:center;justify-content:center;padding:var(--sp-md);';
    el.innerHTML = `
      <div onclick="ConfigurarInvima.cerrar()" style="position:absolute;inset:0;background:rgba(10,46,35,0.45);"></div>
      <div style="position:relative;width:100%;max-width:520px;background:var(--color-white);border-radius:var(--radius-md);
        box-shadow:var(--shadow-lg);padding:var(--sp-lg);border:1px solid var(--color-border);max-height:92vh;overflow-y:auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-md);">
          <div style="font-size:var(--text-md);font-weight:800;color:var(--color-brand);">⚙️ Configurar INVIMA</div>
          <button type="button" class="btn btn-outline" style="padding:4px 10px;" onclick="ConfigurarInvima.cerrar()">✕</button>
        </div>
        <div id="invima-config-body"></div>
      </div>`;
    document.body.appendChild(el);
  }

  function _ensureSubmodal() {
    if (document.getElementById('invima-item-submodal')) return;
    const el = document.createElement('div');
    el.id = 'invima-item-submodal';
    el.style.cssText = 'display:none;position:fixed;inset:0;z-index:2200;align-items:center;justify-content:center;padding:var(--sp-md);';
    el.innerHTML = `
      <div onclick="ConfigurarInvima.cerrarSub()" style="position:absolute;inset:0;background:rgba(10,46,35,0.55);"></div>
      <div style="position:relative;width:100%;max-width:400px;background:var(--color-white);border-radius:var(--radius-md);
        padding:var(--sp-lg);border:1px solid var(--color-border);">
        <div id="invima-sub-title" style="font-weight:700;margin-bottom:var(--sp-md);">Agregar ítem custom</div>
        <div class="form-group">
          <label class="form-label" for="invima-sub-codigo">Código</label>
          <input class="form-input" id="invima-sub-codigo" type="text" placeholder="Auto">
        </div>
        <div class="form-group">
          <label class="form-label" for="invima-sub-nombre">Nombre</label>
          <input class="form-input" id="invima-sub-nombre" type="text" placeholder="Aspecto a verificar">
        </div>
        <div class="form-group">
          <label class="form-label" for="invima-sub-norma">Normativa</label>
          <input class="form-input" id="invima-sub-norma" type="text" value="Local/ECODESA/Específico">
        </div>
        <div id="invima-sub-error" style="font-size:12px;color:var(--color-deficiente);min-height:16px;margin-bottom:8px;"></div>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn btn-outline" style="flex:1;" onclick="ConfigurarInvima.cerrarSub()">Cancelar</button>
          <button type="button" class="btn btn-primary" style="flex:1;" onclick="ConfigurarInvima.guardarSub()">Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(el);
  }

  function _refresh() {
    const body = document.getElementById('invima-config-body');
    if (body) body.innerHTML = _renderBody();
  }

  async function abrir() {
    await _ensureBase();
    _ensureModal();
    _ensureSubmodal();
    _tab = 'cat_01';
    _refresh();
    document.getElementById('invima-config-modal').style.display = 'flex';
  }

  function cerrar() {
    const m = document.getElementById('invima-config-modal');
    if (m) m.style.display = 'none';
  }

  function setTab(catId) {
    _tab = catId;
    _refresh();
  }

  function agregar(catId) {
    _editId = null;
    _tab = catId || _tab;
    _ensureSubmodal();
    document.getElementById('invima-sub-title').textContent = 'Agregar ítem custom';
    document.getElementById('invima-sub-codigo').value = '';
    document.getElementById('invima-sub-codigo').readOnly = false;
    document.getElementById('invima-sub-nombre').value = '';
    document.getElementById('invima-sub-norma').value = 'Local/ECODESA/Específico';
    document.getElementById('invima-sub-error').textContent = '';
    document.getElementById('invima-item-submodal').style.display = 'flex';
  }

  function editar(itemId) {
    const item = InvimaCrud.getConfigINVIMA(_estId()).find(it => it.id === itemId);
    if (!item || !item.custom) return;
    _editId = itemId;
    _tab = item.categoria_id;
    _ensureSubmodal();
    document.getElementById('invima-sub-title').textContent = 'Editar ítem custom';
    document.getElementById('invima-sub-codigo').value = item.codigo;
    document.getElementById('invima-sub-codigo').readOnly = true;
    document.getElementById('invima-sub-nombre').value = item.nombre;
    document.getElementById('invima-sub-norma').value = item.normativa || '';
    document.getElementById('invima-sub-error').textContent = '';
    document.getElementById('invima-item-submodal').style.display = 'flex';
  }

  function cerrarSub() {
    const m = document.getElementById('invima-item-submodal');
    if (m) m.style.display = 'none';
    _editId = null;
  }

  function guardarSub() {
    const err = document.getElementById('invima-sub-error');
    const nombre = document.getElementById('invima-sub-nombre').value.trim();
    const norma = document.getElementById('invima-sub-norma').value.trim();
    const codigo = document.getElementById('invima-sub-codigo').value.trim();
    try {
      if (_editId) {
        InvimaCrud.editarItem(_editId, nombre, norma, _estId());
        Router.toast('Ítem actualizado');
      } else {
        InvimaCrud.agregarItem(_tab, nombre, norma, null, _estId(), codigo || undefined);
        Router.toast('Ítem custom agregado');
      }
      cerrarSub();
      _refresh();
    } catch (e) {
      if (err) err.textContent = e.message || 'Error al guardar';
    }
  }

  function eliminar(itemId) {
    const item = InvimaCrud.getConfigINVIMA(_estId()).find(it => it.id === itemId);
    if (!item) return;
    if (!confirm('¿Eliminar ítem custom "' + item.nombre + '"?')) return;
    try {
      InvimaCrud.eliminarItem(itemId, _estId());
      Router.toast('Ítem eliminado');
      _refresh();
    } catch (e) {
      Router.toast(e.message || 'No se pudo eliminar', 'error');
    }
  }

  function resumenTexto() {
    const r = InvimaCrud.resumen(_estId());
    return `INVIMA: ${r.base || 48} base + ${r.custom} custom`;
  }

  return { abrir, cerrar, setTab, agregar, editar, eliminar, cerrarSub, guardarSub, resumenTexto };
})();
