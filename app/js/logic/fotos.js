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

  // Mismo patrón que _uuid() en logic/vencimientos-v2-crud.js. El id de la
  // foto es parte del path del bucket y su imprevisibilidad es la única
  // mitigación de que SELECT esté abierto a anon (ver fotos-storage.js):
  // 'foto-' + Date.now() era trivialmente adivinable.
  function _fotoId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function _tecnicoIdActual() {
    try {
      return (typeof ScInformes !== 'undefined' && ScInformes.getSesionCache)
        ? (ScInformes.getSesionCache()?.id || null) : null;
    } catch (e) { return null; }
  }

  // La subida resuelve después de que la foto ya está guardada en el Store, y
  // para entonces el técnico pudo haber cambiado de inspección: se busca el
  // registro por id en el estado vigente en vez de confiar en la referencia
  // capturada (que sigue como respaldo si el estado se recargó desde IndexedDB).
  function _marcarSubida(inspeccionId, fotoId, subida, registro) {
    const inspeccion = (Store.get().inspecciones || []).find(i => i.id === inspeccionId);
    if (!inspeccion) { if (registro) registro.subida = subida; return; }
    let encontrada = false;
    (inspeccion.programas || []).forEach(p => (p.aspectos || []).forEach(a => {
      [a, ...(a.criterios_extra || [])].forEach(item => (item.fotografias || []).forEach(f => {
        if (f.id === fotoId) { f.subida = subida; encontrada = true; }
      }));
    }));
    if (!encontrada) { if (registro) registro.subida = subida; return; }
    Store.upsertInspeccion(inspeccion);
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

      const fotoId = _fotoId();
      _previewCache.set(fotoId, URL.createObjectURL(foto.blob));

      const tecnicoId = _tecnicoIdActual();
      if (tecnicoId && typeof FotosStorage !== 'undefined') {
        const objectPath = FotosStorage.path(tecnicoId, inspeccion.id, fotoId);
        // `subida` arranca en false porque la foto se registra ANTES de saber
        // si el blob llegó al bucket. Mientras siga en false su path no se
        // publica en fotos_urls (ver _recolectarFotosUrls en phva/actuar.js) y
        // el acta no queda con un <img> roto.
        const registro = { id: fotoId, path: objectPath, tomada_en: new Date().toISOString(), subida: false };
        destino.fotografias.push(registro);
        const inspeccionId = inspeccion.id;
        FotosStorage.subirFoto(foto.blob, tecnicoId, inspeccionId, fotoId).then(res => {
          // Subida en firme O encolada para reintento: en ambos casos el path
          // va a existir. Solo `!ok && !encolado` es pérdida real (ni se subió
          // ni se pudo guardar en la cola de IndexedDB).
          const subida = !!(res && (res.ok || res.encolado));
          _marcarSubida(inspeccionId, fotoId, subida, registro);
          if (!subida) {
            Router.toast('La foto quedó solo en este equipo: no se pudo subir ni encolar');
          } else if (!res.ok) {
            Router.toast('Foto guardada · se subirá cuando haya conexión');
          } else {
            Router.toast('Foto guardada y optimizada');
          }
          if (typeof Hacer !== 'undefined' && Hacer.refresh) Hacer.refresh();
        });
      } else {
        // Sin sesión activa: no hay tecnico_id para el path del bucket.
        // Se conserva localmente en base64 como red de seguridad (no bloquea
        // la captura).
        // ponytail: fallback sin sesión activa guarda base64 local y nunca
        // migra a Storage al iniciar sesión después — revive el problema de
        // tamaño que este cambio buscaba resolver.
        destino.fotografias.push({ id: fotoId, data: await _blobToDataUrl(foto.blob), tomada_en: new Date().toISOString() });
        Router.toast('Foto guardada y optimizada');
      }

      Store.upsertInspeccion(inspeccion);
      if (typeof Hacer !== 'undefined' && Hacer.refresh) Hacer.refresh();
    } catch (error) {
      console.warn('Foto no procesada', error);
      Router.toast('No se pudo procesar la foto. Intenta con otra imagen.');
    }
  }

  // ponytail: al eliminar una foto localmente no se borra del bucket ni del
  // outbox — queda huérfana en Storage si ya se subió/encoló.
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
