-- migration_sc_informes_tables.sql — SaniCheck · respaldo remoto de Actas/informes
-- Proyecto destino: isncjtomlvxyvcaohcpx (compartido con ProyeCar).
-- Prefijo sc_ obligatorio en toda tabla/RPC propia de SaniCheck (no colisiona con ProyeCar).
--
-- ESTADO: PROPUESTA — NO aplicada a producción todavía.
-- Bloqueada por decisión de identidad de técnicos/admin (ver entrega-carlos.md,
-- sección "Obstáculos"). No ejecutar contra la base real sin confirmar antes:
--   1) si sc_usuarios es una tabla nueva (como aquí) o se reutiliza `usuarios` de ProyeCar,
--   2) quién y cómo provisiona el primer código de acceso de cada técnico y el de Dairo (admin).
--
-- Patrón de autorización tomado de ProyeCar
-- (docs/sql/dashboard-ejecutivo-admin.sql: ra_guardar_dashboard, ra_list_admin_dashboards,
-- ra_get_admin_dashboard_html, ra_delete_dashboard): cada RPC valida el actor con
-- id + codigo_acceso contra una tabla propia de usuarios, NUNCA confía en el
-- tecnico_id que manda el cliente sin verificar el código. usuarios NO tiene
-- columna `activo` en ese patrón — aquí tampoco se agrega.
--
-- Idempotente (IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS).

-- ═══════════════════════════════════════════════════════════════════════════
-- sc_usuarios — identidad mínima de técnicos y admin de SaniCheck
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sc_usuarios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        text NOT NULL,
  codigo_acceso text NOT NULL,
  rol           text NOT NULL CHECK (rol IN ('tecnico', 'admin')),
  creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sc_usuarios_codigo_unique_idx
  ON public.sc_usuarios (codigo_acceso);

COMMENT ON TABLE public.sc_usuarios IS
  'Identidad propia de SaniCheck (técnico/admin) por código de acceso. '
  'No es la tabla usuarios de ProyeCar. No tiene columna activo.';

