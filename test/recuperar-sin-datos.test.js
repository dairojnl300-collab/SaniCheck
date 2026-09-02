/**
 * Regresión: /app/recuperar.html no debe quedarse atascada cuando no hay
 * ninguna inspección local recuperable. El botón principal debe limpiar el
 * almacenamiento local y redirigir a la app normal, sin quedar deshabilitado
 * ni provocar que index.html vuelva a redirigir en bucle.
 * Run: node test/recuperar-sin-datos.test.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const APP_DIR = path.join(__dirname, '..', 'app');
const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
].filter(p => p && fs.existsSync(p));

const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css' };

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url.split('?')[0];
      const filePath = path.join(APP_DIR, urlPath === '/' ? 'index.html' : urlPath);
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

(async () => {
  const server = await serve();
  const port = server.address().port;
  const launchOpts = { headless: true, args: ['--no-sandbox'] };
  if (CHROME_PATHS[0]) launchOpts.executablePath = CHROME_PATHS[0];
  const browser = await puppeteer.launch(launchOpts);
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/recuperar.html`, { waitUntil: 'load' });

    await page.waitForFunction(
      () => document.getElementById('status').textContent.includes('No se encontró'),
      { timeout: 5000 }
    );

    const beforeClick = await page.evaluate(() => ({
      disabled: document.getElementById('recover').disabled,
      label: document.getElementById('recover').textContent,
    }));
    if (beforeClick.disabled) {
      console.error('FAIL: el botón sigue deshabilitado cuando no hay nada que recuperar (atasco reproducido)');
      process.exit(1);
    }
    if (!/Continuar a SaniCheck/i.test(beforeClick.label)) {
      console.error(`FAIL: el botón no indica una acción de salida disponible. Texto: "${beforeClick.label}"`);
      process.exit(1);
    }

    // Simula el residuo que dispara el guard de arranque de index.html: una
    // cadena grande e ilegible en localStorage (no un JSON de inspección válido).
    await page.evaluate(() => {
      localStorage.setItem('saneamiento_psb_v1', 'x'.repeat(3 * 1024 * 1024 + 1));
    });

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load', timeout: 5000 }),
      page.click('#recover'),
    ]);

    const finalUrl = page.url();
    if (!/\/(index\.html)?$/.test(new URL(finalUrl).pathname)) {
      console.error(`FAIL: no navegó a la app normal. URL final: ${finalUrl}`);
      process.exit(1);
    }

    const raw = await page.evaluate(() => localStorage.getItem('saneamiento_psb_v1'));
    if (raw && raw.length > 3 * 1024 * 1024) {
      console.error('FAIL: el almacenamiento local corrupto no se limpió; index.html volverá a redirigir en bucle');
      process.exit(1);
    }

    // Recarga para confirmar que el guard de arranque de index.html ya no redirige de vuelta.
    await page.goto(finalUrl.replace(/index\.html$/, ''), { waitUntil: 'load' });
    const stuckInRecovery = /\/recuperar\.html$/i.test(new URL(page.url()).pathname);
    if (stuckInRecovery) {
      console.error('FAIL: al recargar la app, el guard de arranque volvió a mandar a recuperar.html (bucle persiste)');
      process.exit(1);
    }

    console.log('OK: sin datos recuperables, el botón limpia y abre la app normal sin bucle');
    process.exit(0);
  } catch (error) {
    console.error('FAIL:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
    server.close();
  }
})();
