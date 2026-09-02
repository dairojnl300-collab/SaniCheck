// fotos.js — Captura y gestión de fotografías por aspecto (PWA mobile)

const Fotos = (() => {
  let _pendingProgramaIdx = null;
  let _pendingAspectoIdx  = null;
  let _pendingCriterioIdx = null;

  function _ensureInput() {
    let inp = document.getElementById('_foto-hidden-input');
    if (!inp) {
      inp = document.createElement('input');
      inp.type    = 'file';
      inp.id      = '_foto-hidden-input';
      inp.accept  = 'image/*';
      inp.style.display = 'none';
      inp.addEventListener('change', _onCaptura);
      document.body.appendChild(inp);
    }
    return inp;
  }

  function capturar(programaIdx, aspectoIdx, criterioIdx) {
    _pendingProgramaIdx = programaIdx;
    _pendingAspectoIdx  = aspectoIdx;
    _pendingCriterioIdx = Number.isInteger(criterioIdx) ? criterioIdx : null;
    const inp = _ensureInput();
    inp.value = '';
    inp.click();
  }

  const FOTO_MAX_PX = 1280;
  const FOTO_MAX_BYTES = 350 * 1024;
  const FOTO_CALIDADES = [0.78, 0.64, 0.52, 0.40];
  const FOTO_ESCALAS = [1, 0.82, 0.68, 0.56, 0.46];

  function _blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('No se pudo leer la foto procesada'));
      reader.readAsDataURL(blob);
    });
  }

  async function _comprimirFoto(file) {
    let bitmap;
    try {
      if (typeof createImageBitmap === 'function') {
        try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
        catch { bitmap = await createImageBitmap(file); }
      } else {
        const original = await _blobToDataUrl(file);
        bitmap = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error('No se pudo abrir la foto'));
          image.src = original;
        });
      }
      const width = bitmap.width || bitmap.naturalWidth;
      const height = bitmap.height || bitmap.naturalHeight;
      if (!width || !height) throw new Error('La foto no tiene dimensiones válidas');
      const canvas = document.createElement('canvas');
      const baseScale = Math.min(1, FOTO_MAX_PX / Math.max(width, height));
      for (const dimensionScale of FOTO_ESCALAS) {
        const scale = baseScale * dimensionScale;
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('El navegador no pudo preparar la foto');
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        let lastBlob = null;
        for (const quality of FOTO_CALIDADES) {
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
          if (blob && blob.size <= FOTO_MAX_BYTES) return { data: await _blobToDataUrl(blob), size: blob.size };
          if (blob) lastBlob = blob;
        }
        if (lastBlob && dimensionScale === FOTO_ESCALAS[FOTO_ESCALAS.length - 1]) {
          return { data: await _blobToDataUrl(lastBlob), size: lastBlob.size };
        }
      }
      throw new Error('No se pudo comprimir la foto');
    } finally {
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
    }
  }

  async function _onCaptura(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const foto = await _comprimirFoto(file);
      const inspeccion = Store.getCurrentInspeccion();
      if (!inspeccion) return;
      const aspecto = inspeccion.programas[_pendingProgramaIdx]
                        ?.aspectos[_pendingAspectoIdx];
      const destino = _pendingCriterioIdx !== null && Array.isArray(aspecto.criterios_extra)
        ? aspecto.criterios_extra[_pendingCriterioIdx] : aspecto;
      if (!destino) return;
      if (!destino.fotografias) destino.fotografias = [];
      destino.fotografias.push({
        id:        'foto-' + Date.now(),
        data:      foto.data,
        tomada_en: new Date().toISOString(),
      });
      Store.upsertInspeccion(inspeccion);
      Router.toast('Foto guardada y optimizada');
      if (typeof Hacer !== 'undefined' && Hacer.refresh) Hacer.refresh();
    } catch (error) {
      console.warn('Foto no procesada', error);
      Router.toast('No se pudo procesar la foto. Intenta con otra imagen.');
    }
  }

  function eliminar(programaIdx, aspectoIdx, fotoId, criterioIdx) {
    const inspeccion = Store.getCurrentInspeccion();
    if (!inspeccion) return;
    const aspecto = inspeccion.programas[programaIdx]?.aspectos[aspectoIdx];
    if (!aspecto) return;
    const destino = Number.isInteger(criterioIdx) && Array.isArray(aspecto.criterios_extra) ? aspecto.criterios_extra[criterioIdx] : aspecto;
    if (!destino) return;
    destino.fotografias = (destino.fotografias || []).filter(f => f.id !== fotoId);
    Store.upsertInspeccion(inspeccion);
    if (typeof Hacer !== 'undefined' && Hacer.refresh) Hacer.refresh();
  }

  function renderThumbnails(fotografias, programaIdx, aspectoIdx, criterioIdx) {
    if (!fotografias || !fotografias.length) return '';
    return `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
      ${fotografias.map(f => `
        <div style="position:relative;width:72px;height:72px;">
          <img src="${f.data}" alt="foto"
            style="width:72px;height:72px;object-fit:cover;border-radius:8px;
              border:1px solid var(--color-border);">
          <button onclick="Fotos.eliminar(${programaIdx},${aspectoIdx},'${f.id}',${Number.isInteger(criterioIdx) ? criterioIdx : 'null'})"
            style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;
              border-radius:50%;border:none;background:var(--color-deficiente);
              color:#fff;cursor:pointer;line-height:20px;padding:0;display:inline-flex;align-items:center;justify-content:center;">
            ${AppIcons.icon('x', 11)}</button>
        </div>`).join('')}
    </div>`;
  }

  return { capturar, eliminar, renderThumbnails };
})();
