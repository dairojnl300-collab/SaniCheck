/**
 * vencimientos-storage.js — Upload/download Supabase Storage bucket vencimientos
 * Path: {establecimiento_id}/{vencimiento_id}/{filename}
 */
const VencimientosStorage = (() => {
  'use strict';

  const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
  const SIGNED_URL_TTL_SEC = 86400; // 24h
  const MIME_WHITELIST = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  function _cfg() {
    const c = window.SANICHECK_PORTAL_CONFIG;
    if (!c || !c.SUPABASE_URL || !c.SUPABASE_ANON_KEY) {
      throw new Error('Falta portal-config.js');
    }
    return c;
  }

  function _headers(extra) {
    const { SUPABASE_ANON_KEY } = _cfg();
    const codigo = typeof PortalCliente !== 'undefined' ? PortalCliente.getCodigoAcceso() : '';
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'x-sanicheck-codigo-acceso': codigo ? String(codigo).trim().toUpperCase() : '',
      ...(extra || {}),
    };
  }

  function _storageBase() {
    return _cfg().SUPABASE_URL.replace(/\/$/, '') + '/storage/v1';
  }

  function _publicBase() {
    return _cfg().SUPABASE_URL.replace(/\/$/, '');
  }

  function validarArchivo(file) {
    if (!file) return { ok: false, error: 'No se seleccionó archivo.' };
    if (file.size > MAX_BYTES) {
      return { ok: false, error: 'Archivo debe ser ≤10MB' };
    }
    const mime = (file.type || '').toLowerCase();
    if (!MIME_WHITELIST.has(mime)) {
      return { ok: false, error: 'Formato no permitido' };
    }
    return { ok: true, mime };
  }

  function storagePath(establecimientoId, vencimientoId, filename) {
    const safeName = String(filename || 'documento').replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${establecimientoId}/${vencimientoId}/${safeName}`;
  }

  async function uploadArchivoVencimiento(file, vencimientoId, establecimientoId) {
    const val = validarArchivo(file);
    if (!val.ok) throw new Error(val.error);

    const path = storagePath(establecimientoId, vencimientoId, file.name);
    const res = await fetch(`${_storageBase()}/object/vencimientos/${encodeURI(path)}`, {
      method: 'POST',
      headers: _headers({
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true',
      }),
      body: file,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error('Error al subir archivo (' + res.status + '): ' + text.slice(0, 120));
    }
    return {
      storage_path: path,
      nombre_archivo: file.name,
      tipo_mime: file.type || val.mime,
      tamano_bytes: file.size,
    };
  }

  async function getSignedUrlVencimiento(storagePath, codigoAcceso, expiresIn) {
    const ttl = expiresIn || SIGNED_URL_TTL_SEC;
    const codigo = codigoAcceso
      || (typeof PortalCliente !== 'undefined' ? PortalCliente.getCodigoAcceso() : '');
    const res = await fetch(
      `${_storageBase()}/object/sign/vencimientos/${encodeURI(storagePath)}`,
      {
        method: 'POST',
        headers: _headers(),
        body: JSON.stringify({ expiresIn: ttl }),
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error('Error al firmar URL (' + res.status + '): ' + text.slice(0, 120));
    }
    const data = await res.json();
    const signed = data.signedURL || data.signedUrl || '';
    return _publicBase() + '/storage/v1' + signed;
  }

  async function deleteArchivoVencimiento(storagePath) {
    const res = await fetch(
      `${_storageBase()}/object/vencimientos/${encodeURI(storagePath)}`,
      { method: 'DELETE', headers: _headers() }
    );
    if (!res.ok && res.status !== 404) {
      const text = await res.text().catch(() => '');
      throw new Error('Error al eliminar archivo (' + res.status + '): ' + text.slice(0, 120));
    }
    return true;
  }

  return {
    MAX_BYTES,
    SIGNED_URL_TTL_SEC,
    MIME_WHITELIST,
    validarArchivo,
    storagePath,
    uploadArchivoVencimiento,
    getSignedUrlVencimiento,
    deleteArchivoVencimiento,
  };
})();
