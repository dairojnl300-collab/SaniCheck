-- migration_sc_informes_admin_continuidad.sql
-- Cierra el hueco encontrado en revisión final de la rama
-- feature/continuidad-cross-device: cuando un admin continúa (no solo ve) la
-- inspección en curso — o reabre y re-guarda el informe ya finalizado — de
-- OTRO técnico, sc_guardar_borrador/sc_guardar_informe usan
-- ON CONFLICT (tecnico_id, local_id): como el tecnico_id del admin es
-- distinto al técnico original, el primer guardado del admin creaba una
-- fila DUPLICADA en vez de continuar la original. Se agregan 2 RPCs admin
-- que actualizan la fila original por id (sin tocar tecnico_id).

CREATE OR REPLACE FUNCTION public.sc_guardar_admin_borrador(
  p_id uuid,
  p_codigo text,
  p_estado_parcial jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor sc_usuarios;
BEGIN
  v_actor := public.sc_resolver_actor(p_codigo);
  IF v_actor.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  IF p_estado_parcial IS NULL
     OR jsonb_typeof(p_estado_parcial) <> 'object'
     OR COALESCE(p_estado_parcial->>'estado', '') <> 'en_curso'
     OR pg_column_size(p_estado_parcial) > 524288
     OR p_estado_parcial ? 'fotografias'
  THEN
    RAISE EXCEPTION 'Estado parcial inválido o demasiado grande';
  END IF;

  UPDATE public.sc_informes
     SET estado_parcial = p_estado_parcial,
         estado_parcial_actualizado_en = now(),
         estado_estructurado = p_estado_parcial,
         estado_estructurado_actualizado_en = now()
   WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Borrador no encontrado';
  END IF;

  RETURN p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sc_guardar_admin_informe(
  p_id uuid,
  p_codigo text,
  p_html text,
  p_numero_acta text DEFAULT NULL,
  p_nivel_cumplimiento text DEFAULT NULL,
  p_aspectos_evaluados integer DEFAULT NULL,
  p_aspectos_total integer DEFAULT NULL,
  p_porcentaje_cumplimiento integer DEFAULT NULL,
  p_estado_estructurado jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor sc_usuarios;
BEGIN
  v_actor := public.sc_resolver_actor(p_codigo);
  IF v_actor.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  IF p_nivel_cumplimiento IS NOT NULL
     AND p_nivel_cumplimiento NOT IN ('BUENO','REGULAR','DEFICIENTE')
     OR p_aspectos_evaluados IS NOT NULL
     AND p_aspectos_evaluados < 0
     OR p_aspectos_total IS NOT NULL
     AND p_aspectos_total < 0
     OR p_porcentaje_cumplimiento IS NOT NULL
     AND p_porcentaje_cumplimiento NOT BETWEEN 0 AND 100
  THEN
    RAISE EXCEPTION 'Metadata de informe inválida';
  END IF;

  IF p_estado_estructurado IS NOT NULL
     AND (jsonb_typeof(p_estado_estructurado) <> 'object'
          OR pg_column_size(p_estado_estructurado) > 524288
          OR p_estado_estructurado ? 'fotografias')
  THEN
    RAISE EXCEPTION 'Estado estructurado inválido o demasiado grande';
  END IF;

  UPDATE public.sc_informes
     SET informe_html = public.sc_sanitizar_html(p_html),
         numero_acta = COALESCE(p_numero_acta, numero_acta),
         nivel_cumplimiento = COALESCE(p_nivel_cumplimiento, nivel_cumplimiento),
         aspectos_evaluados = COALESCE(p_aspectos_evaluados, aspectos_evaluados),
         aspectos_total = COALESCE(p_aspectos_total, aspectos_total),
         porcentaje_cumplimiento = COALESCE(p_porcentaje_cumplimiento, porcentaje_cumplimiento),
         estado_parcial = NULL,
         estado_parcial_actualizado_en = NULL,
         estado_estructurado = COALESCE(p_estado_estructurado, estado_estructurado),
         estado_estructurado_actualizado_en = CASE WHEN p_estado_estructurado IS NOT NULL
           THEN now() ELSE estado_estructurado_actualizado_en END,
         actualizado_en = now()
   WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Informe no encontrado';
  END IF;

  RETURN p_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.sc_guardar_admin_borrador(uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_guardar_admin_borrador(uuid,text,jsonb) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.sc_guardar_admin_informe(uuid,text,text,text,text,integer,integer,integer,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_guardar_admin_informe(uuid,text,text,text,text,integer,integer,integer,jsonb) TO anon, authenticated;
