// dadis-simulador.js — Simulador de Inspección DADIS (independiente del diagnóstico B/R/D/N-A)

const DadisSimulador = (() => {
  'use strict';

  const LS_KEY = 'sanicheck_dadis_historial';
  const DRAFT_KEY = 'sanicheck_dadis_draft';

  let _cfg = null;
  let _openCats = {};
  let _respuestas = {};
  let _hallazgos = {};
  let _meta = { establecimiento: '', profesional: '', fecha: '' };
  let _resultado = null;
  let _vista = 'form'; // form | resultado | historial

  function _esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _hoy() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function _loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      _respuestas = d.respuestas || {};
      _hallazgos = d.hallazgos || {};
      _meta = Object.assign({ establecimiento: '', profesional: '', fecha: _hoy() }, d.meta || {});
      _openCats = d.openCats || {};
    } catch (_) { /* ignore */ }
  }

  function _saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        respuestas: _respuestas,
        hallazgos: _hallazgos,
        meta: _meta,
        openCats: _openCats,
      }));
    } catch (_) { /* ignore */ }
  }

  function _getHistorial() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    } catch (_) {
      return [];
    }
  }

  function _pushHistorial(entry) {
    const list = _getHistorial();
    list.unshift(entry);
    if (list.length > 40) list.length = 40;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(list));
    } catch (_) { /* ignore */ }
  }

  function _defaultMeta() {
    const insp = (typeof Store !== 'undefined' && Store.getCurrentInspeccion)
      ? Store.getCurrentInspeccion()
      : null;
    if (!_meta.establecimiento && insp?.establecimiento?.nombre) {
      _meta.establecimiento = insp.establecimiento.nombre;
    }
    if (!_meta.profesional && insp?.inspeccion?.inspector) {
      _meta.profesional = insp.inspeccion.inspector;
    }
    if (!_meta.fecha) _meta.fecha = _hoy();
  }

  function _allItems() {
    const out = [];
    (_cfg?.categorias || []).forEach(cat => {
      (cat.items || []).forEach(it => out.push({ ...it, catId: cat.id, catNombre: cat.nombre, catPeso: cat.peso }));
    });
    return out;
  }

  function _catProgress(cat) {
    const items = cat.items || [];
    if (!items.length) return { done: 0, total: 0 };
    let done = 0;
    items.forEach(it => {
      const r = _respuestas[it.id];
      if (!r) return;
      if ((r === 'AR' || r === 'I') && !(_hallazgos[it.id] || '').trim()) return;
      done++;
    });
    return { done, total: items.length };
  }

  function _validar() {
    const items = _allItems();
    const faltan = [];
    const sinHallazgo = [];
    items.forEach(it => {
      const r = _respuestas[it.id];
      if (!r) faltan.push(it.id);
      else if ((r === 'AR' || r === 'I') && !(_hallazgos[it.id] || '').trim()) {
        sinHallazgo.push(it.id);
      }
    });
    return { ok: faltan.length === 0 && sinHallazgo.length === 0, faltan, sinHallazgo };
  }

  /* ── Render ─────────────────────────────────────── */

  function render() {
    _loadDraft();
    _defaultMeta();
    setTimeout(() => { _boot(); }, 0);
    return `<div id="dadis-root" style="padding-bottom:32px;">
      <div style="padding:var(--sp-md);text-align:center;color:var(--color-ink3);font-size:13px;">
        Cargando simulador DADIS…
      </div>
    </div>`;
  }

  async function _boot() {
    try {
      _cfg = await DadisScoring.loadConfig();
    } catch (e) {
      const root = document.getElementById('dadis-root');
      if (root) {
        root.innerHTML = `<div style="padding:var(--sp-lg);">
          <div class="screen-title">Simulador DADIS</div>
          <p style="color:var(--color-deficiente);margin-top:12px;">No se pudo cargar la configuración: ${_esc(e.message)}</p>
          <button class="btn btn-outline" onclick="Router.go('home')">Volver</button>
        </div>`;
      }
      return;
    }
    _paint();
  }

  function attach() {
    /* no-op: listeners via onclick window.* */
  }

  function _paint() {
    const root = document.getElementById('dadis-root');
    if (!root || !_cfg) return;
    if (_vista === 'resultado' && _resultado) {
      root.innerHTML = _renderResultado();
    } else if (_vista === 'historial') {
      root.innerHTML = _renderHistorial();
    } else {
      root.innerHTML = _renderForm();
    }
  }

  function _header(sub) {
    return `
      <div class="screen-header">
        <div class="screen-fase-badge" style="background:rgba(27,67,50,0.12);color:var(--color-brand);display:inline-flex;align-items:center;gap:6px;">
          ${AppIcons.icon('shieldCheck', 12)} SIMULACIÓN TÉCNICA</div>
        <div class="screen-title">Simulador DADIS</div>
        <div class="screen-subtitle">${_esc(sub || 'Inspección sanitaria con enfoque de riesgo')}</div>
      </div>`;
  }

  function _renderForm() {
    const leyenda = _cfg.meta?.escala_leyenda || {};
    const cats = (_cfg.categorias || []).map(cat => _renderCat(cat)).join('');
    return `
      ${_header('Acta de inspección sanitaria · Enfoque DADIS')}
      <div style="padding:0 var(--sp-md) var(--sp-lg);">
        <div class="card" style="padding:var(--sp-md);margin-bottom:var(--sp-md);">
          <div style="font-size:11px;font-weight:700;color:var(--color-ink3);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;">
            Datos de la simulación</div>
          <label style="display:block;font-size:12px;color:var(--color-ink2);margin-bottom:4px;">Establecimiento</label>
          <input id="dadis-est" class="form-input" type="text" value="${_esc(_meta.establecimiento)}"
            placeholder="Nombre del establecimiento"
            oninput="DadisSimulador.setMeta('establecimiento', this.value)">
          <label style="display:block;font-size:12px;color:var(--color-ink2);margin:10px 0 4px;">Profesional</label>
          <input id="dadis-prof" class="form-input" type="text" value="${_esc(_meta.profesional)}"
            placeholder="Nombre del profesional"
            oninput="DadisSimulador.setMeta('profesional', this.value)">
          <label style="display:block;font-size:12px;color:var(--color-ink2);margin:10px 0 4px;">Fecha</label>
          <input id="dadis-fecha" class="form-input" type="date" value="${_esc(_meta.fecha || _hoy())}"
            oninput="DadisSimulador.setMeta('fecha', this.value)">
        </div>

        <div style="background:rgba(82,183,136,0.1);border:1px solid rgba(82,183,136,0.35);border-radius:10px;
          padding:12px 14px;margin-bottom:var(--sp-md);font-size:12px;color:var(--color-ink2);line-height:1.55;">
          <strong style="color:var(--color-brand);">Escala:</strong>
          <span style="margin-left:6px;"><b>A</b> ${ _esc(leyenda.A || 'Aceptable') }</span> ·
          <span><b>AR</b> ${ _esc(leyenda.AR || 'Aceptable con requerimiento') }</span> ·
          <span><b>I</b> ${ _esc(leyenda.I || 'Inaceptable') }</span>
          ${leyenda.NA_nota ? `<div style="margin-top:6px;font-size:11px;color:var(--color-ink3);">${_esc(leyenda.NA_nota)}</div>` : ''}
        </div>

        <div style="display:flex;gap:8px;margin-bottom:var(--sp-md);">
          <button type="button" class="btn btn-outline" style="flex:1;padding:10px;font-size:12px;"
            onclick="DadisSimulador.showHistorial()">Historial</button>
          <button type="button" class="btn btn-outline" style="flex:1;padding:10px;font-size:12px;"
            onclick="DadisSimulador.resetForm()">Limpiar</button>
        </div>

        ${cats}

        <button type="button" class="btn btn-primary" style="width:100%;margin-top:var(--sp-md);display:inline-flex;align-items:center;justify-content:center;gap:8px;"
          onclick="DadisSimulador.calcular()">
          ${AppIcons.row('barChart', 'Calcular resultado', 16)}
        </button>
        <button type="button" class="btn btn-outline" style="width:100%;margin-top:10px;display:inline-flex;align-items:center;justify-content:center;gap:6px;"
          onclick="Router.go('home')">${AppIcons.row('arrowLeft', 'Volver al inicio', 14)}</button>
      </div>`;
  }

  function _renderCat(cat) {
    const items = cat.items || [];
    const open = !!_openCats[cat.id];
    const prog = _catProgress(cat);
    const emptyNote = !items.length
      ? `<div style="padding:12px 14px;font-size:12px;color:var(--color-ink3);">
          Sin ítems detallados en el instructivo (peso categorial ${cat.peso}%). No aporta al cálculo hasta que se carguen ítems en la configuración.
        </div>`
      : '';

    const body = open ? `
      <div style="border-top:1px solid var(--color-border);">
        ${emptyNote}
        ${items.map(it => _renderItem(it)).join('')}
      </div>` : '';

    return `
      <div class="card" style="padding:0;margin-bottom:10px;overflow:hidden;">
        <button type="button" onclick="DadisSimulador.toggleCat(${cat.id})"
          style="width:100%;display:flex;align-items:center;gap:10px;padding:14px;background:transparent;border:0;cursor:pointer;text-align:left;">
          <span style="width:28px;height:28px;border-radius:8px;background:rgba(27,67,50,0.1);color:var(--color-brand);
            display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;">${cat.id}</span>
          <span style="flex:1;min-width:0;">
            <span style="display:block;font-size:12px;font-weight:700;color:var(--color-brand);line-height:1.3;">${_esc(cat.nombre)}</span>
            <span style="display:block;font-size:11px;color:var(--color-ink3);margin-top:2px;">Peso ${cat.peso}% · ${prog.done}/${prog.total || items.length} evaluados</span>
          </span>
          <span style="color:var(--color-ink3);transform:rotate(${open ? 180 : 0}deg);transition:transform .2s;">
            ${AppIcons.icon('chevronDown', 16)}
          </span>
        </button>
        ${body}
      </div>`;
  }

  function _renderItem(it) {
    const resp = _respuestas[it.id] || '';
    const hall = _hallazgos[it.id] || '';
    const needHall = resp === 'AR' || resp === 'I';
    const btn = (val, label, color) => {
      const on = resp === val;
      return `<button type="button" onclick="DadisSimulador.setResp('${it.id}','${val}')"
        style="flex:1;padding:8px 4px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;
          border:1.5px solid ${on ? color : 'var(--color-border)'};
          background:${on ? color : 'transparent'};
          color:${on ? '#fff' : 'var(--color-ink2)'};">${label}</button>`;
    };
    return `
      <div style="padding:12px 14px;border-top:1px dashed var(--color-border);">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:700;color:var(--color-ink);">${_esc(it.id)} · ${_esc(it.nombre)}</div>
            <button type="button" onclick="DadisSimulador.toggleDesc('${it.id}')"
              style="margin-top:4px;background:none;border:0;padding:0;font-size:11px;color:var(--color-accent);cursor:pointer;font-weight:600;">
              Ver criterio / normativa</button>
          </div>
        </div>
        <div id="dadis-desc-${it.id.replace('.', '_')}" style="display:none;margin-top:8px;padding:10px;background:rgba(27,67,50,0.04);
          border-radius:8px;font-size:11px;color:var(--color-ink2);line-height:1.5;white-space:pre-wrap;">
          <div style="font-weight:700;color:var(--color-brand);margin-bottom:4px;">Normativa</div>
          ${_esc(it.normativa)}
          <div style="font-weight:700;color:var(--color-brand);margin:10px 0 4px;">Criterio de evaluación</div>
          ${_esc(it.descripcion)}
        </div>
        <div style="display:flex;gap:6px;margin-top:10px;">
          ${btn('A', 'A', '#065F46')}
          ${btn('AR', 'AR', '#B45309')}
          ${btn('I', 'I', '#991B1B')}
        </div>
        ${needHall ? `
          <label style="display:block;font-size:11px;font-weight:700;color:#92400E;margin:10px 0 4px;">
            Hallazgo / justificación (obligatorio)</label>
          <textarea class="form-input" rows="2" style="resize:vertical;font-size:12px;"
            placeholder="Describa el hallazgo observado…"
            oninput="DadisSimulador.setHallazgo('${it.id}', this.value)">${_esc(hall)}</textarea>
        ` : ''}
      </div>`;
  }

  function _gaugeSvg(pct, color) {
    const p = Math.max(0, Math.min(100, pct));
    const r = 54;
    const c = 2 * Math.PI * r;
    const dash = (p / 100) * c * 0.75;
    const gap = c - dash;
    return `<svg width="140" height="110" viewBox="0 0 140 110" aria-hidden="true">
      <path d="M16 90 A54 54 0 1 1 124 90" fill="none" stroke="#E5E7EB" stroke-width="12" stroke-linecap="round"/>
      <path d="M16 90 A54 54 0 1 1 124 90" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"
        stroke-dasharray="${dash} ${gap}" stroke-dashoffset="0"/>
      <text x="70" y="72" text-anchor="middle" font-size="22" font-weight="800" fill="${color}">${p.toFixed(1)}%</text>
      <text x="70" y="92" text-anchor="middle" font-size="10" fill="#6B7280">Puntaje total</text>
    </svg>`;
  }

  function _renderResultado() {
    const r = _resultado;
    const sem = DadisScoring.semaforo(r.clasificacion);
    const rows = (r.puntajePorCategoria || []).map(c => `
      <tr>
        <td style="padding:8px 6px;border-bottom:1px solid var(--color-border);font-size:12px;">${_esc(c.nombre)}</td>
        <td style="padding:8px 6px;border-bottom:1px solid var(--color-border);text-align:right;font-weight:700;">${c.obtenido.toFixed(2)}</td>
        <td style="padding:8px 6px;border-bottom:1px solid var(--color-border);text-align:right;color:var(--color-ink3);">${c.maxPosible.toFixed(1)}</td>
      </tr>`).join('');

    const hallazgos = (r.itemsDetalle || []).filter(it => it.respuesta === 'AR' || it.respuesta === 'I');
    const hallHtml = hallazgos.length
      ? hallazgos.map(it => `
        <div style="padding:10px 0;border-bottom:1px dashed var(--color-border);">
          <div style="font-size:12px;font-weight:700;color:var(--color-ink);">${_esc(it.id)} · ${_esc(it.nombre)}
            <span style="margin-left:6px;font-size:10px;padding:2px 6px;border-radius:6px;background:${it.respuesta === 'I' ? '#FEE2E2' : '#FEF3C7'};color:${it.respuesta === 'I' ? '#991B1B' : '#92400E'};">${it.respuesta}</span>
          </div>
          <div style="font-size:12px;color:var(--color-ink2);margin-top:4px;">${_esc(_hallazgos[it.id] || '')}</div>
          <div style="font-size:10px;color:var(--color-ink3);margin-top:4px;">${_esc(it.normativa)}</div>
        </div>`).join('')
      : `<div style="font-size:12px;color:#065F46;padding:8px 0;">Sin hallazgos AR/I registrados.</div>`;

    return `
      ${_header('Resultado de la simulación')}
      <div style="padding:0 var(--sp-md) var(--sp-lg);">
        <div class="card" style="padding:var(--sp-md);margin-bottom:var(--sp-md);text-align:center;">
          <div style="font-size:12px;color:var(--color-ink3);margin-bottom:4px;">${_esc(_meta.establecimiento || 'Establecimiento')}</div>
          ${_gaugeSvg(r.puntajeTotal, sem.color)}
          <div style="margin-top:4px;display:inline-block;padding:8px 16px;border-radius:999px;background:${sem.bg};color:${sem.color};font-weight:800;font-size:13px;letter-spacing:0.03em;">
            ${_esc(r.clasificacion)}
          </div>
          ${r.clasificacion === 'FAVORABLE' ? `
            <div style="margin-top:12px;display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:2px solid #065F46;border-radius:8px;color:#065F46;font-weight:800;font-size:12px;">
              ${AppIcons.icon('shieldCheck', 16)} Verificado ECODESA
            </div>` : ''}
        </div>

        <div class="card" style="padding:var(--sp-md);margin-bottom:var(--sp-md);">
          <div style="font-size:11px;font-weight:700;color:var(--color-ink3);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">
            Desglose por categoría</div>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr>
              <th style="text-align:left;font-size:10px;color:var(--color-ink3);padding:4px 6px;">Categoría</th>
              <th style="text-align:right;font-size:10px;color:var(--color-ink3);padding:4px 6px;">Obtenido</th>
              <th style="text-align:right;font-size:10px;color:var(--color-ink3);padding:4px 6px;">Máx.</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <div class="card" style="padding:var(--sp-md);margin-bottom:var(--sp-md);">
          <div style="font-size:11px;font-weight:700;color:var(--color-ink3);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">
            Hallazgos AR / I</div>
          ${hallHtml}
        </div>

        <button type="button" class="btn btn-primary" style="width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;"
          onclick="DadisSimulador.generarPDF()">
          ${AppIcons.row('fileText', 'Generar PDF', 16)}
        </button>
        <button type="button" class="btn btn-outline" style="width:100%;margin-top:10px;"
          onclick="DadisSimulador.backToForm()">Seguir editando</button>
        <button type="button" class="btn btn-outline" style="width:100%;margin-top:10px;display:inline-flex;align-items:center;justify-content:center;gap:6px;"
          onclick="Router.go('home')">${AppIcons.row('arrowLeft', 'Volver al inicio', 14)}</button>
      </div>`;
  }

  function _renderHistorial() {
    const list = _getHistorial();
    const rows = list.length
      ? list.map(h => `
        <div class="card" style="padding:12px 14px;margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
            <div>
              <div style="font-size:13px;font-weight:700;color:var(--color-ink);">${_esc(h.establecimiento || 'Sin nombre')}</div>
              <div style="font-size:11px;color:var(--color-ink3);margin-top:2px;">${_esc(h.fecha)} · ${_esc(h.profesional || '—')}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:16px;font-weight:800;color:var(--color-brand);">${Number(h.puntajeTotal).toFixed(1)}%</div>
              <div style="font-size:10px;font-weight:700;color:var(--color-ink3);">${_esc(h.clasificacion)}</div>
            </div>
          </div>
        </div>`).join('')
      : `<div class="empty-state" style="padding:24px 12px;">
           <div class="empty-state-text">Aún no hay simulaciones guardadas.</div>
         </div>`;

    return `
      ${_header('Historial de simulaciones')}
      <div style="padding:0 var(--sp-md) var(--sp-lg);">
        ${rows}
        <button type="button" class="btn btn-outline" style="width:100%;margin-top:10px;"
          onclick="DadisSimulador.backToForm()">Volver al formulario</button>
      </div>`;
  }

  /* ── Actions ────────────────────────────────────── */

  function toggleCat(id) {
    _openCats[id] = !_openCats[id];
    _saveDraft();
    _paint();
  }

  function toggleDesc(id) {
    const el = document.getElementById('dadis-desc-' + String(id).replace('.', '_'));
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }

  function setResp(id, val) {
    _respuestas[id] = val;
    if (val === 'A') delete _hallazgos[id];
    _saveDraft();
    _paint();
  }

  function setHallazgo(id, val) {
    _hallazgos[id] = val;
    _saveDraft();
  }

  function setMeta(key, val) {
    _meta[key] = val;
    _saveDraft();
  }

  function resetForm() {
    _respuestas = {};
    _hallazgos = {};
    _resultado = null;
    _vista = 'form';
    _saveDraft();
    _paint();
    if (typeof Router !== 'undefined') Router.toast('Formulario limpiado');
  }

  function showHistorial() {
    _vista = 'historial';
    _paint();
  }

  function backToForm() {
    _vista = 'form';
    _paint();
  }

  function calcular() {
    if (!_cfg) return;
    const v = _validar();
    if (!v.ok) {
      if (v.faltan.length) {
        Router.toast('Complete todos los ítems (' + v.faltan.length + ' pendientes)');
      } else {
        Router.toast('Hallazgo obligatorio en ítems AR / I');
      }
      // Abrir categorías con pendientes
      (_cfg.categorias || []).forEach(cat => {
        const ids = (cat.items || []).map(i => i.id);
        if (ids.some(id => v.faltan.includes(id) || v.sinHallazgo.includes(id))) {
          _openCats[cat.id] = true;
        }
      });
      _paint();
      return;
    }
    _resultado = DadisScoring.calcularPuntaje(_respuestas, _cfg);
    _pushHistorial({
      id: 'dadis_' + Date.now(),
      fecha: _meta.fecha || _hoy(),
      establecimiento: _meta.establecimiento || '',
      profesional: _meta.profesional || '',
      puntajeTotal: _resultado.puntajeTotal,
      clasificacion: _resultado.clasificacion,
      respuestas: { ..._respuestas },
      hallazgos: { ..._hallazgos },
      createdAt: new Date().toISOString(),
    });
    _vista = 'resultado';
    _paint();
  }

  /* ── PDF ────────────────────────────────────────── */

  function generarPDF() {
    if (!_resultado) { Router.toast('Calcule el resultado primero'); return; }
    const win = window.open('', '_blank');
    if (!win) { Router.toast('Permite ventanas emergentes para exportar PDF'); return; }

    const r = _resultado;
    const sem = DadisScoring.semaforo(r.clasificacion);
    const fechaGen = new Date().toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const sello = r.clasificacion === 'FAVORABLE'
      ? `<div class="sello">✓ Verificado ECODESA</div>`
      : '';

    const catRows = (r.puntajePorCategoria || []).map(c => `
      <tr>
        <td>${_esc(c.nombre)}</td>
        <td class="num">${c.obtenido.toFixed(2)}</td>
        <td class="num">${c.maxPosible.toFixed(1)}</td>
        <td class="num">${c.pct != null ? c.pct.toFixed(1) + '%' : '—'}</td>
      </tr>`).join('');

    const hallazgos = (r.itemsDetalle || []).filter(it => it.respuesta === 'AR' || it.respuesta === 'I');
    const hallRows = hallazgos.length
      ? hallazgos.map(it => `
        <tr>
          <td><strong>${_esc(it.id)}</strong> ${_esc(it.nombre)}<br>
            <span class="chip chip-${it.respuesta === 'I' ? 'i' : 'ar'}">${it.respuesta}</span></td>
          <td>${_esc(_hallazgos[it.id] || '')}</td>
          <td style="font-size:9px;color:#4B5563;">${_esc(it.normativa)}</td>
        </tr>`).join('')
      : `<tr><td colspan="3" style="text-align:center;color:#065F46;padding:14px;">Sin hallazgos AR/I</td></tr>`;

    const body = `
      <div class="hdr">
        <div class="hdr-kicker">SaniCheck · ECODESA</div>
        <div class="hdr-title">Simulación de Inspección Sanitaria — Enfoque DADIS</div>
        <div class="hdr-sub">${_esc(_meta.establecimiento || 'Establecimiento')} · ${_esc(_meta.fecha || '')}</div>
        <div class="hdr-date">Generado ${fechaGen}</div>
      </div>

      <div class="kpi-grid">
        <div class="kpi" style="border-top:3px solid ${sem.color};">
          <div class="kpi-lbl">Puntaje total</div>
          <div class="kpi-val" style="color:${sem.color};">${r.puntajeTotal.toFixed(1)}%</div>
        </div>
        <div class="kpi" style="border-top:3px solid ${sem.color};">
          <div class="kpi-lbl">Clasificación</div>
          <div class="kpi-val" style="color:${sem.color};font-size:16px;">${_esc(r.clasificacion)}</div>
        </div>
      </div>
      ${sello}

      <div class="section">
        <div class="section-title">Desglose por categoría</div>
        <div class="panel">
          <table>
            <thead><tr><th>Categoría</th><th>Obtenido</th><th>Máximo</th><th>% cat.</th></tr></thead>
            <tbody>${catRows}</tbody>
          </table>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Hallazgos AR / I y normativa</div>
        <div class="panel">
          <table>
            <thead><tr><th>Ítem</th><th>Hallazgo</th><th>Normativa</th></tr></thead>
            <tbody>${hallRows}</tbody>
          </table>
        </div>
      </div>

      <div class="footer">
        <div>
          <div class="footer-lbl">Profesional</div>
          <div class="footer-val">${_esc(_meta.profesional || '—')}</div>
          <div class="footer-line"></div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:9px;color:#9CA3AF;">ECODESA Ecología Desarrollo e Ingeniería S.A.S</div>
          <div style="font-size:9px;color:#9CA3AF;margin-top:2px;">Cartagena · Documento de simulación técnica — no sustituye acta oficial DADIS</div>
        </div>
      </div>`;

    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>Simulación DADIS — ${_esc(_meta.establecimiento || 'SaniCheck')}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Segoe UI',Arial,sans-serif;padding:20px;color:#0A2E23;background:#F8FAFC;font-size:11px;}
        .hdr{background:linear-gradient(135deg,#0A2E23 0%,#0A7350 100%);color:#fff;padding:20px 24px;border-radius:12px;margin-bottom:16px;}
        .hdr-kicker{font-size:10px;opacity:0.75;letter-spacing:0.08em;text-transform:uppercase;}
        .hdr-title{font-size:18px;font-weight:800;letter-spacing:-0.02em;margin-top:6px;}
        .hdr-sub{font-size:11px;opacity:0.85;margin-top:6px;}
        .hdr-date{font-size:10px;opacity:0.65;margin-top:8px;}
        .kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;}
        .kpi{background:#fff;border-radius:10px;padding:14px 16px;border:1px solid #E5E7EB;}
        .kpi-lbl{font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:0.06em;}
        .kpi-val{font-size:28px;font-weight:800;margin-top:4px;}
        .sello{display:inline-block;margin:0 0 14px;padding:10px 18px;border:2.5px solid #065F46;border-radius:8px;
          color:#065F46;font-weight:800;font-size:14px;letter-spacing:0.04em;background:#ECFDF5;}
        .section{margin-bottom:16px;}
        .section-title{font-size:12px;font-weight:800;color:#fff;background:linear-gradient(90deg,#0A2E23,#0A7350);
          padding:10px 14px;border-radius:10px 10px 0 0;text-transform:uppercase;letter-spacing:0.06em;}
        .panel{background:#fff;border:1px solid #E5E7EB;border-top:0;border-radius:0 0 10px 10px;padding:10px;overflow-x:auto;}
        table{width:100%;border-collapse:collapse;}
        th{text-align:left;font-size:9px;color:#6B7280;text-transform:uppercase;padding:6px;border-bottom:1px solid #E5E7EB;}
        td{padding:8px 6px;border-bottom:1px solid #F3F4F6;vertical-align:top;font-size:11px;}
        td.num{text-align:right;font-weight:700;white-space:nowrap;}
        .chip{display:inline-block;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:800;}
        .chip-ar{background:#FEF3C7;color:#92400E;}
        .chip-i{background:#FEE2E2;color:#991B1B;}
        .footer{display:flex;justify-content:space-between;gap:16px;margin-top:24px;padding-top:16px;border-top:1px solid #E5E7EB;}
        .footer-lbl{font-size:9px;color:#9CA3AF;text-transform:uppercase;}
        .footer-val{font-size:12px;font-weight:700;margin-top:4px;}
        .footer-line{margin-top:28px;border-bottom:1px solid #9CA3AF;width:180px;}
        @media print{body{background:#fff;padding:12px;}}
      </style>
    </head><body>${body}
      <script>setTimeout(function(){try{window.print();}catch(e){}},500);<\/script>
    </body></html>`);
    win.document.close();
  }

  return {
    render, attach,
    toggleCat, toggleDesc, setResp, setHallazgo, setMeta,
    calcular, generarPDF, resetForm, showHistorial, backToForm,
  };
})();
