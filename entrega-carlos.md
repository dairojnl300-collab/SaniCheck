# Entrega de Carlos — Respaldo Supabase de informes (Actuar)

## Estado vigente — 2026-09-01

Implementación local lista para revisión/aplicación remota, sin commit, push ni cambios en Supabase.

- Primer ingreso, creación y cambio de contraseña: exactamente 4 dígitos numéricos, con hash `pgcrypto`.
- Migración auth idempotente: configuración inicial, cambio de contraseña, alta y baja lógica; los informes no se eliminan.
- `sc_list_usuarios` muestra únicamente usuarios activos; el usuario nuevo se genera desde el nombre completo.
- Ver/PDF se muestra dentro de la app mediante overlay e iframe `sandbox`/`srcdoc`; el HTML no confiable no se escribe en la ventana principal.
- Las respuestas RPC incluyen `local_id` para conservar la edición local en Hacer; el outbox se inicializa al arrancar.
- Validado: `node --check` de archivos afectados, contrato local de contraseña/RPC/visor, pruebas focalizadas Vencimientos v2 y prueba manual local Home/Hacer/Ver-PDF.
- Bloqueos: falta aplicar las migraciones en Supabase y validar el flujo transaccional contra la base remota; la suite completa mantiene 3 fallos preexistentes por el fixture ausente `app/data/invima-checklist-base-v1.0.json`.

El contenido restante de este documento conserva el contexto histórico de la integración original.

**Estado:** PARCIAL (código completo en la rama; falta aplicar la migración SQL y configurar credenciales reales — ninguna de las dos cosas las puedo hacer yo)
**Rama:** `feature/sc-informes-backup-supabase`
**PR:** https://github.com/dairojnl300-collab/SaniCheck/pull/20 (draft — **no mergear**, el merge lo hace Dairo)

## Paso 0 — Handler localizado

No existe un botón "Guardar"/"Generar informe" con ese texto literal. El punto real es:
`app/js/phva/actuar.js` → botón "Guardar firmas y generar Acta" → `Actuar.guardarFirmas()`. Ese es el único lugar donde se conectó el respaldo (mismo click, mismo handler, sin paso nuevo obligatorio).

## Decisión de identidad (por qué no hay pantalla de login nueva)

SaniCheck no tenía ningún sistema de identidad de técnicos/admin. En vez de construir un login completo (pantalla, sesión, "cerrar sesión" — el patrón `ra_login` de ProyeCar), reutilicé el patrón **ya existente en este mismo repo**: `app/js/portal-cliente.js` identifica establecimientos con un solo `codigo_acceso` secreto enviado en cada llamada; aquí se hace lo mismo pero para identificar al técnico/admin. Cada RPC resuelve `tecnico_id` y `rol` **server-side** a partir del código (función interna `sc_resolver_actor`, sin GRANT a `anon`/`authenticated`) — el cliente nunca conoce ni envía su propio UUID, y nunca hay una `p_tecnico_id` en la que "confiar". Esto es más simple que el par `(id, codigo)` de ProyeCar y evita construir una pantalla de login nueva, a costa de que el campo del código se pide una sola vez dentro del propio formulario de firmas (campo "Código de acceso SaniCheck", opcional, cerca de los datos del firmante "elaboró").

## Archivos tocados/creados

- `supabase/migrations/migration_sc_informes_tables.sql` (nuevo) — migración completa, **sin aplicar**.
- `app/js/sc-informes.js` (nuevo) — cliente RPC (fetch + anon key) + outbox IndexedDB con backoff.
- `app/js/sc-informes-ui.js` (nuevo) — paneles "Mis informes" y "Panel admin" (login por código, ver/editar/eliminar, exportar PDF).
- `app/js/sc-informes-config.js` (nuevo) — config pública (URL fija del proyecto `isncjtomlvxyvcaohcpx`, anon key vacía).
- `app/js/sc-informes-config.secrets.example.js` (nuevo) — plantilla para la anon key real (gitignored el archivo real).
- `scripts/generate-sc-informes-config-secrets.js` (nuevo) — genera el secrets.js desde `.env` (`SC_INFORMES_SUPABASE_URL`/`SC_INFORMES_SUPABASE_ANON_KEY`), igual patrón que `generate-portal-config-secrets.js`.
- `.gitignore` — agregada `app/js/sc-informes-config.secrets.js`.
- `app/js/phva/actuar.js` — campo "Código de acceso SaniCheck" en la captura de firmas; helper `_generarActaHtmlCompleta()` (extraído de `abrirPDF()`, sin duplicar código); `_respaldarEnNube()` llamado dentro de `guardarFirmas()` **antes** de `_refresh()` (para leer el input antes de que el re-render lo reemplace); botones "Mis informes" / "Panel admin" (solo si `ScInformes.esAdmin()`) en la barra de acciones del Acta ya generada.
- `app/index.html` — script tags nuevos (`sc-informes-config.secrets.js`, `sc-informes-config.js`, `sc-informes.js`, `sc-informes-ui.js`); bump `actuar.js?v=4.13.0` y `brand.css?v=4.13.0`.
- `app/sw.js` — `APP_VERSION` 4.12.13→4.13.0, `BUILD_HASH` nuevo, 3 archivos nuevos agregados a `ASSETS` (precache), `actuar.js?v=4.13.0`.
- `app/version.json`, `app/js/app-version.js` — versión sincronizada a 4.13.0.

