/**
 * Genera app/data/invima-checklist-base-v1.0.json desde dadis-config.json
 * + categoría 6 completada con ítems de verificación INVIMA legacy.
 * Run: node scripts/build-invima-base-from-dadis.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dadis = JSON.parse(fs.readFileSync(path.join(root, 'app/data/dadis-config.json'), 'utf8'));

const CAT_IDS = ['cat_01', 'cat_02', 'cat_03', 'cat_04', 'cat_05', 'cat_06'];

const CAT6_LEGACY = [
  { codigo: '6.1', nombre: 'Plan de autocontrol', normativa: 'Res. 2674/2013 — Programa de autocontrol y verificación del cumplimiento sanitario' },
  { codigo: '6.2', nombre: 'Registros de monitoreo', normativa: 'Res. 2674/2013 — Registros de monitoreo de puntos críticos y controles operacionales' },
  { codigo: '6.3', nombre: 'Acciones correctivas', normativa: 'Res. 2674/2013 — Procedimientos documentados de acciones correctivas y preventivas' },
  { codigo: '6.4', nombre: 'Verificación interna', normativa: 'Res. 2674/2013 — Verificación interna periódica del sistema de autocontrol' },
  { codigo: '6.5', nombre: 'Trazabilidad', normativa: 'Res. 2674/2013 · Dec. 3075/1997 — Trazabilidad de materias primas y productos terminados' },
  { codigo: '6.6', nombre: 'Retiro y recuperación producto', normativa: 'Res. 2674/2013 — Procedimiento de retiro o recuperación de producto cuando aplique' },
  { codigo: '6.7', nombre: 'Auditorías documentadas', normativa: 'Res. 2674/2013 — Registros de auditorías internas o externas al sistema sanitario' },
  { codigo: '6.8', nombre: 'Revisión por la dirección', normativa: 'Res. 2674/2013 — Revisión periódica por la dirección del desempeño del plan sanitario' },
];

function itemId(codigo) {
  return 'item_' + String(codigo).replace(/\./g, '_');
}

function mapItem(it) {
  return {
    id: itemId(it.id || it.codigo),
    codigo: it.id || it.codigo,
    nombre: it.nombre,
    normativa: it.normativa,
    descripcion: it.descripcion || '',
    custom: false,
  };
}

const categorias = (dadis.categorias || []).map((cat, idx) => {
  const catId = CAT_IDS[idx] || ('cat_' + String(idx + 1).padStart(2, '0'));
  let items = (cat.items || []).map(mapItem);
  if (Number(cat.id) === 6 && !items.length) {
    items = CAT6_LEGACY.map(it => ({
      id: itemId(it.codigo),
      codigo: it.codigo,
      nombre: it.nombre,
      normativa: it.normativa,
      descripcion: '',
      custom: false,
    }));
  }
  return {
    id: catId,
    nombre: cat.nombre,
    peso: cat.peso,
    items,
  };
});

const out = {
  meta: {
    version: '1.1',
    fuente: 'Fusión dadis-config.json (Instructivo Dadys.xls) + cat. 6 verificación INVIMA',
    escala_leyenda: dadis.meta?.escala_leyenda || {},
  },
  categorias,
  escala: dadis.escala || { A: 1.0, AR: 0.5, I: 0.0 },
  clasificacion: dadis.clasificacion || [
    { min: 80, max: 100, resultado: 'FAVORABLE' },
    { min: 60, max: 79.9, resultado: 'FAVORABLE CON REQUERIMIENTO' },
    { min: 0, max: 59.9, resultado: 'DESFAVORABLE' },
  ],
};

const dest = path.join(root, 'app/data/invima-checklist-base-v1.0.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n', 'utf8');

const pesoSum = categorias.reduce((s, c) => s + Number(c.peso || 0), 0);
const itemCount = categorias.reduce((s, c) => s + c.items.length, 0);
console.log('Written:', dest);
console.log('Categorías:', categorias.length, '| Pesos sum:', pesoSum, '| Ítems:', itemCount);
