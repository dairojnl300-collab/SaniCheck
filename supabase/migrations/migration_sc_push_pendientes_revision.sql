-- Regla temporal para recontar evidencia nueva después de solicitar ajustes.
-- Se conserva migration_sc_push_suscripciones.sql como historial inmutable.

CREATE OR REPLACE FUNCTION public.sc_push_pendientes_para_tecnico(p_tecnico_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  WITH marcadas AS (
    SELECT h.informe_id,
           h.aspecto_id,
           h.estado,
           coalesce(
             CASE
               WHEN coalesce(h.detalle->>'foto_subida_en', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[T ]'
               THEN (h.detalle->>'foto_subida_en')::timestamptz
             END,
             h.actualizado_en,
             CASE
               WHEN substring(h.foto_url from '/([0-9]{13})[.][a-z0-9]+$') IS NOT NULL
               THEN to_timestamp(substring(h.foto_url from '/([0-9]{13})[.][a-z0-9]+$')::numeric / 1000)
             END
           ) AS foto_subida_en,
           CASE
             WHEN coalesce(h.detalle #>> '{revision,revisado_en}', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[T ]'
             THEN (h.detalle #>> '{revision,revisado_en}')::timestamptz
           END AS revisado_en
      FROM public.sc_hallazgos_estado h
      JOIN public.sc_informes i ON i.id = h.informe_id
     WHERE i.tecnico_id = p_tecnico_id
       AND h.foto_url IS NOT NULL
  ), pendientes AS (
    SELECT informe_id, aspecto_id
      FROM marcadas
     WHERE estado IS DISTINCT FROM 'Verificado'
       AND (
         estado IS DISTINCT FROM 'En corrección'
         OR revisado_en IS NULL
         OR (foto_subida_en IS NOT NULL AND foto_subida_en > revisado_en)
       )
  ), agrupados AS (
    SELECT informe_id,
           count(*)::integer AS pendientes,
           coalesce(jsonb_agg(DISTINCT aspecto_id) FILTER (WHERE aspecto_id IS NOT NULL), '[]'::jsonb) AS aspectos
      FROM pendientes
     GROUP BY informe_id
  )
  SELECT jsonb_build_object(
    'informes', coalesce(jsonb_agg(jsonb_build_object(
      'informe_id', informe_id,
      'pendientes', pendientes,
      'aspectos', aspectos
    ) ORDER BY informe_id), '[]'::jsonb),
    'total', coalesce(sum(pendientes), 0)::integer
  )
  FROM agrupados;
$$;

-- Guardar una marca de tiempo específica de la última evidencia recibida;
-- no inferirla de otros cambios posteriores al estado del hallazgo.
CREATE OR REPLACE FUNCTION public.sc_portal_actualizar_hallazgo(
  p_codigo_portal text,
  p_hallazgo_id uuid,
  p_estado text,
  p_foto_url text,
  p_ip_cliente text,
  p_gate text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo text := upper(trim(coalesce(p_codigo_portal, '')));
  v_ip text := left(coalesce(nullif(btrim(p_ip_cliente), ''), public.sc_client_ip()), 64);
  v_informe_id uuid;
  v_hallazgo_informe_id uuid;
  v_foto_subida_en timestamptz := now();
BEGIN
  IF NOT public.sc_portal_gate_ok(p_gate) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_autorizado');
  END IF;
  BEGIN
    PERFORM public.sc_auth_verificar_bloqueo('portal_escritura', v_ip);
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE LIKE '42%' OR SQLSTATE LIKE '08%' OR SQLSTATE LIKE '58%' THEN RAISE; END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'bloqueado');
  END;
  IF p_estado IS DISTINCT FROM 'En corrección' THEN
    PERFORM public.sc_auth_registrar_fallo('portal_escritura', v_ip);
    RETURN jsonb_build_object('ok', false, 'error', 'estado_no_permitido');
  END IF;
  SELECT id INTO v_informe_id FROM public.sc_informes WHERE codigo_portal = v_codigo;
  IF v_informe_id IS NULL THEN
    PERFORM public.sc_auth_registrar_fallo('portal_escritura', v_ip);
    RETURN jsonb_build_object('ok', false, 'error', 'codigo_invalido');
  END IF;
  SELECT informe_id INTO v_hallazgo_informe_id
    FROM public.sc_hallazgos_estado WHERE id = p_hallazgo_id;
  IF v_hallazgo_informe_id IS NULL OR v_hallazgo_informe_id <> v_informe_id THEN
    PERFORM public.sc_auth_registrar_fallo('portal_escritura', v_ip);
    RETURN jsonb_build_object('ok', false, 'error', 'hallazgo_no_encontrado');
  END IF;

  UPDATE public.sc_hallazgos_estado
     SET estado = 'En corrección',
         foto_url = coalesce(p_foto_url, foto_url),
         detalle = CASE WHEN p_foto_url IS NOT NULL
           THEN jsonb_set(coalesce(detalle, '{}'::jsonb), '{foto_subida_en}', to_jsonb(v_foto_subida_en), true)
           ELSE detalle END,
         actualizado_en = v_foto_subida_en
   WHERE id = p_hallazgo_id AND estado IN ('Pendiente', 'En corrección');
  IF NOT FOUND THEN
    PERFORM public.sc_auth_registrar_fallo('portal_escritura', v_ip);
    RETURN jsonb_build_object('ok', false, 'error', 'hallazgo_no_pendiente');
  END IF;
  RETURN jsonb_build_object('ok', true, 'hallazgo_id', p_hallazgo_id, 'estado', 'En corrección');
END;
$$;

REVOKE ALL ON FUNCTION public.sc_portal_actualizar_hallazgo(text,uuid,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sc_portal_actualizar_hallazgo(text,uuid,text,text,text,text) TO anon;
GRANT EXECUTE ON FUNCTION public.sc_portal_actualizar_hallazgo(text,uuid,text,text,text,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sc_push_pendientes(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_tecnico_id uuid;
  v_resultado jsonb;
BEGIN
  v_tecnico_id := public.sc_push_tecnico_por_codigo(p_codigo);
  IF v_tecnico_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'codigo_invalido_o_bloqueado');
  END IF;
  v_resultado := public.sc_push_pendientes_para_tecnico(v_tecnico_id);
  RETURN v_resultado || jsonb_build_object('ok', true);
END;
$$;

-- Endpoint interno usado solo por el Pages Function Portal con service_role
-- del proyecto técnico (SC_INFORME_SUPABASE_SERVICE_ROLE_KEY).
CREATE OR REPLACE FUNCTION public.sc_push_pendientes_tecnico(p_tecnico_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT public.sc_push_pendientes_para_tecnico(p_tecnico_id);
$$;

REVOKE ALL ON FUNCTION public.sc_push_pendientes_para_tecnico(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.sc_push_pendientes(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sc_push_pendientes_tecnico(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sc_push_pendientes(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_push_pendientes_tecnico(uuid) TO service_role;
