# Entrega de Carlos — Respaldo Supabase de informes (Actuar)

**Estado:** BLOQUEADA (parcial: diseño SQL entregado, sin aplicar; sin cambios de cliente)
**Rama:** `feature/sc-informes-backup-supabase` (no mergear a main/master; el merge lo hace Dairo)
**Tarea origen:** respaldo remoto del informe/Acta generado en el flujo Actuar → `guardarFirmas()`, para que un informe nunca vuelva a perderse por vivir solo en IndexedDB.

## Paso 0 — Handler localizado

El botón "Guardar"/"Generar informe" no existe con ese texto literal. El punto equivalente en el código es:

- `app/js/phva/actuar.js:841` — botón "Guardar firmas y generar Acta" → `Actuar.guardarFirmas()` (línea 1281).
- `guardarFirmas()` valida firmas/cédulas, llama `Store.upsertInspeccion(inspeccion)` (persiste en localStorage + mirror IndexedDB vía `app/js/store.js`) y es el momento en que el Acta queda "generada" (lista para `abrirPDF()` en línea 933, que arma el HTML completo con `_buildActaHTML()`).
- Éste es el handler donde debía enchufarse `sc_guardar_informe`, en el mismo click, sin botón nuevo.

## Por qué no se conectó (bloqueo real, no evitable con una suposición razonable)

SaniCheck **no tiene ningún sistema de identidad/login de técnicos ni de admin** (confirmado con grep exhaustivo: sin `auth`, sin `usuario`, sin `login`, sin sesión, en todo `app/js/`). Lo único parecido es:

- `Licencias.js` — activación de **producto** por código único compartido (SHA-256 local), no identifica personas.
- `PortalCliente.js`/`portal-cliente.js` — identifica **establecimientos** (código de acceso por cliente), no técnicos, y vive en OTRO proyecto Supabase (`hhhyhjidbjpivdnbsyzc`, no `isncjtomlvxyvcaohcpx`).

La tarea pide "Técnico ve/edita/elimina SOLO sus propios informes; Admin ve todos" y da firmas de RPC con `p_tecnico_id` como parámetro **provisto por el cliente sin verificación**. Implementar eso literalmente sería inseguro: cualquiera podría mandar el `tecnico_id` de otra persona y leer/editar/borrar sus informes vía la anon key (SaniCheck no usa Supabase Auth/JWT en ningún módulo, solo REST+anon key). Eso viola el estándar no negociable "sin confianza en autorización del cliente".

El patrón real y ya aprobado en el ecosistema ECODESA (`ProyeCar/docs/sql/dashboard-ejecutivo-admin.sql`, `ProyeCar/registro-asesoria.js`) resuelve esto con una tabla `usuarios(id, codigo_acceso, rol, jefe_id)` + un login propio (`ra_login`, `LS_SESSION` en localStorage, barra de sesión, botón "Cerrar sesión") donde cada RPC valida `id + codigo_acceso` server-side antes de tocar datos. SaniCheck no tiene ese login. Construirlo es una decisión de producto/arquitectura real (nueva pantalla, nueva tabla de identidad, quién y cómo reparte los códigos de acceso), no un detalle de implementación que se pueda asumir sin romper "no sustituir arquitectura/seguridad por conveniencia".

## Lo que SÍ se entrega en esta rama

`supabase/migrations/migration_sc_informes_tables.sql` — migración completa **propuesta, NO aplicada**:

- `sc_usuarios(id uuid pk, nombre text, codigo_acceso text unique, rol text check in ('tecnico','admin'), creado_en)` — sin columna `activo` (regla explícita respetada). Tabla nueva con prefijo `sc_` (no reutiliza `usuarios` de ProyeCar, ver pregunta 1 abajo).
- `sc_informes(id uuid pk, tecnico_id uuid fk sc_usuarios, local_id text, establecimiento jsonb, establecimiento_nombre text generated, fecha date, numero_acta text, informe_html text, creado_en, actualizado_en)`.
  - `local_id` = id de la `inspeccion` local (Store) + índice único `(tecnico_id, local_id)` → hace **idempotente** `sc_guardar_informe` ante reintentos del outbox (mismo motivo que `p_local_id` en `ra_upsert_registro` de ProyeCar: sin esto, cada reintento offline crearía un informe duplicado).
