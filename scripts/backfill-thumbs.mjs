#!/usr/bin/env node

/**
 * Crea miniaturas JPEG de las fotos existentes en sc-informes-fotos.
 *
 * Seguro por defecto: sin --execute solo enumera y estima; nunca escribe.
 * Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o los nombres SC_*).
 * El modo real requiere el paquete opcional `sharp`.
 */

const BUCKET = 'sc-informes-fotos';
const ROOT = process.env.SUPABASE_URL || process.env.SC_INFORME_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SC_INFORME_SUPABASE_SERVICE_ROLE_KEY;
const EXECUTE = process.argv.includes('--execute');
const DRY_RUN = !EXECUTE;
const LIMIT = 1000;
const ESTIMACION_MINIATURA_BYTES = 35 * 1024;

if (!ROOT || !KEY) {
  console.error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o sus equivalentes SC_INFORME_*).');
  process.exitCode = 2;
}

const base = ROOT ? ROOT.replace(/\/+$/, '') : '';
const headers = {
  apikey: KEY || '',
  Authorization: `Bearer ${KEY || ''}`,
};

async function storageList(prefix, offset = 0) {
  const res = await fetch(`${base}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, limit: LIMIT, offset, sortBy: { column: 'name', order: 'asc' } }),
  });
  if (!res.ok) throw new Error(`Storage list ${res.status}: ${(await res.text()).slice(0, 240)}`);
  return res.json();
}

async function listarObjetos() {
  const archivos = [];
  const carpetas = [''];
  while (carpetas.length) {
    const prefix = carpetas.pop();
    for (let offset = 0;; offset += LIMIT) {
      const rows = await storageList(prefix, offset);
      for (const row of rows) {
        const name = String(row.name || '');
        if (!name) continue;
        const full = prefix ? `${prefix}${name}` : name;
        if (row.id === null || row.metadata == null) {
          carpetas.push(full.endsWith('/') ? full : `${full}/`);
        } else {
          archivos.push({ path: full, size: Number(row.metadata?.size || row.size || 0) });
        }
      }
      if (rows.length < LIMIT) break;
    }
  }
  return archivos;
}

function esFoto(path) {
  return /\.(?:jpe?g|png|webp)$/i.test(path) && !/_thumb\.jpg$/i.test(path);
}

function thumbPath(path) {
  return path.replace(/\.[a-z0-9]+$/i, '_thumb.jpg');
}

async function cargarSharp() {
  try {
    return (await import('sharp')).default;
  } catch (error) {
    throw new Error('El modo real requiere instalar sharp en el entorno del script.');
  }
}

async function crearMiniatura(sharp, originalPath, destino) {
  const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${originalPath}`, { headers });
  if (!res.ok) throw new Error(`Storage GET ${res.status} para ${originalPath}`);
  const original = Buffer.from(await res.arrayBuffer());
  const miniatura = await sharp(original)
    .resize({ width: 400, withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();
  const subida = await fetch(`${base}/storage/v1/object/${BUCKET}/${destino}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'image/jpeg', 'x-upsert': 'false' },
    body: miniatura,
  });
  if (!subida.ok && subida.status !== 409) {
    throw new Error(`Storage PUT ${subida.status} para ${destino}: ${(await subida.text()).slice(0, 200)}`);
  }
  return miniatura.length;
}

async function main() {
  if (!ROOT || !KEY) return;
  const objetos = await listarObjetos();
  const fotos = objetos.filter(obj => esFoto(obj.path));
  const existentes = new Set(objetos.filter(obj => /_thumb\.jpg$/i.test(obj.path)).map(obj => obj.path));
  const pendientes = [];

  for (const foto of fotos) {
    const destino = thumbPath(foto.path);
    if (existentes.has(destino)) continue;
    pendientes.push({ ...foto, destino });
  }

  let totalBytes = 0;
  if (DRY_RUN) {
    totalBytes = pendientes.length * ESTIMACION_MINIATURA_BYTES;
  } else {
    const sharp = await cargarSharp();
    for (const foto of pendientes) {
      const size = await crearMiniatura(sharp, foto.path, foto.destino);
      totalBytes += size;
      console.log(`creada ${foto.destino} (${size} bytes)`);
    }
  }

  console.log(JSON.stringify({
    modo: DRY_RUN ? 'dry-run' : 'execute',
    bucket: BUCKET,
    fotosOriginales: fotos.length,
    miniaturasExistentes: existentes.size,
    miniaturasACrear: pendientes.length,
    pesoEstimadoBytes: totalBytes,
    pesoEstimadoMiB: Number((totalBytes / 1024 / 1024).toFixed(2)),
    idempotente: true,
  }, null, 2));
}

main().catch(error => {
  console.error('[backfill-thumbs]', error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
