// personalizar.js — Función explícita dentro del ciclo PHVA (no paso obligatorio):
// activa/desactiva ítems oficiales y agrega/elimina ítems personalizados de la
// inspección ACTIVA. Todo cambio queda en inspeccion.catalogo_audit.

const Personalizar = (() => {
  const PROG_ICONS = {
    edificacion: { color: '#1E40AF', svg: '<path d="M4 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16"/><path d="M13 10h5a1 1 0 0 1 1 1v10"/><path d="M2 21h20"/><path d="M7 8h1M10 8h1M7 12h1M10 12h1M7 16h1M10 16h1"/>' },
    equipos:     { color: '#0891B2', svg: '<path d="M12 3c-3.2 4-6 7.6-6 10.6a6 6 0 0 0 12 0C18 10.6 15.2 7 12 3z"/>' },
    personal:    { color: '#D97706', svg: '<ellipse cx="12" cy="14" rx="4.5" ry="6"/><path d="M12 8v12"/><path d="M9 5.5 7.5 4M15 5.5 16.5 4"/><circle cx="12" cy="6" r="1.5"/>' },
    higienicos:  { color: '#059669', svg: '<path d="M4 12a8 8 0 0 1 14.5-4.5M20 12a8 8 0 0 1-14.5 4.5"/><path d="M17 4v4h-4"/><path d="M7 20v-4h4"/>' },
    saneamiento: { color: '#0284C7', svg: '<path d="M3 17c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/><path d="M3 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/>' },
  };
  function _progIcon(id, size) {
    const p = PROG_ICONS[id] || PROG_ICONS.edificacion;
    size = size || 20;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0;">${p.svg}</svg>`;
  }

  /* ────────────────────────────── render ──────────────────────────────── */
  function render() {
    const insp = Store.getCurrentInspeccion();
    if (!insp) return `
      <div class="coming-soon">
        <div class="coming-soon-icon">⚠️</div>
        <div class="coming-soon-title">Sin inspección activa</div>
        <div class="coming-soon-desc">Primero configure el establecimiento en PLANIFICAR.</div>
        <button class="btn btn-primary mt-md" style="width:auto;padding:12px 24px"
          onclick="Router.go('planificar')">Ir a Planificar</button>
      </div>`;

    const totalActivos = insp.programas.reduce((n, p) =>
      n + p.aspectos.filter(a => !a._disabled).length, 0);

    return `
      <div class="screen-header">
        <div class="screen-fase-badge badge-P" style="font-size:11px;padding:3px 8px;">
          ⚙️ EDITAR ÍTEMS
        </div>
        <div class="screen-title" style="font-size:17px;">Catálogo de esta inspección</div>
        <div class="screen-subtitle">${_esc(insp.establecimiento.nombre)}</div>
      </div>

      <div style="font-size:12px;color:var(--color-ink3);margin-bottom:14px;padding:0 2px;
        line-height:1.5;">
        Active o desactive ítems según aplique. Los desactivados no aparecen en HACER pero
        siguen en el catálogo (restaurables) y quedan registrados en la auditoría.
        <strong style="color:var(--color-primary);">${totalActivos} ítems activos.</strong>
      </div>

      ${insp.programas.map(bloque => _renderBloque(bloque)).join('')}

      ${_renderFormCustom(insp.programas)}

      <button onclick="Router.go('hacer')" class="btn btn-primary"
        style="width:100%;padding:14px;font-size:15px;font-weight:700;margin-top:6px;">
        ← Volver a Hacer
      </button>
      <div style="height:40px;"></div>`;
  }

  function _renderBloque(bloque) {
    const activos = bloque.aspectos.filter(a => !a._disabled).length;
    return `
      <div style="margin-bottom:14px;border-radius:var(--radius-md);
        border:1px solid var(--color-border);overflow:hidden;">
        <div style="background:var(--color-primary);color:#fff;padding:8px 12px;
          display:flex;justify-content:space-between;align-items:center;">
          <span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;">
            ${_progIcon(bloque.id, 18)} ${bloque.nombre}
          </span>
          <span style="font-size:10px;opacity:0.8;">${activos} activos</span>
        </div>
        ${bloque.aspectos.map((asp, i) => {
          const on = !asp._disabled;
          return `
            <label style="display:flex;align-items:flex-start;gap:10px;padding:9px 12px;
              cursor:pointer;${i < bloque.aspectos.length - 1 ? 'border-bottom:1px solid #F3F4F6;' : ''}
              background:${on ? '#fff' : '#FEF9F9'};">
              <input type="checkbox" ${on ? 'checked' : ''}
                onchange="Personalizar.toggleItem('${asp.id}')"
                style="margin-top:2px;width:15px;height:15px;
                  accent-color:var(--color-primary);flex-shrink:0;">
              <div style="flex:1;min-width:0;">
                <div style="font-size:12px;color:${on ? 'var(--color-ink)' : '#9CA3AF'};
                  ${on ? '' : 'text-decoration:line-through;'}">
                  ${_esc(asp.texto)}${asp._custom ? ' <span style="color:var(--color-accent);font-weight:700;">· personalizado</span>' : ''}</div>
                <div style="font-size:10px;color:#9CA3AF;margin-top:1px;">${_esc(asp.norma)}</div>
              </div>
              ${asp._custom ? `<button onclick="event.preventDefault();Personalizar.eliminarCustom('${asp.id}')"
                style="border:none;background:none;cursor:pointer;color:#EF4444;
                  font-size:20px;line-height:1;padding:0 0 0 8px;flex-shrink:0;">×</button>` : ''}
            </label>`;
        }).join('')}
      </div>`;
  }

  function _renderFormCustom(programas) {
    return `
      <div style="background:var(--color-surface);border-radius:var(--radius-md);
        border:1.5px dashed var(--color-border);padding:14px;margin-bottom:10px;">
        <div style="font-size:13px;font-weight:700;color:var(--color-primary);margin-bottom:10px;">
          + Agregar ítem personalizado
        </div>
        <div class="form-group" style="margin-bottom:8px;">
          <input class="form-input" id="cust-nombre" type="text"
            placeholder="Descripción del ítem *" style="font-size:13px;">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
          <select class="form-select" id="cust-bloque" style="font-size:13px;">
            <option value="">Bloque *</option>
            ${programas.map(p => `<option value="${p.id}">${_esc(p.nombre)}</option>`).join('')}
          </select>
          <input class="form-input" id="cust-norma" type="text"
            placeholder="Norma (opcional)" style="font-size:13px;">
        </div>
        <button onclick="Personalizar.agregarCustom()"
          class="btn btn-accent" style="width:100%;padding:10px;font-size:13px;">
          + Agregar ítem
        </button>
      </div>`;
  }

  /* ───────────────────────── acciones ─────────────────────────────────── */
  function _audit(insp, accion, bloqueId, itemId, detalle) {
    insp.catalogo_audit.push({ ts: new Date().toISOString(), accion, bloqueId, itemId, detalle: detalle || '' });
  }

  function toggleItem(itemId) {
    const insp = Store.getCurrentInspeccion();
    if (!insp) return;
    for (const bloque of insp.programas) {
      const asp = bloque.aspectos.find(a => a.id === itemId);
      if (asp) {
        asp._disabled = !asp._disabled;
        _audit(insp, asp._disabled ? 'disable' : 'enable', bloque.id, itemId, asp.texto);
        break;
      }
    }
    Store.upsertInspeccion(insp);
    _refresh();
  }

  function agregarCustom() {
    const insp = Store.getCurrentInspeccion();
    if (!insp) return;
    const nombre   = document.getElementById('cust-nombre')?.value.trim();
    const bloqueId = document.getElementById('cust-bloque')?.value;
    const norma    = document.getElementById('cust-norma')?.value.trim();
    if (!nombre || !bloqueId) {
      Router.toast('⚠ Complete descripción y bloque');
      return;
    }
    const bloque = insp.programas.find(p => p.id === bloqueId);
    if (!bloque) return;
    const item = {
      id: 'cust_' + Date.now(),
      texto: nombre,
      norma: norma || '',
      criterio: null, hallazgo: '', accion: '', estado: null, fotografias: [],
      _custom: true, _disabled: false,
    };
    bloque.aspectos.push(item);
    _audit(insp, 'add', bloqueId, item.id, nombre);
    Store.upsertInspeccion(insp);
    _refresh();
  }

  function eliminarCustom(itemId) {
    const insp = Store.getCurrentInspeccion();
    if (!insp) return;
    for (const bloque of insp.programas) {
      const idx = bloque.aspectos.findIndex(a => a.id === itemId && a._custom);
      if (idx >= 0) {
        const [removido] = bloque.aspectos.splice(idx, 1);
        _audit(insp, 'remove', bloque.id, itemId, removido.texto);
        break;
      }
    }
    Store.upsertInspeccion(insp);
    _refresh();
  }

  function _refresh() {
    const area = document.getElementById('screen-area');
    if (area) area.innerHTML = render();
  }

  function attach() {}

  function _esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { render, attach, toggleItem, agregarCustom, eliminarCustom };
})();
