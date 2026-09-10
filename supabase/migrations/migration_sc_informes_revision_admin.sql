-- Revisión administrativa. Pendiente de aplicación; no ejecutar automáticamente.
DROP FUNCTION IF EXISTS public.sc_revisar_admin_informe(uuid, text, text);
DROP FUNCTION IF EXISTS public.sc_admin_revisar_hallazgo(uuid, text, text, text, text);
CREATE OR REPLACE FUNCTION public.sc_admin_revisar_hallazgo(p_informe_id uuid, p_aspecto_id text, p_codigo text, p_estado text, p_observacion text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := public.sc_resolver_actor(p_codigo);
  IF v_actor.rol NOT IN ('admin', 'tecnico') THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
  IF v_actor.rol = 'tecnico' AND NOT EXISTS (SELECT 1 FROM public.sc_informes WHERE id = p_informe_id AND tecnico_id = v_actor.id) THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
  IF p_estado NOT IN ('cumple', 'ajustes_solicitados') THEN RAISE EXCEPTION 'Estado de revisión inválido'; END IF;
  IF p_estado = 'cumple' AND NOT EXISTS (SELECT 1 FROM public.sc_hallazgos_estado WHERE informe_id=p_informe_id AND aspecto_id=p_aspecto_id AND foto_url IS NOT NULL) THEN RAISE EXCEPTION 'Se requiere evidencia'; END IF;
  UPDATE public.sc_hallazgos_estado h
     SET estado = CASE WHEN p_estado='cumple' THEN 'Verificado' ELSE 'En corrección' END,
         actualizado_en = now(),
         detalle = jsonb_set(COALESCE(h.detalle,'{}'::jsonb), '{revision}', jsonb_build_object('estado',p_estado,'observacion',p_observacion,'revisado_por',v_actor.id,'revisado_en',now()), true)
   WHERE h.informe_id = p_informe_id AND h.aspecto_id = p_aspecto_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
  RETURN true;
END; $function$;

GRANT EXECUTE ON FUNCTION public.sc_admin_revisar_hallazgo(uuid, text, text, text, text) TO anon, authenticated;
