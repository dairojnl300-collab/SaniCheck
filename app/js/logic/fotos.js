// fotos.js — Captura y gestión de fotografías por aspecto (PWA mobile)

const Fotos = (() => {
  let _pendingProgramaIdx = null;
  let _pendingAspectoIdx  = null;

  function _ensureInput() {
    let inp = document.getElementById('_foto-hidden-input');
    if (!inp) {
      inp = document.createElement('input');
      inp.type    = 'file';
      inp.id      = '_foto-hidden-input';
      inp.accept  = 'image/*';
      inp.setAttribute('capture', 'environment');
      inp.style.display = 'none';
      inp.addEventListener('change', _onCaptura);
      document.body.appendChild(inp);
    }
    return inp;
  }

  function capturar(programaIdx, aspectoIdx) {
    _pendingProgramaIdx = programaIdx;
    _pendingAspectoIdx  = aspectoIdx;
    const inp = _ensureInput();
    inp.value = '';
    inp.click();
  }

  function _onCaptura(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      const inspeccion = Store.getCurrentInspeccion();
      if (!inspeccion) return;
      const aspecto = inspeccion.programas[_pendingProgramaIdx]
                        ?.aspectos[_pendingAspectoIdx];
      if (!aspecto) return;
      if (!aspecto.fotografias) aspecto.fotografias = [];
      aspecto.fotografias.push({
        id:        'foto-' + Date.now(),
        data:      ev.target.result,
        tomada_en: new Date().toISOString(),
      });
      Store.upsertInspeccion(inspeccion);
      Router.toast('📷 Foto guardada');
      if (typeof Hacer !== 'undefined' && Hacer.refresh) Hacer.refresh();
    };
    reader.readAsDataURL(file);
  }

  function eliminar(programaIdx, aspectoIdx, fotoId) {
    const inspeccion = Store.getCurrentInspeccion();
    if (!inspeccion) return;
    const aspecto = inspeccion.programas[programaIdx]?.aspectos[aspectoIdx];
    if (!aspecto) return;
    aspecto.fotografias = (aspecto.fotografias || []).filter(f => f.id !== fotoId);
    Store.upsertInspeccion(inspeccion);
    if (typeof Hacer !== 'undefined' && Hacer.refresh) Hacer.refresh();
  }

  function renderThumbnails(fotografias, programaIdx, aspectoIdx) {
    if (!fotografias || !fotografias.length) return '';
    return `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
      ${fotografias.map(f => `
        <div style="position:relative;width:72px;height:72px;">
          <img src="${f.data}" alt="foto"
            style="width:72px;height:72px;object-fit:cover;border-radius:8px;
              border:1px solid var(--color-border);">
          <button onclick="Fotos.eliminar(${programaIdx},${aspectoIdx},'${f.id}')"
            style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;
              border-radius:50%;border:none;background:var(--color-deficiente);
              color:#fff;font-size:11px;cursor:pointer;line-height:20px;padding:0;">✕</button>
        </div>`).join('')}
    </div>`;
  }

  return { capturar, eliminar, renderThumbnails };
})();
