// vencimientos.js — Control de Vencimientos por establecimiento (localStorage)
// Personal · Equipos · Dashboard · Decreto 1072/2015

const Vencimientos = (() => {

  const NORMA_BASE = 'Decreto 1072 de 2015';
  const ALERTA_DIAS = 30;

  const CEDULA_DOC = {
    id: 'cedula',
    label: 'Cédula de ciudadanía',
    soloNumero: true,
    norma: NORMA_BASE,
    archivoLabel: 'Adjuntar soporte',
  };

  const DOC_PERSONAL = [
    { id: 'examen_medico', label: 'Examen médico ocupacional',
      expId: 'examen_medico_exp', vencId: 'examen_medico_venc', meses: 12,
      periodicidad: 'Anual',
      norma: 'Resolución 2674 de 2013 · ' + NORMA_BASE,
      archivoLabel: 'Adjuntar soporte' },
    { id: 'capacitacion_bpm', label: 'Capacitación BPM',
      expId: 'capacitacion_bpm_exp', vencId: 'capacitacion_bpm_venc', meses: 12,
      periodicidad: 'Anual',
      norma: 'Decreto 3075 de 1997, Art. 11',
      archivoLabel: 'Adjuntar soporte' },
    { id: 'induccion', label: 'Inducción',
      expId: 'induccion_exp', vencId: 'induccion_venc',
      periodicidad: 'Renovable — alerta 30 días antes',
      norma: NORMA_BASE + ', Cap. 6 — Inducción SST',
      archivoLabel: 'Adjuntar soporte' },
  ];

  const LEGACY_PERSONAL_MAP = {
    carne_fecha:               { exp: 'examen_medico_exp', venc: 'examen_medico_venc', meses: 12 },
    examen_medico_fecha:       { exp: 'examen_medico_exp', venc: 'examen_medico_venc', meses: 12 },
    carne_salud_exp:           { exp: 'examen_medico_exp' },
    carne_salud_venc:          { venc: 'examen_medico_venc' },
    capacitacion_bpm_fecha:    { exp: 'capacitacion_bpm_exp', venc: 'capacitacion_bpm_venc', meses: 12 },
    curso_capacitacion_exp:    { exp: 'capacitacion_bpm_exp' },
    curso_capacitacion_venc:   { venc: 'capacitacion_bpm_venc' },
    certificado_manipulacion_fecha: { venc: 'capacitacion_bpm_venc' },
  };

  const LEGACY_PERSONAL_DROP = [
    'cedula_fecha', 'frotis_fecha', 'cert_vacunacion_exp', 'cert_vacunacion_venc',
    'carne_salud_exp', 'carne_salud_venc', 'curso_capacitacion_exp', 'curso_capacitacion_venc',
  ];

  const LEGACY_ARCHIVO_MAP = {
    carne_salud: 'examen_medico',
    carne_fecha: 'examen_medico',
    examen_medico_fecha: 'examen_medico',
    curso_capacitacion: 'capacitacion_bpm',
    capacitacion_bpm_fecha: 'capacitacion_bpm',
    cert_vacunacion: 'capacitacion_bpm',
    certificado_manipulacion_fecha: 'capacitacion_bpm',
  };

  const ITEMS = [
    { id: 'mantenimiento_fecha', grupo: 'equipos', label: 'Mantenimiento preventivo',
      campoLabel: 'Fecha del último mantenimiento', tipoFecha: 'ultimo', meses: 3,
      norma: 'Decreto 3075 de 1997', archivoLabel: 'Soporte — orden de mantenimiento' },
    { id: 'factura_equipo_fecha', grupo: 'equipos', label: 'Factura / soporte de compra',
      campoLabel: 'Fecha de expedición', tipoFecha: 'ultimo', meses: 60,
      norma: NORMA_BASE, archivoLabel: 'Soporte — factura o remisión' },
    { id: 'manual_equipo_fecha', grupo: 'equipos', label: 'Manual de operación',
      campoLabel: 'Fecha de última actualización', tipoFecha: 'ultimo', meses: 24,
      norma: NORMA_BASE, archivoLabel: 'Soporte — manual digitalizado' },
    { id: 'calibracion_fecha', grupo: 'equipos', label: 'Certificado de calibración',
      campoLabel: 'Fecha del certificado', tipoFecha: 'vencimiento', meses: 0,
      norma: NORMA_BASE, archivoLabel: 'Soporte — certificado calibración' },
    { id: 'microbiologico_agua_fecha', grupo: 'equipos', label: 'Análisis microbiológico de agua',
      campoLabel: 'Fecha del último análisis', tipoFecha: 'ultimo', meses: 6,
      norma: 'Resolución 2115 de 2007', archivoLabel: 'Soporte — informe análisis' },
    { id: 'fisicoquimico_agua_fecha', grupo: 'equipos', label: 'Análisis fisicoquímico de agua',
      campoLabel: 'Fecha del último análisis', tipoFecha: 'ultimo', meses: 12,
      norma: 'Resolución 2115 de 2007', archivoLabel: 'Soporte — informe análisis' },
    { id: 'fumigacion_fecha', grupo: 'equipos', label: 'Fumigación / control de plagas',
      campoLabel: 'Fecha del último certificado', tipoFecha: 'ultimo', meses: 3,
      norma: 'Resolución 2674 de 2013', archivoLabel: 'Soporte — certificado fumigación' },
  ];

  const GRUPOS = {
    personal: { label: 'Personal', desc: 'Cédula, examen médico, BPM, inducción y requerimientos adicionales — Decreto 1072/2015.' },
    equipos:  { label: 'Equipos',  desc: 'Soportes de equipos: facturas, manuales y certificados de calibración.' },
  };

  function _key(est) {
    const id = (est && (est.nit || est.nombre)) || 'default';
    return 'vencimientos_' + String(id).replace(/[^a-zA-Z0-9]/g, '_');
  }

  function _archivoKey(itemId) {
    if (itemId.endsWith('_archivo')) return itemId;
    if (itemId.endsWith('_fecha')) return itemId.replace(/_fecha$/, '') + '_archivo';
    return itemId + '_archivo';
  }
  function _uid(prefix) { return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function _addMeses(fecha, meses) {
    if (!fecha || !meses) return '';
    const d = new Date(fecha + 'T00:00:00');
    d.setMonth(d.getMonth() + meses);
    return d.toISOString().split('T')[0];
  }

  function _migratePersonalDocs(tr, legacy) {
    const docs = { ...(tr.documentos || {}) };
    Object.entries(LEGACY_PERSONAL_MAP).forEach(([oldKey, map]) => {
      const val = docs[oldKey] || legacy[oldKey] || '';
      if (!val) return;
      if (map.exp && !docs[map.exp]) docs[map.exp] = val;
      if (map.venc && !docs[map.venc]) {
        docs[map.venc] = map.meses ? _addMeses(val, map.meses) : val;
      }
      delete docs[oldKey];
    });
    LEGACY_PERSONAL_DROP.forEach(k => delete docs[k]);
    if (docs.capacitacion_induccion_exp && !docs.induccion_exp) docs.induccion_exp = docs.capacitacion_induccion_exp;
    delete docs.capacitacion_induccion_exp;
    tr.documentos = docs;
    const arch = { ...(tr.archivos || {}) };
    Object.entries(LEGACY_ARCHIVO_MAP).forEach(([oldId, newId]) => {
      const oldAk = _archivoKey(oldId);
      const newAk = _archivoKey(newId);
      if (!arch[newAk] && arch[oldAk]) arch[newAk] = arch[oldAk];
    });
    const indOld = _archivoKey('capacitacion_induccion');
    const indNew = _archivoKey('induccion');
    if (!arch[indNew] && arch[indOld]) arch[indNew] = arch[indOld];
    const cedAk = _archivoKey(CEDULA_DOC.id);
    if (!arch[cedAk] && arch.cedula_archivo) arch[cedAk] = arch.cedula_archivo;
    tr.archivos = arch;
  }

  function estadoDocPersonal(doc, tr) {
    if (doc.soloNumero) {
      const ok = !!(tr.cedula && String(tr.cedula).trim());
      return { estado: ok ? 'vigente' : 'sin_registrar', proximo: null, dias: null };
    }
    const docs = tr.documentos || {};
    if (doc.soloExp) {
      const exp = docs[doc.expId] || '';
      return exp
        ? { estado: 'vigente', proximo: exp, dias: null }
        : { estado: 'sin_registrar', proximo: null, dias: null };
    }
    const venc = docs[doc.vencId] || '';
    return estadoFechaVencimiento(venc);
  }

  function estadoRequerimiento(req) {
    if (!req || !req.nombre) return { estado: 'sin_registrar', proximo: null, dias: null };
    if (req.sinVencimiento) {
      const exp = req.exp || '';
      return exp
        ? { estado: 'vigente', proximo: exp, dias: null }
        : { estado: 'sin_registrar', proximo: null, dias: null };
    }
    const venc = req.venc || '';
    if (!venc) return { estado: 'sin_registrar', proximo: null, dias: null };
    return estadoFechaVencimiento(venc);
  }

  function allDocsPersonal() {
    return [CEDULA_DOC, ...DOC_PERSONAL];
  }

  function _vacio() {
    const out = { actualizado_en: null, trabajadores: [], equiposLista: [] };
    ITEMS.forEach(it => {
      out[it.id] = '';
      out[_archivoKey(it.id)] = null;
    });
    DOC_PERSONAL.forEach(doc => {
      out[doc.expId] = '';
      if (doc.vencId) out[doc.vencId] = '';
      out[_archivoKey(doc.id)] = null;
    });
    out[_archivoKey(CEDULA_DOC.id)] = null;
    return out;
  }

  function _syncLegacyFromTrabajador(data, tr) {
    if (!tr || tr.id !== 'tr-default') return;
    DOC_PERSONAL.forEach(doc => {
      if (tr.documentos) {
        data[doc.expId] = tr.documentos[doc.expId] || '';
        if (doc.vencId) data[doc.vencId] = tr.documentos[doc.vencId] || '';
      }
      const ak = _archivoKey(doc.id);
      if (tr.archivos && tr.archivos[ak] !== undefined) data[ak] = tr.archivos[ak];
    });
    const cedAk = _archivoKey(CEDULA_DOC.id);
    if (tr.archivos && tr.archivos[cedAk] !== undefined) data[cedAk] = tr.archivos[cedAk];
  }

  function _syncLegacyFromEquipo(data, eq) {
    if (!eq || eq.id !== 'eq-default') return;
    if (eq.ultima_calibracion) data.calibracion_fecha = eq.ultima_calibracion;
    if (eq.proxima_calibracion) data.calibracion_fecha = data.calibracion_fecha || eq.proxima_calibracion;
    if (eq.mantenimiento_programado) data.mantenimiento_fecha = eq.mantenimiento_programado;
  }

  function _migrate(data) {
    const d = { ...data };
    if (!Array.isArray(d.trabajadores) || !d.trabajadores.length) {
      const documentos = {};
      const archivos = {};
      DOC_PERSONAL.forEach(doc => {
        documentos[doc.expId] = d[doc.expId] || '';
        if (doc.vencId) documentos[doc.vencId] = d[doc.vencId] || '';
        archivos[_archivoKey(doc.id)] = d[_archivoKey(doc.id)] || null;
      });
      archivos[_archivoKey(CEDULA_DOC.id)] = d[_archivoKey(CEDULA_DOC.id)] || null;
      d.trabajadores = [{
        id: 'tr-default',
        nombre: 'Personal del establecimiento',
        cedula: '',
        documentos,
        archivos,
        requerimientos: Array.isArray(d.requerimientos) ? d.requerimientos : [],
      }];
    }
    if (!Array.isArray(d.equiposLista) || !d.equiposLista.length) {
      const ult = d.calibracion_fecha || d.mantenimiento_fecha || '';
      const prox = ult ? estado(ult, ITEMS.find(x => x.id === 'calibracion_fecha')).proximo : '';
      d.equiposLista = [{
        id: 'eq-default',
        codigo: 'GEN-001',
        tipo: 'Equipos generales del establecimiento',
        ultima_calibracion: ult,
        proxima_calibracion: prox || '',
        mantenimiento_programado: d.mantenimiento_fecha || '',
        historial: ult ? [{ id: _uid('cal'), fecha: ult, resultado: 'Registrado', nota: 'Migrado desde datos anteriores' }] : [],
      }];
    }
    d.trabajadores.forEach(tr => {
      tr.documentos = tr.documentos || {};
      tr.archivos = tr.archivos || {};
      tr.requerimientos = Array.isArray(tr.requerimientos) ? tr.requerimientos : [];
      _migratePersonalDocs(tr, d);
    });
    d.equiposLista.forEach(eq => {
      eq.historial = Array.isArray(eq.historial) ? eq.historial : [];
    });
    return d;
  }

  function _mergeStored(raw) {
    return _migrate({ ..._vacio(), ...raw });
  }

  function getVencimientos(est) {
    try {
      const raw = localStorage.getItem(_key(est));
      if (raw) return _mergeStored(JSON.parse(raw));
    } catch {}
    return _migrate(_vacio());
  }

  function saveVencimientos(est, data) {
    const d = _migrate({ ...data });
    d.trabajadores.forEach(tr => _syncLegacyFromTrabajador(d, tr));
    d.equiposLista.forEach(eq => _syncLegacyFromEquipo(d, eq));
    const out = { actualizado_en: new Date().toISOString(), trabajadores: d.trabajadores, equiposLista: d.equiposLista };
    ITEMS.forEach(it => {
      out[it.id] = d[it.id] || '';
      out[_archivoKey(it.id)] = d[_archivoKey(it.id)] || null;
    });
    DOC_PERSONAL.forEach(doc => {
      out[doc.expId] = d[doc.expId] || '';
      if (doc.vencId) out[doc.vencId] = d[doc.vencId] || '';
      out[_archivoKey(doc.id)] = d[_archivoKey(doc.id)] || null;
    });
    out[_archivoKey(CEDULA_DOC.id)] = d[_archivoKey(CEDULA_DOC.id)] || null;
    localStorage.setItem(_key(est), JSON.stringify(out));
    // Sync Portal Cliente (Supabase) en background — nunca bloquea el guardado local
    try {
      if (typeof PortalCliente !== 'undefined' && PortalCliente.isActivo()) {
        PortalCliente.syncVencimientos(est, out);
      }
    } catch (e) {
      console.warn('[Vencimientos] portal sync', e);
    }
    return out;
  }

  function getArchivo(data, itemId, trabajadorId) {
    if (trabajadorId) {
      const tr = (data.trabajadores || []).find(t => t.id === trabajadorId);
      return tr?.archivos?.[_archivoKey(itemId)] || null;
    }
    return data[_archivoKey(itemId)] || null;
  }

  function setArchivo(data, itemId, archivo, trabajadorId) {
    if (trabajadorId) {
      const tr = data.trabajadores.find(t => t.id === trabajadorId);
      if (tr) {
        if (!tr.archivos) tr.archivos = {};
        tr.archivos[_archivoKey(itemId)] = archivo;
        _syncLegacyFromTrabajador(data, tr);
      }
    } else {
      data[_archivoKey(itemId)] = archivo;
    }
    return data;
  }

  function periodicidadTexto(it) {
    if (it.tipoFecha === 'vencimiento') return 'Según fecha de vencimiento';
    if (it.meses === 12) return 'Anual';
    if (it.meses % 12 === 0) return `Cada ${it.meses / 12} años`;
    return `Cada ${it.meses} meses`;
  }

  function estado(fecha, item) {
    if (!fecha) return { proximo: null, estado: 'sin_registrar', dias: null };
    const hoy = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00');
    let proximo;
    if (item.tipoFecha === 'vencimiento') {
      proximo = new Date(fecha + 'T00:00:00');
    } else {
      proximo = new Date(fecha + 'T00:00:00');
      proximo.setMonth(proximo.getMonth() + item.meses);
    }
    return _estadoDesdeProximo(proximo, hoy);
  }

  function estadoFechaVencimiento(fecha) {
    if (!fecha) return { proximo: null, estado: 'sin_registrar', dias: null };
    const hoy = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00');
    return _estadoDesdeProximo(new Date(fecha + 'T00:00:00'), hoy);
  }

  function _estadoDesdeProximo(proximo, hoy) {
    const dias = Math.round((proximo - hoy) / 86400000);
    let est_ = 'vigente';
    if (dias < 0) est_ = 'vencido';
    else if (dias <= ALERTA_DIAS) est_ = 'por_vencer';
    return { proximo: proximo.toISOString().split('T')[0], estado: est_, dias };
  }

  function itemsGrupo(grupo) {
    if (grupo === 'personal') return DOC_PERSONAL;
    return ITEMS.filter(it => it.grupo === grupo);
  }

  function getPersonalRows(data, filtro) {
    const d = _migrate(data);
    const q = (filtro || '').toLowerCase().trim();
    const rows = [];
    d.trabajadores.forEach(tr => {
      allDocsPersonal().forEach(doc => {
        const e = estadoDocPersonal(doc, tr);
        const docs = tr.documentos || {};
        const exp = doc.soloNumero ? '' : (docs[doc.expId] || '');
        const venc = doc.vencId ? (docs[doc.vencId] || '') : '';
        rows.push({
          trabajadorId: tr.id,
          nombre: tr.nombre,
          cedula: tr.cedula,
          documento: doc.label,
          itemId: doc.id,
          expedicion: exp,
          vencimiento: venc,
          vigencia: doc.soloExp ? exp : (e.proximo || venc || ''),
          sinVencimiento: !!(doc.soloNumero || doc.soloExp),
          estado: e.estado,
          dias: e.dias,
        });
      });
      (tr.requerimientos || []).forEach(req => {
        const e = estadoRequerimiento(req);
        rows.push({
          trabajadorId: tr.id,
          nombre: tr.nombre,
          cedula: tr.cedula,
          documento: req.nombre,
          itemId: req.id,
          esPersonalizado: true,
          expedicion: req.exp || '',
          vencimiento: req.venc || '',
          vigencia: req.sinVencimiento ? (req.exp || '') : (e.proximo || req.venc || ''),
          sinVencimiento: !!req.sinVencimiento,
          estado: e.estado,
          dias: e.dias,
        });
      });
    });
    if (!q) return rows;
    return rows.filter(r =>
      (r.nombre || '').toLowerCase().includes(q) ||
      (r.cedula || '').toLowerCase().includes(q) ||
      (r.documento || '').toLowerCase().includes(q)
    );
  }

  function getEquiposRows(data, filtro) {
    const d = _migrate(data);
    const q = (filtro || '').toLowerCase().trim();
    let rows = d.equiposLista.map(eq => {
      const e = estadoFechaVencimiento(eq.proxima_calibracion);
      return {
        equipoId: eq.id,
        codigo: eq.codigo,
        tipo: eq.tipo,
        ultima_calibracion: eq.ultima_calibracion,
        proxima_calibracion: eq.proxima_calibracion,
        mantenimiento_programado: eq.mantenimiento_programado,
        historial: eq.historial || [],
        estado: e.estado,
        dias: e.dias,
      };
    });
    if (!q) return rows;
    return rows.filter(r =>
      (r.codigo || '').toLowerCase().includes(q) ||
      (r.tipo || '').toLowerCase().includes(q)
    );
  }

  function pctVigencia(rows) {
    const reg = rows.filter(r => r.estado !== 'sin_registrar');
    if (!reg.length) return 0;
    const vig = reg.filter(r => r.estado === 'vigente').length;
    return Math.round((vig / reg.length) * 100);
  }

  function getDashboard(data) {
    const personalRows = getPersonalRows(data, '');
    const equiposRows  = getEquiposRows(data, '');
    const pctPersonal  = pctVigencia(personalRows);
    const pctEquipos   = pctVigencia(equiposRows);
    const proximos = [];
    personalRows.forEach(r => {
      if (r.sinVencimiento) return;
      if (r.estado === 'por_vencer' || r.estado === 'vencido') {
        proximos.push({ grupo: 'Personal', ref: r.nombre, detalle: r.documento, fecha: r.vigencia, estado: r.estado, dias: r.dias });
      }
    });
    equiposRows.forEach(r => {
      if (r.estado === 'por_vencer' || r.estado === 'vencido') {
        proximos.push({ grupo: 'Equipos', ref: r.codigo, detalle: r.tipo, fecha: r.proxima_calibracion, estado: r.estado, dias: r.dias });
      }
    });
    proximos.sort((a, b) => (a.dias ?? 999) - (b.dias ?? 999));
    const proximos30 = proximos.filter(p => p.estado === 'por_vencer' || (p.dias !== null && p.dias >= 0 && p.dias <= ALERTA_DIAS));
    const notificaciones = proximos.map(p => ({
      nivel: p.estado === 'vencido' ? 'critico' : 'alerta',
      texto: p.estado === 'vencido'
        ? `${p.grupo}: ${p.ref} — ${p.detalle} VENCIDO`
        : `${p.grupo}: ${p.ref} — ${p.detalle} vence en ${p.dias} días`,
    }));
    return { pctPersonal, pctEquipos, proximos30, notificaciones, alertas30: proximos30.length };
  }

  function resumenGrupo(data, grupo) {
    const rows = grupo === 'personal' ? getPersonalRows(data, '') : getEquiposRows(data, '');
    const estados = rows.map(r => r.estado);
    if (estados.includes('vencido')) return 'vencido';
    if (estados.includes('por_vencer')) return 'por_vencer';
    if (estados.every(e => e === 'sin_registrar')) return 'sin_registrar';
    return 'vigente';
  }

  function agregarTrabajador(data, nombre, cedula) {
    const d = _migrate(data);
    d.trabajadores.push({
      id: _uid('tr'),
      nombre: nombre || 'Nuevo trabajador',
      cedula: cedula || '',
      documentos: {},
      archivos: {},
      requerimientos: [],
    });
    return d;
  }

  function actualizarTrabajador(data, trId, campo, valor) {
    const d = _migrate(data);
    const tr = d.trabajadores.find(t => t.id === trId);
    if (!tr) return d;
    if (campo === 'nombre' || campo === 'cedula') tr[campo] = valor;
    else {
      if (!tr.documentos) tr.documentos = {};
      tr.documentos[campo] = valor;
      DOC_PERSONAL.forEach(doc => {
        if (campo === doc.expId && doc.meses && valor && doc.vencId) {
          if (!tr.documentos[doc.vencId]) tr.documentos[doc.vencId] = _addMeses(valor, doc.meses);
        }
      });
      _syncLegacyFromTrabajador(d, tr);
    }
    return d;
  }

  function agregarRequerimiento(data, trId, nombre, exp, venc, sinVencimiento) {
    const d = _migrate(data);
    const tr = d.trabajadores.find(t => t.id === trId);
    if (!tr || !nombre) return d;
    if (!tr.requerimientos) tr.requerimientos = [];
    tr.requerimientos.push({
      id: _uid('req'),
      nombre: String(nombre).trim(),
      exp: exp || '',
      venc: sinVencimiento ? '' : (venc || ''),
      sinVencimiento: !!sinVencimiento,
    });
    return d;
  }

  function actualizarRequerimiento(data, trId, reqId, campo, valor) {
    const d = _migrate(data);
    const tr = d.trabajadores.find(t => t.id === trId);
    if (!tr) return d;
    const req = (tr.requerimientos || []).find(r => r.id === reqId);
    if (!req) return d;
    if (campo === 'nombre') req.nombre = String(valor || '').trim();
    else if (campo === 'exp') req.exp = valor || '';
    else if (campo === 'venc') req.venc = valor || '';
    else if (campo === 'sinVencimiento') {
      req.sinVencimiento = !!valor;
      if (req.sinVencimiento) req.venc = '';
    }
    return d;
  }

  function eliminarRequerimiento(data, trId, reqId) {
    const d = _migrate(data);
    const tr = d.trabajadores.find(t => t.id === trId);
    if (!tr) return d;
    tr.requerimientos = (tr.requerimientos || []).filter(r => r.id !== reqId);
    if (tr.archivos) delete tr.archivos[_archivoKey(reqId)];
    return d;
  }

  function agregarEquipo(data, codigo, tipo) {
    const d = _migrate(data);
    d.equiposLista.push({
      id: _uid('eq'),
      codigo: codigo || 'EQ-NEW',
      tipo: tipo || 'Nuevo equipo',
      ultima_calibracion: '',
      proxima_calibracion: '',
      mantenimiento_programado: '',
      historial: [],
    });
    return d;
  }

  function actualizarEquipo(data, eqId, campo, valor) {
    const d = _migrate(data);
    const eq = d.equiposLista.find(e => e.id === eqId);
    if (!eq) return d;
    eq[campo] = valor;
    if (campo === 'ultima_calibracion' && valor) {
      const calItem = ITEMS.find(x => x.id === 'calibracion_fecha');
      const prox = estado(valor, calItem).proximo;
      if (prox && !eq.proxima_calibracion) eq.proxima_calibracion = prox;
      eq.historial = eq.historial || [];
      if (!eq.historial.some(h => h.fecha === valor)) {
        eq.historial.unshift({ id: _uid('cal'), fecha: valor, resultado: 'Registrado', nota: '' });
      }
    }
    _syncLegacyFromEquipo(d, eq);
    return d;
  }

  function agregarCalibracion(data, eqId, fecha, nota) {
    const d = _migrate(data);
    const eq = d.equiposLista.find(e => e.id === eqId);
    if (!eq || !fecha) return d;
    eq.ultima_calibracion = fecha;
    const calItem = ITEMS.find(x => x.id === 'calibracion_fecha');
    eq.proxima_calibracion = estado(fecha, calItem).proximo || '';
    eq.historial = eq.historial || [];
    eq.historial.unshift({ id: _uid('cal'), fecha, resultado: 'Calibración', nota: nota || '' });
    _syncLegacyFromEquipo(d, eq);
    return d;
  }

  return {
    ITEMS, DOC_PERSONAL, CEDULA_DOC, GRUPOS, NORMA_BASE, ALERTA_DIAS,
    getVencimientos, saveVencimientos,
    getArchivo, setArchivo,
    estado, estadoFechaVencimiento, estadoDocPersonal, estadoRequerimiento, periodicidadTexto,
    itemsGrupo, allDocsPersonal, resumenGrupo,
    getPersonalRows, getEquiposRows, getDashboard,
    agregarTrabajador, actualizarTrabajador,
    agregarRequerimiento, actualizarRequerimiento, eliminarRequerimiento,
    agregarEquipo, actualizarEquipo, agregarCalibracion,
  };
})();
