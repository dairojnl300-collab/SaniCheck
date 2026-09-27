-- Web Push subscriptions for the client Portal (project isncjtomlvxyvcaohcpx).
-- Access is server-only through the Portal Pages Functions.
CREATE TABLE IF NOT EXISTS public.sc_push_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  informe_id uuid NOT NULL REFERENCES public.sc_informes(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sc_push_clientes_endpoint_https CHECK (endpoint LIKE 'https://%'),
  CONSTRAINT sc_push_clientes_endpoint_length CHECK (length(endpoint) BETWEEN 1 AND 2048),
  CONSTRAINT sc_push_clientes_keys_length CHECK (
    length(p256dh) BETWEEN 20 AND 200 AND length(auth) BETWEEN 8 AND 100
  )
);

CREATE INDEX IF NOT EXISTS sc_push_clientes_informe_idx
  ON public.sc_push_clientes (informe_id);

ALTER TABLE public.sc_push_clientes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sc_push_clientes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sc_push_clientes TO service_role;
