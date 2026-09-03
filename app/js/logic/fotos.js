// fotos.js — Captura y gestión de fotografías por aspecto (PWA mobile)

const Fotos = (() => {
  let _pendingProgramaIdx = null;
  let _pendingAspectoIdx  = null;
  let _pendingCriterioIdx = null;

  // Preview local de la miniatura recién capturada (solo memoria, nunca se
  // persiste en Store): fotografias[] ahora guarda {id, path, tomada_en},
  // no el dataURL. Se limpia con revokeObjectURL cuando ya no se usa.
  const _previewCache = new Map();

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
          if (blob && blob.size <= FOTO_MAX_BYTES) return { blob, size: blob.size };
          if (blob) lastBlob = blob;
        }
        if (lastBlob && dimensionScale === FOTO_ESCALAS[FOTO_ESCALAS.length - 1]) {
          return { blob: lastBlob, size: lastBlob.size };
        }
      }
      throw new Error('No se pudo comprimir la foto');
    } finally {
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
    }
  }

  function _tecnicoIdActual() {
    try {
      return (typeof ScInformes !== 'undefined' && ScInformes.getSesionCache)
        ? (ScInformes.getSesionCache()?.id || null) : null;
    } catch (e) { return null; }
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

      const fotoId = 'foto-' + Date.now();
      _previewCache.set(fotoId, URL.createObjectURL(foto.blob));

      const tecnicoId = _tecnicoIdActual();
      if (tecnicoId && typeof FotosStorage !== 'undefined') {
        const objectPath = FotosStorage.path(tecnicoId, inspeccion.id, fotoId);
        destino.fotografias.push({ id: fotoId, path: objectPath, tomada_en: new Date().toISOString() });
        FotosStorage.subirFoto(foto.blob, tecnicoId, inspeccion.id, fotoId).then(res => {
          if (!res.ok && res.encolado && typeof Hacer !== 'undefined' && Hacer.refresh) {
            // Sigue local; se reintentará sola al volver la conexión.
          }
        });
      } else {
        // Sin sesión activa: no hay tecnico_id para el path del bucket.
        // Se conserva localmente en base64 como red de seguridad (no bloquea
        // la captura); se sube cuando el técnico inicie sesión y vuelva a
        // guardar el informe.
        destino.fotografias.push({ id: fotoId, data: await _blobToDataUrl(foto.blob), tomada_en: new Date().toISOString() });
      }

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
    const preview = _previewCache.get(fotoId);
    if (preview) { URL.revokeObjectURL(preview); _previewCache.delete(fotoId); }
    if (typeof Hacer !== 'undefined' && Hacer.refresh) Hacer.refresh();
  }

  function renderThumbnails(fotografias, programaIdx, aspectoIdx, criterioIdx) {
    if (!fotografias || !fotografias.length) return '';
    return `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
      ${fotografias.map(f => { const src = _previewCache.get(f.id) || f.data || ''; return `
        <div style="position:relative;width:72px;height:72px;">
          <img${src ? ` src="${src}"` : ''}${f.path ? ` data-foto-path="${f.path}"` : ''} alt="foto"
            style="width:72px;height:72px;object-fit:cover;border-radius:8px;
              border:1px solid var(--color-border);background:#F3F4F6;">
          <button onclick="Fotos.eliminar(${programaIdx},${aspectoIdx},'${f.id}',${Number.isInteger(criterioIdx) ? criterioIdx : 'null'})"
            style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;
              border-radius:50%;border:none;background:var(--color-deficiente);
              color:#fff;cursor:pointer;line-height:20px;padding:0;display:inline-flex;align-items:center;justify-content:center;">
            ${AppIcons.icon('x', 11)}</button>
        </div>`; }).join('')}
    </div>`;
  }

  // Miniaturas sin preview en memoria (recarga de página, foto ya subida en
  // una sesión anterior): descarga perezosa desde Storage.
  function hidratarMiniaturas(root) {
    const scope = root || document;
    const imgs = scope.querySelectorAll('img[data-foto-path]:not([src])');
    imgs.forEach(img => {
      const p = img.getAttribute('data-foto-path');
      if (!p || typeof FotosStorage === 'undefined') return;
      FotosStorage.descargarFotoBlob(p).then(blob => {
        img.src = URL.createObjectURL(blob);
      }).catch(() => {});
    });
  }

  return { capturar, eliminar, renderThumbnails, hidratarMiniaturas };
})();
