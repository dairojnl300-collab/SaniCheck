/**
 * Regresión: una inspección pesada con 28 fotos debe salir de la pantalla de
 * recuperación, conservar su copia original y abrir la app sin volver al loop.
 * Run: node test/recuperar-fotos-pesadas.test.js
 */
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const APP_DIR = path.join(__dirname, '..', 'app');
const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
].filter(candidate => candidate && fs.existsSync(candidate));

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url.split('?')[0];
      const filePath = path.join(APP_DIR, urlPath === '/' ? 'index.html' : urlPath);
      fs.readFile(filePath, (error, data) => {
        if (error) { res.writeHead(404); res.end('not found'); return; }
        const extension = path.extname(filePath);
        const type = extension === '.html' ? 'text/html' : extension === '.js' ? 'application/javascript' : 'application/json';
        res.writeHead(200, { 'Content-Type': type });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

(async () => {
  const server = await serve();
  const port = server.address().port;
  const launchOptions = { headless: true, args: ['--no-sandbox'] };
  if (CHROME_PATHS[0]) launchOptions.executablePath = CHROME_PATHS[0];
  const browser = await puppeteer.launch(launchOptions);
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/recuperar.html`, { waitUntil: 'load' });

    await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 560;
      canvas.height = 560;
      const context = canvas.getContext('2d');
      const noise = context.createImageData(canvas.width, canvas.height);
      for (let index = 0; index < noise.data.length; index += 4) {
        const value = (index * 31) % 255;
        noise.data[index] = value;
        noise.data[index + 1] = (value * 7) % 255;
        noise.data[index + 2] = (value * 13) % 255;
        noise.data[index + 3] = 255;
      }
      context.putImageData(noise, 0, 0);
      const photo = canvas.toDataURL('image/jpeg', 0.92);
      const fotografias = Array.from({ length: 28 }, (_, index) => ({ id: `heavy-${index}`, data: photo }));
      const state = {
        inspecciones: [{
          id: 'heavy-realistic-inspection',
          establecimiento: { nombre: 'Inspección pesada' },
          programas: [{ id: 'edificacion', aspectos: [{ id: 'edificacion_1', fotografias }], }],
          actualizado_en: '2026-09-02T12:00:00.000Z',
        }],
        currentId: 'heavy-realistic-inspection',
        ui: { screen: 'hacer' },
      };
      await new Promise((resolve, reject) => {
        const request = indexedDB.open('sanicheck-persist', 1);
        request.onupgradeneeded = event => event.target.result.createObjectStore('kv');
        request.onerror = () => reject(request.error);
        request.onsuccess = event => {
          const db = event.target.result;
          const tx = db.transaction('kv', 'readwrite');
          tx.objectStore('kv').put({ store: state, saved_at: '2026-09-02T12:00:00.000Z' }, 'snapshot');
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        };
      });
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => document.getElementById('status').textContent.includes('28 fotografías'), { timeout: 10_000 });

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60_000 }),
      page.click('#recover'),
    ]);

    assert.match(new URL(page.url()).pathname, /\/(index\.html)?$/, 'debe abrir la aplicación después de recuperar');
    const result = await page.evaluate(() => new Promise((resolve, reject) => {
      const request = indexedDB.open('sanicheck-persist', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = event => {
        const db = event.target.result;
        const tx = db.transaction('kv', 'readonly');
        const get = tx.objectStore('kv').get('recovery-original');
        get.onerror = () => reject(get.error);
        get.onsuccess = () => resolve({ original: get.result, path: location.pathname });
      };
    }));
    assert.equal(result.original.store.inspecciones[0].programas[0].aspectos[0].fotografias.length, 28,
      'el respaldo original conserva las 28 fotografías');
    assert.notEqual(result.path, '/recuperar.html', 'la app no debe volver al recovery loop');
    console.log('OK: 28 fotos pesadas se preservan y la recuperación abre SaniCheck');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error('FAIL:', error.message); process.exit(1); });
