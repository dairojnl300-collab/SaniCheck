-- migration_vencimientos_v2_tables.sql — SaniCheck Portal · hhhyhjidbjpivdnbsyzc
-- Tablas vencimientos + vencimientos_adjuntos con RLS por codigo_acceso
-- Idempotente.

-- Bucket vencimientos: 10 MB (ETAPA 1)
UPDATE storage.buckets
SET file_size_limit = 10485760,
    public = false,
    allowed_mime_types = ARRAY[
      'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/octet-stream'
    ]::text[]
WHERE id = 'vencimientos';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vencimientos', 'vencimientos', false, 10485760,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp','application/octet-stream']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public             = false,
  file_size_limit    = 10485760,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ═══════════════════════════════════════════════════════════════════════════
-- vencimientos
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.vencimientos (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establecimiento_id        uuid NOT NULL REFERENCES public.establecimientos(id) ON DELETE CASCADE,
  categoria               text NOT NULL CHECK (categoria IN ('personal', 'equipos', 'establecimiento')),
  tipo                    text NOT NULL CHECK (tipo IN (
    'manipulacion', 'medico', 'sst', 'calibracion', 'mantenimiento',
    'plagas', 'analisis_agua', 'custom'
  )),
  tipo_label              text,
  nombre                  text NOT NULL,
  fecha_emision           date,
  fecha_vencimiento       date NOT NULL,
  frecuencia              text CHECK (frecuencia IN ('anual', 'semestral', 'trimestral', 'custom')),
  proveedor               text,
  normativa               text,
  estado                  text NOT NULL DEFAULT 'vigente' CHECK (estado IN (
    'vigente', 'por_vencer_30', 'por_vencer_60', 'vencido'
  )),
  documento_storage_path  text,
  custom                  boolean NOT NULL DEFAULT false,
  creado_por              text,
  fecha_creacion          timestamptz NOT NULL DEFAULT now(),
  fecha_actualizacion     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vencimientos_est_estado_idx
  ON public.vencimientos (establecimiento_id, estado);

CREATE INDEX IF NOT EXISTS vencimientos_est_fecha_idx
  ON public.vencimientos (establecimiento_id, fecha_vencimiento);

CREATE UNIQUE INDEX IF NOT EXISTS vencimientos_est_tipo_unique_idx
  ON public.vencimientos (establecimiento_id, tipo)
  WHERE custom = false AND tipo <> 'custom';

COMMENT ON TABLE public.vencimientos IS
  'Documentos de vencimiento ETAPA 1 — CRUD completo con Storage privado.';

ALTER TABLE public.vencimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vencimientos_select ON public.vencimientos;
DROP POLICY IF EXISTS vencimientos_insert ON public.vencimientos;
DROP POLICY IF EXISTS vencimientos_update ON public.vencimientos;
DROP POLICY IF EXISTS vencimientos_delete ON public.vencimientos;

CREATE POLICY vencimientos_select ON public.vencimientos
  FOR SELECT TO anon, authenticated
  USING (public.sanicheck_can_access_establecimiento(establecimiento_id));

CREATE POLICY vencimientos_insert ON public.vencimientos
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.sanicheck_can_access_establecimiento(establecimiento_id));

CREATE POLICY vencimientos_update ON public.vencimientos
  FOR UPDATE TO anon, authenticated
  USING (public.sanicheck_can_access_establecimiento(establecimiento_id))
  WITH CHECK (public.sanicheck_can_access_establecimiento(establecimiento_id));

CREATE POLICY vencimientos_delete ON public.vencimientos
  FOR DELETE TO anon, authenticated
  USING (public.sanicheck_can_access_establecimiento(establecimiento_id));

-- ═══════════════════════════════════════════════════════════════════════════
-- vencimientos_adjuntos
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.vencimientos_adjuntos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vencimiento_id  uuid NOT NULL REFERENCES public.vencimientos(id) ON DELETE CASCADE,
  storage_path    text NOT NULL,
  nombre_archivo  text NOT NULL,
  tipo_mime       text,
  tamano_bytes    bigint,
  cargado_por     text,
  fecha_carga     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vencimientos_adjuntos_venc_idx
  ON public.vencimientos_adjuntos (vencimiento_id);

COMMENT ON TABLE public.vencimientos_adjuntos IS
  'Adjuntos Storage vinculados a vencimientos — RLS vía establecimiento del padre.';

ALTER TABLE public.vencimientos_adjuntos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vencimientos_adjuntos_select ON public.vencimientos_adjuntos;
DROP POLICY IF EXISTS vencimientos_adjuntos_insert ON public.vencimientos_adjuntos;
DROP POLICY IF EXISTS vencimientos_adjuntos_update ON public.vencimientos_adjuntos;
DROP POLICY IF EXISTS vencimientos_adjuntos_delete ON public.vencimientos_adjuntos;

CREATE POLICY vencimientos_adjuntos_select ON public.vencimientos_adjuntos
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vencimientos v
      WHERE v.id = vencimiento_id
        AND public.sanicheck_can_access_establecimiento(v.establecimiento_id)
    )
  );

CREATE POLICY vencimientos_adjuntos_insert ON public.vencimientos_adjuntos
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vencimientos v
      WHERE v.id = vencimiento_id
        AND public.sanicheck_can_access_establecimiento(v.establecimiento_id)
    )
  );

CREATE POLICY vencimientos_adjuntos_update ON public.vencimientos_adjuntos
  FOR UPDATE TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vencimientos v
      WHERE v.id = vencimiento_id
        AND public.sanicheck_can_access_establecimiento(v.establecimiento_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vencimientos v
      WHERE v.id = vencimiento_id
        AND public.sanicheck_can_access_establecimiento(v.establecimiento_id)
    )
  );

CREATE POLICY vencimientos_adjuntos_delete ON public.vencimientos_adjuntos
  FOR DELETE TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vencimientos v
      WHERE v.id = vencimiento_id
        AND public.sanicheck_can_access_establecimiento(v.establecimiento_id)
    )
  );

-- Recalcular estado server-side (trigger)
CREATE OR REPLACE FUNCTION public.vencimientos_calc_estado(p_fecha date)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_fecha IS NULL THEN 'vigente'
    WHEN p_fecha < current_date THEN 'vencido'
    WHEN p_fecha <= current_date + 30 THEN 'por_vencer_30'
    WHEN p_fecha <= current_date + 60 THEN 'por_vencer_60'
    ELSE 'vigente'
  END;
$$;

CREATE OR REPLACE FUNCTION public.vencimientos_set_estado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.estado := public.vencimientos_calc_estado(NEW.fecha_vencimiento);
  NEW.fecha_actualizacion := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vencimientos_estado_trg ON public.vencimientos;
CREATE TRIGGER vencimientos_estado_trg
  BEFORE INSERT OR UPDATE OF fecha_vencimiento ON public.vencimientos
  FOR EACH ROW EXECUTE FUNCTION public.vencimientos_set_estado();
