// marco-normativo.js — Pantalla estática con el marco legal vigente aplicable a PSB.

const MarcoNormativo = (() => {
  function render() {
    return `
      <div class="screen-header">
        <div class="screen-fase-badge badge-P" style="font-size:11px;padding:3px 8px;">📖 REFERENCIA</div>
        <div class="screen-title" style="font-size:17px;">Marco Normativo</div>
        <div class="screen-subtitle">Normas vigentes aplicables a inspección sanitaria de establecimientos de preparación de alimentos</div>
      </div>

      <div class="dash-panel">
        <h2>Normas base (siempre aplican)</h2>
        <ul style="padding-left:18px;font-size:13px;line-height:1.7;color:var(--color-ink2);">
          <li><strong>Ley 9 de 1979</strong> — Código Sanitario Nacional.</li>
          <li><strong>Resolución 2674 de 2013</strong> — Requisitos sanitarios de fabricación, procesamiento,
            preparación, envase, almacenamiento, transporte, distribución y comercialización de alimentos.
            Artículos aplicables al ciclo PSB: 5–20, 26, 32–35.</li>
          <li><strong>Resolución 1229 de 2013</strong> — Modelo de inspección, vigilancia y control sanitario
            para alimentos y establecimientos.</li>
        </ul>
      </div>

      <div class="dash-panel" style="border-color:var(--color-deficiente);">
        <h2 style="color:var(--color-deficiente);">Norma derogada — no citar como vigente</h2>
        <div style="font-size:13px;color:var(--color-ink2);">
          El <strong>Decreto 3075 de 1997</strong> está derogado. No debe citarse como fundamento normativo
          vigente en ningún hallazgo, acta o comunicación de la inspección.
        </div>
      </div>

      <div class="dash-panel">
        <h2>Aplica cuando corresponda</h2>
        <div class="desc">Solo se citan si el establecimiento tiene la condición específica que las activa.</div>
        <ul style="padding-left:18px;font-size:13px;line-height:1.7;color:var(--color-ink2);">
          <li><strong>Resolución 3168 de 2015</strong> — cuando aplique al tipo de proceso o producto evaluado.</li>
          <li><strong>Decreto 1575 de 2007</strong> + <strong>Resolución 2115 de 2007</strong> — sistema para la
            protección y control de la calidad del agua para consumo humano; aplica cuando el establecimiento
            gestiona su propio suministro/almacenamiento de agua potable.</li>
        </ul>
      </div>

      <button class="btn btn-outline" style="width:100%;padding:12px;margin-top:6px;"
        onclick="Router.go('home')">← Volver</button>
      <div style="height:32px;"></div>`;
  }

  function attach() {}

  return { render, attach };
})();
