// dadis-scoring.js — Motor de puntaje Simulador DADIS (A/AR/I)
// Independiente del diagnóstico B/R/D/N-A de Planificar.

const DadisScoring = (() => {
  'use strict';

  let _config = null;
  let _loadPromise = null;

  async function loadConfig() {
    if (_config) return _config;
    if (_loadPromise) return _loadPromise;
    _loadPromise = fetch('./data/dadis-config.json?_=' + Date.now(), { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error('No se pudo cargar dadis-config.json');
        return r.json();
      })
      .then(cfg => {
        _config = cfg;
        return cfg;
      })
      .catch(err => {
        _loadPromise = null;
        throw err;
      });
    return _loadPromise;
  }

  function getConfig() { return _config; }

  function _clasificar(puntaje, clasificacion) {
    const rules = clasificacion || [];
    for (const rule of rules) {
      if (puntaje >= rule.min && puntaje <= rule.max) return rule.resultado;
    }
    if (puntaje >= 80) return 'FAVORABLE';
    if (puntaje >= 60) return 'FAVORABLE CON REQUERIMIENTO';
    return 'DESFAVORABLE';
  }

  /**
   * @param {Record<string, 'A'|'AR'|'I'>} respuestas
   * @param {object} [config]
   * @returns {{ puntajeTotal, puntajePorCategoria, clasificacion, itemsDetalle }}
   */
  function calcularPuntaje(respuestas, config) {
    const cfg = config || _config;
    if (!cfg) throw new Error('Config DADIS no cargada');
    const escala = cfg.escala || { A: 1, AR: 0.5, I: 0 };
    const respuestasSafe = respuestas || {};

    let puntajeTotal = 0;
    const puntajePorCategoria = [];
    const itemsDetalle = [];

    (cfg.categorias || []).forEach(cat => {
      const items = Array.isArray(cat.items) ? cat.items : [];
      const n = items.length;
      const peso = Number(cat.peso) || 0;
      let obtenido = 0;
      const maxPosible = n > 0 ? peso : 0;

      items.forEach(it => {
        const resp = respuestasSafe[it.id];
        const factor = (resp && escala[resp] !== undefined) ? Number(escala[resp]) : null;
        const pesoItem = n > 0 ? (peso / n) : 0;
        const pts = factor === null ? 0 : pesoItem * factor;
        if (factor !== null) obtenido += pts;
        itemsDetalle.push({
          id: it.id,
          nombre: it.nombre,
          categoriaId: cat.id,
          categoriaNombre: cat.nombre,
          respuesta: resp || null,
          pesoItem,
          puntos: factor === null ? null : pts,
          normativa: it.normativa || '',
          descripcion: it.descripcion || '',
        });
      });

      puntajePorCategoria.push({
        id: cat.id,
        nombre: cat.nombre,
        peso,
        numItems: n,
        maxPosible,
        obtenido: Math.round(obtenido * 1000) / 1000,
        pct: maxPosible > 0 ? Math.round((obtenido / maxPosible) * 1000) / 10 : null,
      });
      puntajeTotal += obtenido;
    });

    puntajeTotal = Math.round(puntajeTotal * 100) / 100;
    const clasificacion = _clasificar(puntajeTotal, cfg.clasificacion);

    return { puntajeTotal, puntajePorCategoria, clasificacion, itemsDetalle };
  }

  function semaforo(clasificacion) {
    if (clasificacion === 'FAVORABLE') return { color: '#065F46', bg: '#D1FAE5', label: 'Verde' };
    if (clasificacion === 'FAVORABLE CON REQUERIMIENTO') return { color: '#92400E', bg: '#FEF3C7', label: 'Amarillo' };
    return { color: '#991B1B', bg: '#FEE2E2', label: 'Rojo' };
  }

  return { loadConfig, getConfig, calcularPuntaje, semaforo };
})();
