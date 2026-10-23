/* Barra inferior "vidrio líquido": mantén presionado y arrastra; la lente sigue tu dedo y al soltar abre la fase elegida. */
(function () {
  'use strict';
  var steps = document.querySelector('.phva-steps');
  if (!steps || !window.PointerEvent) return;
  var btns = Array.prototype.slice.call(steps.querySelectorAll('.phva-step'));
  var down = false, curIdx = -1, handled = false, synth = false, G = null, raf = 0, lastX = 0;

  function geo() { return G || (G = (function () { var r = steps.getBoundingClientRect(); return { r: r, w: r.width / btns.length - 8 }; })()); }
  function idxAt(x) {
    var g = geo(), i = Math.floor((x - g.r.left) / (g.r.width / btns.length));
    return Math.max(0, Math.min(btns.length - 1, i));
  }
  function place(x) {
    var g = geo(), c = Math.max(g.w / 2 + 4, Math.min(g.r.width - 4 - g.w / 2, x - g.r.left));
    steps.style.setProperty('--drag-x', (c - 4 - g.w / 2) + 'px');
  }
  function peek(i) { btns.forEach(function (b, k) { b.classList.toggle('peek', k === i); }); }
  function snap(i) {
    steps.style.setProperty('--tab-pill-transform', 'translateX(calc(' + (i * 100) + '% + ' + (i * 8) + 'px))');
    steps.style.setProperty('--tab-pill-opacity', '1');
  }
  function syncActive() {
    var a = btns.findIndex(function (b) { return b.classList.contains('active'); });
    if (a >= 0) snap(a);
  }
  function end() { down = false; G = null; cancelAnimationFrame(raf); steps.classList.remove('is-pressing', 'is-dragging'); peek(-1); }

  steps.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    G = null; down = true; curIdx = idxAt(e.clientX);
    try { steps.setPointerCapture(e.pointerId); } catch (err) {}
    place(e.clientX); steps.classList.add('is-pressing'); peek(curIdx);
  });
  steps.addEventListener('pointermove', function (e) {
    if (!down) return;
    lastX = e.clientX; steps.classList.add('is-dragging');
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0; if (!down) return;
      place(lastX);
      var i = idxAt(lastX), g = geo(), pitch = g.r.width / btns.length;
      // histéresis: solo cambia de opción al pasar el límite por unos píxeles (evita el temblor en el borde)
      if (i !== curIdx && Math.abs(lastX - (g.r.left + pitch * (curIdx + 0.5))) > pitch / 2 + 8) { curIdx = i; peek(i); }
    });
  });
  steps.addEventListener('pointerup', function (e) {
    if (!down) return;
    var i = curIdx >= 0 ? curIdx : idxAt(e.clientX);
    snap(i); end(); handled = true; setTimeout(function () { handled = false; }, 400);
    synth = true; btns[i].click(); synth = false;
    setTimeout(syncActive, 700);
  });
  steps.addEventListener('pointercancel', function () { end(); syncActive(); });
  steps.addEventListener('click', function (e) {
    if (synth) return;
    if (handled) { handled = false; e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);
})();
