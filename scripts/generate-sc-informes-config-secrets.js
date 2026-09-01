/**
 * Genera app/js/sc-informes-config.secrets.js desde .env (no commitear secrets).
 * Proyecto isncjtomlvxyvcaohcpx (respaldo de informes, distinto del Portal Cliente).
 * Uso: node scripts/generate-sc-informes-config-secrets.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const OUT_PATH = path.join(ROOT, 'app/js/sc-informes-config.secrets.js');

function parseEnv(text) {
  const out = {};
  text.split(/\r?\n/).forEach(line => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const i = t.indexOf('=');
    if (i < 1) return;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  });
  return out;
}

function main() {
  const envFile = fs.existsSync(ENV_PATH) ? parseEnv(fs.readFileSync(ENV_PATH, 'utf8')) : {};
  const url = process.env.SC_INFORMES_SUPABASE_URL || envFile.SC_INFORMES_SUPABASE_URL || 'https://isncjtomlvxyvcaohcpx.supabase.co';
  const key = process.env.SC_INFORMES_SUPABASE_ANON_KEY || envFile.SC_INFORMES_SUPABASE_ANON_KEY || '';

  if (!key) {
    console.error('Falta SC_INFORMES_SUPABASE_ANON_KEY en .env o variables de entorno.');
    process.exit(1);
  }

  const body = `/**
 * sc-informes-config.secrets.js — generado, NO commitear
 * node scripts/generate-sc-informes-config-secrets.js
 */
window.SC_INFORMES_SECRETS = {
  SUPABASE_URL: ${JSON.stringify(url)},
  SUPABASE_ANON_KEY: ${JSON.stringify(key)},
};
`;

  fs.writeFileSync(OUT_PATH, body, 'utf8');
  console.log('OK:', OUT_PATH);
}

main();
