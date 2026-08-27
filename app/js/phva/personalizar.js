// Paso obligatorio previo a HACER. El catálogo oficial no admite ítems genéricos.
const Personalizar = (() => {
  const ICONOS = { edificacion: 'building', equipos: 'clipboardCheck', personal: 'shieldCheck', higienicos: 'listCheck', saneamiento: 'scale' };
  function render() {
    const inspeccion = Store.getCurrentInspeccion();
    if (!inspeccion) return _vacio();
    const total = getPSBPrograms().flatMap(p => p.aspectos).length;
    return `<div class="screen-header">${PhvaIcons.badge('P', 'PERSONALIZAR')}<div class="screen-title">Checklist oficial</div><div class="screen-subtitle">${_esc(inspeccion.establecimiento.nombre || '')}</div></div>
      <div class="catalog-note">${AppIcons.icon('info', 14)} Adaptación operativa ECODESA: ${total} aspectos oficiales, cinco bloques y escala A / I / N-A.</div>
      ${getPSBPrograms().map(p => `<section class="catalog-block"><div class="catalog-block-head">${AppIcons.row(ICONOS[p.id], p.nombre, 15)}<span>${p.peso.toFixed(1)}%</span></div>${p.aspectos.map((a, i) => `<div class="catalog-item"><b>${i + 1}.</b><div>${_esc(a.texto)}<small>${_esc(a.norma)}</small></div></div>`).join('')}</section>`).join('')}
      <button class="btn btn-primary" style="width:100%;display:inline-flex;justify-content:center;align-items:center;gap:6px;" onclick="Personalizar.comenzar()">${AppIcons.row('arrowRight', 'Comenzar inspección', 15)}</button><div style="height:32px"></div>`;
  }
  function comenzar() {
    const inspeccion = Store.getCurrentInspeccion();
    if (!inspeccion) return;
    const config = ChecklistConfig.getConfig(inspeccion.establecimiento);
    // La versión 2 descarta exclusiones y complementarios de configuraciones previas.
    config.disabled = new Set(); config.complementarios = [];
    inspeccion.programas = ChecklistConfig.applyConfig(getPSBPrograms(), config);
    inspeccion.fase_phva = 'H'; Scores.calcular(inspeccion); Store.upsertInspeccion(inspeccion);
    Store.setUI({ programaIdx: 0, aspectoIdx: 0 }); Router.go('hacer');
  }
  function _vacio() { return `<div class="coming-soon"><div class="coming-soon-icon">${AppIcons.block('circleAlert', 40)}</div><div class="coming-soon-title">Sin inspección activa</div><button class="btn btn-primary mt-md" onclick="Router.go('planificar')">Ir a Planificar</button></div>`; }
  return { render, attach() {}, comenzar };
})();
