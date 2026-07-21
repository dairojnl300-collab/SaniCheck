/**
 * Reordena invima-checklist-base-v1.0.json según hoja Instructivo (orden literal)
 * con pesos por tema desde hoja Tablas.
 * Run: node scripts/reorder-invima-instructivo.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'app/data/invima-checklist-base-v1.0.json');
const src = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

const byCodigo = {};
(src.categorias || []).forEach(cat => {
  (cat.items || []).forEach(it => {
    byCodigo[it.codigo] = { ...it };
  });
});

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

const cat6 = (src.categorias || []).find(c => c.id === 'cat_06');
if (!cat6) throw new Error('cat_06 no encontrada');

const categorias = INSTRUCTIVO_CATS.map(def => {
  const items = def.codigos.map(cod => {
    const it = byCodigo[cod];
    if (!it) throw new Error('Ítem no encontrado: ' + cod);
    return {
      id: it.id,
      codigo: it.codigo,
      nombre: it.nombre,
      normativa: it.normativa,
      descripcion: it.descripcion || '',
      esComplementaria: false,
    };
  });
  return { id: def.id, nombre: def.nombre, peso: def.peso, items };
});

categorias.push(JSON.parse(JSON.stringify(cat6)));

const out = {
  ...src,
  meta: {
    ...src.meta,
    version: '1.2',
    fuente: 'Orden literal hoja Instructivo (Dadys.xls) + pesos por tema hoja Tablas + cat. 6 verificación',
  },
  categorias,
};

const pesoSum = categorias.reduce((s, c) => s + Number(c.peso || 0), 0);
if (pesoSum !== 100) throw new Error('Pesos no suman 100: ' + pesoSum);

fs.writeFileSync(srcPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('Reordenado:', srcPath);
console.log('Pesos:', categorias.map(c => c.peso + '% ' + c.nombre).join(' | '));
console.log('Ítems:', categorias.reduce((s, c) => s + c.items.length, 0));
