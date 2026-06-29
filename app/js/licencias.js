// licencias.js — Sistema de activación SaniCheck

const Licencias = (() => {
  // SHA-256 de códigos válidos (nunca revelar código plano)
  const _V = {
    '4aa05c62bc51969c5466a0bd884105fa76e806b034362effd5439368446aacba':
      { tipo: 'DEMO', nombre: 'Demo Gratuito', maxEstab: 1 },
  };

  const _K = 'psb_lic_v1';

  async function _sha256(str) {
    const buf = await crypto.subtle.digest(
      'SHA-256', new TextEncoder().encode(str.toUpperCase().trim()));
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function activar(codigo) {
    try {
      const h = await _sha256(codigo);
      const info = _V[h];
      if (!info) return null;
      const lic = { h, ...info, ts: Date.now() };
      localStorage.setItem(_K, JSON.stringify(lic));
      return lic;
    } catch { return null; }
  }

  function obtener() {
    try { return JSON.parse(localStorage.getItem(_K)) || null; }
    catch { return null; }
  }

  function esValida()         { return !!obtener(); }
  function esDemo()           { return obtener()?.tipo === 'DEMO'; }
  function maxEstab()         { return obtener()?.maxEstab ?? Infinity; }
  function nombreLicencia()   { return obtener()?.nombre ?? ''; }

  return { activar, obtener, esValida, esDemo, maxEstab, nombreLicencia };
})();