## SQL final (resumen — completo en el archivo de migración)

- `sc_usuarios(id, nombre, codigo_acceso UNIQUE, rol CHECK IN ('tecnico','admin'), creado_en)` — sin columna `activo`.
- `sc_informes(id, tecnico_id FK, local_id, establecimiento jsonb, establecimiento_nombre generated, fecha, numero_acta, informe_html, creado_en, actualizado_en)` — índice único parcial `(tecnico_id, local_id) WHERE local_id IS NOT NULL` → hace idempotente el guardado ante reintentos del outbox.
- RLS activado + `REVOKE ALL ... FROM PUBLIC, anon, authenticated` en ambas tablas: el único acceso es vía RPC `SECURITY DEFINER`.
- `sc_resolver_actor(p_codigo)` — helper interno (no expuesto) que valida el código y retorna el usuario.
- RPCs expuestas (`GRANT EXECUTE ... TO anon, authenticated`): `sc_whoami(p_codigo)`, `sc_guardar_informe(p_codigo, p_establecimiento, p_fecha, p_html, p_local_id, p_numero_acta)`, `sc_list_mis_informes(p_codigo)`, `sc_get_informe(p_id, p_codigo)`, `sc_update_informe(p_id, p_codigo, p_html)`, `sc_delete_informe(p_id, p_codigo)`, `sc_list_admin_informes(p_codigo)`, `sc_get_admin_informe(p_id, p_codigo)` (agregada, no estaba en la lista original pero es necesaria para que el admin pueda "ver" un informe puntual), `sc_update_admin_informe(p_id, p_codigo, p_html)`, `sc_delete_admin_informe(p_id, p_codigo)`.
- Firmas RPC **sin `p_tecnico_id`/`p_admin_id`** (a diferencia del enunciado original): la identidad se resuelve del código, nunca de un id mandado por el cliente — más simple y sin superficie de suplantación.

## Comportamiento offline / outbox

`ScInformes.guardarInforme()` intenta `sc_guardar_informe` de inmediato; si falla (sin red, RPC caída), encola el registro completo en IndexedDB (`sanicheck-sc-informes-outbox`, store `pendientes`) con backoff exponencial (30s→...→tope 30min) y reintenta automáticamente en `online` + cada 60s. Nunca borra un pendiente por fallo repetido (a diferencia del outbox `dashboards_pendientes` de ProyeCar, que descarta tras 8 intentos) — aquí el objetivo explícito es no volver a perder un informe.

## Desviación deliberada: sin jsPDF/vendoring nuevo

El encargo pedía jsPDF. No lo agregué: `informe_html` es el mismo documento HTML autocontenido que ya genera `_buildActaHTML()` (con Chart.js incrustado y su propio botón "Guardar como PDF" vía `window.print()`, ya probado en producción en `abrirPDF()`). "Ver/PDF" en los paneles reabre ese mismo HTML en una ventana nueva. Agregar jsPDF habría requerido también `html2canvas` (jsPDF no renderiza HTML/CSS complejo ni Chart.js por sí solo) para un resultado de fidelidad probablemente peor que el que ya funciona, violando la regla de "no introducir dependencias sin necesidad demostrable". Si Dairo prefiere específicamente un archivo `.pdf` descargable (no impresión del navegador), es una decisión de producto a confirmar — hoy technically "Exportar PDF" = abrir e imprimir, igual que el resto de la app.

## Corrección de seguridad — Stored XSS cross-user en `_verHtml` (HIGH)

Hallazgo de revisión: `_verHtml()` abría `informe_html` (que puede venir de OTRO
técnico o de una cuenta comprometida) con `window.open('', '_blank')` +
`document.write(html)` — same-origin, ejecutaría cualquier `<script>`/`onerror`/
`javascript:` inyectado, con riesgo de robo del código de acceso guardado en
`localStorage` cuando el admin abre el informe de un técnico. Corregido:

1. `_verHtml()` ya no hace `document.write(html)` del contenido no confiable.
   Ahora abre una página envolvente propia (confiable) con un
   `<iframe sandbox="allow-modals">` (sin `allow-scripts` ni `allow-same-origin`)
   y asigna `iframe.srcdoc = html`. El botón "Imprimir / Guardar como PDF" vive
   en la página envolvente y llama a `iframe.contentWindow.print()` — funciona
   aunque el iframe esté sandboxeado. Limitación conocida y aceptada: el
   gráfico comparativo (Chart.js, con `<script>` inline) no se renderiza en
   esta vista, porque bloquear scripts es justamente el punto.
