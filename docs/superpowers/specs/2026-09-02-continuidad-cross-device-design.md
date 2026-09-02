# Continuidad de inspecciones entre dispositivos

**Fecha:** 2026-09-02
**Proyecto:** SaniCheck (PWA vanilla JS/CSS, Cloudflare Pages, Supabase `isncjtomlvxyvcaohcpx`)
**Base:** PR #22 (respaldo incremental — columna/RPCs de borrador sobre `sc_informes`), desplegado en producción 4.17.1.

## 1. Problema

Una inspección (en cualquier fase: Planificar, Hacer, Verificar, Actuar) solo puede
abrirse y editarse desde el dispositivo donde se creó. Un técnico que empieza una
inspección en un celular y quiere seguirla en una tablet, o un admin que quiere
retomar la inspección de un técnico, no puede — el dato estructurado (respuestas,
observaciones, hallazgos, acciones correctivas, fase/aspecto activo) vive solo en
`localStorage`/IndexedDB de ese dispositivo.

No es edición simultánea en tiempo real: es continuidad entre sesiones, un
dispositivo a la vez.

## 2. Estado actual (lo que ya existe, PR #22)

El respaldo incremental de borrador ya construyó casi toda la mecánica necesaria:

- `sc_informes.estado_parcial` (jsonb) + `estado_parcial_actualizado_en`: snapshot de
  la inspección en curso, sin fotografías ni firmas (`_clonarSinFotos`), tope de
  512 KB, solo mientras `estado = 'en_curso'`.
- RPCs: `sc_guardar_borrador`, `sc_list_borradores`, `sc_get_borrador` (scope: propio
  `tecnico_id`, resuelto vía `sc_resolver_actor(p_codigo)`).
- Cliente (`sc-informes.js`): `_crearEstadoParcial` arma el snapshot completo de
  `programas` (que ya incluye criterio/evaluación/hallazgo/acción/estado por
  aspecto — la data que pide el requerimiento ya viaja completa), `guardarBorrador`/
  `scheduleBorrador` con debounce de 30s + outbox offline, `_restaurarBorradorLocal`
  hace merge del remoto con las fotos locales por id.
- `revisarBorradoresRemotos()`: al iniciar sesión, si hay un borrador remoto más
  nuevo que el local, ofrece restaurarlo vía `confirm()` del navegador (solo el más
  reciente, sin poder elegir cuál).

### Huecos concretos que faltan cerrar

1. **Solo Hacer dispara el guardado.** `scheduleBorrador`/`programarBorradorActual`
   solo se llama desde `hacer.js`. Editar en Planificar/Verificar/Actuar sin pasar
   por Hacer nunca sincroniza.
2. **`ui.screen` queda fijo en `'hacer'`.** Tanto al guardar (`_crearEstadoParcial`)
   como al restaurar (`_restaurarBorradorLocal`, `Router.go('hacer')` en
   `revisarBorradoresRemotos`), se asume que siempre se vuelve a Hacer, sin importar
   en qué fase estaba el usuario.
3. **"Mis informes" no lista borradores.** `sc_list_mis_informes`/
   `sc_list_admin_informes` excluyen filas con `estado_parcial IS NOT NULL`. Una
   inspección en curso no aparece ahí — solo se ofrece automáticamente al login
   (punto 4).
4. **Tocar una tarjeta sin copia local no hace nada útil.** El handler de
   `data-sc-editar-tarjeta` en `sc-informes-ui.js` busca la inspección en
   `Store.get().inspecciones` local; si no está, muestra un toast y se rinde — no
   intenta pedirla a Supabase.
5. **Al finalizar, se pierde el dato estructurado.** `sc_guardar_informe` pone
   `estado_parcial = NULL`. Un informe ya finalizado solo tiene el HTML renderizado
   en el servidor — si no existe localmente en el dispositivo, no hay forma de
   reabrirlo para corregir el checklist (solo ver el PDF).
6. **Sin RPC de borrador para admin.** `sc_guardar_borrador`/`sc_list_borradores`/
   `sc_get_borrador` están scopeadas a `tecnico_id = actor`. No existe equivalente
   admin (sin filtro de técnico) para inspecciones en curso.

## 3. Decisiones de alcance (confirmadas con el usuario)

- **Admin:** puede ver y continuar la inspección en curso de **cualquier técnico**,
  no solo la propia. Requiere RPCs admin nuevas.
