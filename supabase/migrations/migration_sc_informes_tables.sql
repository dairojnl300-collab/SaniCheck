-- migration_sc_informes_tables.sql — SaniCheck · respaldo remoto de Actas/informes
-- Proyecto destino: isncjtomlvxyvcaohcpx (compartido con ProyeCar).
-- Prefijo sc_ obligatorio en toda tabla/RPC propia de SaniCheck (no colisiona con ProyeCar).
--
-- ESTADO: pendiente de aplicar manualmente (Dairo) o vía MCP Supabase con
-- execute_sql/apply_migration. Esta sesión de Carlos no tuvo herramienta MCP
-- de Supabase disponible ni permiso para ejecutar migraciones de producción
-- por cuenta propia — ver entrega-carlos.md.
--
-- Diseño de autorización: NO usa el par (id, codigo) de ProyeCar
-- (dashboard-ejecutivo-admin.sql: ra_guardar_dashboard, etc.) porque eso
-- exige que el cliente conozca su propio UUID (requiere una pantalla de
-- login nueva). En su lugar se sigue el patrón YA EXISTENTE en este mismo
-- repo (app/js/portal-cliente.js: header x-sanicheck-codigo-acceso / columna
-- codigo_acceso en `establecimientos`): el cliente solo maneja un código
-- secreto (`codigo_acceso`), y cada RPC resuelve tecnico_id + rol
-- server-side a partir de ese código. Nunca se confía en un id mandado por
-- el cliente. usuarios NO tiene columna `activo` (regla explícita).
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

-- Alta inicial de ejemplo — AJUSTAR nombre y código reales antes de ejecutar.
-- Generar codigo_acceso con el mismo esquema que PortalCliente.generarCodigoAcceso()
-- (6 caracteres, alfabeto sin I/O/0/1) y entregarlo por un canal seguro (no email plano).
-- INSERT INTO public.sc_usuarios (nombre, codigo_acceso, rol) VALUES
--   ('Dairo Narváez', 'CAMBIAR-CODIGO-ADMIN', 'admin'),
--   ('Nombre Técnico', 'CAMBIAR-CODIGO-TECNICO', 'tecnico');

