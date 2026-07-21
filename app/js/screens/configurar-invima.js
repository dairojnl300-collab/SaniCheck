/**
 * configurar-invima.js — Modal INVIMA: Configurar (CRUD) + Evaluar (A/AR/I/NA)
 */
const ConfigurarInvima = (() => {
  'use strict';

  let _cats = [];
  let _meta = null;
  let _tab = 'cat_01';
  let _mode = 'config';
  let _editId = null;
  let _openDesc = {};

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
    _meta = {
      escala: base.escala,
      clasificacion: base.clasificacion,
      categorias: _cats,
      leyenda: base.meta?.escala_leyenda || {},
    };
    InvimaCrud.getConfigINVIMA(_estId());
  }

  function _catLabel(id, idx) {
    const c = _cats.find(x => x.id === id);
    if (!c) return id;
    const short = { cat_01: 'Edificación', cat_02: 'Equipos', cat_03: 'Personal',
      cat_04: 'Req. higiénicos', cat_05: 'Saneamiento', cat_06: 'Verificación' };
    const name = short[id] || c.nombre.slice(0, 14);
    const n = typeof idx === 'number' && idx >= 0 ? idx + 1 : _cats.findIndex(x => x.id === id) + 1;
    return n + '. ' + name;
  }

  function _itemsTab(catId) {
    return InvimaCrud.getConfigINVIMA(_estId()).filter(it => it.categoria_id === catId);
  }

  function _calcLive() {
    if (!_meta || typeof InvimaScoring === 'undefined') return null;
    const ev = InvimaScoring.getEvaluacion(_estId());
    return InvimaScoring.calcularPuntaje(ev.respuestas, _meta, _estId());
  }

  function _renderScorePanel() {
    const r = _calcLive();
    if (!r) return '';
    const sem = InvimaScoring.semaforo(r.clasificacion);
    const answered = (r.itemsDetalle || []).filter(it => it.respuesta).length;
    const total = (r.itemsDetalle || []).length;
    return `
      <div style="text-align:center;padding:var(--sp-sm) 0 var(--sp-md);border-bottom:1px solid var(--color-border);margin-bottom:var(--sp-sm);">
        ${InvimaScoring.gaugeSvg(r.puntajeTotal, sem.color)}
        <div style="margin-top:4px;display:inline-block;padding:6px 14px;border-radius:999px;background:${sem.bg};color:${sem.color};font-weight:800;font-size:12px;">
          ${_esc(r.clasificacion)}
        </div>
        <div style="font-size:11px;color:var(--color-ink3);margin-top:6px;">${answered} de ${total} ítems evaluados</div>
      </div>`;
  }

  function _renderModeSwitch() {
    return `
      <div style="display:flex;gap:6px;margin-bottom:var(--sp-sm);">
        <button type="button" class="btn ${_mode === 'config' ? 'btn-accent' : 'btn-outline'}" style="flex:1;padding:8px;font-size:12px;"
          onclick="ConfigurarInvima.setMode('config')">⚙️ Configurar</button>
        <button type="button" class="btn ${_mode === 'eval' ? 'btn-accent' : 'btn-outline'}" style="flex:1;padding:8px;font-size:12px;"
          onclick="ConfigurarInvima.setMode('eval')">📋 Evaluar</button>
      </div>`;
  }

  function _baseItemCount() {
    return _cats.reduce((n, c) => n + ((c.items && c.items.length) || 0), 0);
  }

  function _renderCatTabs() {
    return `
      <div class="invima-cat-grid">
        ${_cats.map((c, i) => `
          <button type="button" class="btn invima-cat-btn ${ _tab === c.id ? 'btn-accent' : 'btn-outline' }"
            onclick="ConfigurarInvima.setTab('${_esc(c.id)}')">${_esc(_catLabel(c.id, i))}</button>
        `).join('')}
      </div>`;
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
              <th style="padding:8px;text-align:center;">Complementaria</th>
              <th style="padding:8px;text-align:right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(it => {
              const ro = !it.esComplementaria;
              const bg = ro ? 'background:#f3f4f6;color:#6b7280;' : '';
              return `<tr style="border-bottom:1px solid var(--color-border);${bg}">
                <td style="padding:8px;font-weight:700;">${_esc(it.codigo)}</td>
                <td style="padding:8px;">${_esc(it.nombre)}</td>
                <td style="padding:8px;font-size:11px;">${_esc(it.normativa)}</td>
                <td style="padding:8px;text-align:center;">${it.esComplementaria ? '✓' : '—'}</td>
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

  function _evalBtn(itemId, val, label, color, current) {
    const on = current === val;
    return `<button type="button" onclick="ConfigurarInvima.setEvalResp('${_esc(itemId)}','${val}')"
      style="flex:1;padding:7px 4px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;
        border:1.5px solid ${on ? color : 'var(--color-border)'};
        background:${on ? color : 'transparent'};
        color:${on ? '#fff' : 'var(--color-ink2)'};">${label}</button>`;
  }

  function _renderEvalItem(it) {
    const ev = InvimaScoring.getEvaluacion(_estId());
    const resp = ev.respuestas[it.id] || '';
    const hall = ev.hallazgos[it.id] || '';
    const needHall = InvimaScoring.requiereHallazgo(resp);
    const descKey = it.id;
    const descOpen = !!_openDesc[descKey];
    const desc = it.descripcion || '';
    return `
      <div style="padding:12px 0;border-bottom:1px dashed var(--color-border);">
        <div style="font-size:13px;font-weight:700;color:var(--color-ink);">${_esc(it.codigo)} · ${_esc(it.nombre)}
          ${it.esComplementaria ? '<span class="badge-complementaria-invima">Complementaria</span>' : ''}
        </div>
        ${desc || it.normativa ? `
          <button type="button" onclick="ConfigurarInvima.toggleEvalDesc('${_esc(descKey)}')"
            style="margin-top:4px;background:none;border:0;padding:0;font-size:11px;color:var(--color-accent);cursor:pointer;font-weight:600;">
            ${descOpen ? 'Ocultar' : 'Ver'} criterio / normativa</button>
          <div id="invima-desc-${_esc(descKey)}" style="display:${descOpen ? 'block' : 'none'};margin-top:8px;padding:10px 12px;background:rgba(27,67,50,0.04);border-radius:8px;font-size:11px;color:var(--color-ink2);line-height:1.5;">
            ${it.normativa ? `<div style="font-weight:700;color:var(--color-brand);margin-bottom:4px;">Normativa</div><div>${_esc(it.normativa)}</div>` : ''}
            ${desc ? `<div style="font-weight:700;color:var(--color-brand);margin:8px 0 4px;">Criterio</div><div style="white-space:pre-wrap;">${_esc(desc)}</div>` : ''}
          </div>` : ''}
        <div style="display:flex;gap:5px;margin-top:10px;">
          ${_evalBtn(it.id, 'A', 'A', '#065F46', resp)}
          ${_evalBtn(it.id, 'AR', 'AR', '#B45309', resp)}
          ${_evalBtn(it.id, 'I', 'I', '#991B1B', resp)}
          ${_evalBtn(it.id, 'NA', 'N/A', '#475569', resp)}
        </div>
        ${needHall ? `
          <label style="display:block;font-size:11px;font-weight:700;color:#92400E;margin:10px 0 4px;">
            Hallazgo / justificación (obligatorio)</label>
          <textarea class="form-input" rows="2" style="resize:vertical;font-size:12px;"
            placeholder="${resp === 'NA' ? 'Justifique por qué no aplica…' : 'Describa el hallazgo observado…'}"
            oninput="ConfigurarInvima.setEvalHallazgo('${_esc(it.id)}', this.value)">${_esc(hall)}</textarea>
        ` : ''}
      </div>`;
  }

  function _renderEvalBody() {
    const leyenda = _meta?.leyenda || {};
    const rows = _itemsTab(_tab);
    const cat = _cats.find(c => c.id === _tab);
    return `
      ${_renderScorePanel()}
      <div style="background:rgba(82,183,136,0.1);border:1px solid rgba(82,183,136,0.35);border-radius:8px;
        padding:10px 12px;margin-bottom:var(--sp-sm);font-size:11px;color:var(--color-ink2);line-height:1.5;">
        <strong style="color:var(--color-brand);">Escala:</strong>
        <b>A</b> ${_esc(leyenda.A || 'Aceptable')} ·
        <b>AR</b> ${_esc(leyenda.AR || 'Aceptable con requerimiento')} ·
        <b>I</b> ${_esc(leyenda.I || 'Inaceptable')} ·
        <b>N/A</b> calificar como A con justificación
      </div>
      ${_renderCatTabs()}
      ${cat ? `<div style="font-size:11px;color:var(--color-ink3);margin-bottom:8px;">Peso categoría: <strong>${cat.peso}%</strong> · ${rows.length} ítem(s)</div>` : ''}
      <div id="invima-eval-list">
        ${rows.length ? rows.map(it => _renderEvalItem(it)).join('') : '<p style="font-size:12px;color:var(--color-ink3);">Sin ítems.</p>'}
      </div>`;
  }

  function _renderConfigBody() {
    const r = InvimaCrud.resumen(_estId());
    const baseNorm = _baseItemCount() || 28;
    return `
      <div style="font-size:12px;color:var(--color-ink3);margin-bottom:var(--sp-sm);padding:8px 12px;
        background:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;">
        <strong>${baseNorm}</strong> ítems normativos + <strong>${r.complementaria}</strong> verificaciones complementarias
      </div>
      ${_renderCatTabs()}
      <div id="invima-tab-body">${_renderTable(_tab)}</div>
      <button type="button" class="btn btn-accent" style="width:100%;margin-top:var(--sp-sm);"
        onclick="ConfigurarInvima.agregar('${_esc(_tab)}')">➕ Agregar verificación complementaria</button>`;
  }

  function _renderBody() {
    return _mode === 'eval' ? _renderEvalBody() : _renderConfigBody();
  }

  function _ensureModal() {
    if (document.getElementById('invima-config-modal')) return;
    const el = document.createElement('div');
    el.id = 'invima-config-modal';
    el.style.cssText = 'display:none;position:fixed;inset:0;z-index:2100;align-items:center;justify-content:center;padding:var(--sp-md);';
    el.innerHTML = `
      <div onclick="ConfigurarInvima.cerrar()" style="position:absolute;inset:0;background:rgba(10,46,35,0.45);"></div>
      <div id="invima-config-panel" style="position:relative;width:100%;max-width:520px;background:var(--color-white);border-radius:var(--radius-md);
        box-shadow:var(--shadow-lg);padding:var(--sp-lg);border:1px solid var(--color-border);max-height:92vh;overflow-y:auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-sm);">
          <div style="font-size:var(--text-md);font-weight:800;color:var(--color-brand);">Simulador INVIMA</div>
          <button type="button" class="btn btn-outline" style="padding:4px 10px;" onclick="ConfigurarInvima.cerrar()">✕</button>
        </div>
        <div id="invima-mode-switch"></div>
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
        <div id="invima-sub-title" style="font-weight:700;margin-bottom:var(--sp-md);">Agregar verificación complementaria</div>
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
    const modeEl = document.getElementById('invima-mode-switch');
    if (modeEl) modeEl.innerHTML = _renderModeSwitch();
    const body = document.getElementById('invima-config-body');
    if (body) body.innerHTML = _renderBody();
    const panel = document.getElementById('invima-config-panel');
    if (panel) panel.style.maxWidth = _mode === 'eval' ? '560px' : '520px';
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

  function setMode(mode) {
    _mode = mode === 'eval' ? 'eval' : 'config';
    _refresh();
  }

  function setTab(catId) {
    _tab = catId;
    _refresh();
  }

  function setEvalResp(itemId, resp) {
    InvimaScoring.setRespuesta(itemId, resp, _estId());
    _refresh();
  }

  function setEvalHallazgo(itemId, text) {
    InvimaScoring.setHallazgo(itemId, text, _estId());
  }

  function toggleEvalDesc(itemId) {
    _openDesc[itemId] = !_openDesc[itemId];
    _refresh();
  }

  function agregar(catId) {
    _editId = null;
    _tab = catId || _tab;
    _ensureSubmodal();
    document.getElementById('invima-sub-title').textContent = 'Agregar verificación complementaria';
    document.getElementById('invima-sub-codigo').value = '';
    document.getElementById('invima-sub-codigo').readOnly = false;
    document.getElementById('invima-sub-nombre').value = '';
    document.getElementById('invima-sub-norma').value = 'Local/ECODESA/Específico';
    document.getElementById('invima-sub-error').textContent = '';
    document.getElementById('invima-item-submodal').style.display = 'flex';
  }

  function editar(itemId) {
    const item = InvimaCrud.getConfigINVIMA(_estId()).find(it => it.id === itemId);
    if (!item || !item.esComplementaria) return;
    _editId = itemId;
    _tab = item.categoria_id;
    _ensureSubmodal();
    document.getElementById('invima-sub-title').textContent = 'Editar verificación complementaria';
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
        Router.toast('Ítem complementaria agregada');
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
    if (!confirm('¿Eliminar verificación complementaria "' + item.nombre + '"?')) return;
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
    return `INVIMA: ${r.base} normativos + ${r.complementaria} complementarias`;
  }

  return {
    abrir, cerrar, setMode, setTab, agregar, editar, eliminar, cerrarSub, guardarSub, resumenTexto,
    setEvalResp, setEvalHallazgo, toggleEvalDesc,
  };
})();
