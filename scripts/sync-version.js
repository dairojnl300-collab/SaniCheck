// sync-version.js — Genera version.json y sincroniza hash de build en sw.js

const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const APP  = path.join(ROOT, 'app');

const ASSET_PATHS = [
  'index.html',
  'manifest.json',
  'version.json',
  'css/brand.css',
  'css/motion.css',
  'js/store.js',
  'js/router.js',
  'js/motion.js',
  'js/licencias.js',
  'js/app-version.js',
  'js/sw-update.js',
  'js/about.js',
  'js/phva-icons.js',
  'js/portal-config.js',
  'js/portal-cliente.js',
  'js/app.js',
  'js/logic/psb-data.js',
  'js/logic/checklist-config.js',
  'js/logic/diagnostico-inicial.js',
  'js/logic/vencimientos.js',
  'js/logic/observaciones.js',
  'js/logic/scores.js',
  'js/logic/hallazgos.js',
  'js/logic/fotos.js',
  'js/logic/dadis-scoring.js',
  'js/phva/planificar.js',
  'js/phva/personalizar.js',
  'js/phva/hacer.js',
  'js/phva/verificar.js',
  'js/phva/actuar.js',
  'js/screens/dadis-simulador.js',
  'data/dadis-config.json',
  'sw.js',
];

function gitShortHash() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
  } catch {
    return 'local';
  }
}

function fileDigest(hash, rel) {
  const p = path.join(APP, rel);
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p);
  if (rel === 'sw.js') {
    content = content.toString()
      .replace(/const BUILD_HASH = '[^']*';/, "const BUILD_HASH = '__BUILD__';")
      .replace(/const APP_VERSION = '[^']*';/, "const APP_VERSION = '__VERSION__';");
  }
  hash.update(content);
}

function computeBuildHash(version) {
  const hash = crypto.createHash('sha256');
  for (const rel of ASSET_PATHS) {
    if (rel === 'version.json') continue;
    fileDigest(hash, rel);
  }
  hash.update(gitShortHash());
  hash.update(version);
  return hash.digest('hex').slice(0, 12);
}

function readAppVersion() {
  const avPath = path.join(APP, 'js/app-version.js');
  if (fs.existsSync(avPath)) {
    const m = fs.readFileSync(avPath, 'utf8').match(/VERSION\s*=\s*'([^']+)'/);
    if (m) return m[1];
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  return pkg.version || '0.0.0';
}

function syncPackageJson(version) {
  const pkgPath = path.join(ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.version === version) return;
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

function patchSw(version, build) {
  const swPath = path.join(APP, 'sw.js');
  let sw = fs.readFileSync(swPath, 'utf8');
  sw = sw.replace(/const APP_VERSION = '[^']*';/, `const APP_VERSION = '${version}';`);
  if (/const BUILD_HASH = '[^']*';/.test(sw)) {
    sw = sw.replace(/const BUILD_HASH = '[^']*';/, `const BUILD_HASH = '${build}';`);
  } else {
    sw = sw.replace(
      /const APP_VERSION = '[^']*';/,
      `const APP_VERSION = '${version}';\nconst BUILD_HASH = '${build}';`
    );
  }
  sw = sw.replace(/const CACHE = '[^']*';/, `const CACHE = 'sanicheck-' + BUILD_HASH;`);
  fs.writeFileSync(swPath, sw, 'utf8');
}

function main() {
  const version = readAppVersion();
  syncPackageJson(version);
  const build   = computeBuildHash(version);
  const builtAt = new Date().toISOString();
  const manifest = { version, build, builtAt };

  fs.writeFileSync(path.join(APP, 'version.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  patchSw(version, build);

  console.log(`✓ version.json → ${version} · build ${build}`);
}

main();