- **Listado:** "Mis informes" pasa a ser **una lista unificada** (finalizados + en
  curso mezclados por fecha, con badge "En curso" en los borradores), no una
  sección separada.
- **Fotos:** quedan fuera de este cambio. Nunca viajan por `estado_parcial`/
  `estado_estructurado` (ya se excluían: `_clonarSinFotos`). Si se continúa en el
  dispositivo B una inspección con fotos tomadas en A, el aspecto se ve respondido
  pero sin miniatura hasta que se finalice desde un dispositivo que sí las tenga.
  Esto es aceptado explícitamente como parte del alcance.
- **Aviso automático de login:** se retira. La lista unificada de "Mis informes" es
  el único camino para abrir cualquier inspección (finalizada o en curso). La
  función `revisarBorradoresRemotos()` queda definida pero sin uso (mínimo cambio,
  mismo criterio aplicado en `_renderComparacionHistorica`).
- **Informes ya finalizados:** también entran en el alcance. Se preserva el estado
  estructurado incluso después de finalizar (columna nueva, separada de
  `estado_parcial`) para poder reabrir y editar el checklist de un informe
  terminado desde cualquier dispositivo.

## 4. Diseño

### 4.1 Esquema Supabase — nueva migración `migration_sc_informes_continuidad.sql`

No se modifica el significado de `estado_parcial`/`estado_parcial_actualizado_en`
(sigue siendo exactamente "hay un borrador sin finalizar"; los filtros existentes
`WHERE estado_parcial IS NULL` en `sc_list_mis_informes`, `sc_list_admin_informes`,
`sc_get_informe`, `sc_get_admin_informe` no cambian).

```sql
ALTER TABLE public.sc_informes
  ADD COLUMN IF NOT EXISTS estado_estructurado jsonb,
  ADD COLUMN IF NOT EXISTS estado_estructurado_actualizado_en timestamptz;
```

`estado_estructurado`: mismo shape que `estado_parcial` (mismo builder
`_crearEstadoParcial` del lado cliente), pero **nunca se borra**, ni al finalizar.
Es el mirror durable de "el último estado estructurado conocido de esta
inspección", independiente de si el informe ya tiene HTML o no.

Cambios a RPCs existentes (`CREATE OR REPLACE FUNCTION`, misma firma salvo donde se
indique):

- **`sc_guardar_borrador(...)`**: además de `estado_parcial`, escribe también
  `estado_estructurado = p_estado_parcial, estado_estructurado_actualizado_en =
  now()`. Mismas validaciones existentes (tope 512 KB, sin clave `fotografias`,
  `estado = 'en_curso'`).
- **`sc_guardar_informe(...)`**: nuevo parámetro `p_estado_estructurado jsonb
  DEFAULT NULL`. Dentro del INSERT y del `ON CONFLICT DO UPDATE`: si viene el
  parámetro, `estado_estructurado = p_estado_estructurado,
  estado_estructurado_actualizado_en = now()`; si no, se conserva el valor
  existente (`COALESCE`). `estado_parcial = NULL` se mantiene igual que hoy (sigue
  marcando "ya no es un borrador"). Se aplican las mismas validaciones de tamaño y
  de no traer `fotografias` cuando `p_estado_estructurado` no es nulo.
- **`sc_get_informe(...)` / `sc_get_admin_informe(...)`**: agregan
  `estado_estructurado`, `estado_estructurado_actualizado_en` al `RETURNS TABLE` y
  al `SELECT` — cambio aditivo, no rompe callers existentes que solo leen
  `informe_html`.

RPCs nuevas (mismo patrón que las de técnico, sin filtro `tecnico_id`, exigiendo
`v_actor.rol = 'admin'`, igual que `sc_list_admin_informes`):

- **`sc_list_admin_borradores(p_codigo text)`** — como `sc_list_borradores` pero
  para todos los técnicos, incluye `tecnico_nombre`.
- **`sc_get_admin_borrador(p_id uuid, p_codigo text)`** — como `sc_get_borrador`
  sin restricción de `tecnico_id`.

`REVOKE ALL ... FROM PUBLIC, anon, authenticated` + `GRANT EXECUTE ... TO anon,
authenticated` para las 2 funciones nuevas, igual que el resto de RPCs de este
proyecto (sin RLS de tabla; todo el control de acceso vive en las funciones
`SECURITY DEFINER`).

