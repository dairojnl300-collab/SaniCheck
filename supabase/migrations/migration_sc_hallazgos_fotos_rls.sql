-- Protege la tabla heredada de fotos de hallazgos.
-- SaniCheck no la usa actualmente; sin policies públicas el acceso queda bloqueado
-- hasta que exista un flujo autorizado explícito.
ALTER TABLE public.sc_hallazgos_fotos ENABLE ROW LEVEL SECURITY;
