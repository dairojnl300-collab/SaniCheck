-- SaniCheck — control server-side de fuerza bruta y metadata de informes.
-- Aplicar después de migration_sc_informes_auth_v4_password_recovery.

ALTER TABLE public.sc_informes
  ADD COLUMN IF NOT EXISTS nivel_cumplimiento text,
  ADD COLUMN IF NOT EXISTS aspectos_evaluados integer,
  ADD COLUMN IF NOT EXISTS aspectos_total integer,
  ADD COLUMN IF NOT EXISTS porcentaje_cumplimiento integer;

ALTER TABLE public.sc_informes
  DROP CONSTRAINT IF EXISTS sc_informes_nivel_cumplimiento_check,
  DROP CONSTRAINT IF EXISTS sc_informes_aspectos_evaluados_check,
  DROP CONSTRAINT IF EXISTS sc_informes_aspectos_total_check,
  DROP CONSTRAINT IF EXISTS sc_informes_porcentaje_cumplimiento_check;

ALTER TABLE public.sc_informes
  ADD CONSTRAINT sc_informes_nivel_cumplimiento_check
    CHECK (nivel_cumplimiento IS NULL OR nivel_cumplimiento IN ('BUENO', 'REGULAR', 'DEFICIENTE')),
  ADD CONSTRAINT sc_informes_aspectos_evaluados_check
    CHECK (aspectos_evaluados IS NULL OR aspectos_evaluados >= 0),
  ADD CONSTRAINT sc_informes_aspectos_total_check
    CHECK (aspectos_total IS NULL OR aspectos_total >= 0),
  ADD CONSTRAINT sc_informes_porcentaje_cumplimiento_check
    CHECK (porcentaje_cumplimiento IS NULL OR porcentaje_cumplimiento BETWEEN 0 AND 100);

-- La clave es el usuario normalizado, nunca la contraseña ni el código de
-- recuperación. El contenido solo sirve para el control interno de intentos.
CREATE TABLE IF NOT EXISTS public.sc_auth_rate_limits (
  operacion       text NOT NULL CHECK (operacion IN ('login', 'recuperacion')),
  identificador   text NOT NULL,
  fallos          integer NOT NULL DEFAULT 0 CHECK (fallos >= 0),
  bloqueado_hasta timestamptz,
  ultimo_intento  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operacion, identificador)
);