-- ═══════════════════════════════════════════════════════════════════════════
-- sc_informes — respaldo remoto de las Actas generadas en Actuar (PHVA)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sc_informes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tecnico_id            uuid NOT NULL REFERENCES public.sc_usuarios(id) ON DELETE RESTRICT,
  -- local_id = inspeccion.id del Store local (IndexedDB/localStorage). Permite
  -- que sc_guardar_informe sea idempotente ante reintentos del outbox
  -- (mismo patrón que p_local_id en ra_upsert_registro de ProyeCar).
  local_id              text,
  establecimiento       jsonb NOT NULL DEFAULT '{}'::jsonb,
  establecimiento_nombre text GENERATED ALWAYS AS (establecimiento ->> 'nombre') STORED,
  fecha                 date NOT NULL,
  numero_acta           text,
  informe_html          text NOT NULL,
  creado_en             timestamptz NOT NULL DEFAULT now(),
  actualizado_en        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sc_informes_tecnico_local_unique_idx
  ON public.sc_informes (tecnico_id, local_id)
  WHERE local_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS sc_informes_tecnico_creado_idx
  ON public.sc_informes (tecnico_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS sc_informes_creado_idx
  ON public.sc_informes (creado_en DESC);

COMMENT ON TABLE public.sc_informes IS
  'Respaldo remoto de Actas PSB generadas en Actuar. Fuente de verdad sigue '
  'siendo IndexedDB local; esta tabla es solo backup para no perder informes.';

CREATE OR REPLACE FUNCTION public.sc_informes_set_actualizado()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS sc_informes_actualizado_trg ON public.sc_informes;
CREATE TRIGGER sc_informes_actualizado_trg
  BEFORE UPDATE ON public.sc_informes
  FOR EACH ROW EXECUTE FUNCTION public.sc_informes_set_actualizado();

-- Acceso solo vía RPC SECURITY DEFINER — igual que dashboards_ejecutivos en ProyeCar.
ALTER TABLE public.sc_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sc_informes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sc_usuarios FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.sc_informes FROM PUBLIC, anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- RPCs — técnico (ownership por id + codigo_acceso, nunca solo por p_tecnico_id)
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.sc_guardar_informe(uuid, text, jsonb, date, text, text, text);
CREATE OR REPLACE FUNCTION public.sc_guardar_informe(
  p_tecnico_id uuid, p_codigo text, p_establecimiento jsonb, p_fecha date, p_html text,
  p_local_id text DEFAULT NULL, p_numero_acta text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor sc_usuarios;
  v_id uuid;
BEGIN
  SELECT * INTO v_actor FROM sc_usuarios
  WHERE id = p_tecnico_id AND codigo_acceso = trim(p_codigo);
  IF NOT FOUND THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  INSERT INTO sc_informes (tecnico_id, local_id, establecimiento, fecha, numero_acta, informe_html)
  VALUES (p_tecnico_id, p_local_id, COALESCE(p_establecimiento, '{}'::jsonb), p_fecha, p_numero_acta, p_html)
  ON CONFLICT (tecnico_id, local_id) WHERE local_id IS NOT NULL
  DO UPDATE SET
    establecimiento = EXCLUDED.establecimiento,
    fecha           = EXCLUDED.fecha,
    numero_acta     = EXCLUDED.numero_acta,
    informe_html    = EXCLUDED.informe_html,
    actualizado_en  = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END; $$;

DROP FUNCTION IF EXISTS public.sc_list_mis_informes(uuid, text);
CREATE OR REPLACE FUNCTION public.sc_list_mis_informes(p_tecnico_id uuid, p_codigo text)
RETURNS TABLE(id uuid, establecimiento jsonb, fecha date, numero_acta text,
              creado_en timestamptz, actualizado_en timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM 1 FROM sc_usuarios WHERE id = p_tecnico_id AND codigo_acceso = trim(p_codigo);
  IF NOT FOUND THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  RETURN QUERY
    SELECT i.id, i.establecimiento, i.fecha, i.numero_acta, i.creado_en, i.actualizado_en
    FROM sc_informes i
    WHERE i.tecnico_id = p_tecnico_id
    ORDER BY i.creado_en DESC;
END; $$;

DROP FUNCTION IF EXISTS public.sc_get_informe(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.sc_get_informe(p_id uuid, p_tecnico_id uuid, p_codigo text)
RETURNS TABLE(id uuid, establecimiento jsonb, fecha date, numero_acta text, informe_html text,
              creado_en timestamptz, actualizado_en timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM 1 FROM sc_usuarios WHERE id = p_tecnico_id AND codigo_acceso = trim(p_codigo);
  IF NOT FOUND THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  RETURN QUERY
    SELECT i.id, i.establecimiento, i.fecha, i.numero_acta, i.informe_html, i.creado_en, i.actualizado_en
    FROM sc_informes i
    WHERE i.id = p_id AND i.tecnico_id = p_tecnico_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
END; $$;

DROP FUNCTION IF EXISTS public.sc_update_informe(uuid, uuid, text, text);
CREATE OR REPLACE FUNCTION public.sc_update_informe(p_id uuid, p_tecnico_id uuid, p_codigo text, p_html text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor sc_usuarios;
BEGIN
  SELECT * INTO v_actor FROM sc_usuarios WHERE id = p_tecnico_id AND codigo_acceso = trim(p_codigo);
  IF NOT FOUND THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  UPDATE sc_informes SET informe_html = p_html
  WHERE id = p_id AND tecnico_id = p_tecnico_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
  RETURN true;
END; $$;

DROP FUNCTION IF EXISTS public.sc_delete_informe(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.sc_delete_informe(p_id uuid, p_tecnico_id uuid, p_codigo text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM 1 FROM sc_usuarios WHERE id = p_tecnico_id AND codigo_acceso = trim(p_codigo);
  IF NOT FOUND THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  DELETE FROM sc_informes WHERE id = p_id AND tecnico_id = p_tecnico_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
  RETURN true;
END; $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- RPCs — admin (Dairo), sin filtro de tecnico_id, rol admin obligatorio
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.sc_list_admin_informes(uuid, text);
CREATE OR REPLACE FUNCTION public.sc_list_admin_informes(p_admin_id uuid, p_codigo text)
RETURNS TABLE(id uuid, tecnico_id uuid, tecnico_nombre text, establecimiento jsonb,
              fecha date, numero_acta text, creado_en timestamptz, actualizado_en timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin sc_usuarios;
BEGIN
  SELECT * INTO v_admin FROM sc_usuarios WHERE id = p_admin_id AND codigo_acceso = trim(p_codigo);
  IF NOT FOUND OR v_admin.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  RETURN QUERY
    SELECT i.id, i.tecnico_id, u.nombre, i.establecimiento, i.fecha, i.numero_acta, i.creado_en, i.actualizado_en
    FROM sc_informes i
    JOIN sc_usuarios u ON u.id = i.tecnico_id
    ORDER BY i.creado_en DESC;
END; $$;

-- No estaba en la lista original de RPCs pero es imprescindible para que el
-- admin pueda "ver"/"editar" un informe puntual (criterio 7: mismo patrón sin
-- filtro tecnico_id) — análogo a ra_get_admin_dashboard_html en ProyeCar.
DROP FUNCTION IF EXISTS public.sc_get_admin_informe(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.sc_get_admin_informe(p_id uuid, p_admin_id uuid, p_codigo text)
RETURNS TABLE(id uuid, tecnico_id uuid, tecnico_nombre text, establecimiento jsonb, fecha date,
              numero_acta text, informe_html text, creado_en timestamptz, actualizado_en timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin sc_usuarios;
BEGIN
  SELECT * INTO v_admin FROM sc_usuarios WHERE id = p_admin_id AND codigo_acceso = trim(p_codigo);
  IF NOT FOUND OR v_admin.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  RETURN QUERY
    SELECT i.id, i.tecnico_id, u.nombre, i.establecimiento, i.fecha, i.numero_acta, i.informe_html, i.creado_en, i.actualizado_en
    FROM sc_informes i
    JOIN sc_usuarios u ON u.id = i.tecnico_id
    WHERE i.id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
END; $$;

DROP FUNCTION IF EXISTS public.sc_update_admin_informe(uuid, uuid, text, text);
CREATE OR REPLACE FUNCTION public.sc_update_admin_informe(p_id uuid, p_admin_id uuid, p_codigo text, p_html text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin sc_usuarios;
BEGIN
  SELECT * INTO v_admin FROM sc_usuarios WHERE id = p_admin_id AND codigo_acceso = trim(p_codigo);
  IF NOT FOUND OR v_admin.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  UPDATE sc_informes SET informe_html = p_html WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
  RETURN true;
END; $$;

DROP FUNCTION IF EXISTS public.sc_delete_admin_informe(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.sc_delete_admin_informe(p_id uuid, p_admin_id uuid, p_codigo text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin sc_usuarios;
BEGIN
  SELECT * INTO v_admin FROM sc_usuarios WHERE id = p_admin_id AND codigo_acceso = trim(p_codigo);
  IF NOT FOUND OR v_admin.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  DELETE FROM sc_informes WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
  RETURN true;
END; $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Grants — cliente solo usa anon key (sin Supabase Auth/JWT en SaniCheck hoy)
-- ═══════════════════════════════════════════════════════════════════════════

REVOKE ALL ON FUNCTION public.sc_guardar_informe(uuid, text, jsonb, date, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sc_list_mis_informes(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sc_get_informe(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sc_update_informe(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sc_delete_informe(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sc_list_admin_informes(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sc_get_admin_informe(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sc_update_admin_informe(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sc_delete_admin_informe(uuid, uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.sc_guardar_informe(uuid, text, jsonb, date, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_list_mis_informes(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_get_informe(uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_update_informe(uuid, uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_delete_informe(uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_list_admin_informes(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_get_admin_informe(uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_update_admin_informe(uuid, uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_delete_admin_informe(uuid, uuid, text) TO anon, authenticated;
