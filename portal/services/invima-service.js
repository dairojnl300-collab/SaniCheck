/**
 * invima-service.js — Portal Cliente: lectura invima_config (read-only)
 */
const InvimaService = (() => {
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

  async function listarConfig(codigo, filtros) {
    let qs = 'invima_config?select=*&estado=eq.activo&order=categoria_id.asc,codigo.asc';
    if (filtros?.categoria_id) qs += '&categoria_id=eq.' + encodeURIComponent(filtros.categoria_id);
    const res = await fetch(_rest(qs), { headers: _headers(codigo) });
    if (!res.ok) throw new Error('list invima_config ' + res.status);
    return res.json();
  }

  function resumen(items) {
    const base = items.filter(it => !it.custom).length;
    const custom = items.filter(it => it.custom).length;
    return { base, custom, total: items.length };
  }

  const CAT_LABELS = {
    cat_01: 'Edificación e instalaciones',
    cat_02: 'Saneamiento',
    cat_03: 'Personal',
    cat_04: 'Equipos',
    cat_05: 'Almacenamiento',
    cat_06: 'Verificación',
  };

  return { listarConfig, resumen, CAT_LABELS };
})();
