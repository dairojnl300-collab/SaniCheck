// phva-icons.js — Iconografía Lucide unificada para SaniCheck

const AppIcons = (() => {

  const SW = 1.75;

  const PHVA = {
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

  const ICONS = {
    lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    shieldCheck: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>',
    clipboardList: PHVA.P,
    clipboardCheck: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/>',
    fileText: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    sliders: '<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>',
    paperclip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    alertTriangle: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
    arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    chevronUp: '<path d="m18 15-6-6-6 6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    equal: '<line x1="5" x2="19" y1="9" y2="9"/><line x1="5" x2="19" y1="15" y2="15"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    scale: '<path d="m16 16 3-8 5.5 5.5-1.5 1.5"/><path d="m2 16 3-8 5.5 5.5-1.5 1.5"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2"/><path d="M3 11h2"/><path d="M19 7h2"/><path d="M19 11h2"/>',
    listCheck: '<path d="M11 18H3"/><path d="M15 18H21"/><path d="M15 6h6"/><path d="M3 6h8"/><path d="m3 12 2 2 4-4"/>',
    building: '<path d="M4 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16"/><path d="M13 10h5a1 1 0 0 1 1 1v10"/><path d="M2 21h20"/><path d="M7 8h1M10 8h1M7 12h1M10 12h1M7 16h1M10 16h1"/>',
    calendarClock: '<path d="M11.795 21h-6.795a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M14 18a4 4 0 1 0 8 0 4 4 0 1 0-8 0"/><path d="M15 3v4"/><path d="M7 3v4"/><path d="M3 11h16"/><path d="M18 16.496v1.504l1 1"/>',
    barChart: PHVA.V,
    circleAlert: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    octagonAlert: '<path d="M12 16h.01"/><path d="M12 8v4"/><path d="M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  };

  function delta(d, size) {
    const n = d > 0 ? 'chevronUp' : d < 0 ? 'chevronDown' : 'equal';
    return icon(n, size || 12);
  }

  function _svg(paths, size, extraStyle, className) {
    const s = size || 14;
    const cls = className ? ` class="${className}"` : '';
    const st  = extraStyle ? extraStyle + ';' : '';
    return `<svg${cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${SW}" `
      + `stroke-linecap="round" stroke-linejoin="round" `
      + `style="${st}width:${s}px;height:${s}px;flex-shrink:0;display:inline-block;vertical-align:middle;">`
      + `${paths}</svg>`;
  }

  function icon(name, size, extraStyle, className) {
    return _svg(ICONS[name] || ICONS.info, size, extraStyle, className);
  }

  function svg(fase, size, className) {
    return _svg(PHVA[fase] || PHVA.P, size, null, className);
  }

  function row(name, text, size) {
    return `<span style="display:inline-flex;align-items:center;gap:6px;">${icon(name, size || 14)}<span>${text}</span></span>`;
  }

  function block(name, size) {
    const s = size || 40;
    return `<span style="display:inline-flex;color:currentColor;">${icon(name, s)}</span>`;
  }

  function badge(fase, label, extraStyle) {
    const st = extraStyle ? ` style="${extraStyle}"` : '';
    return `<div class="screen-fase-badge badge-${fase}"${st}>${svg(fase)} ${label}</div>`;
  }

  function tabSvg(fase) {
    return `<svg class="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" `
      + `stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round">${PHVA[fase]}</svg>`;
  }

  function tileSvg(fase) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${SW}" `
      + `stroke-linecap="round" stroke-linejoin="round">${PHVA[fase]}</svg>`;
  }

  function accordion(name, color) {
    const paths = ICONS[name] || ICONS.info;
    return `<svg class="acc-icon-svg sticker-3d-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" `
      + `stroke="currentColor" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round" `
      + `style="color:${color};flex-shrink:0;display:block;">${paths}</svg>`;
  }

  return {
    icon, svg, row, block, badge, tabSvg, tileSvg, accordion, delta,
    ICONS, PHVA,
  };
})();

const PhvaIcons = AppIcons;
