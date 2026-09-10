-- Recalcula el resumen del informe cuando un profesional verifica evidencia
-- subida por el portal cliente.
CREATE OR REPLACE FUNCTION public.sc_admin_revisar_hallazgo(
  p_informe_id uuid,
  p_aspecto_id text,
  p_codigo text,
  p_estado text,
  p_observacion text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor sc_usuarios;
  v_total integer;
  v_verificados integer;
  v_porcentaje integer;
  v_nivel text;
BEGIN
  v_actor := public.sc_resolver_actor(p_codigo);
  IF v_actor.rol NOT IN ('admin','tecnico') THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
  IF v_actor.rol = 'tecnico' AND NOT EXISTS (
    SELECT 1 FROM public.sc_informes WHERE id = p_informe_id AND tecnico_id = v_actor.id
  ) THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
  IF p_estado NOT IN ('cumple','ajustes_solicitados') THEN
    RAISE EXCEPTION 'Estado de revisión inválido';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.sc_hallazgos_estado
    WHERE informe_id = p_informe_id AND aspecto_id = p_aspecto_id
  ) THEN RAISE EXCEPTION 'Hallazgo no encontrado'; END IF;
  IF p_estado = 'cumple' AND NOT EXISTS (
    SELECT 1 FROM public.sc_hallazgos_estado
    WHERE informe_id = p_informe_id AND aspecto_id = p_aspecto_id AND foto_url IS NOT NULL
  ) THEN RAISE EXCEPTION 'Se requiere evidencia'; END IF;

  UPDATE public.sc_hallazgos_estado h
     SET estado = CASE WHEN p_estado = 'cumple' THEN 'Verificado' ELSE 'En corrección' END,
         actualizado_en = now(),
         detalle = jsonb_set(
           coalesce(h.detalle, '{}'::jsonb), '{revision}',
           jsonb_build_object('estado', p_estado, 'observacion', p_observacion,
                              'revisado_por', v_actor.id, 'revisado_en', now()), true
         )
   WHERE h.informe_id = p_informe_id AND h.aspecto_id = p_aspecto_id;

  SELECT count(*), count(*) FILTER (WHERE estado = 'Verificado')
    INTO v_total, v_verificados
    FROM public.sc_hallazgos_estado WHERE informe_id = p_informe_id;
  v_porcentaje := CASE WHEN v_total = 0 THEN 0 ELSE round(v_verificados * 100.0 / v_total)::integer END;
  v_nivel := CASE WHEN v_porcentaje >= 80 THEN 'BUENO'
                  WHEN v_porcentaje >= 60 THEN 'REGULAR'
                  ELSE 'DEFICIENTE' END;

  UPDATE public.sc_informes
     SET porcentaje_cumplimiento = v_porcentaje,
         nivel_cumplimiento = v_nivel,
         aspectos_evaluados = v_total,
         actualizado_en = now()
   WHERE id = p_informe_id;
  RETURN true;
END;
$$;
