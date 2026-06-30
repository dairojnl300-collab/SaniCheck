// router.js — Navegación entre pantallas PHVA

const Router = (() => {
  const SCREEN_FASE = {
    home: null, planificar: 'P', personalizar: 'P', hacer: 'H', verificar: 'V', actuar: 'A',
  };

  let currentScreen = 'home';
  const RENDERERS = {};

  function register(screen, renderFn) { RENDERERS[screen] = renderFn; }

  function go(screen, p = {}) {
    currentScreen = screen;
    Store.setUI({ screen });
    _render(p);
    _updateTopbar();
    const area = document.getElementById('screen-area');
    if (area) area.scrollTop = 0;
  }

  function current() { return currentScreen; }

  function _render(p) {
    const area = document.getElementById('screen-area');
    if (!area) return;
    const fn = RENDERERS[currentScreen];
    if (fn) {
      area.innerHTML = fn(p);
      try { if (currentScreen === 'planificar')  Planificar.attach();   } catch(e) {}
      try { if (currentScreen === 'personalizar') Personalizar.attach(); } catch(e) {}
      try { if (currentScreen === 'hacer')       Hacer.attach();        } catch(e) {}
      try { if (currentScreen === 'verificar')  Verificar.attach();  } catch(e) {}
      try { if (currentScreen === 'actuar')     Actuar.attach();     } catch(e) {}
    } else {
      area.innerHTML = _comingSoon(currentScreen);
    }
  }

  function _updateTopbar() {
    const fase = SCREEN_FASE[currentScreen];
    const insp = Store.getCurrentInspeccion();
    const completed = [];
    if (insp) {
      if (insp.establecimiento && insp.establecimiento.nombre) completed.push('P');
      if (insp.programas && insp.programas[0]?.aspectos.some(a => a.evaluacion)) completed.push('H');
    }
    document.querySelectorAll('.phva-step').forEach(btn => {
      const f = btn.dataset.fase;
      btn.classList.remove('active', 'completed');
      if (f === fase) btn.classList.add('active');
      else if (completed.includes(f)) btn.classList.add('completed');
    });
  }

  function _comingSoon(screen) {
    const MAP = {
      verificar: { icon: '📊', title: 'VERIFICAR', desc: 'Dashboard de resultados y comparación histórica. Disponible en Semana 3.' },
      actuar:    { icon: '📄', title: 'ACTUAR',    desc: 'Generación automática del Acta PSB en PDF. Disponible en Semana 3.' },
    };
    const i = MAP[screen] || { icon: '🔧', title: screen.toUpperCase(), desc: 'Próximamente.' };
    return `<div class="coming-soon">
      <div class="coming-soon-icon">${i.icon}</div>
      <div class="coming-soon-title">${i.title}</div>
      <div class="coming-soon-desc">${i.desc}</div>
      <div class="coming-soon-badge">SEMANA 3</div>
      <button class="btn btn-outline mt-md" style="width:auto;padding:10px 24px"
        onclick="Router.go('home')">← Inicio</button>
    </div>`;
  }

  function toast(msg, ms = 2500) {
    let el = document.getElementById('app-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'app-toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), ms);
  }

  return { go, current, register, toast };
})();
