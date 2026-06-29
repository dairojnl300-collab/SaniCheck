// gen-icons.js — Genera PNG 192x192 y 512x512 para PWA (sin dependencias externas)
// Crea un PNG con diseño ECODESA usando zlib

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size) {
  const W = size, H = size;

  // Dibuja los pixels manualmente (RGBA)
  const pixels = new Uint8Array(W * H * 4);

  const cx = W / 2, cy = H / 2;
  const R = size * 0.5;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const dx = x - cx, dy = y - cy;
      const d  = Math.sqrt(dx * dx + dy * dy);

      // Fondo circular verde oscuro
      if (d <= R * 0.98) {
        // Color base: #1B4332
        pixels[idx]   = 0x1B;
        pixels[idx+1] = 0x43;
        pixels[idx+2] = 0x32;
        pixels[idx+3] = 255;

        // Hoja: curva elíptica
        const nx = dx / R, ny = dy / R;
        const leafR = 0.65;
        const inLeaf = (nx*nx*1.5 + ny*ny + ny * 0.5) < leafR * leafR;
        if (inLeaf && ny < 0.3) {
          // Verde hoja #52B788
          pixels[idx]   = 0x52;
          pixels[idx+1] = 0xB7;
          pixels[idx+2] = 0x88;
          pixels[idx+3] = 255;
        }

        // Tallo
        const stemW = R * 0.06;
        if (Math.abs(dx) < stemW && ny > 0.1 && ny < 0.55) {
          pixels[idx]   = 0x2D;
          pixels[idx+1] = 0x6A;
          pixels[idx+2] = 0x4F;
          pixels[idx+3] = 255;
        }
      } else {
        // Transparente fuera del círculo
        pixels[idx+3] = 0;
      }
    }
  }

  // Construir PNG
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);

  function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc >>> 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // IDAT: filtros + compresión
  const raw = [];
  for (let y = 0; y < H; y++) {
    raw.push(0); // filter type None
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      raw.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]);
    }
  }
  const rawBuf = Buffer.from(raw);
  const compressed = zlib.deflateSync(rawBuf, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// CRC32
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

const outDir = path.join(__dirname, 'app/assets/icons');
fs.mkdirSync(outDir, { recursive: true });

[192, 512].forEach(size => {
  const png = createPNG(size);
  const out = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(out, png);
  console.log(`✅ ${out} (${(png.length/1024).toFixed(0)} KB)`);
});
