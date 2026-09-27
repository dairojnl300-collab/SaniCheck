-- Revisión y subida del cliente fuera de `detalle`, que puede ser reemplazado
-- durante la sincronización offline del técnico. Proyecto: isncjtomlvxyvcaohcpx.
ALTER TABLE public.sc_hallazgos_estado
  ADD COLUMN IF NOT EXISTS cliente_subio_en timestamptz,
  ADD COLUMN IF NOT EXISTS revision_estado text,
  ADD COLUMN IF NOT EXISTS revision_observacion text,
  ADD COLUMN IF NOT EXISTS revision_en timestamptz,
  ADD COLUMN IF NOT EXISTS revision_vista_cliente_en timestamptz;

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.sc_hallazgos_estado'::regclass AND conname='sc_hallazgos_revision_estado_check') THEN
    ALTER TABLE public.sc_hallazgos_estado ADD CONSTRAINT sc_hallazgos_revision_estado_check
      CHECK (revision_estado IS NULL OR revision_estado IN ('cumple','ajustes_solicitados'));
  END IF;
END;
$migration$;

UPDATE public.sc_hallazgos_estado h
   SET cliente_subio_en=coalesce(h.cliente_subio_en,CASE WHEN coalesce(h.detalle->>'foto_subida_en','') ~ '^\d{4}-\d{2}-\d{2}[T ]' THEN (h.detalle->>'foto_subida_en')::timestamptz END),
       revision_estado=coalesce(h.revision_estado,CASE WHEN h.detalle #>> '{revision,estado}' IN ('cumple','ajustes_solicitados') THEN h.detalle #>> '{revision,estado}' END),
       revision_observacion=coalesce(h.revision_observacion,h.detalle #>> '{revision,observacion}'),
       revision_en=coalesce(h.revision_en,CASE WHEN coalesce(h.detalle #>> '{revision,revisado_en}','') ~ '^\d{4}-\d{2}-\d{2}[T ]' THEN (h.detalle #>> '{revision,revisado_en}')::timestamptz END)
 WHERE h.cliente_subio_en IS NULL OR h.revision_estado IS NULL OR h.revision_observacion IS NULL OR h.revision_en IS NULL;

CREATE INDEX IF NOT EXISTS sc_hallazgos_estado_revision_pendiente_idx
  ON public.sc_hallazgos_estado(informe_id,revision_en) WHERE revision_en IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sc_portal_actualizar_hallazgo(
  p_codigo_portal text,p_hallazgo_id uuid,p_estado text,p_foto_url text,p_ip_cliente text,p_gate text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $function$
DECLARE
  v_codigo text:=upper(trim(coalesce(p_codigo_portal,'')));
  v_ip text:=left(coalesce(nullif(btrim(p_ip_cliente),''),public.sc_client_ip()),64);
  v_informe_id uuid;
  v_hallazgo_informe_id uuid;
  v_ahora timestamptz:=now();
BEGIN
  IF NOT public.sc_portal_gate_ok(p_gate) THEN RETURN jsonb_build_object('ok',false,'error','no_autorizado'); END IF;
  BEGIN PERFORM public.sc_auth_verificar_bloqueo('portal_escritura',v_ip);
  EXCEPTION WHEN OTHERS THEN IF SQLSTATE LIKE '42%' OR SQLSTATE LIKE '08%' OR SQLSTATE LIKE '58%' THEN RAISE; END IF; RETURN jsonb_build_object('ok',false,'error','bloqueado'); END;
  IF p_estado IS DISTINCT FROM 'En corrección' THEN PERFORM public.sc_auth_registrar_fallo('portal_escritura',v_ip); RETURN jsonb_build_object('ok',false,'error','estado_no_permitido'); END IF;
  SELECT id INTO v_informe_id FROM public.sc_informes WHERE codigo_portal=v_codigo;
  IF v_informe_id IS NULL THEN PERFORM public.sc_auth_registrar_fallo('portal_escritura',v_ip); RETURN jsonb_build_object('ok',false,'error','codigo_invalido'); END IF;
  SELECT informe_id INTO v_hallazgo_informe_id FROM public.sc_hallazgos_estado WHERE id=p_hallazgo_id;
  IF v_hallazgo_informe_id IS DISTINCT FROM v_informe_id THEN PERFORM public.sc_auth_registrar_fallo('portal_escritura',v_ip); RETURN jsonb_build_object('ok',false,'error','hallazgo_no_encontrado'); END IF;
  UPDATE public.sc_hallazgos_estado SET estado='En corrección',foto_url=coalesce(p_foto_url,foto_url),
    cliente_subio_en=CASE WHEN p_foto_url IS NOT NULL THEN v_ahora ELSE cliente_subio_en END,
    detalle=CASE WHEN p_foto_url IS NOT NULL THEN jsonb_set(coalesce(detalle,'{}'::jsonb),'{foto_subida_en}',to_jsonb(v_ahora),true) ELSE detalle END,
    actualizado_en=v_ahora WHERE id=p_hallazgo_id AND estado IN ('Pendiente','En corrección');
  IF NOT FOUND THEN PERFORM public.sc_auth_registrar_fallo('portal_escritura',v_ip); RETURN jsonb_build_object('ok',false,'error','hallazgo_no_pendiente'); END IF;
  RETURN jsonb_build_object('ok',true,'hallazgo_id',p_hallazgo_id,'estado','En corrección');
END; $function$;
REVOKE ALL ON FUNCTION public.sc_portal_actualizar_hallazgo(text,uuid,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sc_portal_actualizar_hallazgo(text,uuid,text,text,text,text) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.sc_admin_revisar_hallazgo(
  p_informe_id uuid,p_aspecto_id text,p_codigo text,p_estado text,p_observacion text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $function$
DECLARE
  v_actor public.sc_usuarios;
  v_total integer; v_verificados integer; v_porcentaje integer; v_nivel text; v_ahora timestamptz:=now();
BEGIN
  v_actor:=public.sc_resolver_actor(p_codigo);
  IF v_actor.rol NOT IN ('admin','tecnico') THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
  IF v_actor.rol='tecnico' AND NOT EXISTS(SELECT 1 FROM public.sc_informes WHERE id=p_informe_id AND tecnico_id=v_actor.id) THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
  IF p_estado NOT IN ('cumple','ajustes_solicitados') THEN RAISE EXCEPTION 'Estado de revisión inválido'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.sc_hallazgos_estado WHERE informe_id=p_informe_id AND aspecto_id=p_aspecto_id) THEN RAISE EXCEPTION 'Hallazgo no encontrado'; END IF;
  IF p_estado='cumple' AND NOT EXISTS(SELECT 1 FROM public.sc_hallazgos_estado WHERE informe_id=p_informe_id AND aspecto_id=p_aspecto_id AND foto_url IS NOT NULL) THEN RAISE EXCEPTION 'Se requiere evidencia'; END IF;
  UPDATE public.sc_hallazgos_estado h SET estado=CASE WHEN p_estado='cumple' THEN 'Verificado' ELSE 'En corrección' END,
    actualizado_en=v_ahora,revision_estado=p_estado,revision_observacion=nullif(left(coalesce(p_observacion,''),1000),''),revision_en=v_ahora,
    detalle=jsonb_set(coalesce(h.detalle,'{}'::jsonb),'{revision}',jsonb_build_object('estado',p_estado,'observacion',p_observacion,'revisado_por',v_actor.id,'revisado_en',v_ahora),true)
    WHERE h.informe_id=p_informe_id AND h.aspecto_id=p_aspecto_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
  SELECT count(*),count(*) FILTER(WHERE estado='Verificado') INTO v_total,v_verificados FROM public.sc_hallazgos_estado WHERE informe_id=p_informe_id;
  v_porcentaje:=CASE WHEN v_total=0 THEN 0 ELSE round(v_verificados*100.0/v_total)::integer END;
  v_nivel:=CASE WHEN v_porcentaje>=80 THEN 'BUENO' WHEN v_porcentaje>=60 THEN 'REGULAR' ELSE 'DEFICIENTE' END;
  UPDATE public.sc_informes SET porcentaje_cumplimiento=v_porcentaje,nivel_cumplimiento=v_nivel,aspectos_evaluados=v_total,actualizado_en=v_ahora WHERE id=p_informe_id;
  RETURN true;
END; $function$;
GRANT EXECUTE ON FUNCTION public.sc_admin_revisar_hallazgo(uuid,text,text,text,text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.sc_push_pendientes_para_tecnico(p_tecnico_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $function$
  WITH pendientes AS (
    SELECT h.informe_id,h.aspecto_id FROM public.sc_hallazgos_estado h JOIN public.sc_informes i ON i.id=h.informe_id
    WHERE i.tecnico_id=p_tecnico_id AND h.foto_url IS NOT NULL AND h.estado IS DISTINCT FROM 'Verificado'
      AND (h.revision_en IS NULL OR h.cliente_subio_en>h.revision_en)
  ), agrupados AS (
    SELECT informe_id,count(*)::integer AS pendientes,coalesce(jsonb_agg(DISTINCT aspecto_id) FILTER(WHERE aspecto_id IS NOT NULL),'[]'::jsonb) AS aspectos
    FROM pendientes GROUP BY informe_id
  )
  SELECT jsonb_build_object('informes',coalesce(jsonb_agg(jsonb_build_object('informe_id',informe_id,'pendientes',pendientes,'aspectos',aspectos) ORDER BY informe_id),'[]'::jsonb),'total',coalesce(sum(pendientes),0)::integer) FROM agrupados;
$function$;

-- sc_push_pendientes(text) y sc_push_pendientes_tecnico(uuid) delegan aquí.

-- Añadir campos de revisión y el badge al RPC existente sin reescribir su
-- cálculo de programas, evaluación ni la validación código/gate/rate-limit.
DO $migration$
DECLARE v_def text; v_original text;
BEGIN
  SELECT pg_get_functiondef('public.sc_portal_get_estado(text,text,text)'::regprocedure) INTO v_def;
  v_original:=v_def;
  IF position('  v_items jsonb;' in v_def)=0 THEN RAISE EXCEPTION 'Firma local inesperada de sc_portal_get_estado (declaración)'; END IF;
  v_def:=replace(v_def,'  v_items jsonb;','  v_items jsonb;'||chr(10)||'  v_badge_cliente integer;');
  IF position('''foto_url'', h.foto_url, ''actualizado_en'', h.actualizado_en' in v_def)=0 THEN RAISE EXCEPTION 'Firma local inesperada de sc_portal_get_estado (hallazgos)'; END IF;
  v_def:=replace(v_def,'''foto_url'', h.foto_url, ''actualizado_en'', h.actualizado_en',
    '''foto_url'', h.foto_url, ''actualizado_en'', h.actualizado_en, ''cliente_subio_en'', h.cliente_subio_en, ''revision_estado'', h.revision_estado, ''revision_observacion'', h.revision_observacion, ''revision_en'', h.revision_en, ''revision_vista_cliente_en'', h.revision_vista_cliente_en');
  IF position('    ''hallazgos'', v_hallazgos' in v_def)=0 THEN RAISE EXCEPTION 'Firma local inesperada de sc_portal_get_estado (retorno)'; END IF;
  v_def:=replace(v_def,'  RETURN jsonb_build_object(',
    '  SELECT count(*)::integer INTO v_badge_cliente FROM public.sc_hallazgos_estado h WHERE h.informe_id=v_informe.id AND h.revision_en IS NOT NULL AND (h.revision_vista_cliente_en IS NULL OR h.revision_vista_cliente_en<h.revision_en);'||chr(10)||'  RETURN jsonb_build_object(');
  v_def:=replace(v_def,'''hallazgos'', v_hallazgos','''hallazgos'', v_hallazgos, ''revision_pendientes'', v_badge_cliente');
  IF v_def=v_original THEN RAISE EXCEPTION 'No se aplicaron cambios al RPC sc_portal_get_estado'; END IF;
  EXECUTE v_def;
END;
$migration$;
