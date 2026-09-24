import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer';

const cards = Array.from({ length: 103 }, (_, index) => {
  const program = Math.floor(index / 10) + 1;
  const photos = index % 7 === 0 ? 6 : index % 3;
  return `
    ${index % 10 === 0 ? `<div class="acta-programa"><div class="acta-programa-title">Programa ${program}</div><div class="acta-criteria-grid"><section class="acta-criterion-group"><div class="acta-aspectos-stack">` : ''}
    <article class="acta-card" data-card="${index + 1}">
      <div class="acta-criterion-inline-title">${program}.${index + 1} Criterio histórico</div>
      <p>${'Texto extenso de verificación y seguimiento. '.repeat((index % 4) + 1)}</p>
      ${photos ? `<div style="display:grid;grid-template-columns:repeat(2,1fr)">${Array.from({ length: photos }, (_, photo) => `<figure><img alt="Foto ${photo + 1}" width="640" height="480" style="width:100%;height:280px"><figcaption>Foto ${photo + 1}</figcaption></figure>`).join('')}</div>` : ''}
    </article>
    ${(index % 10 === 9 || index === 102) ? '</div></section></div></div>' : ''}`;
}).join('');

const oldHtml = `<!doctype html><html><head><style>
  *{box-sizing:border-box} body{margin:0;font-family:Arial}.acta-wrap{width:min(100%,800px);padding:16px}
  .acta-criteria-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .acta-criterion-group,.acta-aspectos-stack{display:contents}.acta-card{min-height:320px;padding:10px;border:1px solid #ddd}
  @media print{.acta-card{break-inside:avoid}} @page{size:auto;margin:1.5cm}
</style></head><body><main class="acta-wrap"><header>Encabezado histórico</header><section class="acta-seccion"><h2>Detalle</h2><div class="acta-desktop-detail">${cards}</div></section><footer>Firmas</footer></main></body></html>`;

const executablePath = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find(path => fs.existsSync(path));
const browser = await puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.setContent(oldHtml, { waitUntil: 'load' });
  await page.addScriptTag({ path: resolve('app/js/acta-print.js') });
  const result = await page.evaluate(() => {
    ActaPrint.aplicar(document);
    const metrics = ActaPrint.paginarMovil(document);
    return {
      ...metrics,
      directPages: document.querySelectorAll('body > .pdf-page').length,
      cards: document.querySelectorAll('body > .pdf-page .acta-card').length,
      pagesWithoutProgramTitle: Array.from(document.querySelectorAll('body > .pdf-page'))
        .filter(node => !node.querySelector('.acta-programa-title')).length,
      overflowPages: Array.from(document.querySelectorAll('body > .pdf-page'))
        .map((node, page) => ({
          page: page + 1,
          height: node.offsetHeight,
          cards: Array.from(node.querySelectorAll('.acta-card')).map(card => card.dataset.card),
          oversize: Array.from(node.querySelectorAll('.pdf-card-oversize')).map(card => card.dataset.card),
        }))
        .filter(item => item.height > metrics.limit),
    };
  });

  assert.equal(result.cards, 103);
  assert.equal(result.directPages, result.pages);
  assert.equal(result.pagesWithoutProgramTitle, 0);
  assert.ok(result.maxHeight <= result.limit, JSON.stringify(result));
  process.stdout.write(`${JSON.stringify(result)}\n`);
} finally {
  await browser.close();
}
