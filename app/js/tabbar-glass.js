/* Barra inferior "vidrio líquido": mantén presionado y arrastra; la lente sigue tu dedo y al soltar abre la fase elegida. */
(function () {
  'use strict';
  var steps = document.querySelector('.phva-steps');
  if (!steps || !window.PointerEvent) return;
  var btns = Array.prototype.slice.call(steps.querySelectorAll('.phva-step'));
  var down = false, curIdx = -1, handled = false, synth = false;

  function geo() { var r = steps.getBoundingClientRect(); return { r: r, w: r.width / btns.length - 8 }; }
  function idxAt(x) {
    var g = geo(), i = Math.floor((x - g.r.left) / (g.r.width / btns.length));
    return Math.max(0, Math.min(btns.length - 1, i));
  }
  function place(x) {
    var g = geo(), c = Math.max(g.w / 2 + 4, Math.min(g.r.width - 4 - g.w / 2, x - g.r.left));
    steps.style.setProperty('--drag-x', (c - 4 - g.w / 2) + 'px');
  }
  function peek(i) { btns.forEach(function (b, k) { b.classList.toggle('peek', k === i); }); }
  function end() { down = false; steps.classList.remove('is-pressing'); peek(-1); }

  steps.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    down = true; curIdx = idxAt(e.clientX);
    try { steps.setPointerCapture(e.pointerId); } catch (err) {}
    place(e.clientX); steps.classList.add('is-pressing'); peek(curIdx);
  });
  steps.addEventListener('pointermove', function (e) {
    if (!down) return;
    place(e.clientX);
    var i = idxAt(e.clientX);
    if (i !== curIdx) { curIdx = i; peek(i); }
  });
  steps.addEventListener('pointerup', function (e) {
    if (!down) return;
    var i = idxAt(e.clientX);
    end(); handled = true; setTimeout(function () { handled = false; }, 400);
    synth = true; btns[i].click(); synth = false;
  });
  steps.addEventListener('pointercancel', end);
  steps.addEventListener('click', function (e) {
    if (synth) return;
    if (handled) { handled = false; e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);
})();