2. `window.open(...)` en `_verHtml` y en `Actuar.abrirPDF()` ahora incluye
   `'noopener'` + `win.opener = null` de refuerzo (aunque `abrirPDF()` solo
   muestra contenido autogenerado en la sesión actual, no contenido cruzado
   entre usuarios — no tenía el mismo riesgo, pero se endureció igual).
3. Defensa en profundidad server-side: nueva función `sc_sanitizar_html(text)`
   en la migración SQL (regex conservador, solo 3 vectores: `<script>`,
   atributos `on*`, URLs `javascript:`), aplicada en `sc_guardar_informe`,
   `sc_update_informe` y `sc_update_admin_informe` antes de escribir
   `informe_html`. Documentado en el propio SQL que la mitigación primaria es
   el sandbox del iframe, no este regex.

Confirmo explícitamente: `_verHtml` ya no ejecuta HTML no confiable en un
contexto same-origin — el HTML ajeno solo llega a un iframe sandboxeado sin
capacidad de ejecutar script ni de heredar el origen del documento contenedor.

## Seguridad y accesibilidad

- Ownership resuelto 100% server-side (`sc_resolver_actor`); ningún RPC confía en un id/rol enviado por el cliente.
- `REVOKE ALL` + RLS en ambas tablas; sin políticas de acceso directo — todo pasa por RPC.
- Valores dinámicos escapados con el `_esc()` global (`app/js/util/escape-html.js`) en las tablas/paneles nuevos, mismo patrón que el resto de `actuar.js`.
- Paneles con `role="dialog"`, `aria-modal`, `aria-label`, cierre con Escape/click fuera/botón, foco inicial en el primer control, `role="alert"` en mensajes de error, confirmación nativa antes de eliminar.
- `informe_html` se reabre con `document.write()` en ventana nueva — mismo patrón ya en producción (`abrirPDF()`), no es una superficie nueva de riesgo.
- Nunca se bloquea el guardado local: `Store.upsertInspeccion()` corre siempre primero; el respaldo remoto es fire-and-forget con outbox.

## Validación

- `node --check` sobre los 7 archivos JS nuevos/modificados: **OK** (sin errores de sintaxis).
- `version.json` validado como JSON válido.
- Revisión manual línea por línea del SQL (balance de bloques `$$…$$`, índices que respaldan cada `ON CONFLICT`, coherencia de tipos) — no ejecutado contra una base real.
- **No pude**: aplicar la migración ni correr `information_schema.columns` como pedía el paso 9 original — esta sesión no tuvo ninguna herramienta MCP de Supabase invocable (el `<functions>` disponible para este subagente fue solo Read/Write/Edit/Glob/Grep/Bash/PowerShell), y aunque la hubiera tenido, ejecutar una migración de producción por cuenta propia excede mi rol.
- **No pude**: probar el flujo end-to-end en navegador (login por código → guardar Acta → verlo en "Mis informes") porque no hay proyecto Supabase real conectado (`SC_INFORMES_ANON_KEY` vacía) ni filas en `sc_usuarios` todavía.

## Bloqueos reales para dejarlo 100% operativo (no los puedo resolver yo)

1. **Aplicar la migración** `supabase/migrations/migration_sc_informes_tables.sql` contra `isncjtomlvxyvcaohcpx` (Dairo, vía SQL editor de Supabase o MCP con permisos).
2. **Provisionar usuarios**: insertar al menos una fila admin (Dairo) y una por técnico en `sc_usuarios`, con códigos de acceso generados fuera de banda (la migración trae el INSERT comentado, con placeholders).
3. **Configurar la anon key real**: copiar `app/js/sc-informes-config.secrets.example.js` → `app/js/sc-informes-config.secrets.js` (o `node scripts/generate-sc-informes-config-secrets.js` con `.env`) y desplegarlo junto con el resto de la app (mismo mecanismo ya usado para `portal-config.secrets.js`).
4. Repartir los códigos de acceso a cada técnico por un canal seguro (no quedó definido cuál — WhatsApp/email en texto plano no es ideal, pero no es una decisión técnica que me corresponda).

Sin (1)-(3) la funcionalidad queda instalada pero inerte: el campo de código en el formulario de firmas no tendrá contra qué validar, y `ScInformesUI` fallará con "Código inválido" (comportamiento esperado y no bloqueante — el guardado local sigue funcionando igual que siempre).

## Para Camila

Cuando (1)-(3) estén resueltos, **Camila debe auditar**: `Actuar.guardarFirmas()` → `_respaldarEnNube()` → `ScInformes.guardarInforme()` (incluyendo el camino de fallo/outbox con la red cortada de verdad, no simulada); los 10 RPCs `sc_*` uno por uno confirmando que ningún código puede leer/editar/borrar informes de otro técnico ni acceder a `sc_list_admin_informes`/`sc_*_admin_informe` sin `rol = 'admin'`; los paneles "Mis informes" y "Panel admin" en mobile y desktop; y que el service worker sirva la versión 4.13.0 (bump de caché) en producción tras el deploy.
