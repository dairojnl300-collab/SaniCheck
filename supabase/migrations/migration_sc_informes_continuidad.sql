-- migration_sc_informes_continuidad.sql
-- Continuidad de inspecciones entre dispositivos: preserva el estado
-- estructurado (mismo shape que estado_parcial) incluso después de
-- finalizar un informe, y agrega RPCs admin para borradores.
-- No modifica sc_usuarios, sc_login_usuario, ni el significado de
-- estado_parcial (sigue siendo exactamente "hay un borrador sin finalizar").

ALTER TABLE public.sc_informes
  ADD COLUMN IF NOT EXISTS estado_estructurado jsonb,
  ADD COLUMN IF NOT EXISTS estado_estructurado_actualizado_en timestamptz;

COMMENT ON COLUMN public.sc_informes.estado_estructurado IS
  'Mirror durable del último estado_parcial conocido de esta inspección. A diferencia de estado_parcial, NUNCA se borra al finalizar. No contiene fotografías.';
COMMENT ON COLUMN public.sc_informes.estado_estructurado_actualizado_en IS
  'Momento del último guardado de estado_estructurado (borrador o finalización).';

-- ── sc_guardar_borrador: además de estado_parcial, mirror en estado_estructurado ──

CREATE OR REPLACE FUNCTION public.sc_guardar_borrador(
  p_codigo text,
  p_establecimiento jsonb,
  p_fecha date,
  p_local_id text,
  p_numero_acta text,
  p_estado_parcial jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor sc_usuarios;
  v_id uuid;
BEGIN
  v_actor := public.sc_resolver_actor(p_codigo);

  IF nullif(trim(COALESCE(p_local_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'El borrador requiere un identificador local';
  END IF;

  IF p_estado_parcial IS NULL
     OR jsonb_typeof(p_estado_parcial) <> 'object'
     OR COALESCE(p_estado_parcial->>'estado', '') <> 'en_curso'
     OR pg_column_size(p_estado_parcial) > 524288
     OR p_estado_parcial ? 'fotografias'
  THEN
    RAISE EXCEPTION 'Estado parcial inválido o demasiado grande';
  END IF;

  INSERT INTO public.sc_informes(
    tecnico_id, local_id, establecimiento, fecha, numero_acta, informe_html,
    estado_parcial, estado_parcial_actualizado_en,
    estado_estructurado, estado_estructurado_actualizado_en
  )
  VALUES (
    v_actor.id,
    trim(p_local_id),
    COALESCE(p_establecimiento, '{}'::jsonb),
    p_fecha,
    p_numero_acta,
    '',
    p_estado_parcial,
    now(),
    p_estado_parcial,
    now()
  )
  ON CONFLICT (tecnico_id, local_id) WHERE local_id IS NOT NULL
  DO UPDATE SET
    establecimiento = EXCLUDED.establecimiento,
    fecha = EXCLUDED.fecha,
    numero_acta = EXCLUDED.numero_acta,
    estado_parcial = EXCLUDED.estado_parcial,
    estado_parcial_actualizado_en = now(),
    estado_estructurado = EXCLUDED.estado_parcial,
    estado_estructurado_actualizado_en = now()
  WHERE COALESCE(public.sc_informes.informe_html, '') = ''
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT i.id INTO v_id
      FROM public.sc_informes i
     WHERE i.tecnico_id = v_actor.id
       AND i.local_id = trim(p_local_id);
  END IF;

  RETURN v_id;
END;
$function$;

-- ── sc_guardar_informe: nuevo parámetro opcional p_estado_estructurado ──
-- (Postgres NO reemplaza una función in-place al agregarle un parámetro
-- nuevo, aunque tenga DEFAULT: crea un overload adicional en vez de
-- sustituir el existente. Hay que dropear la firma vieja de 10 args primero
-- — comprobado en despliegue: sin este DROP quedan 2 versiones convivendo
-- y PostgREST puede responder ambiguo ante un body con exactamente 10
-- claves, ej. un registro ya encolado en el outbox de un cliente desde
-- antes de este cambio.)

DROP FUNCTION IF EXISTS public.sc_guardar_informe(text,jsonb,date,text,text,text);
DROP FUNCTION IF EXISTS public.sc_guardar_informe(text,jsonb,date,text,text,text,text,integer,integer,integer);
CREATE OR REPLACE FUNCTION public.sc_guardar_informe(
  p_codigo text, p_establecimiento jsonb, p_fecha date, p_html text,
  p_local_id text DEFAULT NULL, p_numero_acta text DEFAULT NULL,
  p_nivel_cumplimiento text DEFAULT NULL, p_aspectos_evaluados integer DEFAULT NULL,
  p_aspectos_total integer DEFAULT NULL, p_porcentaje_cumplimiento integer DEFAULT NULL,
  p_estado_estructurado jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor sc_usuarios;
  v_id uuid;
BEGIN
  v_actor := public.sc_resolver_actor(p_codigo);

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

  INSERT INTO public.sc_informes(
    tecnico_id, local_id, establecimiento, fecha, numero_acta, informe_html,
    nivel_cumplimiento, aspectos_evaluados, aspectos_total, porcentaje_cumplimiento,
    estado_parcial, estado_parcial_actualizado_en,
    estado_estructurado, estado_estructurado_actualizado_en
  )
  VALUES (
    v_actor.id, p_local_id, COALESCE(p_establecimiento, '{}'::jsonb), p_fecha,
    p_numero_acta, public.sc_sanitizar_html(p_html), p_nivel_cumplimiento,
    p_aspectos_evaluados, p_aspectos_total, p_porcentaje_cumplimiento,
    NULL, NULL,
    p_estado_estructurado, CASE WHEN p_estado_estructurado IS NOT NULL THEN now() END
  )
  ON CONFLICT (tecnico_id, local_id) WHERE local_id IS NOT NULL
  DO UPDATE SET
    establecimiento = EXCLUDED.establecimiento,
    fecha = EXCLUDED.fecha,
    numero_acta = EXCLUDED.numero_acta,
    informe_html = EXCLUDED.informe_html,
    nivel_cumplimiento = COALESCE(EXCLUDED.nivel_cumplimiento, public.sc_informes.nivel_cumplimiento),
    aspectos_evaluados = COALESCE(EXCLUDED.aspectos_evaluados, public.sc_informes.aspectos_evaluados),
    aspectos_total = COALESCE(EXCLUDED.aspectos_total, public.sc_informes.aspectos_total),
    porcentaje_cumplimiento = COALESCE(EXCLUDED.porcentaje_cumplimiento, public.sc_informes.porcentaje_cumplimiento),
    estado_parcial = NULL,
    estado_parcial_actualizado_en = NULL,
    estado_estructurado = COALESCE(EXCLUDED.estado_estructurado, public.sc_informes.estado_estructurado),
    estado_estructurado_actualizado_en = CASE WHEN EXCLUDED.estado_estructurado IS NOT NULL
      THEN now() ELSE public.sc_informes.estado_estructurado_actualizado_en END,
    actualizado_en = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- ── sc_get_informe / sc_get_admin_informe: agregan columnas de salida ──
-- (RETURNS TABLE no admite cambiar columnas con CREATE OR REPLACE: hay que
-- dropear primero. La firma de entrada (uuid,text) no cambia.)

DROP FUNCTION IF EXISTS public.sc_get_informe(uuid, text);
CREATE OR REPLACE FUNCTION public.sc_get_informe(p_id uuid, p_codigo text)
RETURNS TABLE(id uuid, local_id text, establecimiento jsonb, fecha date, numero_acta text, informe_html text,
              nivel_cumplimiento text, aspectos_evaluados integer, aspectos_total integer,
              porcentaje_cumplimiento integer, creado_en timestamptz, actualizado_en timestamptz,
              estado_estructurado jsonb, estado_estructurado_actualizado_en timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := public.sc_resolver_actor(p_codigo);
  RETURN QUERY SELECT i.id, i.local_id, i.establecimiento, i.fecha, i.numero_acta, i.informe_html,
      i.nivel_cumplimiento, i.aspectos_evaluados, i.aspectos_total, i.porcentaje_cumplimiento,
      i.creado_en, i.actualizado_en, i.estado_estructurado, i.estado_estructurado_actualizado_en
    FROM public.sc_informes i
   WHERE i.id = p_id
     AND i.tecnico_id = v_actor.id
     AND i.estado_parcial IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
END;
$function$;

DROP FUNCTION IF EXISTS public.sc_get_admin_informe(uuid, text);
CREATE OR REPLACE FUNCTION public.sc_get_admin_informe(p_id uuid, p_codigo text)
RETURNS TABLE(id uuid, local_id text, tecnico_id uuid, tecnico_nombre text, establecimiento jsonb, fecha date,
              numero_acta text, informe_html text, nivel_cumplimiento text, aspectos_evaluados integer,
              aspectos_total integer, porcentaje_cumplimiento integer, creado_en timestamptz,
              actualizado_en timestamptz, estado_estructurado jsonb, estado_estructurado_actualizado_en timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := public.sc_resolver_actor(p_codigo);
  IF v_actor.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
  RETURN QUERY SELECT i.id, i.local_id, i.tecnico_id, u.nombre, i.establecimiento, i.fecha, i.numero_acta,
      i.informe_html, i.nivel_cumplimiento, i.aspectos_evaluados, i.aspectos_total,
      i.porcentaje_cumplimiento, i.creado_en, i.actualizado_en,
      i.estado_estructurado, i.estado_estructurado_actualizado_en
    FROM public.sc_informes i
    JOIN public.sc_usuarios u ON u.id = i.tecnico_id
   WHERE i.id = p_id
     AND i.estado_parcial IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
END;
$function$;

-- ── RPCs nuevas: borradores admin (cualquier técnico) ──

CREATE OR REPLACE FUNCTION public.sc_list_admin_borradores(p_codigo text)
RETURNS TABLE(
  id uuid,
  local_id text,
  tecnico_id uuid,
  tecnico_nombre text,
  establecimiento jsonb,
  fecha date,
  numero_acta text,
  creado_en timestamptz,
  actualizado_en timestamptz,
  estado_parcial_actualizado_en timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor sc_usuarios;
BEGIN
  v_actor := public.sc_resolver_actor(p_codigo);
  IF v_actor.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  RETURN QUERY
  SELECT i.id, i.local_id, i.tecnico_id, u.nombre, i.establecimiento, i.fecha, i.numero_acta,
         i.creado_en, i.actualizado_en, i.estado_parcial_actualizado_en
    FROM public.sc_informes i
    JOIN public.sc_usuarios u ON u.id = i.tecnico_id
   WHERE i.estado_parcial IS NOT NULL
   ORDER BY COALESCE(i.estado_parcial_actualizado_en, i.actualizado_en) DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sc_get_admin_borrador(p_id uuid, p_codigo text)
RETURNS TABLE(
  id uuid,
  local_id text,
  tecnico_id uuid,
  tecnico_nombre text,
  establecimiento jsonb,
  fecha date,
  numero_acta text,
  estado_parcial jsonb,
  creado_en timestamptz,
  actualizado_en timestamptz,
  estado_parcial_actualizado_en timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor sc_usuarios;
BEGIN
  v_actor := public.sc_resolver_actor(p_codigo);
  IF v_actor.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  RETURN QUERY
  SELECT i.id, i.local_id, i.tecnico_id, u.nombre, i.establecimiento, i.fecha, i.numero_acta,
         i.estado_parcial, i.creado_en, i.actualizado_en, i.estado_parcial_actualizado_en
    FROM public.sc_informes i
    JOIN public.sc_usuarios u ON u.id = i.tecnico_id
   WHERE i.id = p_id
     AND i.estado_parcial IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Borrador no encontrado';
  END IF;
END;
$function$;

-- ── Grants ──
-- sc_guardar_borrador conserva su OID (CREATE OR REPLACE con la misma lista
-- de parámetros de entrada, sin cambios), por lo que su GRANT existente
-- sigue vigente. sc_guardar_informe, sc_get_informe y sc_get_admin_informe
-- se dropearon y recrearon (ver nota arriba): hay que regranter. Las 2 RPCs
-- admin nuevas necesitan grant explícito.

REVOKE ALL ON FUNCTION public.sc_guardar_informe(text,jsonb,date,text,text,text,text,integer,integer,integer,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_guardar_informe(text,jsonb,date,text,text,text,text,integer,integer,integer,jsonb) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.sc_get_informe(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_get_informe(uuid,text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.sc_get_admin_informe(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_get_admin_informe(uuid,text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.sc_list_admin_borradores(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_list_admin_borradores(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.sc_get_admin_borrador(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_get_admin_borrador(uuid,text) TO anon, authenticated;
