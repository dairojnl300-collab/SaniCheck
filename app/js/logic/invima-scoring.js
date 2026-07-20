/**
 * invima-scoring.js — Motor A/AR/I para checklist INVIMA (base DADIS + ítems custom)
 */
const InvimaScoring = (() => {
  'use strict';

  const LS_EVAL = 'sanicheck_invima_eval';
  const ESCALA_DEFAULT = { A: 1.0, AR: 0.5, I: 0.0 };
  const CLASIFICACION_DEFAULT = [
    { min: 80, max: 100, resultado: 'FAVORABLE' },
    { min: 60, max: 79.9, resultado: 'FAVORABLE CON REQUERIMIENTO' },
    { min: 0, max: 59.9, resultado: 'DESFAVORABLE' },
  ];

  function _estId(fallback) {
    return (typeof PortalCliente !== 'undefined' && PortalCliente.getEstablecimientoId())
      || fallback || 'local-pending';
  }

  function _loadEvalAll() {
    try {
      return JSON.parse(localStorage.getItem(LS_EVAL) || '{}');
    } catch (_) {
      return {};
    }
  }

  function _saveEvalAll(all) {
    localStorage.setItem(LS_EVAL, JSON.stringify(all));
  }

  function getEvaluacion(establecimientoId) {
    const estId = _estId(establecimientoId);
    const slot = _loadEvalAll()[estId] || {};
    return {
      respuestas: { ...(slot.respuestas || {}) },
      hallazgos: { ...(slot.hallazgos || {}) },
    };
  }

  function setRespuesta(itemId, respuesta, establecimientoId) {
    const estId = _estId(establecimientoId);
    const all = _loadEvalAll();
    if (!all[estId]) all[estId] = { respuestas: {}, hallazgos: {} };
    if (!respuesta) {
      delete all[estId].respuestas[itemId];
    } else {
      all[estId].respuestas[itemId] = respuesta;
    }
    _saveEvalAll(all);
    return getEvaluacion(estId);
  }

  function setHallazgo(itemId, texto, establecimientoId) {
    const estId = _estId(establecimientoId);
    const all = _loadEvalAll();
    if (!all[estId]) all[estId] = { respuestas: {}, hallazgos: {} };
    all[estId].hallazgos[itemId] = String(texto || '');
    _saveEvalAll(all);
    return getEvaluacion(estId);
  }

  function _clasificar(puntaje, clasificacion) {
    const rules = clasificacion || CLASIFICACION_DEFAULT;
    for (const rule of rules) {
      if (puntaje >= rule.min && puntaje <= rule.max) return rule.resultado;
    }
    if (puntaje >= 80) return 'FAVORABLE';
    if (puntaje >= 60) return 'FAVORABLE CON REQUERIMIENTO';
    return 'DESFAVORABLE';
  }

  function _factor(resp, escala) {
    if (!resp) return null;
    if (resp === 'NA') return Number(escala.A);
    return escala[resp] !== undefined ? Number(escala[resp]) : null;
  }

  function buildEvalGroups(estId, meta) {
    const items = InvimaCrud.getConfigINVIMA(estId);
    const catMap = {};
    (meta.categorias || []).forEach(c => { catMap[c.id] = c; });
    const order = (meta.categorias || []).map(c => c.id);
    const groups = {};

    items.forEach(it => {
      const cat = catMap[it.categoria_id] || { id: it.categoria_id, nombre: it.categoria_id, peso: 0 };
      if (!groups[it.categoria_id]) {
        groups[it.categoria_id] = {
          id: it.categoria_id,
          nombre: cat.nombre,
          peso: Number(cat.peso) || 0,
          items: [],
        };
      }
      groups[it.categoria_id].items.push({
        id: it.id,
        codigo: it.codigo,
        nombre: it.nombre,
        normativa: it.normativa || '',
        descripcion: it.descripcion || '',
        custom: !!it.custom,
      });
    });

    return order.filter(id => groups[id]).map(id => groups[id]);
  }

  function calcularPuntaje(respuestas, meta, estId) {
    const escala = meta?.escala || ESCALA_DEFAULT;
    const respuestasSafe = respuestas || {};
    const groups = buildEvalGroups(estId, meta);

    let puntajeTotal = 0;
    const puntajePorCategoria = [];
    const itemsDetalle = [];

    groups.forEach(cat => {
      const items = cat.items || [];
      const n = items.length;
      const peso = Number(cat.peso) || 0;
      let obtenido = 0;
      const maxPosible = n > 0 ? peso : 0;

      items.forEach(it => {
        const resp = respuestasSafe[it.id] || null;
        const factor = _factor(resp, escala);
        const pesoItem = n > 0 ? (peso / n) : 0;
        const pts = factor === null ? 0 : pesoItem * factor;
        if (factor !== null) obtenido += pts;
        itemsDetalle.push({
          id: it.id,
          codigo: it.codigo,
          nombre: it.nombre,
          categoriaId: cat.id,
          categoriaNombre: cat.nombre,
          respuesta: resp,
          pesoItem,
          puntos: factor === null ? null : pts,
          normativa: it.normativa,
          descripcion: it.descripcion,
          custom: it.custom,
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
    const clasificacion = _clasificar(puntajeTotal, meta?.clasificacion);

    return { puntajeTotal, puntajePorCategoria, clasificacion, itemsDetalle };
  }

  function calcularPerfilRapido(respuestas, meta, estId) {
    const escala = meta?.escala || ESCALA_DEFAULT;
    const respuestasSafe = respuestas || {};
    const items = InvimaCrud.getPerfilRapido(estId);
    const n = items.length;
    let puntajeTotal = 0;
    const itemsDetalle = [];

    items.forEach(it => {
      const resp = respuestasSafe[it.id] || null;
      const factor = _factor(resp, escala);
      const pesoItem = n > 0 ? (100 / n) : 0;
      const pts = factor === null ? 0 : pesoItem * factor;
      if (factor !== null) puntajeTotal += pts;
      itemsDetalle.push({
        id: it.id,
        codigo: it.codigo,
        nombre: it.nombre,
        categoriaId: it.categoria_id,
        respuesta: resp,
        pesoItem,
        puntos: factor === null ? null : pts,
        normativa: it.normativa,
        descripcion: it.descripcion || '',
        custom: !!it.custom,
      });
    });

    puntajeTotal = Math.round(puntajeTotal * 100) / 100;
    const clasificacion = _clasificar(puntajeTotal, meta?.clasificacion);
    return { puntajeTotal, clasificacion, itemsDetalle, numItems: n };
  }

  function prioridadPerfil(resp) {
    if (resp === 'I') return 'Alta';
    if (resp === 'AR') return 'Media';
    if (resp === 'A' || resp === 'NA') return 'Baja';
    return '';
  }

  async function calcularPerfil(establecimientoId) {
    const estId = _estId(establecimientoId);
    const base = await InvimaCrud.loadBaseChecklist();
    const meta = {
      escala: base.escala || ESCALA_DEFAULT,
      clasificacion: base.clasificacion || CLASIFICACION_DEFAULT,
    };
    InvimaCrud.getConfigINVIMA(estId);
    const ev = getEvaluacion(estId);
    const r = calcularPerfilRapido(ev.respuestas, meta, estId);
    const hallazgos = ev.hallazgos || {};
    r.itemsDetalle = (r.itemsDetalle || []).map(it => ({
      ...it,
      hallazgo: hallazgos[it.id] || '',
    }));
    return r;
  }

  async function calcular(establecimientoId) {
    const estId = _estId(establecimientoId);
    const base = await InvimaCrud.loadBaseChecklist();
    const meta = {
      escala: base.escala || ESCALA_DEFAULT,
      clasificacion: base.clasificacion || CLASIFICACION_DEFAULT,
      categorias: base.categorias || [],
    };
    InvimaCrud.getConfigINVIMA(estId);
    const ev = getEvaluacion(estId);
    return calcularPuntaje(ev.respuestas, meta, estId);
  }

  function semaforo(clasificacion) {
    if (clasificacion === 'FAVORABLE') return { color: '#065F46', bg: '#D1FAE5', label: 'Verde' };
    if (clasificacion === 'FAVORABLE CON REQUERIMIENTO') return { color: '#92400E', bg: '#FEF3C7', label: 'Amarillo' };
    return { color: '#991B1B', bg: '#FEE2E2', label: 'Rojo' };
  }

  function gaugeSvg(pct, color) {
    const p = Math.max(0, Math.min(100, pct));
    const r = 54;
    const c = 2 * Math.PI * r;
    const dash = (p / 100) * c * 0.75;
    const gap = c - dash;
    return `<svg width="120" height="96" viewBox="0 0 140 110" aria-hidden="true">
      <path d="M16 90 A54 54 0 1 1 124 90" fill="none" stroke="#E5E7EB" stroke-width="12" stroke-linecap="round"/>
      <path d="M16 90 A54 54 0 1 1 124 90" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"
        stroke-dasharray="${dash} ${gap}" stroke-dashoffset="0"/>
      <text x="70" y="72" text-anchor="middle" font-size="20" font-weight="800" fill="${color}">${p.toFixed(1)}%</text>
      <text x="70" y="92" text-anchor="middle" font-size="10" fill="#6B7280">Puntaje total</text>
    </svg>`;
  }

  function requiereHallazgo(resp) {
    return resp === 'AR' || resp === 'I' || resp === 'NA';
  }

  return {
    LS_EVAL,
    getEvaluacion,
    setRespuesta,
    setHallazgo,
    buildEvalGroups,
    calcularPuntaje,
    calcularPerfilRapido,
    calcularPerfil,
    prioridadPerfil,
    calcular,
    semaforo,
    gaugeSvg,
    requiereHallazgo,
  };
})();
