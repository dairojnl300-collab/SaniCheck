-- migration_sc_informes_fotos_storage.sql
-- Migra las fotografías de las Actas de dataURL base64 embebido en
-- informe_html (duplicado 2x: detalle de ítem + Registro Fotográfico) a
-- Supabase Storage. Con 10+ fotos ese HTML rompía la generación de PDF
-- (window.print(), sin jsPDF) y ya presionaba el límite local documentado
-- en app/js/store.js (_estimatePhotoBytes/RECOVERY_LIMIT_BYTES).
--
-- Aplicar después de migration_sc_informes_admin_continuidad.sql.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- DECISIÓN DE ARQUITECTURA — RLS de storage.objects (leer antes de auditar)
-- ═══════════════════════════════════════════════════════════════════════════
-- SaniCheck NO usa Supabase Auth/JWT: verificado con execute_sql sobre este
-- proyecto (auth.users tiene 1 fila sin uso real; la identidad real es
-- codigo_acceso, resuelto server-side por sc_resolver_actor()). Por lo tanto
-- auth.uid() es SIEMPRE NULL en el contexto de las peticiones reales, y una
-- policy de storage.objects tipo `auth.uid() = (storage.foldername(name))[1]`
-- es inalcanzable sin introducir JWT propio o Edge Functions (fuera de
-- alcance de este cambio; confirmado con el usuario, sin pg_net/vault).
--
-- Se adopta el MISMO nivel de confianza que ya acepta sc_informes: acceso
-- real gateado en las RPCs SECURITY DEFINER (que sí validan p_codigo), no a
-- nivel de fila en Storage. Las policies de este bucket son deliberadamente
-- amplias (anon/authenticated + bucket_id), sin aislar por técnico a nivel
-- Storage. Mitigación: paths con UUIDs no adivinables
-- ({tecnico_id}/{informe_id}/{foto_id}.jpg) — cualquiera con la anon key
-- puede, en teoría, subir/leer/listar objetos de este bucket conociendo o
-- adivinando un path, exactamente igual que ya puede llamar cualquier RPC sc_*
-- sin código válido (recibirá 'Código de acceso inválido', pero la superficie
-- de red es la misma). RIESGO ACEPTADO — Camila: marcar explícitamente en
-- la auditoría de este PR, no es un descuido.
--
-- Idempotente donde es razonable (buckets/policies con nombre fijo).

-- ═══════════════════════════════════════════════════════════════════════════
-- Bucket
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('sc-informes-fotos', 'sc-informes-fotos', false, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS sc_informes_fotos_select ON storage.objects;
CREATE POLICY sc_informes_fotos_select ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'sc-informes-fotos');

DROP POLICY IF EXISTS sc_informes_fotos_insert ON storage.objects;
CREATE POLICY sc_informes_fotos_insert ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'sc-informes-fotos');

DROP POLICY IF EXISTS sc_informes_fotos_update ON storage.objects;
CREATE POLICY sc_informes_fotos_update ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'sc-informes-fotos')
  WITH CHECK (bucket_id = 'sc-informes-fotos');

DROP POLICY IF EXISTS sc_informes_fotos_delete ON storage.objects;
CREATE POLICY sc_informes_fotos_delete ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'sc-informes-fotos');

-- ═══════════════════════════════════════════════════════════════════════════
-- Columna fotos_urls (array de paths dentro del bucket, no base64)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.sc_informes
  ADD COLUMN IF NOT EXISTS fotos_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.sc_informes.fotos_urls IS
  'Array jsonb de paths dentro del bucket sc-informes-fotos (no URLs firmadas, no base64). '
  'Formato de cada path: {tecnico_id}/{informe_id}/{foto_id}.jpg.';

-- No tocar el guard existente que rechaza la clave "fotografias" dentro de
-- estado_parcial/estado_estructurado (migration_sc_informes_borradores.sql,
-- migration_sc_informes_continuidad.sql). Si la feature pausada de
-- continuidad llega a reusar este bucket para adjuntos, usar una clave nueva
-- (p.ej. "adjuntos_urls", array de paths string) — no implementado aquí.

