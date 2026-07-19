-- migration_invima_config_tables.sql — INVIMA config por establecimiento
-- Idempotente · RLS sanicheck_can_access_establecimiento

CREATE TABLE IF NOT EXISTS public.invima_config (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establecimiento_id  uuid NOT NULL REFERENCES public.establecimientos(id) ON DELETE CASCADE,
  categoria_id        varchar(16) NOT NULL,
  item_id             varchar(32) NOT NULL,
  codigo              varchar(16) NOT NULL,
  nombre              text NOT NULL,
  normativa           varchar(255),
  peso                numeric(5,2) DEFAULT 1,
  custom              boolean NOT NULL DEFAULT false,
  estado              varchar(16) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  creado_por          varchar(64),
  fecha_creacion      timestamptz NOT NULL DEFAULT now(),
  fecha_actualizacion timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS invima_config_est_codigo_unique
  ON public.invima_config (establecimiento_id, codigo);

CREATE INDEX IF NOT EXISTS invima_config_est_categoria_idx
  ON public.invima_config (establecimiento_id, categoria_id);

CREATE INDEX IF NOT EXISTS invima_config_est_item_idx
  ON public.invima_config (establecimiento_id, item_id);

COMMENT ON TABLE public.invima_config IS
  'Checklist INVIMA personalizable: ítems base (custom=false) + custom por establecimiento.';

ALTER TABLE public.invima_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invima_config_select ON public.invima_config;
DROP POLICY IF EXISTS invima_config_insert ON public.invima_config;
DROP POLICY IF EXISTS invima_config_update ON public.invima_config;
DROP POLICY IF EXISTS invima_config_delete ON public.invima_config;

CREATE POLICY invima_config_select ON public.invima_config
  FOR SELECT TO anon, authenticated
  USING (public.sanicheck_can_access_establecimiento(establecimiento_id));

CREATE POLICY invima_config_insert ON public.invima_config
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.sanicheck_can_access_establecimiento(establecimiento_id));

CREATE POLICY invima_config_update ON public.invima_config
  FOR UPDATE TO anon, authenticated
  USING (public.sanicheck_can_access_establecimiento(establecimiento_id))
  WITH CHECK (public.sanicheck_can_access_establecimiento(establecimiento_id));

CREATE POLICY invima_config_delete ON public.invima_config
  FOR DELETE TO anon, authenticated
  USING (public.sanicheck_can_access_establecimiento(establecimiento_id));
