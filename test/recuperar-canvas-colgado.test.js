/**
 * Regresión: si un WebView no llama el callback de canvas.toBlob durante una
 * recuperación pesada, el botón debe completar usando el encoder alterno.
 * Run: node test/recuperar-canvas-colgado.test.js
 */
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const APP_DIR = path.join(__dirname, '..', 'app');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const file = path.join(APP_DIR, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
      fs.readFile(file, (error, data) => {
        if (error) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': path.extname(file) === '.js' ? 'application/javascript' : 'text/html' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

(async () => {
  const server = await serve();
  const browser = await puppeteer.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/recuperar.html`, { waitUntil: 'load' });
    await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 560;
      const context = canvas.getContext('2d');
      context.fillStyle = '#5BA832';
      context.fillRect(0, 0, 560, 560);
      const photo = canvas.toDataURL('image/jpeg', 0.92);
      const state = {
        inspecciones: [{ id: 'webview-timeout', programas: [{ aspectos: [{ fotografias: Array.from({ length: 28 }, (_, index) => ({ id: `foto-${index}`, data: photo })) }] }] }],
        currentId: 'webview-timeout', ui: { screen: 'hacer' },
      };
      await new Promise((resolve, reject) => {
        const request = indexedDB.open('sanicheck-persist', 1);
        request.onupgradeneeded = event => event.target.result.createObjectStore('kv');
        request.onerror = () => reject(request.error);
        request.onsuccess = event => {
          const tx = event.target.result.transaction('kv', 'readwrite');
          tx.objectStore('kv').put({ store: state, saved_at: '2026-09-02T12:00:00.000Z' }, 'snapshot');
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        };
      });
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => document.getElementById('status').textContent.includes('28 fotografías'));
    await page.evaluate(() => {
      const nativeToBlob = HTMLCanvasElement.prototype.toBlob;
      let dropped = false;
      HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
        if (!dropped) { dropped = true; return; }
        return nativeToBlob.call(this, callback, ...args);
      };
    });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15_000 }),
      page.click('#recover'),
    ]);
    assert.match(new URL(page.url()).pathname, /\/(index\.html)?$/, 'debe abrir SaniCheck aunque toBlob no responda');
    console.log('OK: la recuperación pesada continúa si el primer toBlob queda colgado');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error('FAIL:', error.message); process.exit(1); });
