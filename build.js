// build.js — Concatena y minifica todos los JS de SaniCheck
const fs   = require('fs');
const path = require('path');
const { minify } = require('terser');

const ROOT = __dirname;

const ORDEN = [
  'app/js/logic/psb-data.js',
  'app/js/store.js',
  'app/js/router.js',
  'app/js/logic/observaciones.js',
  'app/js/logic/scores.js',
  'app/js/logic/hallazgos.js',
  'app/js/logic/fotos.js',
  'app/js/licencias.js',
  'app/js/phva/planificar.js',
  'app/js/phva/hacer.js',
  'app/js/phva/verificar.js',
  'app/js/phva/actuar.js',
  'app/js/app.js',
];

// Nombres accedidos desde HTML (onclick=, etc.) — no renombrar
const RESERVADOS = [
  'Router','Store','Planificar','Hacer','Verificar','Actuar',
  'Scores','Hallazgos','Observaciones','Fotos','Licencias',
  '_abrirInsp','_activarLicencia','_nuevaInspeccion',
  'getPSBPrograms','crearInspeccion',
];

async function build() {
  console.log('⚙ Construyendo SaniCheck...');

  const fuente = ORDEN
    .map(f => {
      const ruta = path.join(ROOT, f);
      if (!fs.existsSync(ruta)) { console.warn(`  ⚠ No encontrado: ${f}`); return ''; }
      return `/* === ${f} === */\n` + fs.readFileSync(ruta, 'utf8');
    })
    .join('\n\n');

  const resultado = await minify(fuente, {
    compress: {
      passes: 2,
      drop_console: false,
    },
    mangle: {
      reserved: RESERVADOS,
    },
    format: { comments: false },
  });

  const salida = path.join(ROOT, 'app/js/app.bundle.min.js');
  fs.writeFileSync(salida, resultado.code, 'utf8');

  const kb = (resultado.code.length / 1024).toFixed(1);
  const orig = (fuente.length / 1024).toFixed(1);
  console.log(`✅ Bundle: ${orig} KB → ${kb} KB (${Math.round((1 - resultado.code.length / fuente.length) * 100)}% reducción)`);
}

build().catch(err => { console.error(err); process.exit(1); });
