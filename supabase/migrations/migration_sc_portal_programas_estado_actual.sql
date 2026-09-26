CREATE OR REPLACE FUNCTION public.sc_portal_get_estado(p_codigo_portal text, p_ip_cliente text, p_gate text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_codigo text := upper(trim(coalesce(p_codigo_portal, '')));
  v_ip text := left(coalesce(nullif(btrim(p_ip_cliente), ''), sc_client_ip()), 64);
  v_informe sc_informes%rowtype;
  v_hallazgos jsonb;
  v_aspectos jsonb;
  v_programas jsonb;
  v_items jsonb;
BEGIN
  IF NOT sc_portal_gate_ok(p_gate) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_autorizado');
  END IF;

  BEGIN
    PERFORM sc_auth_verificar_bloqueo('portal_lectura', v_ip);
  EXCEPTION WHEN OTHERS THEN
    IF sqlstate LIKE '42%' OR sqlstate LIKE '08%' OR sqlstate LIKE '58%' THEN RAISE; END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'bloqueado');
  END;

  IF v_codigo = '' THEN
    PERFORM sc_auth_registrar_fallo('portal_lectura', v_ip);
    RETURN jsonb_build_object('ok', false, 'error', 'codigo_invalido');
  END IF;

  SELECT * INTO v_informe FROM sc_informes WHERE codigo_portal = v_codigo;
  IF NOT FOUND THEN
    PERFORM sc_auth_registrar_fallo('portal_lectura', v_ip);
    RETURN jsonb_build_object('ok', false, 'error', 'codigo_invalido');
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', h.id, 'aspecto_id', h.aspecto_id, 'orden', h.orden,
    'hallazgo', h.hallazgo, 'detalle', h.detalle, 'estado', h.estado,
    'foto_url', h.foto_url, 'actualizado_en', h.actualizado_en
  ) ORDER BY h.orden NULLS LAST, h.actualizado_en, h.id), '[]'::jsonb)
  INTO v_hallazgos
  FROM sc_hallazgos_estado h
  WHERE h.informe_id = v_informe.id;

  WITH programa_items AS (
    SELECT p->>'nombre' AS programa_nombre,
           a AS dato,
           coalesce(a->>'id', '') AS aspecto_id,
           upper(coalesce(a->>'evaluacion', a->>'criterio', '')) AS evaluacion_original
    FROM jsonb_array_elements(coalesce(v_informe.estado_estructurado->'inspeccion'->'programas', '[]'::jsonb)) p
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(p->'aspectos', '[]'::jsonb)) a
    UNION ALL
    SELECT p->>'nombre', x,
           coalesce(x->>'id', coalesce(a->>'id', '') || '-extra-' || extra.ord::text),
           upper(coalesce(x->>'evaluacion', x->>'criterio', ''))
    FROM jsonb_array_elements(coalesce(v_informe.estado_estructurado->'inspeccion'->'programas', '[]'::jsonb)) p
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(p->'aspectos', '[]'::jsonb)) a
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(a->'criterios_extra', '[]'::jsonb)) WITH ORDINALITY AS extra(x, ord)
  ), con_estado AS (
    SELECT pi.*,
           CASE h.estado
             WHEN 'Verificado' THEN 'A'
             WHEN 'En corrección' THEN 'I'
             ELSE pi.evaluacion_original
           END AS evaluacion_actual,
           h.estado AS estado_hallazgo
    FROM programa_items pi
    LEFT JOIN LATERAL (
      SELECT he.estado
      FROM sc_hallazgos_estado he
      WHERE he.informe_id = v_informe.id AND he.aspecto_id = pi.aspecto_id
      ORDER BY he.actualizado_en DESC NULLS LAST, he.id DESC
      LIMIT 1
    ) h ON true
  )
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'programa_nombre', programa_nombre,
      'aspecto_id', aspecto_id,
      'texto', coalesce(dato->>'texto', dato->>'titulo', 'Aspecto adicional'),
      'norma', dato->>'norma',
      'evaluacion', evaluacion_actual,
      'criterio', evaluacion_actual,
      'hallazgo', dato->>'hallazgo',
      'accion', dato->>'accion',
      'estado', dato->>'estado',
      'plazo', dato->>'plazo'
    ) ORDER BY programa_nombre, aspecto_id
  ) FILTER (WHERE coalesce(evaluacion_actual, '') <> ''), '[]'::jsonb)
  INTO v_aspectos
  FROM con_estado;

  WITH programa_items AS (
    SELECT p->>'nombre' AS programa_nombre,
           coalesce(a->>'id', '') AS aspecto_id,
           upper(coalesce(a->>'evaluacion', a->>'criterio', '')) AS evaluacion_original
    FROM jsonb_array_elements(coalesce(v_informe.estado_estructurado->'inspeccion'->'programas', '[]'::jsonb)) p
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(p->'aspectos', '[]'::jsonb)) a
    UNION ALL
    SELECT p->>'nombre',
           coalesce(x->>'id', coalesce(a->>'id', '') || '-extra-' || extra.ord::text),
           upper(coalesce(x->>'evaluacion', x->>'criterio', ''))
    FROM jsonb_array_elements(coalesce(v_informe.estado_estructurado->'inspeccion'->'programas', '[]'::jsonb)) p
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(p->'aspectos', '[]'::jsonb)) a
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(a->'criterios_extra', '[]'::jsonb)) WITH ORDINALITY AS extra(x, ord)
  ), con_estado AS (
    SELECT pi.programa_nombre,
           CASE h.estado
             WHEN 'Verificado' THEN 'A'
             WHEN 'En corrección' THEN 'I'
             ELSE pi.evaluacion_original
           END AS evaluacion
    FROM programa_items pi
    LEFT JOIN LATERAL (
      SELECT he.estado
      FROM sc_hallazgos_estado he
      WHERE he.informe_id = v_informe.id AND he.aspecto_id = pi.aspecto_id
      ORDER BY he.actualizado_en DESC NULLS LAST, he.id DESC
      LIMIT 1
    ) h ON true
  ), conteos AS (
    SELECT programa_nombre,
           count(*)::int AS total,
           count(*) FILTER (WHERE evaluacion IN ('A', 'I', 'NA'))::int AS evaluados,
           count(*) FILTER (WHERE evaluacion = 'A')::int AS cumple,
           count(*) FILTER (WHERE evaluacion = 'I')::int AS incumple,
           count(*) FILTER (WHERE evaluacion = 'NA')::int AS na
    FROM con_estado
    GROUP BY programa_nombre
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'nombre', programa_nombre,
    'total', total,
    'evaluados', evaluados,
    'cumple', cumple,
    'incumple', incumple,
    'na', na,
    'porcentaje', CASE WHEN cumple + incumple = 0 THEN 0 ELSE round(cumple * 100.0 / (cumple + incumple))::int END,
    'nivel', CASE
      WHEN cumple + incumple > 0 AND round(cumple * 100.0 / (cumple + incumple)) >= 80 THEN 'BUENO'
      WHEN cumple + incumple > 0 AND round(cumple * 100.0 / (cumple + incumple)) >= 50 THEN 'REGULAR'
      ELSE 'DEFICIENTE'
    END
  ) ORDER BY programa_nombre), '[]'::jsonb)
  INTO v_programas
  FROM conteos;

  RETURN jsonb_build_object(
    'ok', true,
    'informe_id', v_informe.id,
    'numero_acta', v_informe.numero_acta,
    'fecha', v_informe.fecha,
    'establecimiento_nombre', v_informe.establecimiento_nombre,
    'nivel_cumplimiento', v_informe.nivel_cumplimiento,
    'porcentaje_cumplimiento', v_informe.porcentaje_cumplimiento,
    'informe_html', v_informe.informe_html,
    'programas', v_programas,
    'aspectos', v_aspectos,
    'hallazgos', v_hallazgos
  );
END;
$$;
