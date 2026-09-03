-- migration_sc_informes_fotos_storage_hardening.sql
-- Endurece lo que dejó abierto migration_sc_informes_fotos_storage.sql
-- (ya aplicada en producción; NO se edita ese archivo, se corrige aquí).
--
-- Aplicar después de migration_sc_informes_fotos_storage.sql.
--
-- Cubre dos hallazgos confirmados en la auditoría del PR de fotos → Storage:
--   1. El bucket sc-informes-fotos aceptaba UPDATE y DELETE de anon/authenticated.
--   2. fotos_urls podía quedar pisado con [] al guardar desde otro dispositivo.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Bucket sc-informes-fotos — cerrar escritura destructiva
-- ═══════════════════════════════════════════════════════════════════════════
--
-- El flujo real de la app solo hace INSERT (app/js/logic/fotos-storage.js,
-- _subirAhora) y SELECT (descargarFotoBlob + la hidratación del visor en
-- app/js/sc-informes-ui.js). No existe ningún caller de UPDATE ni de DELETE de
-- fotos en el cliente, así que esas dos policies solo aportaban superficie:
-- con la anon key (pública por diseño en esta app) cualquiera podía sustituir
-- o borrar la evidencia fotográfica de un acta ya firmada conociendo su path.
--
-- Se eliminan. Si en el futuro hace falta borrar o reemplazar una foto
-- (p. ej. limpiar huérfanas cuando el técnico elimina una foto local), NO se
-- deben recrear estas policies: debe hacerse vía una RPC SECURITY DEFINER que
-- valide p_codigo con sc_resolver_actor(), igual que el resto de las sc_*, y
-- que borre el objeto server-side.
--
-- Lo que queda abierto y es una limitación conocida, no un descuido: SELECT e
-- INSERT siguen siendo accesibles a anon/authenticated sin filtro por técnico,
-- porque SaniCheck no usa Supabase Auth/JWT (auth.uid() es siempre NULL) ni
-- Edge Functions, así que no hay identidad evaluable dentro de storage.objects.
-- El bucket es privado y los paths llevan UUID real
-- ({tecnico_id}/{informe_id}/{crypto.randomUUID()}.jpg), lo que los hace no
-- adivinables; ya no son 'foto-' + Date.now(). Sigue siendo cierto que quien
-- conozca un path exacto y tenga la anon key puede LEER esa foto — eso NO es
-- equivalente a llamar una RPC sc_* sin código válido (esas responden 'Código
-- de acceso inválido'). Riesgo aceptado y acotado a lectura.

DROP POLICY IF EXISTS sc_informes_fotos_update ON storage.objects;
DROP POLICY IF EXISTS sc_informes_fotos_delete ON storage.objects;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. fotos_urls: un array vacío no debe borrar los paths ya guardados
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Antes: NULL no tocaba, pero [] sí pisaba. El cliente manda
-- fotosUrls: _recolectarFotosUrls(inspeccion) siempre, y esa lista sale del
-- estado LOCAL del dispositivo: al continuar un acta en otro equipo (o en uno
-- donde el estado local todavía no tiene las fotos) llegaba [] y vaciaba la
-- columna, dejando el acta sin fotos para siempre.
--
-- Ahora, en las cuatro RPCs de escritura:
--   NULL          → no toca fotos_urls
--   []            → no toca fotos_urls (no hay evidencia de que el cliente
--                   quiera vaciar; para eso haría falta una RPC explícita)
--   array no vacío → reemplaza
--
-- Solo cambia el CUERPO de las funciones, no su firma de parámetros: por eso
-- basta CREATE OR REPLACE y NO hace falta DROP FUNCTION antes (mismo gotcha
-- documentado al revés en migration_sc_informes_continuidad.sql, donde sí se
-- agregaban parámetros). Al no dropear, los GRANT existentes se conservan.

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
    -- NULL y [] no tocan; solo un array con elementos reemplaza.
    fotos_urls = CASE
      WHEN p_fotos_urls IS NOT NULL AND jsonb_array_length(p_fotos_urls) > 0
        THEN EXCLUDED.fotos_urls
      ELSE public.sc_informes.fotos_urls
    END,
    actualizado_en = now()
  RETURNING id INTO v_id;

  RETURN v_id;
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
         fotos_urls = CASE
           WHEN p_fotos_urls IS NOT NULL AND jsonb_array_length(p_fotos_urls) > 0
             THEN p_fotos_urls
           ELSE fotos_urls
         END,
         actualizado_en = now()
   WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Informe no encontrado';
  END IF;

  RETURN p_id;
END;
$function$;

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
    fotos_urls = CASE
      WHEN p_fotos_urls IS NOT NULL AND jsonb_array_length(p_fotos_urls) > 0
        THEN p_fotos_urls
      ELSE fotos_urls
    END
  WHERE id = p_id AND tecnico_id = v_actor.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
  RETURN true;
END; $function$;

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
    fotos_urls = CASE
      WHEN p_fotos_urls IS NOT NULL AND jsonb_array_length(p_fotos_urls) > 0
        THEN p_fotos_urls
      ELSE fotos_urls
    END
  WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
  RETURN true;
END; $function$;
