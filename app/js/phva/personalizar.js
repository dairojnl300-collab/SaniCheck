// Paso obligatorio previo a HACER. El catálogo oficial no admite ítems genéricos.
const Personalizar = (() => {
  const ICONOS = { edificacion: 'building', equipos: 'clipboardCheck', personal: 'shieldCheck', higienicos: 'listCheck', saneamiento: 'scale' };
  const abiertos = new Set();
  function render() {
    const inspeccion = Store.getCurrentInspeccion();
    if (!inspeccion) return _vacio();
    const total = getPSBPrograms().flatMap(p => p.aspectos).length;
    return `<div class="screen-header">${PhvaIcons.badge('P', 'PERSONALIZAR')}<div class="screen-title">Aspectos a evaluar</div><div class="screen-subtitle">${_esc(inspeccion.establecimiento.nombre || '')}</div></div>
      <div class="catalog-note">${AppIcons.icon('info', 14)} Adaptación operativa ECODESA: ${total} aspectos del instructivo, cinco bloques y escala A / I / N-A.</div>
      ${getPSBPrograms().map(p => `<section class="catalog-block"><button class="catalog-block-head" aria-expanded="${abiertos.has(p.id)}" onclick="Personalizar.toggleBloque('${p.id}')">${AppIcons.row(ICONOS[p.id], p.nombre, 15)}<span>${p.peso.toFixed(1)}% ${AppIcons.icon(abiertos.has(p.id) ? 'chevronUp' : 'chevronDown', 15)}</span></button><div class="catalog-items ${abiertos.has(p.id) ? 'open' : ''}">${p.aspectos.map((a, i) => `<div class="catalog-item"><b>${i + 1}.</b><div>${_esc(a.texto)}<small>${_esc(a.norma)}</small></div></div>`).join('')}</div></section>`).join('')}
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
    if (typeof ScInformes !== 'undefined' && ScInformes.programarBorradorActual) ScInformes.programarBorradorActual();
    Store.setUI({ programaIdx: 0, aspectoIdx: 0 }); Router.go('hacer');
  }
  function toggleBloque(id) { abiertos.has(id) ? abiertos.delete(id) : abiertos.add(id); const area = document.getElementById('screen-area'); if (area) area.innerHTML = render(); }
  function _vacio() { return `<div class="coming-soon"><div class="coming-soon-icon">${AppIcons.block('circleAlert', 40)}</div><div class="coming-soon-title">Sin inspección activa</div><button class="btn btn-primary mt-md" onclick="Router.go('planificar')">Ir a Planificar</button></div>`; }
  return { render, attach() {}, comenzar, toggleBloque };
})();
