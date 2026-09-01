/**
 * sc-informes-config.secrets.js — SÍ se commitea (decisión 2026-09-01, Dairo).
 * Cloudflare Pages sirve este repo como deploy estático puro (sin build
 * command), así que un archivo gitignored nunca llega a producción — no hay
 * paso de servidor que lo genere desde variables de entorno. La anon key es
 * pública por diseño de Supabase (RLS + RPCs SECURITY DEFINER la protegen,
 * NUNCA la service_role key aquí). Regenerar con:
 * node scripts/generate-sc-informes-config-secrets.js
 */
window.SC_INFORMES_SECRETS = {
  SUPABASE_URL: "https://isncjtomlvxyvcaohcpx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzbmNqdG9tbHZ4eXZjYW9oY3B4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMDIxNjUsImV4cCI6MjA5ODg3ODE2NX0.sBLX06udmLUc2-aAjp7hwIAuTGANwn0mG7enkMG9Rwo",
};
