/**
 * configurar-invima.js — Simulador INVIMA: Configurar (normativa + complementaria) + Evaluar
 */
const ConfigurarInvima = (() => {
  'use strict';

  let _cats = [];
  let _meta = null;
  let _tab = 'cat_01';
  let _mode = 'config';
  let _editCompId = null;

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
    if (typeof InvimaComplementaria !== 'undefined') {
      InvimaComplementaria.migrateLegacyFromCrud(_estId());
    }
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

  function _normativaItems(catId) {
    return InvimaCrud.getConfigINVIMA(_estId()).filter(it => it.categoria_id === catId && !it.esComplementaria);
  }

  function _complementariaCount() {
    return typeof InvimaComplementaria !== 'undefined'
      ? InvimaComplementaria.countAll(_estId())
      : InvimaCrud.resumen(_estId()).complementaria;
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

  function _renderNormativaList(catId) {
    const rows = _normativaItems(catId);
    if (!rows.length) {
      return '<p style="font-size:11px;color:var(--color-ink3);">Sin ítems normativos.</p>';
    }
    return rows.map(it => `
      <div class="invima-normativa-item">
        <span>🔒</span>
        <span><strong>${_esc(it.codigo)}</strong> · ${_esc(it.nombre)}</span>
      </div>`).join('');
  }

  function _renderComplementariaList(catId) {
    const items = typeof InvimaComplementaria !== 'undefined'
      ? InvimaComplementaria.listByCatId(catId, _estId())
      : [];
    if (!items.length) return '';
    return items.map(it => `
      <div class="invima-complementaria-item">
        <div><strong>${_esc(it.nombre)}</strong>${it.critico ? ' <span class="invima-eval-comp-badge">Crítico</span>' : ''}</div>
        ${it.descripcion ? `<small>${_esc(it.descripcion)}</small>` : ''}
        <div class="invima-comp-actions">
          <button type="button" onclick="ConfigurarInvima.editComplementaria('${_esc(catId)}','${_esc(it.id)}')">Editar</button>
          <button type="button" class="btn-comp-del" onclick="ConfigurarInvima.removeComplementaria('${_esc(catId)}','${_esc(it.id)}')">Eliminar</button>
        </div>
      </div>`).join('');
  }

  function _renderConfigCategory(catId) {
    const cat = _cats.find(c => c.id === catId);
    const label = _catLabel(catId);
    return `
      <div style="margin-bottom:var(--sp-md);">
        <div style="font-size:13px;font-weight:800;color:var(--color-brand);margin-bottom:6px;">
          Categoría: ${label}${cat ? ` (${cat.peso}%)` : ''}
        </div>
        <div class="invima-seccion-titulo"><span class="badge-normativa-invima">🔒 NORMATIVA</span></div>
        <div class="invima-normativa-list">${_renderNormativaList(catId)}</div>
        <div class="invima-seccion-titulo"><span class="badge-complementaria-invima">✏️ VERIFICACIÓN COMPLEMENTARIA</span></div>
        <div class="invima-complementaria-list">
          ${_renderComplementariaList(catId) || '<p style="font-size:11px;color:var(--color-ink3);margin:0;">Sin verificaciones complementarias aún.</p>'}
        </div>
        <button type="button" class="btn btn-accent" style="width:100%;"
          onclick="ConfigurarInvima.addComplementaria('${_esc(catId)}')">+ Agregar verificación complementaria</button>
      </div>`;
  }

  function _evalBtn(itemId, val, label, color, current, isComp) {
    const fn = isComp
      ? `ConfigurarInvima.setCompEval('${_esc(_tab)}','${_esc(itemId)}','${val}')`
      : `ConfigurarInvima.setEvalResp('${_esc(itemId)}','${val}')`;
    const on = current === val;
    return `<button type="button" onclick="${fn}"
      style="flex:1;padding:7px 4px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;
        border:1.5px solid ${on ? color : 'var(--color-border)'};
        background:${on ? color : 'transparent'};
        color:${on ? '#fff' : 'var(--color-ink2)'};">${label}</button>`;
  }

  function _renderEvalNormativaItem(it) {
    const ev = InvimaScoring.getEvaluacion(_estId());
    const resp = ev.respuestas[it.id] || '';
    const hall = ev.hallazgos[it.id] || '';
    const needHall = InvimaScoring.requiereHallazgo(resp);
    return `
      <div style="padding:12px 0;border-bottom:1px dashed var(--color-border);">
        <div style="font-size:13px;font-weight:700;color:var(--color-ink);">🔒 ${_esc(it.codigo)} · ${_esc(it.nombre)}</div>
        <div style="display:flex;gap:5px;margin-top:10px;">
          ${_evalBtn(it.id, 'A', 'A', '#065F46', resp, false)}
          ${_evalBtn(it.id, 'AR', 'AR', '#B45309', resp, false)}
          ${_evalBtn(it.id, 'I', 'I', '#991B1B', resp, false)}
          ${_evalBtn(it.id, 'NA', 'N/A', '#475569', resp, false)}
        </div>
        ${needHall ? `
          <textarea class="form-input" rows="2" style="resize:vertical;font-size:12px;margin-top:8px;"
            placeholder="Hallazgo / justificación…"
            oninput="ConfigurarInvima.setEvalHallazgo('${_esc(it.id)}', this.value)">${_esc(hall)}</textarea>
        ` : ''}
      </div>`;
  }

  function _renderEvalComplementariaItem(it) {
    const resp = InvimaComplementaria.getEvaluacionCat(_tab, _estId())[it.id] || '';
    return `
      <div style="padding:12px 0;border-bottom:1px dashed #bbf7d0;">
        <div style="font-size:13px;font-weight:700;color:var(--color-brand);">
          ✏️ ${_esc(it.nombre)}${it.critico ? ' <span class="invima-eval-comp-badge">Crítico</span>' : ''}
        </div>
        ${it.descripcion ? `<div style="font-size:11px;color:var(--color-ink3);margin-top:4px;">${_esc(it.descripcion)}</div>` : ''}
        <div style="display:flex;gap:5px;margin-top:10px;">
          ${_evalBtn(it.id, 'A', 'A', '#065F46', resp, true)}
          ${_evalBtn(it.id, 'AR', 'AR', '#B45309', resp, true)}
          ${_evalBtn(it.id, 'I', 'I', '#991B1B', resp, true)}
          ${_evalBtn(it.id, 'NA', 'N/A', '#475569', resp, true)}
        </div>
      </div>`;
  }

  function _renderEvalBody() {
    const leyenda = _meta?.leyenda || {};
    const normRows = _normativaItems(_tab);
    const compRows = InvimaComplementaria.listByCatId(_tab, _estId());
    const cat = _cats.find(c => c.id === _tab);
    const crit = InvimaComplementaria.countCriticosCumplidos(_tab, _estId());
    const catSummary = cat
      ? `${normRows.length} ítems normativos${crit.total ? ` + ${crit.cumplidos}/${crit.total} complementarios críticos cumplidos` : ''}`
      : '';
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
      ${cat ? `<div style="font-size:11px;color:var(--color-ink3);margin-bottom:8px;">Peso categoría: <strong>${cat.peso}%</strong> · ${catSummary}</div>` : ''}
      <div id="invima-eval-list">
        ${normRows.map(it => _renderEvalNormativaItem(it)).join('')}
        ${compRows.length ? `<div class="invima-seccion-titulo" style="margin-top:12px;"><span class="badge-complementaria-invima">✏️ COMPLEMENTARIA</span></div>` : ''}
        ${compRows.map(it => _renderEvalComplementariaItem(it)).join('')}
        ${!normRows.length && !compRows.length ? '<p style="font-size:12px;color:var(--color-ink3);">Sin ítems.</p>' : ''}
      </div>`;
  }

  function _renderConfigBody() {
    const baseNorm = _baseItemCount() || 28;
    const compN = _complementariaCount();
    return `
      <div style="font-size:12px;color:var(--color-ink3);margin-bottom:var(--sp-sm);padding:8px 12px;
        background:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;">
        <strong>${baseNorm}</strong> ítems normativos + <strong>${compN}</strong> verificaciones complementarias
      </div>
      ${_renderCatTabs()}
      <div id="invima-tab-body">${_renderConfigCategory(_tab)}</div>`;
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

  function _ensureCompModal() {
    if (document.getElementById('modal-agregar-complementaria')) return;
    const el = document.createElement('div');
    el.id = 'modal-agregar-complementaria';
    el.className = 'modal-complementaria';
    el.innerHTML = `
      <div class="modal-complementaria-backdrop" onclick="ConfigurarInvima.cerrarCompModal()"></div>
      <div class="modal-content">
        <h3 id="modal-comp-title">Agregar verificación complementaria</h3>
        <form id="form-complementaria" onsubmit="ConfigurarInvima.guardarComplementaria(event)">
          <label for="nombre-complementaria">Nombre *</label>
          <input type="text" id="nombre-complementaria" maxlength="100" required placeholder="Ej: Cartelería de alérgenos">
          <label for="descripcion-complementaria">Descripción</label>
          <textarea id="descripcion-complementaria" maxlength="200" rows="3" placeholder="Detalle opcional…"></textarea>
          <label class="modal-check">
            <input type="checkbox" id="critico-complementaria">
            Crítico (afecta evaluación)
          </label>
          <div id="modal-comp-error" style="font-size:12px;color:var(--color-deficiente);min-height:16px;"></div>
          <div class="modal-actions">
            <button type="submit" class="btn-guardar">Guardar</button>
            <button type="button" class="btn-cancelar" onclick="ConfigurarInvima.cerrarCompModal()">Cancelar</button>
          </div>
        </form>
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
    _ensureCompModal();
    _tab = 'cat_01';
    _refresh();
    document.getElementById('invima-config-modal').style.display = 'flex';
  }

  function cerrar() {
    const m = document.getElementById('invima-config-modal');
    if (m) m.style.display = 'none';
    cerrarCompModal();
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

  function setCompEval(catId, itemId, resp) {
    InvimaComplementaria.setEvaluacion(catId, itemId, resp, _estId());
    _refresh();
  }

  function setEvalHallazgo(itemId, text) {
    InvimaScoring.setHallazgo(itemId, text, _estId());
  }

  function addComplementaria(catId) {
    _tab = catId || _tab;
    _editCompId = null;
    _ensureCompModal();
    document.getElementById('modal-comp-title').textContent = 'Agregar verificación complementaria';
    document.getElementById('nombre-complementaria').value = '';
    document.getElementById('descripcion-complementaria').value = '';
    document.getElementById('critico-complementaria').checked = false;
    document.getElementById('modal-comp-error').textContent = '';
    document.getElementById('modal-agregar-complementaria').classList.add('open');
  }

  function editComplementaria(catId, itemId) {
    const item = InvimaComplementaria.listByCatId(catId, _estId()).find(it => it.id === itemId);
    if (!item) return;
    _tab = catId;
    _editCompId = itemId;
    _ensureCompModal();
    document.getElementById('modal-comp-title').textContent = 'Editar verificación complementaria';
    document.getElementById('nombre-complementaria').value = item.nombre;
    document.getElementById('descripcion-complementaria').value = item.descripcion || '';
    document.getElementById('critico-complementaria').checked = !!item.critico;
    document.getElementById('modal-comp-error').textContent = '';
    document.getElementById('modal-agregar-complementaria').classList.add('open');
  }

  function cerrarCompModal() {
    const m = document.getElementById('modal-agregar-complementaria');
    if (m) m.classList.remove('open');
    _editCompId = null;
  }

  function guardarComplementaria(e) {
    if (e) e.preventDefault();
    const err = document.getElementById('modal-comp-error');
    const data = {
      nombre: document.getElementById('nombre-complementaria').value,
      descripcion: document.getElementById('descripcion-complementaria').value,
      critico: document.getElementById('critico-complementaria').checked,
    };
    try {
      if (_editCompId) {
        InvimaComplementaria.update(_tab, _editCompId, data, _estId());
        Router.toast('Verificación complementaria actualizada');
      } else {
        InvimaComplementaria.add(_tab, data, _estId());
        Router.toast('Verificación complementaria agregada');
      }
      cerrarCompModal();
      _refresh();
    } catch (ex) {
      if (err) err.textContent = ex.message || 'Error al guardar';
    }
  }

  function removeComplementaria(catId, itemId) {
    const item = InvimaComplementaria.listByCatId(catId, _estId()).find(it => it.id === itemId);
    if (!item) return;
    if (!confirm('¿Eliminar "' + item.nombre + '"?')) return;
    InvimaComplementaria.remove(catId, itemId, _estId());
    Router.toast('Verificación complementaria eliminada');
    _refresh();
  }

  function resumenTexto() {
    const r = InvimaCrud.resumen(_estId());
    const comp = _complementariaCount();
    return `INVIMA: ${r.base} normativos + ${comp} complementarias`;
  }

  return {
    abrir, cerrar, setMode, setTab, resumenTexto,
    addComplementaria, editComplementaria, removeComplementaria,
    cerrarCompModal, guardarComplementaria,
    setEvalResp, setCompEval, setEvalHallazgo,
  };
})();