-- ═══════════════════════════════════════════════════════════════════════════
-- sc_informes — respaldo remoto de las Actas generadas en Actuar
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sc_informes (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tecnico_id             uuid NOT NULL REFERENCES public.sc_usuarios(id) ON DELETE RESTRICT,
  -- local_id = inspeccion.id del Store local (IndexedDB/localStorage). Permite
  -- que sc_guardar_informe sea idempotente ante reintentos del outbox: sin
  -- esto, cada reintento offline crearía un informe remoto duplicado.
  local_id               text,
  establecimiento        jsonb NOT NULL DEFAULT '{}'::jsonb,
  establecimiento_nombre text GENERATED ALWAYS AS (establecimiento ->> 'nombre') STORED,
  fecha                  date NOT NULL,
  numero_acta            text,
  informe_html           text NOT NULL,
  creado_en              timestamptz NOT NULL DEFAULT now(),
  actualizado_en         timestamptz NOT NULL DEFAULT now()
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
-- Helper interno — resuelve el usuario a partir del código secreto.
-- No se expone (sin GRANT EXECUTE a anon/authenticated).
-- ═══════════════════════════════════════════════════════════════════════════

-- Defensa en profundidad: el cliente ya aísla informe_html en un <iframe
-- sandbox> sin allow-scripts/allow-same-origin (mitigación primaria contra
-- XSS cruzado entre técnicos/admin). Esta función es una segunda capa que
-- limpia el HTML ANTES de guardarlo, cubriendo solo los 3 vectores clásicos:
-- <script>, atributos on* y URLs javascript:. No es un sanitizador HTML
-- completo (no vendoriza DOMPurify server-side); si se detecta otro vector
-- de inyección, la mitigación real sigue siendo el sandbox del iframe.
DROP FUNCTION IF EXISTS public.sc_sanitizar_html(text);
CREATE OR REPLACE FUNCTION public.sc_sanitizar_html(p_html text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(
    regexp_replace(
      regexp_replace(
        COALESCE(p_html, ''),
        '<script\b[^>]*>.*?</script\s*>', '', 'gis'
      ),
      '\son[a-zA-Z]+\s*=\s*("[^"]*"|''[^'']*''|[^\s>]+)', '', 'gi'
    ),
    'javascript\s*:', 'blocked:', 'gi'
  );
$$;

REVOKE ALL ON FUNCTION public.sc_sanitizar_html(text) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.sc_resolver_actor(text);
CREATE OR REPLACE FUNCTION public.sc_resolver_actor(p_codigo text)
RETURNS public.sc_usuarios
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor sc_usuarios;
BEGIN
  SELECT * INTO v_actor FROM sc_usuarios WHERE codigo_acceso = trim(p_codigo);
  IF NOT FOUND THEN RAISE EXCEPTION 'Código de acceso inválido'; END IF;
  RETURN v_actor;
END; $$;

REVOKE ALL ON FUNCTION public.sc_resolver_actor(text) FROM PUBLIC, anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- RPCs — sesión (whoami) y técnico (ownership resuelto server-side)
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.sc_whoami(text);
CREATE OR REPLACE FUNCTION public.sc_whoami(p_codigo text)
RETURNS TABLE(id uuid, nombre text, rol text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := sc_resolver_actor(p_codigo);
  RETURN QUERY SELECT v_actor.id, v_actor.nombre, v_actor.rol;
END; $$;

DROP FUNCTION IF EXISTS public.sc_guardar_informe(text, jsonb, date, text, text, text);
CREATE OR REPLACE FUNCTION public.sc_guardar_informe(
  p_codigo text, p_establecimiento jsonb, p_fecha date, p_html text,
  p_local_id text DEFAULT NULL, p_numero_acta text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor sc_usuarios;
  v_id uuid;
BEGIN
  v_actor := sc_resolver_actor(p_codigo);

  INSERT INTO sc_informes (tecnico_id, local_id, establecimiento, fecha, numero_acta, informe_html)
  VALUES (v_actor.id, p_local_id, COALESCE(p_establecimiento, '{}'::jsonb), p_fecha, p_numero_acta, sc_sanitizar_html(p_html))
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

DROP FUNCTION IF EXISTS public.sc_list_mis_informes(text);
CREATE OR REPLACE FUNCTION public.sc_list_mis_informes(p_codigo text)
RETURNS TABLE(id uuid, establecimiento jsonb, fecha date, numero_acta text,
              creado_en timestamptz, actualizado_en timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := sc_resolver_actor(p_codigo);
  RETURN QUERY
    SELECT i.id, i.establecimiento, i.fecha, i.numero_acta, i.creado_en, i.actualizado_en
    FROM sc_informes i
    WHERE i.tecnico_id = v_actor.id
    ORDER BY i.creado_en DESC;
END; $$;

DROP FUNCTION IF EXISTS public.sc_get_informe(uuid, text);
CREATE OR REPLACE FUNCTION public.sc_get_informe(p_id uuid, p_codigo text)
RETURNS TABLE(id uuid, establecimiento jsonb, fecha date, numero_acta text, informe_html text,
              creado_en timestamptz, actualizado_en timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := sc_resolver_actor(p_codigo);
  RETURN QUERY
    SELECT i.id, i.establecimiento, i.fecha, i.numero_acta, i.informe_html, i.creado_en, i.actualizado_en
    FROM sc_informes i
    WHERE i.id = p_id AND i.tecnico_id = v_actor.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
END; $$;

DROP FUNCTION IF EXISTS public.sc_update_informe(uuid, text, text);
CREATE OR REPLACE FUNCTION public.sc_update_informe(p_id uuid, p_codigo text, p_html text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := sc_resolver_actor(p_codigo);
  UPDATE sc_informes SET informe_html = sc_sanitizar_html(p_html)
  WHERE id = p_id AND tecnico_id = v_actor.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
  RETURN true;
END; $$;

DROP FUNCTION IF EXISTS public.sc_delete_informe(uuid, text);
CREATE OR REPLACE FUNCTION public.sc_delete_informe(p_id uuid, p_codigo text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := sc_resolver_actor(p_codigo);
  DELETE FROM sc_informes WHERE id = p_id AND tecnico_id = v_actor.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
  RETURN true;
END; $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- RPCs — admin (Dairo), sin filtro de tecnico_id, exige rol = 'admin'
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.sc_list_admin_informes(text);
CREATE OR REPLACE FUNCTION public.sc_list_admin_informes(p_codigo text)
RETURNS TABLE(id uuid, tecnico_id uuid, tecnico_nombre text, establecimiento jsonb,
              fecha date, numero_acta text, creado_en timestamptz, actualizado_en timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := sc_resolver_actor(p_codigo);
  IF v_actor.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  RETURN QUERY
    SELECT i.id, i.tecnico_id, u.nombre, i.establecimiento, i.fecha, i.numero_acta, i.creado_en, i.actualizado_en
    FROM sc_informes i
    JOIN sc_usuarios u ON u.id = i.tecnico_id
    ORDER BY i.creado_en DESC;
END; $$;

-- No estaba en la lista original de RPCs pero es imprescindible para que el
-- admin pueda "ver"/"editar" un informe puntual (criterio 7: mismo patrón sin
-- filtro tecnico_id) — análogo a ra_get_admin_dashboard_html en ProyeCar.
DROP FUNCTION IF EXISTS public.sc_get_admin_informe(uuid, text);
CREATE OR REPLACE FUNCTION public.sc_get_admin_informe(p_id uuid, p_codigo text)
RETURNS TABLE(id uuid, tecnico_id uuid, tecnico_nombre text, establecimiento jsonb, fecha date,
              numero_acta text, informe_html text, creado_en timestamptz, actualizado_en timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := sc_resolver_actor(p_codigo);
  IF v_actor.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  RETURN QUERY
    SELECT i.id, i.tecnico_id, u.nombre, i.establecimiento, i.fecha, i.numero_acta, i.informe_html, i.creado_en, i.actualizado_en
    FROM sc_informes i
    JOIN sc_usuarios u ON u.id = i.tecnico_id
    WHERE i.id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
END; $$;

DROP FUNCTION IF EXISTS public.sc_update_admin_informe(uuid, text, text);
CREATE OR REPLACE FUNCTION public.sc_update_admin_informe(p_id uuid, p_codigo text, p_html text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := sc_resolver_actor(p_codigo);
  IF v_actor.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  UPDATE sc_informes SET informe_html = sc_sanitizar_html(p_html) WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
  RETURN true;
END; $$;

DROP FUNCTION IF EXISTS public.sc_delete_admin_informe(uuid, text);
CREATE OR REPLACE FUNCTION public.sc_delete_admin_informe(p_id uuid, p_codigo text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := sc_resolver_actor(p_codigo);
  IF v_actor.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  DELETE FROM sc_informes WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
  RETURN true;
END; $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Grants — cliente solo usa anon key (SaniCheck no usa Supabase Auth/JWT)
-- ═══════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.sc_whoami(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_guardar_informe(text, jsonb, date, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_list_mis_informes(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_get_informe(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_update_informe(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_delete_informe(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_list_admin_informes(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_get_admin_informe(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_update_admin_informe(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_delete_admin_informe(uuid, text) TO anon, authenticated;
