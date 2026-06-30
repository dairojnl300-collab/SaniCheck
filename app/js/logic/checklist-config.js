// checklist-config.js — Config de checklist por establecimiento (localStorage)
// Pesos automáticos según programa (PSB_PESOS de psb-data.js), sin campo extra.

const ChecklistConfig = (() => {

  function _key(est) {
    const id = est.nit || est.nombre || 'default';
    return 'psb_checklist_' + String(id).replace(/[^a-zA-Z0-9]/g, '_');
  }

  function getConfig(est) {
    try {
      const raw = localStorage.getItem(_key(est));
      if (raw) {
        const p = JSON.parse(raw);
        return { disabled: new Set(p.disabled || []), custom: p.custom || [] };
      }
    } catch {}
    return { disabled: new Set(), custom: [] };
  }

  function saveConfig(est, disabled, custom) {
    localStorage.setItem(_key(est), JSON.stringify({
      disabled: [...disabled],
      custom
    }));
  }

  // Aplica config a programasBase: filtra desactivados, agrega custom.
  // Excluye programas que quedan sin ningún aspecto.
  function applyConfig(programasBase, config) {
    const off = config.disabled instanceof Set ? config.disabled : new Set(config.disabled || []);
    return programasBase.map(prog => ({
      ...prog,
      aspectos: [
        ...prog.aspectos.filter(a => !off.has(a.id)),
        ...(config.custom || [])
          .filter(c => c.programaId === prog.id)
          .map(c => ({
            id:               c.id,
            texto:            c.nombre,
            norma:            c.norma || '',
            evaluacion:       null,
            obs:              '',
            obs_editada:      false,
            fotografias:      [],
            hallazgo_critico: false,
            plazo:            null,
            _custom:          true,
          }))
      ]
    })).filter(prog => prog.aspectos.length > 0);
  }

  return { getConfig, saveConfig, applyConfig };
})();
