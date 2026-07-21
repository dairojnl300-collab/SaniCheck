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
        const complementarios = p.complementarios || p.esComplementaria || [];
        return { disabled: new Set(p.disabled || []), complementarios };
      }
    } catch {}
    return { disabled: new Set(), complementarios: [] };
  }

  function saveConfig(est, disabled, complementarios) {
    localStorage.setItem(_key(est), JSON.stringify({
      disabled: [...disabled],
      complementarios
    }));
  }

  function applyConfig(programasBase, config) {
    const off = config.disabled instanceof Set ? config.disabled : new Set(config.disabled || []);
    return programasBase.map(prog => ({
      ...prog,
      aspectos: [
        ...prog.aspectos.filter(a => !off.has(a.id)),
        ...(config.complementarios || [])
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
            _esComplementario: true,
          }))
      ]
    })).filter(prog => prog.aspectos.length > 0);
  }

  return { getConfig, saveConfig, applyConfig };
})();
