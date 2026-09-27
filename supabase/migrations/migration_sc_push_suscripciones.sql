-- Notificaciones de evidencia del Portal para técnicos SaniCheck.
-- El código de acceso identifica al técnico; anon nunca accede directamente a la tabla.

ALTER TABLE public.sc_auth_rate_limits
  DROP CONSTRAINT IF EXISTS sc_auth_rate_limits_operacion_check;
ALTER TABLE public.sc_auth_rate_limits
  ADD CONSTRAINT sc_auth_rate_limits_operacion_check
  CHECK (operacion IN ('login', 'recuperacion', 'portal_lectura', 'portal_escritura', 'push_suscripcion'));

CREATE TABLE IF NOT EXISTS public.sc_push_suscripciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tecnico_id uuid NOT NULL REFERENCES public.sc_usuarios(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sc_push_endpoint_https CHECK (endpoint LIKE 'https://%'),
  CONSTRAINT sc_push_endpoint_length CHECK (length(endpoint) BETWEEN 1 AND 2048),
  CONSTRAINT sc_push_keys_length CHECK (length(p256dh) BETWEEN 20 AND 200 AND length(auth) BETWEEN 8 AND 100)
);

CREATE INDEX IF NOT EXISTS sc_push_suscripciones_tecnico_idx
  ON public.sc_push_suscripciones (tecnico_id);

ALTER TABLE public.sc_push_suscripciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sc_push_suscripciones FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.sc_push_suscripciones TO service_role;

-- La clave de código no se persiste: solo un MD5 como identificador del rate limit.
CREATE OR REPLACE FUNCTION public.sc_push_tecnico_por_codigo(p_codigo text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_codigo text := left(upper(trim(coalesce(p_codigo, ''))), 64);
  v_identificador text := 'push:' || md5(left(upper(trim(coalesce(p_codigo, ''))), 64));
  v_tecnico_id uuid;
  v_bloqueado timestamptz;
BEGIN
  SELECT bloqueado_hasta INTO v_bloqueado
    FROM public.sc_auth_rate_limits
   WHERE operacion = 'push_suscripcion' AND identificador = v_identificador;
  IF v_bloqueado IS NOT NULL AND v_bloqueado > now() THEN
    RETURN NULL;
  END IF;

  SELECT u.id INTO v_tecnico_id
    FROM public.sc_usuarios u
   WHERE u.codigo_acceso = v_codigo AND u.activo = true AND u.rol = 'tecnico'
   LIMIT 1;

  IF v_tecnico_id IS NULL THEN
    INSERT INTO public.sc_auth_rate_limits(operacion, identificador, fallos, bloqueado_hasta)
    VALUES ('push_suscripcion', v_identificador, 1, NULL)
    ON CONFLICT (operacion, identificador) DO UPDATE SET
      fallos = CASE
        WHEN public.sc_auth_rate_limits.ultimo_intento < now() - interval '15 minutes'
         AND coalesce(public.sc_auth_rate_limits.bloqueado_hasta, '-infinity'::timestamptz) <= now()
        THEN 1 ELSE public.sc_auth_rate_limits.fallos + 1 END,
      bloqueado_hasta = CASE
        WHEN public.sc_auth_rate_limits.ultimo_intento < now() - interval '15 minutes'
         AND coalesce(public.sc_auth_rate_limits.bloqueado_hasta, '-infinity'::timestamptz) <= now()
        THEN NULL
        WHEN public.sc_auth_rate_limits.fallos + 1 >= 12 THEN now() + interval '15 minutes'
        WHEN public.sc_auth_rate_limits.fallos + 1 >= 8 THEN now() + interval '5 minutes'
        WHEN public.sc_auth_rate_limits.fallos + 1 >= 5 THEN now() + interval '1 minute'
        ELSE NULL END,
      ultimo_intento = now();
    RETURN NULL;
  END IF;

  DELETE FROM public.sc_auth_rate_limits
   WHERE operacion = 'push_suscripcion' AND identificador = v_identificador;
  RETURN v_tecnico_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sc_push_registrar_suscripcion(
  p_codigo text, p_endpoint text, p_p256dh text, p_auth text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_tecnico_id uuid;
BEGIN
  v_tecnico_id := public.sc_push_tecnico_por_codigo(p_codigo);
  IF v_tecnico_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'codigo_invalido_o_bloqueado');
  END IF;
  IF p_endpoint IS NULL OR p_endpoint !~ '^https://' OR length(p_endpoint) > 2048
     OR p_p256dh IS NULL OR p_p256dh !~ '^[A-Za-z0-9_-]{20,200}$'
     OR p_auth IS NULL OR p_auth !~ '^[A-Za-z0-9_-]{8,100}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'suscripcion_invalida');
  END IF;

  INSERT INTO public.sc_push_suscripciones(tecnico_id, endpoint, p256dh, auth)
  VALUES (v_tecnico_id, p_endpoint, p_p256dh, p_auth)
  ON CONFLICT (endpoint) DO UPDATE SET
    tecnico_id = EXCLUDED.tecnico_id,
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    creado_en = now();
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.sc_push_baja_suscripcion(p_codigo text, p_endpoint text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_tecnico_id uuid;
BEGIN
  v_tecnico_id := public.sc_push_tecnico_por_codigo(p_codigo);
  IF v_tecnico_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'codigo_invalido_o_bloqueado');
  END IF;
  IF p_endpoint IS NULL OR length(p_endpoint) > 2048 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'suscripcion_invalida');
  END IF;
  DELETE FROM public.sc_push_suscripciones
   WHERE tecnico_id = v_tecnico_id AND endpoint = p_endpoint;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.sc_push_pendientes(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_tecnico_id uuid;
  v_informes jsonb;
  v_total integer;
BEGIN
  v_tecnico_id := public.sc_push_tecnico_por_codigo(p_codigo);
  IF v_tecnico_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'codigo_invalido_o_bloqueado');
  END IF;

  WITH pendientes AS (
    SELECT h.informe_id, h.aspecto_id
      FROM public.sc_hallazgos_estado h
      JOIN public.sc_informes i ON i.id = h.informe_id
     WHERE i.tecnico_id = v_tecnico_id
       AND h.foto_url LIKE 'portal/%'
       AND coalesce(h.estado, '') NOT IN ('Verificado', 'En corrección')
  ), agrupados AS (
    SELECT informe_id, count(*)::integer AS pendientes,
           coalesce(jsonb_agg(DISTINCT aspecto_id) FILTER (WHERE aspecto_id IS NOT NULL), '[]'::jsonb) AS aspectos
      FROM pendientes
     GROUP BY informe_id
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'informe_id', informe_id,
           'pendientes', pendientes,
           'aspectos', aspectos
         ) ORDER BY informe_id), '[]'::jsonb),
         coalesce(sum(pendientes), 0)::integer
    INTO v_informes, v_total
    FROM agrupados;

  RETURN jsonb_build_object('ok', true, 'informes', v_informes, 'total', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.sc_push_tecnico_por_codigo(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sc_push_registrar_suscripcion(text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sc_push_baja_suscripcion(text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sc_push_pendientes(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_push_registrar_suscripcion(text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_push_baja_suscripcion(text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_push_pendientes(text) TO anon, authenticated;
