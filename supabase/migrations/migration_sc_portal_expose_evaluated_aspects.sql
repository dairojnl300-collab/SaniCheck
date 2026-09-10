-- El portal usa las mismas tarjetas evaluadas que el detalle del PDF.
-- Los hallazgos materializados se mezclan por aspecto_id para conservar
-- únicamente los controles de evidencia autorizados al cliente.
CREATE OR REPLACE FUNCTION public.sc_portal_get_estado(p_codigo_portal text,p_ip_cliente text,p_gate text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_codigo text:=upper(trim(coalesce(p_codigo_portal,''))); v_ip text:=left(coalesce(nullif(btrim(p_ip_cliente),''),sc_client_ip()),64); v_informe sc_informes%rowtype; v_hallazgos jsonb; v_aspectos jsonb;
BEGIN
 IF NOT sc_portal_gate_ok(p_gate) THEN RETURN jsonb_build_object('ok',false,'error','no_autorizado'); END IF;
 BEGIN PERFORM sc_auth_verificar_bloqueo('portal_lectura',v_ip); EXCEPTION WHEN OTHERS THEN IF sqlstate LIKE '42%' OR sqlstate LIKE '08%' OR sqlstate LIKE '58%' THEN RAISE; END IF; RETURN jsonb_build_object('ok',false,'error','bloqueado'); END;
 IF v_codigo='' THEN PERFORM sc_auth_registrar_fallo('portal_lectura',v_ip); RETURN jsonb_build_object('ok',false,'error','codigo_invalido'); END IF;
 SELECT * INTO v_informe FROM sc_informes WHERE codigo_portal=v_codigo;
 IF NOT FOUND THEN PERFORM sc_auth_registrar_fallo('portal_lectura',v_ip); RETURN jsonb_build_object('ok',false,'error','codigo_invalido'); END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',h.id,'aspecto_id',h.aspecto_id,'orden',h.orden,'hallazgo',h.hallazgo,'detalle',h.detalle,'estado',h.estado,'foto_url',h.foto_url,'actualizado_en',h.actualizado_en) ORDER BY h.orden NULLS LAST,h.actualizado_en,h.id),'[]'::jsonb) INTO v_hallazgos FROM sc_hallazgos_estado h WHERE h.informe_id=v_informe.id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('aspecto_id',a->>'id','programa_nombre',p->>'nombre','texto',a->>'texto','norma',a->>'norma','evaluacion',a->>'evaluacion','criterio',a->>'criterio','hallazgo',a->>'hallazgo','accion',a->>'accion','estado',a->>'estado','plazo',a->>'plazo') ORDER BY p->>'nombre',a->>'id'),'[]'::jsonb) INTO v_aspectos FROM jsonb_array_elements(coalesce(v_informe.estado_estructurado->'inspeccion'->'programas','[]'::jsonb)) p CROSS JOIN LATERAL jsonb_array_elements(coalesce(p->'aspectos','[]'::jsonb)) a WHERE coalesce(a->>'evaluacion',a->>'criterio','') <> '';
 RETURN jsonb_build_object('ok',true,'informe_id',v_informe.id,'numero_acta',v_informe.numero_acta,'fecha',v_informe.fecha,'establecimiento_nombre',v_informe.establecimiento_nombre,'nivel_cumplimiento',v_informe.nivel_cumplimiento,'porcentaje_cumplimiento',v_informe.porcentaje_cumplimiento,'informe_html',v_informe.informe_html,'aspectos',v_aspectos,'hallazgos',v_hallazgos);
END; $$;
