/**
 * Fuente canónica del CSS y la paginación de actas impresas.
 * sanicheck-portal/acta-print.js debe ser una copia byte a byte de este archivo.
 */
const ActaPrint = (() => {
  'use strict';

  const STYLE_ID = 'acta-print-shared';
  const PAGE_HEIGHT_MM = 247;
  const MAX_CARDS = 6;

  function css({ mobile = true } = {}) {
    return `
      @page { size: A4; margin: 25mm 20mm; }
      ${mobile ? `
      body.mobile-pdf .acta-mobile-detail { display: none !important; }
      body.mobile-pdf .acta-desktop-detail { display: block !important; }

      body.mobile-pdf { margin: 0; background: #fff; }
      body.mobile-pdf > .acta-wrap,
      body.mobile-pdf > .pdf-page {
        box-sizing: border-box; width: 170mm !important; max-width: 170mm !important;
        margin: 0 auto !important; padding: 0 !important;
      }
      body.mobile-pdf .acta-criteria-grid,
      body.mobile-pdf .acta-criterion-group,
      body.mobile-pdf .acta-aspectos-stack {
        display: block !important; width: auto !important; min-width: 0 !important;
      }
      body.mobile-pdf .acta-card {
        display: block !important; box-sizing: border-box; width: 100% !important;
        min-height: 0 !important; height: auto !important; margin: 0 0 12px !important;
        overflow: visible !important; break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      body.mobile-pdf .acta-evidence-grid {
        display: flex !important; flex-wrap: wrap !important; align-items: flex-start !important;
        gap: 6px !important; break-inside: avoid !important; page-break-inside: avoid !important;
      }
      body.mobile-pdf .acta-evidence-grid > figure {
        display: block !important; box-sizing: border-box;
        margin: 0 !important;
        flex: 1 1 calc(50% - 3px) !important; width: calc(50% - 3px) !important;
        max-width: calc(50% - 3px) !important; min-width: 0 !important;
      }
      body.mobile-pdf .acta-card figure img {
        display: block !important; width: 100% !important; max-width: 100% !important;
        max-height: 96px !important; object-fit: contain !important;
      }
      body.mobile-pdf .acta-card.pdf-card-oversize figure img { max-height: 80px !important; }
      body.mobile-pdf > .pdf-page {
        display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 12px !important; align-content: start;
        break-inside: avoid !important; page-break-inside: avoid !important;
      }
      body.mobile-pdf > .pdf-page > .acta-desktop-detail {
        display: contents !important;
      }
      body.mobile-pdf > .pdf-page .acta-programa-title {
        grid-column: 1 / -1 !important;
      }
      body.mobile-pdf > .pdf-page--first {
        break-before: page !important; page-break-before: always !important;
      }
      body.mobile-pdf > .pdf-page:not(.pdf-page--last) {
        break-after: page !important; page-break-after: always !important;
      }
      ` : `
      @media print {
        .btn-save, .phva-topbar, .acta-actions, #app-toast { display: none !important; }
      }
      `}

      @media print {
        html, body { width: auto; min-height: 0; background: #fff; }
        body { margin: 0; orphans: 4; widows: 4; }
        ${mobile ? 'body.mobile-pdf .btn-save, body.mobile-pdf .phva-topbar, body.mobile-pdf .acta-actions, body.mobile-pdf #app-toast { display: none !important; }' : ''}
        .acta-wrap {
          box-sizing: border-box; width: 100%; max-width: 170mm; margin: 0 auto; padding: 0;
        }
        .acta-programa { break-inside: auto; page-break-inside: auto; }
        ${mobile ? 'body.mobile-pdf .acta-desktop-detail .acta-criteria-grid, body.mobile-pdf .acta-desktop-detail .acta-criterion-group, body.mobile-pdf .acta-desktop-detail .acta-aspectos-stack {' : '.acta-desktop-detail .acta-criteria-grid, .acta-desktop-detail .acta-criterion-group, .acta-desktop-detail .acta-aspectos-stack {'}
          display: block !important; width: auto; min-width: 0;
        }
        ${mobile ? 'body.mobile-pdf .acta-desktop-detail .acta-card {' : '.acta-desktop-detail .acta-card {'}
          display: block; box-sizing: border-box; width: 100%; min-height: 0 !important;
          height: auto !important; margin: 0 0 12px; overflow: visible;
          break-inside: avoid; page-break-inside: avoid;
        }
        ${mobile ? 'body.mobile-pdf .acta-desktop-detail .acta-evidence-grid {' : '.acta-desktop-detail .acta-evidence-grid {'}
          display: flex !important; flex-wrap: wrap; align-items: flex-start; gap: 6px;
          break-inside: avoid; page-break-inside: avoid;
        }
        ${mobile ? 'body.mobile-pdf .acta-desktop-detail .acta-evidence-grid > figure {' : '.acta-desktop-detail .acta-evidence-grid > figure {'}
          display: block; box-sizing: border-box; flex: 1 1 calc(50% - 3px);
          margin: 0;
          width: calc(50% - 3px); max-width: calc(50% - 3px); min-width: 0;
        }
        ${mobile ? 'body.mobile-pdf .acta-desktop-detail .acta-card figure, body.mobile-pdf .acta-desktop-detail .acta-card img,' : '.acta-desktop-detail .acta-card figure, .acta-desktop-detail .acta-card img,'}
        table tr { break-inside: avoid; page-break-inside: avoid; }
        ${mobile ? 'body.mobile-pdf .acta-desktop-detail .acta-card figure img {' : '.acta-desktop-detail .acta-card figure img {'}
          width: 100%; max-width: 100%; max-height: 96px !important; object-fit: contain !important;
        }
        thead { display: table-header-group; }
        h1, h2, h3, .acta-programa-title { break-after: avoid; page-break-after: avoid; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    `;
  }

  function _eliminarReglasImpresion(contenedor) {
    const reglas = contenedor?.cssRules;
    if (!reglas) return;
    for (let i = reglas.length - 1; i >= 0; i -= 1) {
      const regla = reglas[i];
      const esPage = regla.type === 6;
      const esMediaPrint = regla.type === 4
        && String(regla.media?.mediaText || '').toLowerCase().includes('print');
      if (esPage || esMediaPrint) contenedor.deleteRule(i);
      else if (regla.cssRules) _eliminarReglasImpresion(regla);
    }
  }

  function _limpiarCssHistorico(doc) {
    doc.querySelectorAll(`style#${STYLE_ID}, style[data-acta-print]`).forEach(style => style.remove());
    doc.querySelectorAll('style').forEach(style => {
      try {
        const sheet = style.sheet;
        if (!sheet) return;
        _eliminarReglasImpresion(sheet);
        style.textContent = Array.from(sheet.cssRules).map(regla => regla.cssText).join('\n');
      } catch (_) {
        // El CSS compartido se inserta al final y conserva prioridad.
      }
    });
  }

  function _normalizarEvidenciasHistoricas(doc) {
    doc.querySelectorAll('.acta-card figure').forEach(figure => {
      if (figure.parentElement) figure.parentElement.classList.add('acta-evidence-grid');
    });
  }

  function aplicar(doc, options = {}) {
    if (!doc?.head) return;
    _limpiarCssHistorico(doc);
    _normalizarEvidenciasHistoricas(doc);
    const style = doc.createElement('style');
    style.id = STYLE_ID;
    style.setAttribute('data-acta-print', 'shared');
    style.textContent = css(options);
    doc.head.appendChild(style);
  }

  function normalizarHtml(html) {
    if (!html || typeof DOMParser === 'undefined') return html;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    aplicar(doc, { mobile: false });
    return `<!doctype html>${doc.documentElement.outerHTML}`;
  }

  function styleTag(options = {}) {
    return `<style id="${STYLE_ID}" data-acta-print="shared">${css(options)}</style>`;
  }

  function esMovil(view = window) {
    return view.matchMedia?.('(max-width: 600px)').matches
      || (view.navigator?.maxTouchPoints > 1 && view.innerWidth < 900);
  }

  function _alturaUtilPx(doc) {
    const regla = doc.createElement('div');
    regla.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;height:${PAGE_HEIGHT_MM}mm;width:1px;padding:0;border:0`;
    doc.body.appendChild(regla);
    const altura = regla.getBoundingClientRect().height;
    regla.remove();
    return altura;
  }

  function paginarMovil(doc) {
    if (!doc?.body) return { pages: 0, heights: [], maxHeight: 0, limit: 0 };
    if (doc.body.dataset.actaPaginada === 'true') {
      const existentes = Array.from(doc.body.querySelectorAll(':scope > .pdf-page'));
      const heights = existentes.map(page => page.offsetHeight);
      return { pages: existentes.length, heights, maxHeight: Math.max(0, ...heights), limit: _alturaUtilPx(doc) };
    }

    aplicar(doc, { mobile: true });
    doc.body.classList.add('mobile-pdf');

    const wrap = doc.body.querySelector(':scope > .acta-wrap');
    const detalle = wrap?.querySelector('.acta-desktop-detail');
    const seccion = detalle?.closest('.acta-seccion');
    const tarjetas = Array.from(detalle?.querySelectorAll('.acta-card') || []);
    if (!wrap || !detalle || !seccion || !tarjetas.length) {
      return { pages: 0, heights: [], maxHeight: 0, limit: _alturaUtilPx(doc) };
    }

    const entradas = tarjetas.map(card => {
      const programa = card.closest('.acta-programa');
      const titulo = programa?.querySelector('.acta-programa-title');
      return { card, programa: programa || null, titulo: titulo ? titulo.cloneNode(true) : null };
    });
    const tituloDetalle = Array.from(seccion.children)
      .find(node => !node.classList.contains('acta-desktop-detail')
        && !node.classList.contains('acta-mobile-detail'))
      ?.cloneNode(true);

    const antes = wrap.cloneNode(false);
    antes.classList.add('acta-pdf-before');
    while (wrap.firstChild && wrap.firstChild !== seccion) antes.appendChild(wrap.firstChild);

    const despues = wrap.cloneNode(false);
    despues.classList.add('acta-pdf-after');
    while (seccion.nextSibling) despues.appendChild(seccion.nextSibling);
    if (antes.childNodes.length) doc.body.insertBefore(antes, wrap);

    const limite = _alturaUtilPx(doc);
    const paginas = [];
    let pagina = null;
    let contenido = null;
    let cantidad = 0;
    let programaActual = null;

    const nuevaPagina = () => {
      pagina = doc.createElement('section');
      pagina.className = 'pdf-page acta-wrap';
      contenido = doc.createElement('div');
      contenido.className = 'acta-desktop-detail';
      pagina.appendChild(contenido);
      doc.body.insertBefore(pagina, wrap);
      paginas.push(pagina);
      cantidad = 0;
      programaActual = null;
      if (paginas.length === 1) {
        pagina.classList.add('pdf-page--first');
        if (tituloDetalle) contenido.appendChild(tituloDetalle.cloneNode(true));
      }
    };

    entradas.forEach(entrada => {
      if (!pagina || cantidad >= MAX_CARDS) nuevaPagina();
      const necesitaTitulo = entrada.programa !== programaActual && entrada.titulo;
      const tituloInsertado = necesitaTitulo ? entrada.titulo.cloneNode(true) : null;
      if (tituloInsertado) contenido.appendChild(tituloInsertado);
      contenido.appendChild(entrada.card);

      if (pagina.offsetHeight > limite && cantidad > 0) {
        entrada.card.remove();
        if (tituloInsertado) tituloInsertado.remove();
        nuevaPagina();
        if (entrada.titulo) contenido.appendChild(entrada.titulo.cloneNode(true));
        contenido.appendChild(entrada.card);
      }

      cantidad += 1;
      programaActual = entrada.programa;
      if (cantidad === 1 && pagina.offsetHeight > limite) {
        entrada.card.classList.add('pdf-card-oversize');
        void pagina.offsetHeight;
      }
    });

    if (paginas.length) paginas[paginas.length - 1].classList.add('pdf-page--last');
    if (despues.childNodes.length) doc.body.insertBefore(despues, wrap);
    seccion.remove();
    wrap.remove();
    doc.body.dataset.actaPaginada = 'true';

    const heights = paginas.map(page => page.offsetHeight);
    return {
      pages: paginas.length,
      cards: tarjetas.length,
      heights,
      maxHeight: Math.max(0, ...heights),
      limit: limite,
    };
  }

  return { aplicar, css, esMovil, normalizarHtml, paginarMovil, styleTag };
})();
