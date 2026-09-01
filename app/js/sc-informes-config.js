/**
 * SaniCheck — config pública respaldo de informes (Supabase isncjtomlvxyvcaohcpx)
 * La anon key vive en sc-informes-config.secrets.js (gitignored, generado desde .env).
 * Proyecto DISTINTO al del Portal Cliente (hhhyhjidbjpivdnbsyzc) — este es el
 * proyecto compartido con ProyeCar, solo para identidad de técnico/admin y
 * respaldo de Actas. NUNCA pongas service_role aquí.
 */
window.SC_INFORMES_CONFIG = {
  SUPABASE_URL: 'https://isncjtomlvxyvcaohcpx.supabase.co',
  SUPABASE_ANON_KEY: '',
};

(function applyScInformesSecrets() {
  const s = window.SC_INFORMES_SECRETS;
  if (!s) return;
  if (s.SUPABASE_URL) window.SC_INFORMES_CONFIG.SUPABASE_URL = s.SUPABASE_URL;
  if (s.SUPABASE_ANON_KEY) window.SC_INFORMES_CONFIG.SUPABASE_ANON_KEY = s.SUPABASE_ANON_KEY;
})();
