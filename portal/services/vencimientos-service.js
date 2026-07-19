/**
 * vencimientos-service.js — Portal Cliente: fetch vencimientos v2 + signed URLs
 */
const VencimientosService = (() => {
  'use strict';

  function _cfg() {
    return window.SANICHECK_PORTAL_CONFIG;
  }

  function _headers(codigo) {
    const cfg = _cfg();
    const c = String(codigo || sessionStorage.getItem('portal_codigo') || '').trim().toUpperCase();
    return {
      apikey: cfg.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + cfg.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'x-sanicheck-codigo-acceso': c,
    };
  }

  function _rest(path) {
    return _cfg().SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + path;
  }

  function _storageBase() {
    return _cfg().SUPABASE_URL.replace(/\/$/, '') + '/storage/v1';
  }

  async function listarVencimientos(codigo, filtros) {
    let qs = 'vencimientos?select=*,vencimientos_adjuntos(*)&order=fecha_vencimiento.asc';
    if (filtros?.categoria) qs += '&categoria=eq.' + encodeURIComponent(filtros.categoria);
    if (filtros?.estado) qs += '&estado=eq.' + encodeURIComponent(filtros.estado);
    const res = await fetch(_rest(qs), { headers: _headers(codigo) });
    if (!res.ok) throw new Error('list vencimientos ' + res.status);
    return res.json();
  }

  async function crearVencimiento(codigo, row) {
    const res = await fetch(_rest('vencimientos'), {
      method: 'POST',
      headers: { ..._headers(codigo), Prefer: 'return=representation' },
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error('create vencimientos ' + res.status);
    const rows = await res.json();
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async function getSignedUrl(codigo, storagePath, expiresIn) {
    const res = await fetch(
      _storageBase() + '/object/sign/vencimientos/' + encodeURI(storagePath),
      {
        method: 'POST',
        headers: _headers(codigo),
        body: JSON.stringify({ expiresIn: expiresIn || 86400 }),
      }
    );
    if (!res.ok) throw new Error('sign ' + res.status);
    const data = await res.json();
    return _cfg().SUPABASE_URL.replace(/\/$/, '') + '/storage/v1' + (data.signedURL || data.signedUrl);
  }

  async function uploadArchivo(codigo, file, establecimientoId, vencimientoId) {
    const path = `${establecimientoId}/${vencimientoId}/${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const res = await fetch(_storageBase() + '/object/vencimientos/' + encodeURI(path), {
      method: 'POST',
      headers: {
        ..._headers(codigo),
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true',
      },
      body: file,
    });
    if (!res.ok) throw new Error('upload ' + res.status);
    return path;
  }

  function calcKpis(items) {
    const counts = { vigente: 0, por_vencer_30: 0, por_vencer_60: 0, vencido: 0 };
    (items || []).forEach(it => { counts[it.estado] = (counts[it.estado] || 0) + 1; });
    return counts;
  }

  return {
    listarVencimientos,
    crearVencimiento,
    getSignedUrl,
    uploadArchivo,
    calcKpis,
  };
})();
