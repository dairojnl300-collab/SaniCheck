/**
 * Verificación local SW — cero redirected:true + carga offline
 * Uso: node scripts/verify-sw-offline.mjs (servidor en :8080)
 */
import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE = 'http://127.0.0.1:8080/';
const TIMEOUT = 60000;

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
].filter(p => p && fs.existsSync(p));

async function main() {
  const launchOpts = { headless: true, args: ['--no-sandbox'] };
  if (CHROME_PATHS[0]) launchOpts.executablePath = CHROME_PATHS[0];

  const browser = await puppeteer.launch(launchOpts);
  const page = await browser.newPage();

  try {
    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: TIMEOUT });

    // Esperar registro SW + precache
    await page.waitForFunction(
      () => navigator.serviceWorker && navigator.serviceWorker.controller,
      { timeout: TIMEOUT }
    );
    await new Promise(r => setTimeout(r, 3000));

    const cacheReport = await page.evaluate(async () => {
      const keys = await caches.keys();
      const sanicheck = keys.find(k => k.startsWith('sanicheck-')) || keys[0];
      if (!sanicheck) return { error: 'No cache found', keys };

      const cache = await caches.open(sanicheck);
      const reqs = await cache.keys();
      const redirected = [];
      for (const req of reqs) {
        const res = await cache.match(req);
        if (res && res.redirected) {
          redirected.push(req.url);
        }
      }
      return {
        cacheName: sanicheck,
        total: reqs.length,
        redirectedCount: redirected.length,
        redirectedUrls: redirected.slice(0, 10),
      };
    });

    console.log('=== Cache Storage ===');
    console.log(JSON.stringify(cacheReport, null, 2));

    if (cacheReport.redirectedCount > 0) {
      console.error('FAIL: entradas con redirected:true encontradas');
      process.exit(1);
    }

    // Offline reload
    await page.setOfflineMode(true);
    const offlineResp = await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    const title = await page.title();
    const hasApp = await page.evaluate(() => !!document.getElementById('app'));

    console.log('=== Offline test ===');
    console.log('status:', offlineResp?.status());
    console.log('title:', title);
    console.log('has #app shell:', hasApp);

    if (!offlineResp || offlineResp.status() !== 200 || !hasApp) {
      console.error('FAIL: página no cargó offline correctamente');
      process.exit(1);
    }

    console.log('PASS: cero redirected + carga offline OK');
    process.exit(0);
  } catch (err) {
    console.error('FAIL:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
