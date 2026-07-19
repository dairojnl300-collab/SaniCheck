/**
 * vencimientos-v2-crud.js — CRUD vencimientos v2 + sync Supabase + UI helpers
 * localStorage: sanicheck_vencimientos_v2
 */
const VencimientosV2 = (() => {
  'use strict';

  const LS_KEY = 'sanicheck_vencimientos_v2';
  const LS_QUEUE = 'sanicheck_vencimientos_pending_v2';

  let _catalog = null;
  let _syncing = false;

  const CATALOG_FALLBACK = {
    categorias: {
      personal: {
        label: 'Personal',
        tipos: [
          { id: 'manipulacion', label: 'Manipulación de alimentos', normativa: 'Decreto 3075/1997, Art. 11' },
          { id: 'medico', label: 'Examen médico ocupacional', normativa: 'Resolución 2674/2013' },
          { id: 'sst', label: 'Inducción SST / capacitación', normativa: 'Decreto 1072/2015, Cap. 6' },
        ],
      },
      equipos: {
        label: 'Equipos',
        tipos: [
          { id: 'calibracion', label: 'Certificado de calibración', normativa: 'Decreto 1072/2015' },
          { id: 'mantenimiento', label: 'Mantenimiento preventivo', normativa: 'Decreto 3075/1997' },
        ],
      },
      establecimiento: {
        label: 'Establecimiento',
        tipos: [
          { id: 'plagas', label: 'Fumigación / control de plagas', normativa: 'Resolución 2674/2013' },
          { id: 'analisis_agua', label: 'Análisis de agua', normativa: 'Resolución 2115/2007' },
          { id: 'custom', label: 'Documento personalizado', normativa: '', custom: true },
        ],
      },
    },
    frecuencias: [
      { id: 'anual', label: 'Anual' },
      { id: 'semestral', label: 'Semestral' },
      { id: 'trimestral', label: 'Trimestral' },
      { id: 'custom', label: 'Personalizada' },
    ],
    estados: {
      vigente: { label: 'Vigente', cls: 'estado-B' },
      por_vencer_60: { label: 'Por vencer (60d)', cls: 'estado-R' },
      por_vencer_30: { label: 'Por vencer (30d)', cls: 'estado-R' },
      vencido: { label: 'Vencido', cls: 'estado-D' },
    },
  };

  function _uid() {
    return 'v2-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function _uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function getCatalog() {
    return _catalog || CATALOG_FALLBACK;
  }

  async function loadCatalog() {
    if (_catalog) return _catalog;
    try {
      const res = await fetch('data/vencimientos-tipos.json');
      if (res.ok) {
        const data = await res.json();
        _catalog = { ...CATALOG_FALLBACK, ...data, estados: CATALOG_FALLBACK.estados };
        return _catalog;
      }
    } catch (_) { /* offline */ }
    _catalog = CATALOG_FALLBACK;
    return _catalog;
  }

  function _loadStore() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const data = raw ? JSON.parse(raw) : { items: [] };
      if (!Array.isArray(data.items)) data.items = [];
      return data;
    } catch (_) {
      return { items: [] };
    }
  }

  function _saveStore(data) {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }

  function calcularEstado(fechaVencimiento) {
    if (!fechaVencimiento) return 'vigente';
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = new Date(String(fechaVencimiento).slice(0, 10) + 'T00:00:00');
    if (Number.isNaN(venc.getTime())) return 'vigente';
    const dias = Math.round((venc - hoy) / 86400000);
    if (dias < 0) return 'vencido';
    if (dias <= 30) return 'por_vencer_30';
    if (dias <= 60) return 'por_vencer_60';
    return 'vigente';
  }

  function _establecimientoId() {
    return typeof PortalCliente !== 'undefined' ? PortalCliente.getEstablecimientoId() : '';
  }

  function _portalActivo() {
    return typeof PortalCliente !== 'undefined' && PortalCliente.isActivo();
  }

  function _headers(prefer) {
    const cfg = window.SANICHECK_PORTAL_CONFIG;
    const codigo = typeof PortalCliente !== 'undefined' ? PortalCliente.getCodigoAcceso() : '';
    const h = {
      apikey: cfg.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + cfg.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'x-sanicheck-codigo-acceso': codigo ? String(codigo).trim().toUpperCase() : '',
    };
    if (prefer) h.Prefer = prefer;
    return h;
  }

  function _rest(path) {
    return window.SANICHECK_PORTAL_CONFIG.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + path;
  }

  function obtenerVencimientos(categoria) {
    const store = _loadStore();
    let items = store.items.map(it => ({
      ...it,
      estado: calcularEstado(it.fecha_vencimiento),
    }));
    if (categoria) items = items.filter(it => it.categoria === categoria);
    return items.sort((a, b) => (a.fecha_vencimiento || '').localeCompare(b.fecha_vencimiento || ''));
  }

  function _tipoDuplicado(estId, tipo, categoria, excludeId) {
    if (!tipo || tipo === 'custom') return false;
    return _loadStore().items.some(it =>
      it.establecimiento_id === estId &&
      it.categoria === categoria &&
      it.tipo === tipo &&
      !it.custom &&
      it.id !== excludeId
    );
  }

  function _validarPayload(payload, isUpdate, excludeId, file) {
    if (!payload.nombre || !String(payload.nombre).trim()) {
      throw new Error('Indique el nombre del documento.');
    }
    if (!payload.fecha_vencimiento) {
      throw new Error('Indique la fecha de vencimiento.');
    }
    if (payload.fecha_emision && payload.fecha_vencimiento) {
      const em = new Date(String(payload.fecha_emision).slice(0, 10) + 'T00:00:00');
      const ve = new Date(String(payload.fecha_vencimiento).slice(0, 10) + 'T00:00:00');
      if (!Number.isNaN(em.getTime()) && !Number.isNaN(ve.getTime()) && em >= ve) {
        throw new Error('La fecha de emisión debe ser anterior al vencimiento.');
      }
    }
    if (!isUpdate) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const venc = new Date(String(payload.fecha_vencimiento).slice(0, 10) + 'T00:00:00');
      if (venc < hoy) {
        throw new Error('La fecha de vencimiento debe ser futura.');
      }
    }
    const estId = payload.establecimiento_id || _establecimientoId() || 'local-pending';
    if (_tipoDuplicado(estId, payload.tipo, payload.categoria, excludeId)) {
      throw new Error('Ya existe este documento');
    }
    if (file) {
      const val = VencimientosStorage.validarArchivo(file);
      if (!val.ok) throw new Error(val.error);
    }
  }

  function validateData(payload, file, isUpdate, excludeId) {
    _validarPayload(payload, isUpdate, excludeId, file);
  }

  function _rowToSupabase(item) {
    return {
      id: item.id,
      establecimiento_id: item.establecimiento_id,
      categoria: item.categoria,
      tipo: item.tipo,
      tipo_label: item.tipo_label || null,
      nombre: item.nombre,
      fecha_emision: item.fecha_emision || null,
      fecha_vencimiento: item.fecha_vencimiento,
      frecuencia: item.frecuencia || null,
      proveedor: item.proveedor || null,
      normativa: item.normativa || null,
      estado: calcularEstado(item.fecha_vencimiento),
      documento_storage_path: item.documento_storage_path || null,
      custom: !!item.custom,
      creado_por: item.creado_por || 'Profesional',
    };
  }

  function guardarVencimiento(payload, file) {
    const estId = payload.establecimiento_id || _establecimientoId() || 'local-pending';

    const now = new Date().toISOString();
    const item = {
      id: _uuid(),
      establecimiento_id: estId || 'local-pending',
      categoria: payload.categoria || 'establecimiento',
      tipo: payload.tipo || 'custom',
      tipo_label: payload.tipo_label || '',
      nombre: String(payload.nombre).trim(),
      fecha_emision: payload.fecha_emision || '',
      fecha_vencimiento: payload.fecha_vencimiento,
      frecuencia: payload.frecuencia || 'anual',
      proveedor: payload.proveedor || '',
      normativa: payload.normativa || '',
      estado: calcularEstado(payload.fecha_vencimiento),
      documento_storage_path: '',
      custom: payload.tipo === 'custom' || !!payload.custom,
      creado_por: 'Profesional',
      fecha_creacion: now,
      fecha_actualizacion: now,
      sincronizado_en: null,
      sync_pending: true,
      adjuntos: [],
      _local_file: null,
    };

    if (file) {
      item._local_file = { name: file.name, type: file.type, size: file.size };
      item._pending_file = true;
    }

    _validarPayload(item, false, null, file);

    const store = _loadStore();
    store.items.push(item);
    _saveStore(store);

    _syncItem(item, file).catch(err => {
      console.warn('[VencimientosV2] sync guardar', err);
      _enqueue('upsert', item.id);
    });

    return item;
  }

  function actualizarVencimiento(id, cambios, file) {
    const store = _loadStore();
    const idx = store.items.findIndex(it => it.id === id);
    if (idx < 0) throw new Error('Documento no encontrado.');

    const prev = store.items[idx];
    const item = {
      ...prev,
      ...cambios,
      fecha_actualizacion: new Date().toISOString(),
      sync_pending: true,
    };
    item.estado = calcularEstado(item.fecha_vencimiento);
    item.custom = item.tipo === 'custom' || !!item.custom;

    if (file) {
      item._pending_file = true;
      item._local_file = { name: file.name, type: file.type, size: file.size };
    }

    _validarPayload(item, true, id, file);
    store.items[idx] = item;
    _saveStore(store);

    _syncItem(item, file).catch(err => {
      console.warn('[VencimientosV2] sync actualizar', err);
      _enqueue('upsert', item.id);
    });

    return item;
  }

  async function eliminarVencimiento(id) {
    const store = _loadStore();
    const item = store.items.find(it => it.id === id);
    if (!item) return false;

    if (item.documento_storage_path && _portalActivo()) {
      try {
        await VencimientosStorage.deleteArchivoVencimiento(item.documento_storage_path);
      } catch (e) {
        console.warn('[VencimientosV2] delete storage', e);
      }
    }

    if (_portalActivo() && item.establecimiento_id && !item.establecimiento_id.startsWith('local')) {
      try {
        await fetch(_rest('vencimientos?id=eq.' + encodeURIComponent(id)), {
          method: 'DELETE',
          headers: _headers(),
        });
      } catch (e) {
        console.warn('[VencimientosV2] delete supabase', e);
        _enqueue('delete', id);
      }
    }

    store.items = store.items.filter(it => it.id !== id);
    _saveStore(store);
    return true;
  }

  async function _syncItem(item, file) {
    if (!_portalActivo()) return;
    const estId = _establecimientoId();
    if (!estId) return;

    item.establecimiento_id = estId;
    let uploadFile = file;

    if (uploadFile) {
      const up = await VencimientosStorage.uploadArchivoVencimiento(uploadFile, item.id, estId);
      item.documento_storage_path = up.storage_path;
      item.adjuntos = [{
        storage_path: up.storage_path,
        nombre_archivo: up.nombre_archivo,
        tipo_mime: up.tipo_mime,
        tamano_bytes: up.tamano_bytes,
      }];
      delete item._pending_file;
      delete item._local_file;
    }

    const row = _rowToSupabase(item);
    const res = await fetch(
      _rest('vencimientos?on_conflict=id'),
      {
        method: 'POST',
        headers: _headers('resolution=merge-duplicates,return=representation'),
        body: JSON.stringify([row]),
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error('sync vencimientos ' + res.status + ' ' + text.slice(0, 120));
    }

    if (item.adjuntos && item.adjuntos.length) {
      const adj = item.adjuntos[0];
      await fetch(_rest('vencimientos_adjuntos?on_conflict=id'), {
        method: 'POST',
        headers: _headers('resolution=merge-duplicates,return=minimal'),
        body: JSON.stringify([{
          id: _uuid(),
          vencimiento_id: item.id,
          storage_path: adj.storage_path,
          nombre_archivo: adj.nombre_archivo,
          tipo_mime: adj.tipo_mime,
          tamano_bytes: adj.tamano_bytes,
          cargado_por: 'Profesional',
        }]),
      });
    }

    const store = _loadStore();
    const idx = store.items.findIndex(it => it.id === item.id);
    if (idx >= 0) {
      store.items[idx] = {
        ...store.items[idx],
        ...item,
        sincronizado_en: new Date().toISOString(),
        sync_pending: false,
      };
      _saveStore(store);
    }
  }

  function _loadQueue() {
    try {
      const q = JSON.parse(localStorage.getItem(LS_QUEUE) || '[]');
      return Array.isArray(q) ? q : [];
    } catch (_) {
      return [];
    }
  }

  function _saveQueue(q) {
    localStorage.setItem(LS_QUEUE, JSON.stringify(q.slice(-100)));
  }

  function _enqueue(op, id) {
    const q = _loadQueue();
    q.push({ op, id, at: Date.now() });
    _saveQueue(q);
  }

  async function flushQueue() {
    if (_syncing || !navigator.onLine || !_portalActivo()) return;
    const q = _loadQueue();
    if (!q.length) return;

    _syncing = true;
    const remaining = [];
    try {
      for (const job of q) {
        try {
          if (job.op === 'delete') {
            await fetch(_rest('vencimientos?id=eq.' + encodeURIComponent(job.id)), {
              method: 'DELETE',
              headers: _headers(),
            });
          } else {
            const item = _loadStore().items.find(it => it.id === job.id);
            if (item) await _syncItem(item, null);
          }
        } catch (_) {
          remaining.push(job);
        }
      }
      _saveQueue(remaining);
    } finally {
      _syncing = false;
    }
  }

  function bindOnlineRetry() {
    window.addEventListener('online', () => flushQueue().catch(() => {}));
    setTimeout(() => flushQueue().catch(() => {}), 2000);
  }

  function getKpis() {
    const items = obtenerVencimientos();
    const total = items.length || 1;
    const counts = { vigente: 0, por_vencer_30: 0, por_vencer_60: 0, vencido: 0 };
    items.forEach(it => { counts[it.estado] = (counts[it.estado] || 0) + 1; });
    return {
      total: items.length,
      counts,
      pct: {
        vigente: Math.round((counts.vigente / total) * 100),
        por_vencer_30: Math.round((counts.por_vencer_30 / total) * 100),
        por_vencer_60: Math.round((counts.por_vencer_60 / total) * 100),
        vencido: Math.round((counts.vencido / total) * 100),
      },
    };
  }

  function getProximos30() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + 30);
    return obtenerVencimientos()
      .filter(it => {
        const v = new Date(String(it.fecha_vencimiento).slice(0, 10) + 'T00:00:00');
        return !Number.isNaN(v.getTime()) && v >= hoy && v <= limite;
      })
      .slice(0, 20);
  }

  function estadoUi(est) {
    return getCatalog().estados[est] || { label: est, cls: '' };
  }

  function renderDashboard(esc) {
    const kpi = getKpis();
    const prox = getProximos30();
    const fmt = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CO') : '—';

    return `
      <div style="border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;margin-bottom:var(--sp-md);">
        <div style="background:var(--emerald-2);color:#fff;padding:10px 14px;">
          <div style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">Dashboard v2</div>
          <div style="font-size:var(--text-sm);font-weight:700;margin-top:4px;">Control de Vencimientos</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px 14px;background:var(--color-surface);">
          ${['vigente', 'por_vencer_60', 'por_vencer_30', 'vencido'].map(k => {
            const st = estadoUi(k);
            return `<div style="text-align:center;padding:8px;background:#fff;border-radius:var(--radius-md);border:1px solid var(--color-border);">
              <div style="font-size:18px;font-weight:900;">${kpi.counts[k] || 0}</div>
              <div style="font-size:9px;color:var(--color-ink3);">${esc(st.label)}</div>
              <div style="font-size:10px;color:var(--color-ink2);">${kpi.pct[k]}%</div>
            </div>`;
          }).join('')}
        </div>
        ${prox.length ? `
        <div style="padding:10px 14px;border-top:1px solid var(--color-border);">
          <div style="font-size:var(--text-xs);font-weight:700;margin-bottom:8px;text-transform:uppercase;">Timeline próximos 30 días</div>
          ${prox.map(p => {
            const st = estadoUi(p.estado);
            return `<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px dashed var(--color-border);font-size:11px;">
              <span>${fmt(p.fecha_vencimiento)} · <strong>${esc(p.nombre)}</strong> · ${esc(p.tipo_label || p.tipo)}</span>
              <span class="estado-chip ${st.cls}">${esc(st.label)}</span>
            </div>`;
          }).join('')}
        </div>` : ''}
      </div>`;
  }

  function renderTabla(categoria, esc) {
    const rows = obtenerVencimientos(categoria);
    const fmt = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CO') : '—';
    if (!rows.length) {
      return `<div style="padding:16px;text-align:center;font-size:var(--text-sm);color:var(--color-ink3);">Sin documentos en esta categoría.</div>`;
    }
    return `
      <table style="width:100%;border-collapse:collapse;font-size:var(--text-xs);">
        <thead><tr style="background:var(--emerald-2);color:#fff;">
          <th style="padding:8px;text-align:left;">Nombre</th>
          <th style="padding:8px;text-align:left;">Tipo</th>
          <th style="padding:8px;">Emite</th>
          <th style="padding:8px;">Vencimiento</th>
          <th style="padding:8px;">Estado</th>
          <th style="padding:8px;text-align:center;">Acciones</th>
        </tr></thead>
        <tbody>
          ${rows.map((r, i) => {
            const st = estadoUi(r.estado);
            const badge = r.estado === 'vencido' ? 'estado-D' : (r.estado === 'por_vencer_30' ? 'estado-R' : st.cls);
            return `<tr style="background:${i % 2 ? 'var(--color-surface)' : '#fff'};">
              <td style="padding:8px;border-bottom:1px solid var(--color-border);font-weight:600;">${esc(r.nombre)}</td>
              <td style="padding:8px;border-bottom:1px solid var(--color-border);">${esc(r.tipo_label || r.tipo)}</td>
              <td style="padding:8px;border-bottom:1px solid var(--color-border);">${fmt(r.fecha_emision)}</td>
              <td style="padding:8px;border-bottom:1px solid var(--color-border);">${fmt(r.fecha_vencimiento)}</td>
              <td style="padding:8px;border-bottom:1px solid var(--color-border);"><span class="estado-chip ${badge}">${esc(st.label)}</span></td>
              <td style="padding:8px;border-bottom:1px solid var(--color-border);text-align:center;white-space:nowrap;">
                ${r.documento_storage_path ? `<button type="button" data-p-act="v2Descargar" data-p-id="${esc(r.id)}" style="font-size:10px;padding:4px 8px;margin:2px;cursor:pointer;">Descargar</button>` : ''}
                <button type="button" data-p-act="v2Editar" data-p-id="${esc(r.id)}" style="font-size:10px;padding:4px 8px;margin:2px;cursor:pointer;">Editar</button>
                <button type="button" data-p-act="v2Eliminar" data-p-id="${esc(r.id)}" style="font-size:10px;padding:4px 8px;margin:2px;cursor:pointer;color:var(--color-deficiente);">Eliminar</button>
                <button type="button" data-p-act="v2Reemplazar" data-p-id="${esc(r.id)}" style="font-size:10px;padding:4px 8px;margin:2px;cursor:pointer;">Reemplazar</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  function renderModal(esc, editId) {
    const cat = getCatalog();
    const edit = editId ? _loadStore().items.find(it => it.id === editId) : null;
    const cats = Object.keys(cat.categorias);

    return `
      <div id="v2-modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9000;display:flex;align-items:flex-end;justify-content:center;padding:16px;">
        <div style="background:#fff;border-radius:var(--radius-md);width:100%;max-width:480px;max-height:90vh;overflow:auto;padding:16px;">
          <div style="font-weight:700;margin-bottom:12px;">${edit ? 'Editar documento' : 'Agregar documento'}</div>
          <div class="form-group">
            <label class="form-label">Categoría</label>
            <select class="form-input" id="v2-categoria">
              ${cats.map(c => `<option value="${c}" ${edit && edit.categoria === c ? 'selected' : ''}>${esc(cat.categorias[c].label)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tipo</label>
            <select class="form-input" id="v2-tipo"></select>
          </div>
          <div id="v2-custom-fields" style="display:none;">
            <div class="form-group"><label class="form-label">Normativa</label><input class="form-input" id="v2-normativa" value="${esc(edit && edit.normativa || '')}"></div>
            <div class="form-group"><label class="form-label">Proveedor</label><input class="form-input" id="v2-proveedor" value="${esc(edit && edit.proveedor || '')}"></div>
          </div>
          <div class="form-group"><label class="form-label">Nombre</label><input class="form-input" id="v2-nombre" value="${esc(edit && edit.nombre || '')}"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div class="form-group"><label class="form-label">Fecha emisión</label><input class="form-input" type="date" id="v2-emision" value="${esc(edit && edit.fecha_emision || '')}"></div>
            <div class="form-group"><label class="form-label">Fecha vencimiento</label><input class="form-input" type="date" id="v2-vencimiento" value="${esc(edit && edit.fecha_vencimiento || '')}"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Frecuencia</label>
            <select class="form-input" id="v2-frecuencia">
              ${cat.frecuencias.map(f => `<option value="${f.id}" ${edit && edit.frecuencia === f.id ? 'selected' : ''}>${esc(f.label)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Archivo (PDF/JPG/PNG/WEBP, max 10MB)</label>
            <input class="form-input" type="file" id="v2-archivo" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp">
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button type="button" class="btn btn-primary" style="flex:1;" data-p-act="v2GuardarModal" data-p-edit="${esc(editId || '')}">Guardar</button>
            <button type="button" class="btn btn-outline" data-p-act="v2CerrarModal">Cancelar</button>
          </div>
        </div>
      </div>`;
  }

  function populateTipoSelect(categoria, selectedTipo) {
    const sel = document.getElementById('v2-tipo');
    if (!sel) return;
    const tipos = getCatalog().categorias[categoria]?.tipos || [];
    sel.innerHTML = tipos.map(t =>
      `<option value="${t.id}" ${selectedTipo === t.id ? 'selected' : ''}>${t.label}</option>`
    ).join('');
    const customWrap = document.getElementById('v2-custom-fields');
    const showCustom = sel.value === 'custom';
    if (customWrap) customWrap.style.display = showCustom ? 'block' : 'none';
    sel.onchange = () => {
      if (customWrap) customWrap.style.display = sel.value === 'custom' ? 'block' : 'none';
    };
  }

  function readModalPayload() {
    const categoria = document.getElementById('v2-categoria')?.value || 'establecimiento';
    const tipo = document.getElementById('v2-tipo')?.value || 'custom';
    const cat = getCatalog();
    const tipoMeta = (cat.categorias[categoria]?.tipos || []).find(t => t.id === tipo);
    return {
      categoria,
      tipo,
      tipo_label: tipoMeta ? tipoMeta.label : tipo,
      nombre: document.getElementById('v2-nombre')?.value || tipoMeta?.label || '',
      fecha_emision: document.getElementById('v2-emision')?.value || '',
      fecha_vencimiento: document.getElementById('v2-vencimiento')?.value || '',
      frecuencia: document.getElementById('v2-frecuencia')?.value || 'anual',
      normativa: document.getElementById('v2-normativa')?.value || tipoMeta?.normativa || '',
      proveedor: document.getElementById('v2-proveedor')?.value || '',
      custom: tipo === 'custom',
    };
  }

  function editarVencimiento(id, cambios, file) {
    return actualizarVencimiento(id, cambios, file);
  }

  async function fetchFromSupabase(establecimientoId) {
    if (!_portalActivo() || !establecimientoId) return [];
    const res = await fetch(
      _rest('vencimientos?establecimiento_id=eq.' + encodeURIComponent(establecimientoId) + '&order=fecha_vencimiento.asc'),
      { headers: _headers() }
    );
    if (!res.ok) return [];
    const remote = await res.json();
    if (!Array.isArray(remote) || !remote.length) return remote;
    const store = _loadStore();
    const byId = new Map(store.items.map(it => [it.id, it]));
    remote.forEach(row => {
      const local = byId.get(row.id) || {};
      byId.set(row.id, {
        ...local,
        ...row,
        estado: calcularEstado(row.fecha_vencimiento),
        sincronizado_en: local.sincronizado_en || new Date().toISOString(),
        sync_pending: false,
      });
    });
    store.items = Array.from(byId.values());
    _saveStore(store);
    return remote;
  }

  async function descargarDocumento(id) {
    const item = _loadStore().items.find(it => it.id === id);
    if (!item || !item.documento_storage_path) {
      throw new Error('Sin archivo en Storage.');
    }
    const url = await VencimientosStorage.getSignedUrlVencimiento(item.documento_storage_path);
    window.open(url, '_blank');
  }

  return {
    LS_KEY,
    loadCatalog,
    getCatalog,
    calcularEstado,
    obtenerVencimientos,
    validateData,
    editarVencimiento,
    fetchFromSupabase,
    guardarVencimiento,
    actualizarVencimiento,
    eliminarVencimiento,
    flushQueue,
    bindOnlineRetry,
    getKpis,
    getProximos30,
    estadoUi,
    renderDashboard,
    renderTabla,
    renderModal,
    populateTipoSelect,
    readModalPayload,
    descargarDocumento,
  };
})();
