-- migration_invima_perfil_rapido.sql — flag en_perfil_rapido en invima_config
ALTER TABLE public.invima_config
  ADD COLUMN IF NOT EXISTS en_perfil_rapido boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS invima_config_est_perfil_idx
  ON public.invima_config (establecimiento_id, en_perfil_rapido)
  WHERE en_perfil_rapido = true;

COMMENT ON COLUMN public.invima_config.en_perfil_rapido IS
  'true = ítem incluido en Perfil Sanitario Inicial (triage rápido) del establecimiento';
