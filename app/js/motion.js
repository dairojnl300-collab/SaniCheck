// motion.js — Transiciones premium entre pantallas (capa visual aislada)

const AppMotion = (() => {
  'use strict';

  const DUR_MS = 380;
  const ANIM_SCREENS = new Set([
    'home', 'planificar', 'personalizar', 'hacer', 'verificar', 'actuar', 'about',
  ]);

  let _origGo  = null;
  let _busy    = false;
  let _skipNext = true;

  function init() {
    if (typeof Router === 'undefined' || !Router.go) return;
    _origGo = Router.go;
    Router.go = _goAnimated;
    _watchUpdateBanner();
  }

  function _shouldAnimate(from, to) {
    if (_skipNext) {
      _skipNext = false;
      return false;
    }
    if (from === to) return false;
    return ANIM_SCREENS.has(from) && ANIM_SCREENS.has(to);
  }

  function _goAnimated(screen, p) {
    const from = Router.current();
    if (!_origGo || _busy || !_shouldAnimate(from, screen)) {
      _origGo(screen, p);
      _afterPaint();
      return;
    }

    const area = document.getElementById('screen-area');
    if (!area) {
      _origGo(screen, p);
      return;
    }

    _busy = true;
    let done = false;

    const finishExit = () => {
      if (done) return;
      done = true;
      area.classList.remove('is-exiting');
      _origGo(screen, p);
      area.classList.add('is-entering');

      const endEnter = () => {
        area.classList.remove('is-entering');
        _busy = false;
        _afterPaint();
      };

      const onEnter = (e) => {
        if (e.target !== area || e.animationName !== 'scEnter') return;
        area.removeEventListener('animationend', onEnter);
        endEnter();
      };
      area.addEventListener('animationend', onEnter);
      setTimeout(endEnter, DUR_MS + 60);
    };

    const onExit = (e) => {
      if (e.target !== area || e.animationName !== 'scExit') return;
      area.removeEventListener('animationend', onExit);
      finishExit();
    };

    area.addEventListener('animationend', onExit);
    area.classList.add('is-exiting');
    setTimeout(finishExit, DUR_MS + 60);
  }

  function _afterPaint() {
    requestAnimationFrame(() => {
      _animateProgressBars(document.getElementById('screen-area'));
    });
  }

  function _animateProgressBars(root) {
    if (!root) return;
    root.querySelectorAll('.progress-fill').forEach(el => {
      const target = el.style.width;
      if (!target || target === '0%' || target === '2%') return;
      el.style.width = '0%';
      void el.offsetWidth;
      el.style.width = target;
    });
  }

  function _watchUpdateBanner() {
    const obs = new MutationObserver(() => {
      const banner = document.getElementById('sw-update-banner');
      if (banner && !banner.classList.contains('sw-banner-enter')) {
        banner.classList.add('sw-banner-enter');
      }
    });
    obs.observe(document.body, { childList: true, subtree: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init };
})();