ALTER TABLE public.sc_auth_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sc_auth_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sc_auth_verificar_bloqueo(p_operacion text, p_identificador text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hasta timestamptz;
BEGIN
  SELECT bloqueado_hasta INTO v_hasta
    FROM public.sc_auth_rate_limits
   WHERE operacion = p_operacion AND identificador = p_identificador;
  IF v_hasta IS NOT NULL AND v_hasta > now() THEN
    RAISE EXCEPTION 'Demasiados intentos. Intenta de nuevo más tarde.';
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.sc_auth_registrar_fallo(p_operacion text, p_identificador text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.sc_auth_rate_limits(operacion, identificador, fallos, bloqueado_hasta)
  VALUES (p_operacion, p_identificador, 1, NULL)
  ON CONFLICT (operacion, identificador) DO UPDATE SET
    fallos = public.sc_auth_rate_limits.fallos + 1,
    bloqueado_hasta = CASE
      WHEN public.sc_auth_rate_limits.fallos + 1 >= 12 THEN now() + interval '15 minutes'
      WHEN public.sc_auth_rate_limits.fallos + 1 >= 8 THEN now() + interval '5 minutes'
      WHEN public.sc_auth_rate_limits.fallos + 1 >= 5 THEN now() + interval '1 minute'
      ELSE NULL
    END,
    ultimo_intento = now();
END; $$;

CREATE OR REPLACE FUNCTION public.sc_auth_limpiar_fallos(p_operacion text, p_identificador text)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.sc_auth_rate_limits
   WHERE operacion = p_operacion AND identificador = p_identificador;
$$;

REVOKE ALL ON FUNCTION public.sc_auth_verificar_bloqueo(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sc_auth_registrar_fallo(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sc_auth_limpiar_fallos(text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sc_informe_porcentaje(p_html text)
RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT NULLIF((regexp_match(COALESCE(p_html, ''), '(?is)([0-9]{1,3})%\s*</div>\s*<div[^>]*>\s*CUMPLIMIENTO'))[1], '')::integer;
$$;

CREATE OR REPLACE FUNCTION public.sc_informe_aspectos_evaluados(p_html text)
RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN count(*) = 0 THEN NULL ELSE sum((m[1])::integer)::integer END
    FROM regexp_matches(COALESCE(p_html, ''), '(?i)Evaluados:\s*([0-9]+)', 'g') AS m;
$$;

REVOKE ALL ON FUNCTION public.sc_informe_porcentaje(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sc_informe_aspectos_evaluados(text) FROM PUBLIC, anon, authenticated;

-- Completa metadata de respaldos anteriores sin tocar el HTML ni eliminar filas.
WITH parsed AS (
  SELECT i.id,
         public.sc_informe_porcentaje(i.informe_html) AS pct,
         public.sc_informe_aspectos_evaluados(i.informe_html) AS evaluados
    FROM public.sc_informes i
)
UPDATE public.sc_informes i
   SET porcentaje_cumplimiento = COALESCE(i.porcentaje_cumplimiento, p.pct),
       aspectos_evaluados = COALESCE(i.aspectos_evaluados, p.evaluados),
       nivel_cumplimiento = COALESCE(i.nivel_cumplimiento, CASE
         WHEN p.pct >= 80 THEN 'BUENO'
         WHEN p.pct >= 50 THEN 'REGULAR'
         WHEN p.pct IS NOT NULL THEN 'DEFICIENTE'
       END)
  FROM parsed p
 WHERE i.id = p.id;

DROP FUNCTION IF EXISTS public.sc_guardar_informe(text, jsonb, date, text, text, text);
CREATE OR REPLACE FUNCTION public.sc_guardar_informe(
  p_codigo text, p_establecimiento jsonb, p_fecha date, p_html text,
  p_local_id text DEFAULT NULL, p_numero_acta text DEFAULT NULL,
  p_nivel_cumplimiento text DEFAULT NULL, p_aspectos_evaluados integer DEFAULT NULL,
  p_aspectos_total integer DEFAULT NULL, p_porcentaje_cumplimiento integer DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor sc_usuarios; v_id uuid;
BEGIN
  v_actor := sc_resolver_actor(p_codigo);
  IF p_nivel_cumplimiento IS NOT NULL AND p_nivel_cumplimiento NOT IN ('BUENO','REGULAR','DEFICIENTE')
     OR p_aspectos_evaluados IS NOT NULL AND p_aspectos_evaluados < 0
     OR p_aspectos_total IS NOT NULL AND p_aspectos_total < 0
     OR p_porcentaje_cumplimiento IS NOT NULL AND p_porcentaje_cumplimiento NOT BETWEEN 0 AND 100
  THEN RAISE EXCEPTION 'Metadata de informe inválida'; END IF;

  INSERT INTO public.sc_informes(
    tecnico_id, local_id, establecimiento, fecha, numero_acta, informe_html,
    nivel_cumplimiento, aspectos_evaluados, aspectos_total, porcentaje_cumplimiento
  ) VALUES (
    v_actor.id, p_local_id, COALESCE(p_establecimiento, '{}'::jsonb), p_fecha,
    p_numero_acta, sc_sanitizar_html(p_html), p_nivel_cumplimiento,
    p_aspectos_evaluados, p_aspectos_total, p_porcentaje_cumplimiento
  )
  ON CONFLICT (tecnico_id, local_id) WHERE local_id IS NOT NULL DO UPDATE SET
    establecimiento = EXCLUDED.establecimiento,
    fecha = EXCLUDED.fecha,
    numero_acta = EXCLUDED.numero_acta,
    informe_html = EXCLUDED.informe_html,
    nivel_cumplimiento = COALESCE(EXCLUDED.nivel_cumplimiento, public.sc_informes.nivel_cumplimiento),
    aspectos_evaluados = COALESCE(EXCLUDED.aspectos_evaluados, public.sc_informes.aspectos_evaluados),
    aspectos_total = COALESCE(EXCLUDED.aspectos_total, public.sc_informes.aspectos_total),
    porcentaje_cumplimiento = COALESCE(EXCLUDED.porcentaje_cumplimiento, public.sc_informes.porcentaje_cumplimiento),
    actualizado_en = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

DROP FUNCTION IF EXISTS public.sc_list_mis_informes(text);
CREATE OR REPLACE FUNCTION public.sc_list_mis_informes(p_codigo text)
RETURNS TABLE(id uuid, local_id text, establecimiento jsonb, fecha date, numero_acta text,
              nivel_cumplimiento text, aspectos_evaluados integer, aspectos_total integer,
              porcentaje_cumplimiento integer, creado_en timestamptz, actualizado_en timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := sc_resolver_actor(p_codigo);
  RETURN QUERY SELECT i.id, i.local_id, i.establecimiento, i.fecha, i.numero_acta,
      COALESCE(i.nivel_cumplimiento, CASE WHEN public.sc_informe_porcentaje(i.informe_html) >= 80 THEN 'BUENO' WHEN public.sc_informe_porcentaje(i.informe_html) >= 50 THEN 'REGULAR' WHEN public.sc_informe_porcentaje(i.informe_html) IS NOT NULL THEN 'DEFICIENTE' END),
      COALESCE(i.aspectos_evaluados, public.sc_informe_aspectos_evaluados(i.informe_html)), i.aspectos_total,
      COALESCE(i.porcentaje_cumplimiento, public.sc_informe_porcentaje(i.informe_html)), i.creado_en, i.actualizado_en
    FROM public.sc_informes i WHERE i.tecnico_id = v_actor.id ORDER BY i.creado_en DESC;
END; $$;

DROP FUNCTION IF EXISTS public.sc_get_informe(uuid, text);
CREATE OR REPLACE FUNCTION public.sc_get_informe(p_id uuid, p_codigo text)
RETURNS TABLE(id uuid, local_id text, establecimiento jsonb, fecha date, numero_acta text, informe_html text,
              nivel_cumplimiento text, aspectos_evaluados integer, aspectos_total integer,
              porcentaje_cumplimiento integer, creado_en timestamptz, actualizado_en timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := sc_resolver_actor(p_codigo);
  RETURN QUERY SELECT i.id, i.local_id, i.establecimiento, i.fecha, i.numero_acta, i.informe_html,
      i.nivel_cumplimiento, i.aspectos_evaluados, i.aspectos_total, i.porcentaje_cumplimiento,
      i.creado_en, i.actualizado_en FROM public.sc_informes i
    WHERE i.id = p_id AND i.tecnico_id = v_actor.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
END; $$;

DROP FUNCTION IF EXISTS public.sc_list_admin_informes(text);
CREATE OR REPLACE FUNCTION public.sc_list_admin_informes(p_codigo text)
RETURNS TABLE(id uuid, local_id text, tecnico_id uuid, tecnico_nombre text, establecimiento jsonb,
              fecha date, numero_acta text, nivel_cumplimiento text, aspectos_evaluados integer,
              aspectos_total integer, porcentaje_cumplimiento integer, creado_en timestamptz,
              actualizado_en timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := sc_resolver_actor(p_codigo);
  IF v_actor.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
  RETURN QUERY SELECT i.id, i.local_id, i.tecnico_id, u.nombre, i.establecimiento, i.fecha, i.numero_acta,
      COALESCE(i.nivel_cumplimiento, CASE WHEN public.sc_informe_porcentaje(i.informe_html) >= 80 THEN 'BUENO' WHEN public.sc_informe_porcentaje(i.informe_html) >= 50 THEN 'REGULAR' WHEN public.sc_informe_porcentaje(i.informe_html) IS NOT NULL THEN 'DEFICIENTE' END),
      COALESCE(i.aspectos_evaluados, public.sc_informe_aspectos_evaluados(i.informe_html)), i.aspectos_total,
      COALESCE(i.porcentaje_cumplimiento, public.sc_informe_porcentaje(i.informe_html)), i.creado_en, i.actualizado_en
    FROM public.sc_informes i JOIN public.sc_usuarios u ON u.id = i.tecnico_id ORDER BY i.creado_en DESC;
END; $$;

DROP FUNCTION IF EXISTS public.sc_get_admin_informe(uuid, text);
CREATE OR REPLACE FUNCTION public.sc_get_admin_informe(p_id uuid, p_codigo text)
RETURNS TABLE(id uuid, local_id text, tecnico_id uuid, tecnico_nombre text, establecimiento jsonb, fecha date,
              numero_acta text, informe_html text, nivel_cumplimiento text, aspectos_evaluados integer,
              aspectos_total integer, porcentaje_cumplimiento integer, creado_en timestamptz,
              actualizado_en timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := sc_resolver_actor(p_codigo);
  IF v_actor.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
  RETURN QUERY SELECT i.id, i.local_id, i.tecnico_id, u.nombre, i.establecimiento, i.fecha, i.numero_acta,
      i.informe_html, i.nivel_cumplimiento, i.aspectos_evaluados, i.aspectos_total,
      i.porcentaje_cumplimiento, i.creado_en, i.actualizado_en
    FROM public.sc_informes i JOIN public.sc_usuarios u ON u.id = i.tecnico_id WHERE i.id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
END; $$;

REVOKE ALL ON FUNCTION public.sc_guardar_informe(text,jsonb,date,text,text,text, text,integer,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_guardar_informe(text,jsonb,date,text,text,text, text,integer,integer,integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_list_mis_informes(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_get_informe(uuid,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_list_admin_informes(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_get_admin_informe(uuid,text) TO anon, authenticated;

-- Login: 5 fallos -> 1 min; 8 -> 5 min; 12+ -> 15 min.
DROP FUNCTION IF EXISTS public.sc_login_usuario(text,text);
CREATE OR REPLACE FUNCTION public.sc_login_usuario(p_usuario text, p_password text)
RETURNS TABLE(id uuid, nombre text, rol text, usuario text, codigo_acceso text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_usuario text := lower(trim(COALESCE(p_usuario, ''))); v_actor sc_usuarios;
BEGIN
  PERFORM public.sc_auth_verificar_bloqueo('login', v_usuario);
  IF p_password IS NULL OR p_password !~ '^[0-9]{4}$' THEN
    PERFORM public.sc_auth_registrar_fallo('login', v_usuario);
    RAISE EXCEPTION 'Usuario o contraseña incorrectos';
  END IF;
  SELECT u.* INTO v_actor FROM public.sc_usuarios u
    WHERE lower(u.usuario) = v_usuario AND u.activo = true AND u.password_hash IS NOT NULL
      AND extensions.crypt(p_password, u.password_hash) = u.password_hash;
  IF NOT FOUND THEN
    PERFORM public.sc_auth_registrar_fallo('login', v_usuario);
    RAISE EXCEPTION 'Usuario o contraseña incorrectos';
  END IF;
  PERFORM public.sc_auth_limpiar_fallos('login', v_usuario);
  RETURN QUERY SELECT v_actor.id, v_actor.nombre, v_actor.rol, v_actor.usuario, v_actor.codigo_acceso;
END; $$;

-- Recuperación: mismo límite y rotación del código tras éxito (un solo uso).
DROP FUNCTION IF EXISTS public.sc_configurar_password_inicial(text,text,text);
CREATE OR REPLACE FUNCTION public.sc_configurar_password_inicial(p_usuario text, p_codigo text, p_password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_usuario text := lower(trim(COALESCE(p_usuario, ''))); v_nuevo_codigo text; v_id uuid;
BEGIN
  PERFORM public.sc_auth_verificar_bloqueo('recuperacion', v_usuario);
  IF p_password IS NULL OR p_password !~ '^[0-9]{4}$' THEN
    PERFORM public.sc_auth_registrar_fallo('recuperacion', v_usuario);
    RAISE EXCEPTION 'Usuario, código inválido o contraseña no actualizada';
  END IF;
  LOOP
    v_nuevo_codigo := public.sc_generar_codigo();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.sc_usuarios u WHERE u.codigo_acceso = v_nuevo_codigo);
  END LOOP;
  UPDATE public.sc_usuarios SET password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')), codigo_acceso = v_nuevo_codigo
   WHERE lower(usuario) = v_usuario AND codigo_acceso = upper(trim(COALESCE(p_codigo, ''))) AND activo = true
   RETURNING id INTO v_id;
  IF NOT FOUND THEN
    PERFORM public.sc_auth_registrar_fallo('recuperacion', v_usuario);
    RAISE EXCEPTION 'Usuario, código inválido o contraseña no actualizada';
  END IF;
  PERFORM public.sc_auth_limpiar_fallos('recuperacion', v_usuario);
  RETURN true;
END; $$;

GRANT EXECUTE ON FUNCTION public.sc_login_usuario(text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_configurar_password_inicial(text,text,text) TO anon, authenticated;