### 4.2 Cliente — `app/js/sc-informes.js`

- **`_crearEstadoParcial(inspeccion, cursor)`**: `ui.screen` deja de ser el literal
  `'hacer'`. Se toma `Store.get().ui.screen` real (uno de `home, about, planificar,
  personalizar, hacer, verificar, dashboard, actuar` — el mismo whitelist que ya usa
  `app.js` al restaurar sesión), con fallback a `'hacer'` si no hay pantalla
  reconocida. Se sigue mandando `programaIdx`/`aspectoIdx` del `ui` actual sin
  importar la fase (son inofensivos para fases que no los usan).
- **`_restaurarEstadoRemoto(payloadEstado)`** (nueva, generaliza
  `_restaurarBorradorLocal`): recibe un objeto con la forma
  `{ inspeccion, ui, local_id }` (el mismo shape que hoy trae
  `detalle.estado_parcial`, o el nuevo `detalle.estado_estructurado`). Hace el merge
  con la copia local existente preservando `fotografias`/`firmas`
  (`_conservarFotografias`, sin cambios), actualiza `Store.set({ inspecciones,
  currentId, ui })` navegando al `ui.screen` real en vez de forzar `'hacer'`.
  `_restaurarBorradorLocal` pasa a ser un wrapper delgado sobre esta función para no
  romper el único caller que le queda si se decide no retirarlo del todo.
- **`guardarInforme(...)`**: antes de llamar a `sc_guardar_informe`, arma
  `_crearEstadoParcial(inspeccion, cursor)` con `estado: 'finalizada'` y lo manda
  como `p_estado_estructurado` — best-effort, si falla la construcción del snapshot
  (p. ej. faltan datos) se llama igual sin ese parámetro, nunca bloquea el guardado
  del informe.
- **`listMisInformesUnificado()`** (nueva): `Promise.all([listMisInformes(),
  listBorradores()])`, tag `_enCurso: false/true` por fila, combina y ordena por
  `actualizado_en`/`estado_parcial_actualizado_en` descendente.
- **`listAdminInformesUnificado()`** (nueva): igual, con `listAdminInformes()` +
  `sc_list_admin_borradores` (RPC nueva expuesta como `listAdminBorradores()`).
- Se agregan `getAdminBorrador(id)` (wrapper de `sc_get_admin_borrador`) al export.
- `revisarBorradoresRemotos` queda definida, sin llamadas (ver 4.3).

### 4.3 Cliente — `app/js/sc-informes-ui.js`

- **`_tablaInformes(filas, opts)`**: recibe filas ya unificadas. Fila con
  `_enCurso: true` muestra badge "En curso" junto al estado de cumplimiento y
  **oculta el botón "Ver / PDF"** (no hay `informe_html` todavía). El resto de la
  tarjeta (establecimiento, fecha, acta, profesional si `opts.admin`) no cambia.
- **`mostrarEnPortada` / `_renderAdmin`**: usan `listMisInformesUnificado()` /
  `listAdminInformesUnificado()` en vez de `listMisInformes()`/`listAdminInformes()`.
- **Handler `data-sc-editar-tarjeta`** (el que ya dice "toca la tarjeta para
  editar"), nueva lógica:
  1. Si `Store.get().inspecciones` ya tiene esa `local_id` **y** su
     `actualizado_en` local es ≥ al timestamp remoto de la fila → comportamiento
     actual sin cambios (`Store.set({currentId})` + `Router.go('hacer')`). Evita
     tocar el camino ya probado del caso de un solo dispositivo.
  2. Si no hay copia local, o la remota es más nueva:
     - Fila en curso → `getBorrador(id)` (propia) o `getAdminBorrador(id)` (admin,
       cualquier técnico) → `estado_parcial` del resultado.
     - Fila finalizada → `getInforme(id)` o `getAdminInforme(id)` → si
       `estado_estructurado` no es nulo, se usa; si es nulo (informe finalizado
       antes de este cambio, sin snapshot estructurado) → toast "Este informe no
       tiene datos editables guardados; solo se puede ver el PDF" (mensaje nuevo,
       reemplaza el actual "no disponible en este equipo" para este caso
       específico).
     - Con datos disponibles → `_restaurarEstadoRemoto(...)`, `Router.go(ui.screen
       real)`, toast "Progreso cargado desde la nube".