-- ═══════════════════════════════════════════════════════════════════════════
-- RPCs de escritura — agregan p_fotos_urls jsonb
-- (Postgres NO reemplaza una función in-place al agregarle un parámetro
-- nuevo: hay que dropear la firma vieja primero — mismo gotcha ya documentado
-- en migration_sc_informes_continuidad.sql.)
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.sc_guardar_informe(text,jsonb,date,text,text,text,text,integer,integer,integer,jsonb);
CREATE OR REPLACE FUNCTION public.sc_guardar_informe(
  p_codigo text, p_establecimiento jsonb, p_fecha date, p_html text,
  p_local_id text DEFAULT NULL, p_numero_acta text DEFAULT NULL,
  p_nivel_cumplimiento text DEFAULT NULL, p_aspectos_evaluados integer DEFAULT NULL,
  p_aspectos_total integer DEFAULT NULL, p_porcentaje_cumplimiento integer DEFAULT NULL,
  p_estado_estructurado jsonb DEFAULT NULL, p_fotos_urls jsonb DEFAULT NULL
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

  IF p_fotos_urls IS NOT NULL AND jsonb_typeof(p_fotos_urls) <> 'array' THEN
    RAISE EXCEPTION 'fotos_urls debe ser un array jsonb';
  END IF;

  INSERT INTO public.sc_informes(
    tecnico_id, local_id, establecimiento, fecha, numero_acta, informe_html,
    nivel_cumplimiento, aspectos_evaluados, aspectos_total, porcentaje_cumplimiento,
    estado_parcial, estado_parcial_actualizado_en,
    estado_estructurado, estado_estructurado_actualizado_en,
    fotos_urls
  )
  VALUES (
    v_actor.id, p_local_id, COALESCE(p_establecimiento, '{}'::jsonb), p_fecha,
    p_numero_acta, public.sc_sanitizar_html(p_html), p_nivel_cumplimiento,
    p_aspectos_evaluados, p_aspectos_total, p_porcentaje_cumplimiento,
    NULL, NULL,
    p_estado_estructurado, CASE WHEN p_estado_estructurado IS NOT NULL THEN now() END,
    COALESCE(p_fotos_urls, '[]'::jsonb)
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
    fotos_urls = CASE WHEN p_fotos_urls IS NOT NULL THEN EXCLUDED.fotos_urls ELSE public.sc_informes.fotos_urls END,
    actualizado_en = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

DROP FUNCTION IF EXISTS public.sc_guardar_admin_informe(uuid,text,text,text,text,integer,integer,integer,jsonb);
CREATE OR REPLACE FUNCTION public.sc_guardar_admin_informe(
  p_id uuid,
  p_codigo text,
  p_html text,
  p_numero_acta text DEFAULT NULL,
  p_nivel_cumplimiento text DEFAULT NULL,
  p_aspectos_evaluados integer DEFAULT NULL,
  p_aspectos_total integer DEFAULT NULL,
  p_porcentaje_cumplimiento integer DEFAULT NULL,
  p_estado_estructurado jsonb DEFAULT NULL,
  p_fotos_urls jsonb DEFAULT NULL
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

  IF p_fotos_urls IS NOT NULL AND jsonb_typeof(p_fotos_urls) <> 'array' THEN
    RAISE EXCEPTION 'fotos_urls debe ser un array jsonb';
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
         fotos_urls = COALESCE(p_fotos_urls, fotos_urls),
         actualizado_en = now()
   WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Informe no encontrado';
  END IF;

  RETURN p_id;
END;
$function$;

DROP FUNCTION IF EXISTS public.sc_update_informe(uuid, text, text);
CREATE OR REPLACE FUNCTION public.sc_update_informe(
  p_id uuid, p_codigo text, p_html text, p_fotos_urls jsonb DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := sc_resolver_actor(p_codigo);
  IF p_fotos_urls IS NOT NULL AND jsonb_typeof(p_fotos_urls) <> 'array' THEN
    RAISE EXCEPTION 'fotos_urls debe ser un array jsonb';
  END IF;
  UPDATE sc_informes SET
    informe_html = sc_sanitizar_html(p_html),
    fotos_urls = COALESCE(p_fotos_urls, fotos_urls)
  WHERE id = p_id AND tecnico_id = v_actor.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
  RETURN true;
END; $function$;

DROP FUNCTION IF EXISTS public.sc_update_admin_informe(uuid, text, text);
CREATE OR REPLACE FUNCTION public.sc_update_admin_informe(
  p_id uuid, p_codigo text, p_html text, p_fotos_urls jsonb DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := sc_resolver_actor(p_codigo);
  IF v_actor.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
  IF p_fotos_urls IS NOT NULL AND jsonb_typeof(p_fotos_urls) <> 'array' THEN
    RAISE EXCEPTION 'fotos_urls debe ser un array jsonb';
  END IF;
  UPDATE sc_informes SET
    informe_html = sc_sanitizar_html(p_html),
    fotos_urls = COALESCE(p_fotos_urls, fotos_urls)
  WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
  RETURN true;
END; $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- RPCs de lectura — agregan fotos_urls a la salida
-- (RETURNS TABLE no admite cambiar columnas con CREATE OR REPLACE: dropear.)
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.sc_get_informe(uuid, text);
CREATE OR REPLACE FUNCTION public.sc_get_informe(p_id uuid, p_codigo text)
RETURNS TABLE(id uuid, local_id text, establecimiento jsonb, fecha date, numero_acta text, informe_html text,
              nivel_cumplimiento text, aspectos_evaluados integer, aspectos_total integer,
              porcentaje_cumplimiento integer, creado_en timestamptz, actualizado_en timestamptz,
              estado_estructurado jsonb, estado_estructurado_actualizado_en timestamptz, fotos_urls jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := public.sc_resolver_actor(p_codigo);
  RETURN QUERY SELECT i.id, i.local_id, i.establecimiento, i.fecha, i.numero_acta, i.informe_html,
      i.nivel_cumplimiento, i.aspectos_evaluados, i.aspectos_total, i.porcentaje_cumplimiento,
      i.creado_en, i.actualizado_en, i.estado_estructurado, i.estado_estructurado_actualizado_en, i.fotos_urls
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
              actualizado_en timestamptz, estado_estructurado jsonb, estado_estructurado_actualizado_en timestamptz,
              fotos_urls jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := public.sc_resolver_actor(p_codigo);
  IF v_actor.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
  RETURN QUERY SELECT i.id, i.local_id, i.tecnico_id, u.nombre, i.establecimiento, i.fecha, i.numero_acta,
      i.informe_html, i.nivel_cumplimiento, i.aspectos_evaluados, i.aspectos_total,
      i.porcentaje_cumplimiento, i.creado_en, i.actualizado_en,
      i.estado_estructurado, i.estado_estructurado_actualizado_en, i.fotos_urls
    FROM public.sc_informes i
    JOIN public.sc_usuarios u ON u.id = i.tecnico_id
   WHERE i.id = p_id
     AND i.estado_parcial IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
END;
$function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Grants
-- ═══════════════════════════════════════════════════════════════════════════

REVOKE ALL ON FUNCTION public.sc_guardar_informe(text,jsonb,date,text,text,text,text,integer,integer,integer,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_guardar_informe(text,jsonb,date,text,text,text,text,integer,integer,integer,jsonb,jsonb) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.sc_guardar_admin_informe(uuid,text,text,text,text,integer,integer,integer,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_guardar_admin_informe(uuid,text,text,text,text,integer,integer,integer,jsonb,jsonb) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.sc_update_informe(uuid,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_update_informe(uuid,text,text,jsonb) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.sc_update_admin_informe(uuid,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_update_admin_informe(uuid,text,text,jsonb) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.sc_get_informe(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_get_informe(uuid,text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.sc_get_admin_informe(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_get_admin_informe(uuid,text) TO anon, authenticated;
