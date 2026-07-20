/**
 * configurar-perfil-rapido.js — Perfil Sanitario Inicial: CRUD selección + Evaluar A/AR/I/NA
 * Vista filtrada de invima_config (en_perfil_rapido).
 */
const ConfigurarPerfilRapido = (() => {
  'use strict';

  let _meta = null;
  let _mode = 'eval';
  let _editId = null;
  let _openDesc = {};
  let _pickOpen = false;

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _estId() {
    return (typeof PortalCliente !== 'undefined' && PortalCliente.getEstablecimientoId()) || 'local-pending';
  }

  async function _ensureBase() {
    const base = await InvimaCrud.loadBaseChecklist();
    _meta = {
      escala: base.escala,
      clasificacion: base.clasificacion,
      leyenda: base.meta?.escala_leyenda || {},
    };
    InvimaCrud.getConfigINVIMA(_estId());
  }

  function _notifyParent() {
    if (typeof Planificar !== 'undefined' && Planificar.refreshPerfilCard) {
      Planificar.refreshPerfilCard();
    }
  }

  function _calcLive() {
    if (!_meta || typeof InvimaScoring === 'undefined') return null;
    const ev = InvimaScoring.getEvaluacion(_estId());
    return InvimaScoring.calcularPerfilRapido(ev.respuestas, _meta, _estId());
  }

  function _renderScorePanel() {
    const r = _calcLive();
    if (!r) return '';
    const sem = InvimaScoring.semaforo(r.clasificacion);
    const answered = (r.itemsDetalle || []).filter(it => it.respuesta).length;
    const total = r.numItems || (r.itemsDetalle || []).length;
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
          onclick="ConfigurarPerfilRapido.setMode('config')">⚙️ Configurar</button>
        <button type="button" class="btn ${_mode === 'eval' ? 'btn-accent' : 'btn-outline'}" style="flex:1;padding:8px;font-size:12px;"
          onclick="ConfigurarPerfilRapido.setMode('eval')">📋 Evaluar</button>
      </div>`;
  }

  function _renderConfigTable() {
    const rows = InvimaCrud.getPerfilRapido(_estId());
    if (!rows.length) {
      return '<p style="font-size:12px;color:var(--color-ink3);padding:8px 0;">Sin ítems en el perfil rápido.</p>';
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
            ${rows.map(it => `
              <tr style="border-bottom:1px solid var(--color-border);${it.custom ? '' : 'background:#f3f4f6;color:#6b7280;'}">
                <td style="padding:8px;font-weight:700;">${_esc(it.codigo)}</td>
                <td style="padding:8px;">${_esc(it.nombre)}</td>
                <td style="padding:8px;font-size:11px;">${_esc(it.normativa)}</td>
                <td style="padding:8px;text-align:center;">${it.custom ? '✓' : '—'}</td>
                <td style="padding:8px;text-align:right;white-space:nowrap;">
                  ${it.custom ? `
                    <button type="button" class="btn btn-outline" style="padding:4px 8px;font-size:11px;margin-left:4px;"
                      onclick="ConfigurarPerfilRapido.editar('${_esc(it.id)}')">✏️</button>` : ''}
                  <button type="button" class="btn btn-outline" style="padding:4px 8px;font-size:11px;margin-left:4px;color:var(--color-deficiente);"
                    onclick="ConfigurarPerfilRapido.quitar('${_esc(it.id)}')">🗑️</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function _evalBtn(itemId, val, label, color, current) {
    const on = current === val;
    return `<button type="button" onclick="ConfigurarPerfilRapido.setEvalResp('${_esc(itemId)}','${val}')"
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
          ${it.custom ? '<span style="font-size:10px;color:var(--color-accent);margin-left:4px;">custom</span>' : ''}
        </div>
        ${desc || it.normativa ? `
          <button type="button" onclick="ConfigurarPerfilRapido.toggleEvalDesc('${_esc(descKey)}')"
            style="margin-top:4px;background:none;border:0;padding:0;font-size:11px;color:var(--color-accent);cursor:pointer;font-weight:600;">
            ${descOpen ? 'Ocultar' : 'Ver'} criterio / normativa</button>
          <div id="perfil-desc-${_esc(descKey)}" style="display:${descOpen ? 'block' : 'none'};margin-top:8px;padding:10px 12px;background:rgba(27,67,50,0.04);border-radius:8px;font-size:11px;color:var(--color-ink2);line-height:1.5;">
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
            oninput="ConfigurarPerfilRapido.setEvalHallazgo('${_esc(it.id)}', this.value)">${_esc(hall)}</textarea>
        ` : ''}
      </div>`;
  }

  function _renderEvalBody() {
    const leyenda = _meta?.leyenda || {};
    const rows = InvimaCrud.getPerfilRapido(_estId());
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
      <div style="font-size:11px;color:var(--color-ink3);margin-bottom:8px;">
        <strong>${rows.length}</strong> ítem(s) en perfil rápido · selección editable en Configurar
      </div>
      <div id="perfil-eval-list">
        ${rows.length ? rows.map(it => _renderEvalItem(it)).join('') : '<p style="font-size:12px;color:var(--color-ink3);">Sin ítems.</p>'}
      </div>`;
  }

  function _renderConfigBody() {
    const n = InvimaCrud.getPerfilRapido(_estId()).length;
    return `
      <div style="font-size:12px;color:var(--color-ink3);margin-bottom:var(--sp-sm);padding:8px 12px;
        background:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;">
        Perfil rápido: <strong>${n}</strong> ítem(s) seleccionado(s). Mínimo 1. Los ítems normativos quitados siguen en el checklist INVIMA completo.
      </div>
      <div id="perfil-tab-body">${_renderConfigTable()}</div>
      <button type="button" class="btn btn-outline" style="width:100%;margin-top:var(--sp-sm);"
        onclick="ConfigurarPerfilRapido.abrirPicker()">➕ Agregar desde checklist</button>
      <button type="button" class="btn btn-accent" style="width:100%;margin-top:6px;"
        onclick="ConfigurarPerfilRapido.agregarCustom()">➕ Agregar custom</button>`;
  }

  function _renderBody() {
    return _mode === 'eval' ? _renderEvalBody() : _renderConfigBody();
  }

  function _ensureModal() {
    if (document.getElementById('perfil-rapido-modal')) return;
    const el = document.createElement('div');
    el.id = 'perfil-rapido-modal';
    el.style.cssText = 'display:none;position:fixed;inset:0;z-index:2100;align-items:center;justify-content:center;padding:var(--sp-md);';
    el.innerHTML = `
      <div onclick="ConfigurarPerfilRapido.cerrar()" style="position:absolute;inset:0;background:rgba(10,46,35,0.45);"></div>
      <div id="perfil-rapido-panel" style="position:relative;width:100%;max-width:560px;background:var(--color-white);border-radius:var(--radius-md);
        box-shadow:var(--shadow-lg);padding:var(--sp-lg);border:1px solid var(--color-border);max-height:92vh;overflow-y:auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-sm);">
          <div style="font-size:var(--text-md);font-weight:800;color:var(--color-brand);">Perfil Sanitario Inicial</div>
          <button type="button" class="btn btn-outline" style="padding:4px 10px;" onclick="ConfigurarPerfilRapido.cerrar()">✕</button>
        </div>
        <div id="perfil-mode-switch"></div>
        <div id="perfil-rapido-body"></div>
      </div>`;
    document.body.appendChild(el);
  }

  function _ensureSubmodal() {
    if (document.getElementById('perfil-item-submodal')) return;
    const el = document.createElement('div');
    el.id = 'perfil-item-submodal';
    el.style.cssText = 'display:none;position:fixed;inset:0;z-index:2200;align-items:center;justify-content:center;padding:var(--sp-md);';
    el.innerHTML = `
      <div onclick="ConfigurarPerfilRapido.cerrarSub()" style="position:absolute;inset:0;background:rgba(10,46,35,0.55);"></div>
      <div style="position:relative;width:100%;max-width:400px;background:var(--color-white);border-radius:var(--radius-md);
        padding:var(--sp-lg);border:1px solid var(--color-border);">
        <div id="perfil-sub-title" style="font-weight:700;margin-bottom:var(--sp-md);">Agregar ítem custom</div>
        <div class="form-group">
          <label class="form-label" for="perfil-sub-codigo">Código</label>
          <input class="form-input" id="perfil-sub-codigo" type="text" placeholder="Auto">
        </div>
        <div class="form-group">
          <label class="form-label" for="perfil-sub-nombre">Nombre</label>
          <input class="form-input" id="perfil-sub-nombre" type="text" placeholder="Aspecto a verificar">
        </div>
        <div class="form-group">
          <label class="form-label" for="perfil-sub-norma">Normativa</label>
          <input class="form-input" id="perfil-sub-norma" type="text" value="Local/ECODESA/Específico">
        </div>
        <div id="perfil-sub-error" style="font-size:12px;color:var(--color-deficiente);min-height:16px;margin-bottom:8px;"></div>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn btn-outline" style="flex:1;" onclick="ConfigurarPerfilRapido.cerrarSub()">Cancelar</button>
          <button type="button" class="btn btn-primary" style="flex:1;" onclick="ConfigurarPerfilRapido.guardarSub()">Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(el);
  }

  function _ensurePicker() {
    if (document.getElementById('perfil-picker-modal')) return;
    const el = document.createElement('div');
    el.id = 'perfil-picker-modal';
    el.style.cssText = 'display:none;position:fixed;inset:0;z-index:2250;align-items:center;justify-content:center;padding:var(--sp-md);';
    el.innerHTML = `
      <div onclick="ConfigurarPerfilRapido.cerrarPicker()" style="position:absolute;inset:0;background:rgba(10,46,35,0.55);"></div>
      <div style="position:relative;width:100%;max-width:420px;background:var(--color-white);border-radius:var(--radius-md);
        padding:var(--sp-lg);border:1px solid var(--color-border);max-height:85vh;overflow-y:auto;">
        <div style="font-weight:700;margin-bottom:var(--sp-md);">Agregar ítem al perfil rápido</div>
        <div id="perfil-picker-list"></div>
        <button type="button" class="btn btn-outline" style="width:100%;margin-top:var(--sp-sm);" onclick="ConfigurarPerfilRapido.cerrarPicker()">Cerrar</button>
      </div>`;
    document.body.appendChild(el);
  }

  function _refresh() {
    const modeEl = document.getElementById('perfil-mode-switch');
    if (modeEl) modeEl.innerHTML = _renderModeSwitch();
    const body = document.getElementById('perfil-rapido-body');
    if (body) body.innerHTML = _renderBody();
  }

  async function abrir(mode) {
    await _ensureBase();
    _ensureModal();
    _ensureSubmodal();
    _ensurePicker();
    if (mode === 'config' || mode === 'eval') _mode = mode;
    _refresh();
    document.getElementById('perfil-rapido-modal').style.display = 'flex';
  }

  function cerrar() {
    const m = document.getElementById('perfil-rapido-modal');
    if (m) m.style.display = 'none';
    _notifyParent();
  }

  function setMode(mode) {
    _mode = mode === 'config' ? 'config' : 'eval';
    _refresh();
  }

  function setEvalResp(itemId, resp) {
    InvimaScoring.setRespuesta(itemId, resp, _estId());
    _refresh();
    _notifyParent();
  }

  function setEvalHallazgo(itemId, text) {
    InvimaScoring.setHallazgo(itemId, text, _estId());
  }

  function toggleEvalDesc(itemId) {
    _openDesc[itemId] = !_openDesc[itemId];
    _refresh();
  }

  function quitar(itemId) {
    try {
      InvimaCrud.quitarDelPerfil(itemId, _estId());
      Router.toast('Ítem quitado del perfil');
      _refresh();
      _notifyParent();
    } catch (e) {
      Router.toast(e.message || 'No se pudo quitar', 'error');
    }
  }

  function abrirPicker() {
    _ensurePicker();
    const list = InvimaCrud.getDisponiblesPerfil(_estId());
    const el = document.getElementById('perfil-picker-list');
    if (!list.length) {
      el.innerHTML = '<p style="font-size:12px;color:var(--color-ink3);">No hay más ítems disponibles en el checklist.</p>';
    } else {
      el.innerHTML = list.map(it => `
        <button type="button" class="btn btn-outline" style="width:100%;text-align:left;margin-bottom:6px;padding:10px;font-size:12px;"
          onclick="ConfigurarPerfilRapido.elegirPicker('${_esc(it.id)}')">
          <strong>${_esc(it.codigo)}</strong> · ${_esc(it.nombre)}
        </button>`).join('');
    }
    document.getElementById('perfil-picker-modal').style.display = 'flex';
  }

  function cerrarPicker() {
    const m = document.getElementById('perfil-picker-modal');
    if (m) m.style.display = 'none';
  }

  function elegirPicker(itemId) {
    try {
      InvimaCrud.agregarAlPerfil(itemId, _estId());
      Router.toast('Ítem agregado al perfil');
      cerrarPicker();
      _refresh();
      _notifyParent();
    } catch (e) {
      Router.toast(e.message || 'Error', 'error');
    }
  }

  function agregarCustom() {
    _editId = null;
    _ensureSubmodal();
    document.getElementById('perfil-sub-title').textContent = 'Agregar ítem custom al perfil';
    document.getElementById('perfil-sub-codigo').value = '';
    document.getElementById('perfil-sub-codigo').readOnly = false;
    document.getElementById('perfil-sub-nombre').value = '';
    document.getElementById('perfil-sub-norma').value = 'Local/ECODESA/Específico';
    document.getElementById('perfil-sub-error').textContent = '';
    document.getElementById('perfil-item-submodal').style.display = 'flex';
  }

  function editar(itemId) {
    const item = InvimaCrud.getConfigINVIMA(_estId()).find(it => it.id === itemId);
    if (!item || !item.custom) return;
    _editId = itemId;
    _ensureSubmodal();
    document.getElementById('perfil-sub-title').textContent = 'Editar ítem custom';
    document.getElementById('perfil-sub-codigo').value = item.codigo;
    document.getElementById('perfil-sub-codigo').readOnly = true;
    document.getElementById('perfil-sub-nombre').value = item.nombre;
    document.getElementById('perfil-sub-norma').value = item.normativa || '';
    document.getElementById('perfil-sub-error').textContent = '';
    document.getElementById('perfil-item-submodal').style.display = 'flex';
  }

  function cerrarSub() {
    const m = document.getElementById('perfil-item-submodal');
    if (m) m.style.display = 'none';
    _editId = null;
  }

  function guardarSub() {
    const err = document.getElementById('perfil-sub-error');
    const nombre = document.getElementById('perfil-sub-nombre').value.trim();
    const norma = document.getElementById('perfil-sub-norma').value.trim();
    const codigo = document.getElementById('perfil-sub-codigo').value.trim();
    try {
      if (_editId) {
        InvimaCrud.editarItem(_editId, nombre, norma, _estId());
        Router.toast('Ítem actualizado');
      } else {
        InvimaCrud.agregarItem('cat_01', nombre, norma, null, _estId(), codigo || undefined, true);
        Router.toast('Ítem custom agregado al perfil');
      }
      cerrarSub();
      _refresh();
      _notifyParent();
    } catch (e) {
      if (err) err.textContent = e.message || 'Error al guardar';
    }
  }

  function resumenTexto() {
    const n = InvimaCrud.getPerfilRapido(_estId()).length;
    return `Perfil: ${n} ítem(s)`;
  }

  return {
    abrir, cerrar, setMode, quitar, editar, agregarCustom, abrirPicker, cerrarPicker, elegirPicker,
    cerrarSub, guardarSub, resumenTexto, setEvalResp, setEvalHallazgo, toggleEvalDesc,
  };
})();
