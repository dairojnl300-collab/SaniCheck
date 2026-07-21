/**
 * SaniCheck — config pública Portal Cliente (Supabase)
 * La anon key vive en portal-config.secrets.js (gitignored, generado desde .env).
 * NUNCA pongas service_role aquí.
 */
window.SANICHECK_PORTAL_CONFIG = {
  SUPABASE_URL: 'https://hhhyhjidbjpivdnbsyzc.supabase.co',
  SUPABASE_ANON_KEY: '',
};

(function applyPortalSecrets() {
  const s = window.SANICHECK_PORTAL_SECRETS;
  if (!s) return;
  if (s.SUPABASE_URL) window.SANICHECK_PORTAL_CONFIG.SUPABASE_URL = s.SUPABASE_URL;
  if (s.SUPABASE_ANON_KEY) window.SANICHECK_PORTAL_CONFIG.SUPABASE_ANON_KEY = s.SUPABASE_ANON_KEY;
})();