- RLS activado + `REVOKE ALL ... FROM PUBLIC, anon, authenticated` en ambas tablas (igual que `dashboards_ejecutivos`): el único camino de acceso son los RPC `SECURITY DEFINER`.
- RPCs (todas `SECURITY DEFINER`, `SET search_path = public`, verifican `id + codigo_acceso` contra `sc_usuarios` antes de cualquier lectura/escritura — se agregó `p_codigo` a la firma literal del encargo porque sin eso la ownership es fingida):
  - `sc_guardar_informe(p_tecnico_id, p_codigo, p_establecimiento jsonb, p_fecha, p_html, p_local_id, p_numero_acta)` → upsert idempotente, retorna `id`.
  - `sc_list_mis_informes(p_tecnico_id, p_codigo)` → lista propia sin html (liviana).
  - `sc_get_informe(p_id, p_tecnico_id, p_codigo)` → valida ownership, retorna html completo.
  - `sc_update_informe(p_id, p_tecnico_id, p_codigo, p_html)` / `sc_delete_informe(p_id, p_tecnico_id, p_codigo)` → solo dueño.
  - `sc_list_admin_informes(p_admin_id, p_codigo)` → sin filtro, columna `tecnico_nombre` vía join.
  - `sc_get_admin_informe(p_id, p_admin_id, p_codigo)` → **agregada, no estaba en la lista original**; imprescindible para que el admin pueda "ver" un informe puntual (criterio 7 lo exige aunque el listado de RPC no la nombrara).
  - `sc_update_admin_informe(p_id, p_admin_id, p_codigo, p_html)` / `sc_delete_admin_informe(p_id, p_admin_id, p_codigo)` → sin restricción de dueño, valida solo `rol = 'admin'`.
- Grants: `EXECUTE` a `anon, authenticated` (SaniCheck no usa Supabase Auth), todo lo demás revocado.

**No se aplicó** contra la base real: (a) no tengo en esta sesión ninguna herramienta MCP de Supabase disponible (no hay `execute_sql` ni equivalente en las tools que me dieron, pese a que el encargo lo pedía como paso 9), y (b) mi rol no permite ejecutar migraciones de producción por mi cuenta aunque la tuviera. Por eso tampoco pude verificar `information_schema.columns` como pedía el paso 9 — queda pendiente para quien aplique la migración.

## Lo que NO se hizo (depende de la decisión de identidad)

- Ningún cambio en `app/js/phva/actuar.js` ni `app/js/store.js`: conectar `sc_guardar_informe` en `guardarFirmas()` sin un `tecnico_id`/`codigo` reales habría significado inventar una identidad falsa (por ejemplo reusar la cédula del firmante "elaboro", que ya se captura en ese mismo formulario) — la cédula es un dato cuasi-público, no un secreto, y usarla como control de acceso sería seguridad de fachada, no seguridad real.
- No hay outbox/IndexedDB nuevo para `sc_informes` (`sc-informes-outbox.js`): construirlo ahora sería código muerto hasta resolver de dónde sale `tecnico_id`/`codigo`.
- No hay UI "Mis informes" (técnico) ni panel admin: ambas dependen 100% de sesión/login.
- No hay integración jsPDF nueva: no aplica sin la UI de listado que la dispara.

## Preguntas exactas para desbloquear

1. **Identidad**: ¿`sc_usuarios` es una tabla nueva y propia de SaniCheck (como quedó en la migración propuesta), o los técnicos de SaniCheck ya existen como filas en la tabla `usuarios` de ProyeCar (mismo proyecto `isncjtomlvxyvcaohcpx`) y hay que reutilizarla?
2. **Login**: ¿Se autoriza construir una pantalla de login mínima en SaniCheck (nombre + código de acceso, sesión en `localStorage`, barra de sesión con "Cerrar sesión" — igual patrón que `registro-asesoria.js` de ProyeCar) antes de poder generar/ver informes? Esto es una superficie de UI nueva que el encargo original no mencionaba explícitamente pero que es condición necesaria para que "técnico ve solo lo suyo" sea real y no decorativo.
3. **Provisión de códigos**: ¿Quién crea el primer usuario admin (Dairo) y los usuarios técnico — un script SQL que yo prepare para que Dairo lo corra manualmente, o una pantalla de administración de usuarios dentro de SaniCheck?
4. **Herramienta Supabase**: esta sesión no tuvo ninguna tool MCP de Supabase disponible. Si el flujo esperado depende de `execute_sql`, hay que habilitarla en la próxima sesión de Carlos o dársela a Dairo para aplicar/verificar la migración manualmente.

## Para Camila

No aplica auditoría todavía: no hay superficie de cliente ni RPC en producción para revisar. Cuando se resuelvan las preguntas 1-3 y se conecte `guardarFirmas()` + la UI, **Camila debe auditar**: el flujo completo `guardarFirmas()` → `sc_guardar_informe` (incluyendo comportamiento offline/outbox), las pantallas "Mis informes" y admin, y especialmente que ningún RPC permita leer/editar/borrar el informe de otro técnico sin el código correcto.
