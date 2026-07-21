// personalizar.js — Paso entre PLANIFICAR y HACER: checklist editable por establecimiento

const Personalizar = (() => {
  const PROG_ICONS = {
    infra:    { color: '#1E40AF', svg: '<path d="M4 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16"/><path d="M13 10h5a1 1 0 0 1 1 1v10"/><path d="M2 21h20"/><path d="M7 8h1M10 8h1M7 12h1M10 12h1M7 16h1M10 16h1"/>' },
    pld:      { color: '#0891B2', svg: '<path d="M12 3c-3.2 4-6 7.6-6 10.6a6 6 0 0 0 12 0C18 10.6 15.2 7 12 3z"/>' },
    pcip:     { color: '#D97706', svg: '<ellipse cx="12" cy="14" rx="4.5" ry="6"/><path d="M12 8v12"/><path d="M9 5.5 7.5 4M15 5.5 16.5 4"/><circle cx="12" cy="6" r="1.5"/>' },
    residuos: { color: '#059669', svg: '<path d="M4 12a8 8 0 0 1 14.5-4.5M20 12a8 8 0 0 1-14.5 4.5"/><path d="M17 4v4h-4"/><path d="M7 20v-4h4"/>' },
    agua:     { color: '#0284C7', svg: '<path d="M3 17c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/><path d="M3 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/>' },
  };
  function _progIcon(id, size) {
    const p = PROG_ICONS[id] || PROG_ICONS.infra;
    size = size || 20;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0;">${p.svg}</svg>`;
  }

  // Estado de sesión (se inicializa en render() desde localStorage)
  let _disabled = new Set();
  let _complementarios   = [];

  /* ────────────────────────────── render ──────────────────────────────── */
  function render() {
    const insp = Store.getCurrentInspeccion();
    if (!insp) return `
      <div class="coming-soon">
        <div class="coming-soon-icon" style="display:flex;justify-content:center;color:var(--color-ink3);">${AppIcons.block('circleAlert', 40)}</div>
        <div class="coming-soon-title">Sin inspección activa</div>
        <div class="coming-soon-desc">Primero configure el establecimiento en PLANIFICAR.</div>
        <button class="btn btn-primary mt-md" style="width:auto;padding:12px 24px"
          onclick="Router.go('planificar')">Ir a Planificar</button>
      </div>`;

    const cfg  = ChecklistConfig.getConfig(insp.establecimiento);
    _disabled  = cfg.disabled;
    _complementarios = cfg.complementarios;

    const base = getPSBPrograms();
    const totalActivos = base.reduce((n, p) => {
      const activos = p.aspectos.filter(a => !_disabled.has(a.id)).length;
      const compProg = _complementarios.filter(c => c.programaId === p.id).length;
      return n + activos + compProg;
    }, 0);

    return `
      <div class="screen-header">
        <div class="screen-fase-badge badge-P" style="font-size:11px;padding:3px 8px;display:inline-flex;align-items:center;gap:6px;">
          ${AppIcons.icon('sliders', 12)} PERSONALIZAR
        </div>
        <div class="screen-title" style="font-size:17px;">Checklist del establecimiento</div>
        <div class="screen-subtitle">${_esc(insp.establecimiento.nombre)}</div>
      </div>

      <div style="font-size:12px;color:var(--color-ink3);margin-bottom:14px;padding:0 2px;
        line-height:1.5;">
        Active o desactive ítems según aplique. Los desactivados no aparecen en HACER ni en el acta.
        <strong style="color:var(--color-primary);">${totalActivos} ítems activos.</strong>
      </div>

      ${base.map(prog => _renderPrograma(prog)).join('')}

      ${_renderFormComplementario()}

      <button onclick="Personalizar.comenzar()" class="btn btn-primary"
        style="width:100%;padding:14px;font-size:15px;font-weight:700;margin-top:6px;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        Comenzar inspección ${AppIcons.icon('arrowRight', 16)}
      </button>
      <div style="height:40px;"></div>`;
  }

  function _renderPrograma(prog) {
    const custProg = _complementarios.filter(c => c.programaId === prog.id);
    const activos  = prog.aspectos.filter(a => !_disabled.has(a.id)).length + custProg.length;
    return `
      <div style="margin-bottom:14px;border-radius:var(--radius-md);
        border:1px solid var(--color-border);overflow:hidden;">
        <div style="background:var(--color-primary);color:#fff;padding:8px 12px;
          display:flex;justify-content:space-between;align-items:center;">
          <span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;">
            ${_progIcon(prog.id, 18)} ${prog.nombre}
          </span>
          <span style="font-size:10px;opacity:0.8;">${activos} activos</span>
        </div>
        ${prog.aspectos.map((asp, i) => {
          const on = !_disabled.has(asp.id);
          return `
            <label style="display:flex;align-items:flex-start;gap:10px;padding:9px 12px;
              cursor:pointer;${i < prog.aspectos.length - 1 || custProg.length
                ? 'border-bottom:1px solid #F3F4F6;' : ''}
              background:${on ? '#fff' : '#FEF9F9'};">
              <input type="checkbox" ${on ? 'checked' : ''}
                onchange="Personalizar.toggleItem('${asp.id}', this.checked)"
                style="margin-top:2px;width:15px;height:15px;
                  accent-color:var(--color-primary);flex-shrink:0;">
              <div style="flex:1;min-width:0;">
                <div style="font-size:12px;color:${on ? 'var(--color-ink)' : '#9CA3AF'};
                  ${on ? '' : 'text-decoration:line-through;'}">${_esc(asp.texto)}</div>
                <div style="font-size:10px;color:#9CA3AF;margin-top:1px;">${_esc(asp.norma)}</div>
              </div>
            </label>`;
        }).join('')}
        ${custProg.map((c, i) => `
          <div style="display:flex;align-items:flex-start;gap:10px;padding:9px 12px;
            background:#F0FDF4;${i < custProg.length - 1 ? 'border-bottom:1px solid #D1FAE5;' : ''}">
            <div style="width:15px;height:15px;border-radius:50%;
              background:var(--color-accent);flex-shrink:0;margin-top:2px;
              display:flex;align-items:center;justify-content:center;color:#fff;">
              ${AppIcons.icon('check', 9)}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:12px;color:var(--color-ink);font-weight:600;">
                ${_esc(c.nombre)}</div>
              ${c.norma ? `<div style="font-size:10px;color:#9CA3AF;margin-top:1px;">${_esc(c.norma)}</div>` : ''}
            </div>
            <button onclick="Personalizar.eliminarComplementaria('${c.id}')"
              style="border:none;background:none;cursor:pointer;color:#EF4444;
                line-height:1;padding:0 0 0 8px;flex-shrink:0;display:inline-flex;align-items:center;">
              ${AppIcons.icon('x', 16)}</button>
          </div>`).join('')}
      </div>`;
  }

  function _renderFormComplementario() {
    return `
      <div style="background:var(--color-surface);border-radius:var(--radius-md);
        border:1.5px dashed var(--color-border);padding:14px;margin-bottom:10px;">
        <div style="font-size:13px;font-weight:700;color:var(--color-primary);margin-bottom:10px;display:flex;align-items:center;gap:6px;">
          ${AppIcons.row('plus', 'Agregar ítem personalizado', 14)}
        </div>
        <div class="form-group" style="margin-bottom:8px;">
          <input class="form-input" id="cust-nombre" type="text"
            placeholder="Descripción del ítem *" style="font-size:13px;">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
          <select class="form-select" id="cust-programa" style="font-size:13px;">
            <option value="">Programa *</option>
            <option value="infra">Infraestructura</option>
            <option value="pld">Limpieza/Desinf.</option>
            <option value="pcip">Control Plagas</option>
            <option value="residuos">Residuos</option>
            <option value="agua">Agua Potable</option>
          </select>
          <input class="form-input" id="cust-norma" type="text"
            placeholder="Norma (opcional)" style="font-size:13px;">
        </div>
        <button onclick="Personalizar.agregarComplementaria()"
          class="btn btn-accent" style="width:100%;padding:10px;font-size:13px;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
          ${AppIcons.row('plus', 'Agregar ítem', 14)}
        </button>
      </div>`;
  }

  /* ───────────────────────── acciones ─────────────────────────────────── */
  function toggleItem(aspectoId, active) {
    if (active) _disabled.delete(aspectoId);
    else        _disabled.add(aspectoId);
    _saveAndRefresh();
  }

  function agregarComplementaria() {
    const nombre     = document.getElementById('cust-nombre')?.value.trim();
    const programaId = document.getElementById('cust-programa')?.value;
    const norma      = document.getElementById('cust-norma')?.value.trim();
    if (!nombre || !programaId) {
      Router.toast('Complete descripción y programa');
      return;
    }
    _complementarios.push({ id: 'cust_' + Date.now(), nombre, programaId, norma });
    _saveAndRefresh();
  }

  function eliminarComplementaria(id) {
    _complementarios = _complementarios.filter(c => c.id !== id);
    _saveAndRefresh();
  }

  function comenzar() {
    const insp = Store.getCurrentInspeccion();
    if (!insp) return;
    const config = ChecklistConfig.getConfig(insp.establecimiento);
    // Siempre aplica desde el catálogo base para evitar doble filtrado
    insp.programas = ChecklistConfig.applyConfig(getPSBPrograms(), config);
    Store.upsertInspeccion(insp);
    Store.setUI({ programaIdx: 0, aspectoIdx: 0 });
    Router.toast('Checklist configurado');
    Router.go('hacer');
  }

  function _saveAndRefresh() {
    const insp = Store.getCurrentInspeccion();
    if (!insp) return;
    ChecklistConfig.saveConfig(insp.establecimiento, _disabled, _complementarios);
    _refresh();
  }

  function _refresh() {
    const area = document.getElementById('screen-area');
    if (area) area.innerHTML = render();
  }

  function attach() {}


  return { render, attach, toggleItem, agregarComplementaria, eliminarComplementaria, comenzar };
})();
