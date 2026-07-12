// phva-icons.js — Íconos Lucide minimalistas para fases PHVA (fuente única)

const PhvaIcons = (() => {

  const PATHS = {
    P: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>'
      + '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>'
      + '<path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
    H: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>'
      + '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>'
      + '<path d="m9 14 2 2 4-4"/>',
    V: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/>'
      + '<path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    A: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>'
      + '<path d="M14 2v4a2 2 0 0 0 2 2h4"/>'
      + '<path d="m9 15 2 2 4-4"/>',
  };

  function svg(fase, size, className) {
    const s = size || 14;
    const cls = className ? ` class="${className}"` : '';
    return `<svg${cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" `
      + `stroke-linecap="round" stroke-linejoin="round" `
      + `style="width:${s}px;height:${s}px;flex-shrink:0;">${PATHS[fase] || PATHS.P}</svg>`;
  }

  function badge(fase, label, extraStyle) {
    const st = extraStyle ? ` style="${extraStyle}"` : '';
    return `<div class="screen-fase-badge badge-${fase}"${st}>${svg(fase)} ${label}</div>`;
  }

  function tabSvg(fase) {
    return `<svg class="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" `
      + `stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${PATHS[fase]}</svg>`;
  }

  function tileSvg(fase) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" `
      + `stroke-linecap="round" stroke-linejoin="round">${PATHS[fase]}</svg>`;
  }

  return { svg, badge, tabSvg, tileSvg, PATHS };
})();