- **`iniciarSesionAutomatica()`**: se quitan las 2 llamadas a
  `ScInformes.revisarBorradoresRemotos()`.

### 4.4 Disparadores de sincronización por fase

`ScInformes.programarBorradorActual()` ya es genérico (lee
`Store.getCurrentInspeccion()`, no depende de la fase). Se agrega la llamada justo
después de cada `Store.upsertInspeccion(inspeccion)` fuera de `hacer.js`:

| Archivo | Línea aprox. | Contexto |
|---|---|---|
| `planificar.js` | 2455 | fin de wizard de establecimiento → pasa a Hacer |
| `planificar.js` | 2513 | edición de establecimiento en curso |
| `verificar.js` | 5 | recalculo tras editar un ítem desde Verificar |
| `actuar.js` | 22 | guardado genérico de Actuar |
| `actuar.js` | 1429 | firmas/cierre (se sincroniza el texto; las firmas mismas quedan excluidas por `_clonarSinFotos`) |
| `personalizar.js` | 21 | aplicar configuración de checklist |

Mismo mecanismo ya probado: debounce de 30s (`DRAFT_INTERVAL_MS`), forzado en
cambios de aspecto/pantalla, cola offline (`encolarBorrador`) si la red falla. No se
introduce mecanismo nuevo.

## 5. Qué NO se toca

`sc_usuarios`, `sc_login_usuario`, `app/recuperar.html`, `app/js/store.js`, el flujo
de compresión/adjunto de fotografías, RLS (el proyecto no usa RLS de tabla; todo el
control de acceso ya vive en las funciones `SECURITY DEFINER` vía
`sc_resolver_actor`).

## 6. Manejo de errores / casos borde

- **Tamaño > 512 KB**: mismo comportamiento actual de `sc_guardar_borrador`
  (rechaza la escritura); al no tener fotos, el `programas` completo de una
  inspección PSB típica está muy por debajo del tope — no se toca el límite.
- **Sin red al finalizar**: `guardarInforme` ya tiene manejo de outbox
  (`encolarPendiente`/`flushPendientes`); el nuevo `p_estado_estructurado` viaja
  dentro del mismo payload encolado, sin lógica nueva de reintento.
- **Informe finalizado antes de este cambio** (sin `estado_estructurado`): se
  degrada al comportamiento actual (solo ver PDF), con el mensaje aclaratorio del
  punto 4.3.
- **Admin abre el borrador de un técnico y el técnico sigue trabajando en su
  dispositivo original**: no hay bloqueo ni lock — el próximo guardado del que
  sea gana (last-write-wins por timestamp), igual que ya asume el diseño de un
  dispositivo a la vez. No se agrega detección de conflicto; está fuera del
  alcance pedido ("no es edición simultánea en tiempo real").

## 7. Plan de verificación

- Automatizado (estilo `test/sc-informes-borrador.test.js`, sandbox `vm`):
  - `_crearEstadoParcial` con `Store.ui.screen = 'verificar'` produce
    `ui.screen: 'verificar'` (no `'hacer'`).
  - `_restaurarEstadoRemoto` navega al `ui.screen` recibido, conserva fotos
    locales por id.
  - `sc_guardar_informe` (revisión de la migración, no ejecutable en el sandbox JS)
    se valida manualmente contra la base de Supabase de desarrollo/staging si
    existe, o con `execute_sql` de la MCP de Supabase contra la base real antes del
    merge.
- Manual cross-device (paso 6 del requerimiento):
  1. Crear inspección en navegador A, avanzar hasta Planificar completo +
     algunas respuestas en Hacer, **sin pasar por Verificar/Actuar**.
  2. Iniciar sesión con el mismo código en navegador B (perfil distinto/incógnito).
  3. Abrir "Mis informes", confirmar que aparece con badge "En curso", tocarla.
  4. Confirmar que carga en la fase correcta con todas las respuestas/hallazgos, y
     que se puede seguir editando y guardando desde B.
  5. Finalizar el informe desde B, confirmar que aparece como finalizado en A al
     refrescar "Mis informes", y que tocarlo en A (sin haber estado nunca ahí)
     permite reabrir el checklist si A no tiene copia local.
- Producción real: `curl` a `sanicheck.pages.dev/app/version.json` para confirmar
  `build` tras el deploy, igual que en los cambios anteriores de esta sesión.
