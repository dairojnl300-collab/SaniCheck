/**
 * Genera app/data/invima-checklist-base-v1.0.json desde dadis-config.json
 * reordenado según hoja Instructivo (orden literal) + pesos por tema (Tablas)
 * + categoría 6 verificación INVIMA legacy.
 * Run: node scripts/build-invima-base-from-dadis.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dadis = JSON.parse(fs.readFileSync(path.join(root, 'app/data/dadis-config.json'), 'utf8'));

const INSTRUCTIVO_CATS = [
  {
    id: 'cat_01',
    nombre: 'EDIFICACIÓN E INSTALACIONES',
    peso: 10,
    codigos: ['1.1', '1.2', '1.3', '1.4'],
  },
  {
    id: 'cat_02',
    nombre: 'EQUIPOS Y UTENSILIOS',
    peso: 10,
    codigos: ['2.1', '2.2'],
  },
  {
    id: 'cat_03',
    nombre: 'PERSONAL MANIPULADOR DE ALIMENTOS',
    peso: 20,
    codigos: ['3.1', '3.2', '3.3', '3.4'],
  },
  {
    id: 'cat_04',
    nombre: 'REQUISITOS HIGIÉNICOS',
    peso: 20,
    codigos: ['4.1', '4.2', '4.3', '4.4'],
  },
  {
    id: 'cat_05',
    nombre: 'SANEAMIENTO',
    peso: 30,
    codigos: ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6'],
  },
];

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
  const codigo = it.id || it.codigo;
  return {
    id: itemId(codigo),
    codigo,
    nombre: it.nombre,
    normativa: it.normativa,
    descripcion: it.descripcion || '',
    custom: false,
  };
}

const byCodigo = {};
(dadis.categorias || []).forEach(cat => {
  (cat.items || []).forEach(it => {
    const codigo = it.id || it.codigo;
    byCodigo[codigo] = mapItem(it);
  });
});

const categorias = INSTRUCTIVO_CATS.map(def => {
  const items = def.codigos.map(cod => {
    const it = byCodigo[cod];
    if (!it) throw new Error('Ítem no encontrado en dadis-config: ' + cod);
    return it;
  });
  return { id: def.id, nombre: def.nombre, peso: def.peso, items };
});

categorias.push({
  id: 'cat_06',
  nombre: 'VERIFICACION SOBRE LOS ALIMENTOS',
  peso: 10,
  items: CAT6_LEGACY.map(it => ({
    id: itemId(it.codigo),
    codigo: it.codigo,
    nombre: it.nombre,
    normativa: it.normativa,
    descripcion: '',
    custom: false,
  })),
});

const out = {
  meta: {
    version: '1.2',
    fuente: 'Orden literal hoja Instructivo (Dadys.xls) + pesos por tema hoja Tablas + cat. 6 verificación',
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
