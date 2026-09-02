# Continuidad de inspecciones entre dispositivos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que una inspección PSB en cualquier fase (Planificar/Hacer/Verificar/Actuar), o ya finalizada, se abra y continúe desde otro dispositivo — un técnico entre celular y tablet, o un admin retomando la inspección de cualquier técnico — sin edición simultánea en tiempo real.

**Architecture:** El respaldo incremental de borrador (PR #22, `estado_parcial`) ya provee snapshot + RPCs + debounce + outbox. Este cambio: (1) añade una columna gemela `estado_estructurado` que sobrevive a la finalización del informe, (2) generaliza el snapshot/restauración para respetar la fase real (`ui.screen`) en vez de forzar `'hacer'`, (3) unifica "Mis informes" (finalizados + en curso) como único punto de entrada, (4) dispara el guardado incremental desde las 4 fases que hoy no lo hacen, (5) agrega RPCs admin para borradores de cualquier técnico.

**Tech Stack:** PWA vanilla JS (sin framework), Supabase Postgres (RPC `SECURITY DEFINER`, sin RLS de tabla), IndexedDB (outbox offline).

**Spec:** `docs/superpowers/specs/2026-09-02-continuidad-cross-device-design.md`

## Global Constraints

- Fotografías y firmas NUNCA viajan en `estado_parcial`/`estado_estructurado` (ya las excluye `_clonarSinFotos`; no se toca esa función).
- Tope de tamaño 524288 bytes (512 KB) en cualquier snapshot escrito a Postgres — mismo límite ya vigente para `estado_parcial`.
- No hay RLS de tabla en `sc_informes`; todo el control de acceso vive en funciones `SECURITY DEFINER` vía `sc_resolver_actor(p_codigo)`. No se agrega RLS.
- No se modifican: `sc_usuarios`, `sc_login_usuario`, `app/recuperar.html`, `app/js/store.js`, el flujo de compresión/adjunto de fotografías.
- Mismo mecanismo de sincronización ya probado: debounce `DRAFT_INTERVAL_MS` = 30000 ms, outbox IndexedDB (`encolarBorrador`/`encolarPendiente`) si falla la red. No se introduce mecanismo nuevo.
- Cambios a RPCs existentes son aditivos: no deben romper callers que ya existen (ej. código que solo lee `informe_html`).
- Nunca se usa la palabra "Inspector" en textos de UI — se usa "profesional" (convención ya vigente en `sc-informes-ui.js`).
- Todo cambio a un archivo cargado por `app/index.html` requiere `npm run build` antes de desplegar (regenera `BUILD_HASH`/`CACHE` en `app/sw.js` vía `scripts/sync-version.js`) — sin esto, el Service Worker sirve JS obsoleto en producción.

---

## Task 1: Migración SQL — columna `estado_estructurado` y RPCs

**Files:**
- Create: `supabase/migrations/migration_sc_informes_continuidad.sql`

**Interfaces:**
- Produces (usado por Task 2): RPCs `sc_guardar_borrador` (sin cambio de firma, ahora también escribe `estado_estructurado`), `sc_guardar_informe(..., p_estado_estructurado jsonb DEFAULT NULL)`, `sc_get_informe`/`sc_get_admin_informe` (agregan columnas `estado_estructurado`, `estado_estructurado_actualizado_en`), `sc_list_admin_borradores(p_codigo text)`, `sc_get_admin_borrador(p_id uuid, p_codigo text)` (nuevas).

- [ ] **Step 1: Escribir la migración completa**

```sql
-- migration_sc_informes_continuidad.sql
-- Continuidad de inspecciones entre dispositivos: preserva el estado
-- estructurado (mismo shape que estado_parcial) incluso después de
-- finalizar un informe, y agrega RPCs admin para borradores.
-- No modifica sc_usuarios, sc_login_usuario, ni el significado de
-- estado_parcial (sigue siendo exactamente "hay un borrador sin finalizar").

ALTER TABLE public.sc_informes
  ADD COLUMN IF NOT EXISTS estado_estructurado jsonb,
  ADD COLUMN IF NOT EXISTS estado_estructurado_actualizado_en timestamptz;

COMMENT ON COLUMN public.sc_informes.estado_estructurado IS
  'Mirror durable del último estado_parcial conocido de esta inspección. A diferencia de estado_parcial, NUNCA se borra al finalizar. No contiene fotografías.';
COMMENT ON COLUMN public.sc_informes.estado_estructurado_actualizado_en IS
  'Momento del último guardado de estado_estructurado (borrador o finalización).';

-- ── sc_guardar_borrador: además de estado_parcial, mirror en estado_estructurado ──

CREATE OR REPLACE FUNCTION public.sc_guardar_borrador(
  p_codigo text,
  p_establecimiento jsonb,
  p_fecha date,
  p_local_id text,
  p_numero_acta text,
  p_estado_parcial jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor sc_usuarios;
  v_id uuid;
BEGIN
  v_actor := public.sc_resolver_actor(p_codigo);

  IF nullif(trim(COALESCE(p_local_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'El borrador requiere un identificador local';
  END IF;

  IF p_estado_parcial IS NULL
     OR jsonb_typeof(p_estado_parcial) <> 'object'
     OR COALESCE(p_estado_parcial->>'estado', '') <> 'en_curso'
     OR pg_column_size(p_estado_parcial) > 524288
     OR p_estado_parcial ? 'fotografias'
  THEN
    RAISE EXCEPTION 'Estado parcial inválido o demasiado grande';
  END IF;

  INSERT INTO public.sc_informes(
    tecnico_id, local_id, establecimiento, fecha, numero_acta, informe_html,
    estado_parcial, estado_parcial_actualizado_en,
    estado_estructurado, estado_estructurado_actualizado_en
  )
  VALUES (
    v_actor.id,
    trim(p_local_id),
    COALESCE(p_establecimiento, '{}'::jsonb),
    p_fecha,
    p_numero_acta,
    '',
    p_estado_parcial,
    now(),
    p_estado_parcial,
    now()
  )
  ON CONFLICT (tecnico_id, local_id) WHERE local_id IS NOT NULL
  DO UPDATE SET
    establecimiento = EXCLUDED.establecimiento,
    fecha = EXCLUDED.fecha,
    numero_acta = EXCLUDED.numero_acta,
    estado_parcial = EXCLUDED.estado_parcial,
    estado_parcial_actualizado_en = now(),
    estado_estructurado = EXCLUDED.estado_parcial,
    estado_estructurado_actualizado_en = now()
  WHERE COALESCE(public.sc_informes.informe_html, '') = ''
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT i.id INTO v_id
      FROM public.sc_informes i
     WHERE i.tecnico_id = v_actor.id
       AND i.local_id = trim(p_local_id);
  END IF;

  RETURN v_id;
END;
$function$;

-- ── sc_guardar_informe: nuevo parámetro opcional p_estado_estructurado ──

CREATE OR REPLACE FUNCTION public.sc_guardar_informe(
  p_codigo text, p_establecimiento jsonb, p_fecha date, p_html text,
  p_local_id text DEFAULT NULL, p_numero_acta text DEFAULT NULL,
  p_nivel_cumplimiento text DEFAULT NULL, p_aspectos_evaluados integer DEFAULT NULL,
  p_aspectos_total integer DEFAULT NULL, p_porcentaje_cumplimiento integer DEFAULT NULL,
  p_estado_estructurado jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor sc_usuarios;
  v_id uuid;
BEGIN
  v_actor := public.sc_resolver_actor(p_codigo);

  IF p_nivel_cumplimiento IS NOT NULL
     AND p_nivel_cumplimiento NOT IN ('BUENO','REGULAR','DEFICIENTE')
     OR p_aspectos_evaluados IS NOT NULL
     AND p_aspectos_evaluados < 0
     OR p_aspectos_total IS NOT NULL
     AND p_aspectos_total < 0
     OR p_porcentaje_cumplimiento IS NOT NULL
     AND p_porcentaje_cumplimiento NOT BETWEEN 0 AND 100
  THEN
    RAISE EXCEPTION 'Metadata de informe inválida';
  END IF;

  IF p_estado_estructurado IS NOT NULL
     AND (jsonb_typeof(p_estado_estructurado) <> 'object'
          OR pg_column_size(p_estado_estructurado) > 524288
          OR p_estado_estructurado ? 'fotografias')
  THEN
    RAISE EXCEPTION 'Estado estructurado inválido o demasiado grande';
  END IF;

  INSERT INTO public.sc_informes(
    tecnico_id, local_id, establecimiento, fecha, numero_acta, informe_html,
    nivel_cumplimiento, aspectos_evaluados, aspectos_total, porcentaje_cumplimiento,
    estado_parcial, estado_parcial_actualizado_en,
    estado_estructurado, estado_estructurado_actualizado_en
  )
  VALUES (
    v_actor.id, p_local_id, COALESCE(p_establecimiento, '{}'::jsonb), p_fecha,
    p_numero_acta, public.sc_sanitizar_html(p_html), p_nivel_cumplimiento,
    p_aspectos_evaluados, p_aspectos_total, p_porcentaje_cumplimiento,
    NULL, NULL,
    p_estado_estructurado, CASE WHEN p_estado_estructurado IS NOT NULL THEN now() END
  )
  ON CONFLICT (tecnico_id, local_id) WHERE local_id IS NOT NULL
  DO UPDATE SET
    establecimiento = EXCLUDED.establecimiento,
    fecha = EXCLUDED.fecha,
    numero_acta = EXCLUDED.numero_acta,
    informe_html = EXCLUDED.informe_html,
    nivel_cumplimiento = COALESCE(EXCLUDED.nivel_cumplimiento, public.sc_informes.nivel_cumplimiento),
    aspectos_evaluados = COALESCE(EXCLUDED.aspectos_evaluados, public.sc_informes.aspectos_evaluados),
    aspectos_total = COALESCE(EXCLUDED.aspectos_total, public.sc_informes.aspectos_total),
    porcentaje_cumplimiento = COALESCE(EXCLUDED.porcentaje_cumplimiento, public.sc_informes.porcentaje_cumplimiento),
    estado_parcial = NULL,
    estado_parcial_actualizado_en = NULL,
    estado_estructurado = COALESCE(EXCLUDED.estado_estructurado, public.sc_informes.estado_estructurado),
    estado_estructurado_actualizado_en = CASE WHEN EXCLUDED.estado_estructurado IS NOT NULL
      THEN now() ELSE public.sc_informes.estado_estructurado_actualizado_en END,
    actualizado_en = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- ── sc_get_informe / sc_get_admin_informe: agregan columnas de salida ──
-- (RETURNS TABLE no admite cambiar columnas con CREATE OR REPLACE: hay que
-- dropear primero. La firma de entrada (uuid,text) no cambia.)

DROP FUNCTION IF EXISTS public.sc_get_informe(uuid, text);
CREATE FUNCTION public.sc_get_informe(p_id uuid, p_codigo text)
RETURNS TABLE(id uuid, local_id text, establecimiento jsonb, fecha date, numero_acta text, informe_html text,
              nivel_cumplimiento text, aspectos_evaluados integer, aspectos_total integer,
              porcentaje_cumplimiento integer, creado_en timestamptz, actualizado_en timestamptz,
              estado_estructurado jsonb, estado_estructurado_actualizado_en timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := public.sc_resolver_actor(p_codigo);
  RETURN QUERY SELECT i.id, i.local_id, i.establecimiento, i.fecha, i.numero_acta, i.informe_html,
      i.nivel_cumplimiento, i.aspectos_evaluados, i.aspectos_total, i.porcentaje_cumplimiento,
      i.creado_en, i.actualizado_en, i.estado_estructurado, i.estado_estructurado_actualizado_en
    FROM public.sc_informes i
   WHERE i.id = p_id
     AND i.tecnico_id = v_actor.id
     AND i.estado_parcial IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
END;
$function$;

DROP FUNCTION IF EXISTS public.sc_get_admin_informe(uuid, text);
CREATE FUNCTION public.sc_get_admin_informe(p_id uuid, p_codigo text)
RETURNS TABLE(id uuid, local_id text, tecnico_id uuid, tecnico_nombre text, establecimiento jsonb, fecha date,
              numero_acta text, informe_html text, nivel_cumplimiento text, aspectos_evaluados integer,
              aspectos_total integer, porcentaje_cumplimiento integer, creado_en timestamptz,
              actualizado_en timestamptz, estado_estructurado jsonb, estado_estructurado_actualizado_en timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_actor sc_usuarios;
BEGIN
  v_actor := public.sc_resolver_actor(p_codigo);
  IF v_actor.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
  RETURN QUERY SELECT i.id, i.local_id, i.tecnico_id, u.nombre, i.establecimiento, i.fecha, i.numero_acta,
      i.informe_html, i.nivel_cumplimiento, i.aspectos_evaluados, i.aspectos_total,
      i.porcentaje_cumplimiento, i.creado_en, i.actualizado_en,
      i.estado_estructurado, i.estado_estructurado_actualizado_en
    FROM public.sc_informes i
    JOIN public.sc_usuarios u ON u.id = i.tecnico_id
   WHERE i.id = p_id
     AND i.estado_parcial IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Informe no encontrado'; END IF;
END;
$function$;

-- ── RPCs nuevas: borradores admin (cualquier técnico) ──

CREATE OR REPLACE FUNCTION public.sc_list_admin_borradores(p_codigo text)
RETURNS TABLE(
  id uuid,
  local_id text,
  tecnico_id uuid,
  tecnico_nombre text,
  establecimiento jsonb,
  fecha date,
  numero_acta text,
  creado_en timestamptz,
  actualizado_en timestamptz,
  estado_parcial_actualizado_en timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor sc_usuarios;
BEGIN
  v_actor := public.sc_resolver_actor(p_codigo);
  IF v_actor.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  RETURN QUERY
  SELECT i.id, i.local_id, i.tecnico_id, u.nombre, i.establecimiento, i.fecha, i.numero_acta,
         i.creado_en, i.actualizado_en, i.estado_parcial_actualizado_en
    FROM public.sc_informes i
    JOIN public.sc_usuarios u ON u.id = i.tecnico_id
   WHERE i.estado_parcial IS NOT NULL
   ORDER BY COALESCE(i.estado_parcial_actualizado_en, i.actualizado_en) DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sc_get_admin_borrador(p_id uuid, p_codigo text)
RETURNS TABLE(
  id uuid,
  local_id text,
  tecnico_id uuid,
  tecnico_nombre text,
  establecimiento jsonb,
  fecha date,
  numero_acta text,
  estado_parcial jsonb,
  creado_en timestamptz,
  actualizado_en timestamptz,
  estado_parcial_actualizado_en timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor sc_usuarios;
BEGIN
  v_actor := public.sc_resolver_actor(p_codigo);
  IF v_actor.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  RETURN QUERY
  SELECT i.id, i.local_id, i.tecnico_id, u.nombre, i.establecimiento, i.fecha, i.numero_acta,
         i.estado_parcial, i.creado_en, i.actualizado_en, i.estado_parcial_actualizado_en
    FROM public.sc_informes i
    JOIN public.sc_usuarios u ON u.id = i.tecnico_id
   WHERE i.id = p_id
     AND i.estado_parcial IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Borrador no encontrado';
  END IF;
END;
$function$;

-- ── Grants ──
-- sc_guardar_borrador y sc_guardar_informe conservan su OID (CREATE OR
-- REPLACE con la misma lista de parámetros de entrada, o un parámetro nuevo
-- al final con DEFAULT), por lo que sus GRANT existentes siguen vigentes.
-- sc_get_informe/sc_get_admin_informe se dropearon y recrearon: hay que
-- regranter. Las 2 RPCs admin nuevas necesitan grant explícito.

REVOKE ALL ON FUNCTION public.sc_get_informe(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_get_informe(uuid,text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.sc_get_admin_informe(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_get_admin_informe(uuid,text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.sc_list_admin_borradores(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_list_admin_borradores(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.sc_get_admin_borrador(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_get_admin_borrador(uuid,text) TO anon, authenticated;
```

- [ ] **Step 2: Verificar la migración contra la base real antes de aplicarla**

No hay entorno de staging separado (proyecto único `isncjtomlvxyvcaohcpx`). Antes de aplicar:
1. Confirmar con el usuario que se va a ejecutar contra producción (ALTER TABLE + DROP/CREATE FUNCTION son cambios de esquema).
2. Aplicar con la MCP de Supabase (`apply_migration` o `execute_sql`) o `supabase db push` si hay CLI configurado.
3. Confirmar post-aplicación: `SELECT proname, pronargs FROM pg_proc WHERE proname IN ('sc_get_informe','sc_get_admin_informe','sc_guardar_informe','sc_guardar_borrador','sc_list_admin_borradores','sc_get_admin_borrador');` — deben existir las 6, sin duplicados por sobrecarga accidental.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/migration_sc_informes_continuidad.sql
git commit -m "feat(sc-informes): migración estado_estructurado + RPCs admin de borrador"
```

---

## Task 2: Cliente `app/js/sc-informes.js` — estado estructurado y restauración genérica

**Files:**
- Modify: `app/js/sc-informes.js`

**Interfaces:**
- Consumes: RPCs de Task 1 (`sc_guardar_informe` con `p_estado_estructurado`, `sc_list_admin_borradores`, `sc_get_admin_borrador`).
- Produces (usado por Task 3): `ScInformes.restaurarEstadoRemoto(payloadEstado)`, `ScInformes.listMisInformesUnificado()`, `ScInformes.listAdminInformesUnificado()`, `ScInformes.getAdminBorrador(id)`, `ScInformes.listAdminBorradores()`. Filas unificadas llevan `_enCurso: true|false`.

- [ ] **Step 1: Agregar whitelist de pantallas compartida y generalizar `_crearEstadoParcial`**

Reemplazar (línea 419-449):

```js
  function _crearEstadoParcial(inspeccion, cursor) {
    const ahora = new Date().toISOString();
    const total = _aspectosTotales(inspeccion);
    const evaluados = _aspectosEvaluados(inspeccion);
    const snapshot = _clonarSinFotos({
      id: inspeccion.id,
      fase_phva: inspeccion.fase_phva,
      establecimiento: inspeccion.establecimiento,
      inspeccion: inspeccion.inspeccion,
      numero_acta: inspeccion.numero_acta,
      programas: inspeccion.programas,
      estado_general: inspeccion.estado_general,
      hallazgos_criticos: inspeccion.hallazgos_criticos,
      score: inspeccion.score,
      creado_en: inspeccion.creado_en,
      actualizado_en: inspeccion.actualizado_en,
      version_app: inspeccion.version_app,
    });
    const ui = (typeof Store !== 'undefined' && Store.get) ? (Store.get().ui || {}) : {};
    return {
      version: 1,
      estado: 'en_curso',
      local_id: inspeccion.id,
      guardado_en: ahora,
      aspectos_completados: evaluados,
      aspectos_total: total,
      ultimo_aspecto: cursor || null,
      ui: { screen: 'hacer', programaIdx: ui.programaIdx || 0, aspectoIdx: ui.aspectoIdx || 0 },
      inspeccion: snapshot,
    };
  }
```

por:

```js
  const UI_SCREENS = ['home', 'about', 'planificar', 'personalizar', 'hacer', 'verificar', 'dashboard', 'actuar'];

  function _crearEstadoParcial(inspeccion, cursor, estadoLabel) {
    const ahora = new Date().toISOString();
    const total = _aspectosTotales(inspeccion);
    const evaluados = _aspectosEvaluados(inspeccion);
    const snapshot = _clonarSinFotos({
      id: inspeccion.id,
      fase_phva: inspeccion.fase_phva,
      establecimiento: inspeccion.establecimiento,
      inspeccion: inspeccion.inspeccion,
      numero_acta: inspeccion.numero_acta,
      programas: inspeccion.programas,
      estado_general: inspeccion.estado_general,
      hallazgos_criticos: inspeccion.hallazgos_criticos,
      score: inspeccion.score,
      creado_en: inspeccion.creado_en,
      actualizado_en: inspeccion.actualizado_en,
      version_app: inspeccion.version_app,
    });
    const ui = (typeof Store !== 'undefined' && Store.get) ? (Store.get().ui || {}) : {};
    const screenReal = UI_SCREENS.includes(ui.screen) ? ui.screen : 'hacer';
    return {
      version: 1,
      estado: estadoLabel || 'en_curso',
      local_id: inspeccion.id,
      guardado_en: ahora,
      aspectos_completados: evaluados,
      aspectos_total: total,
      ultimo_aspecto: cursor || null,
      ui: { screen: screenReal, programaIdx: ui.programaIdx || 0, aspectoIdx: ui.aspectoIdx || 0 },
      inspeccion: snapshot,
    };
  }
```

- [ ] **Step 2: Generalizar `_restaurarBorradorLocal` en `_restaurarEstadoRemoto`**

Reemplazar (línea 601-616):

```js
  function _restaurarBorradorLocal(detalle) {
    const parcial = detalle?.estado_parcial;
    const remoto = parcial?.inspeccion;
    if (!remoto?.programas?.length || !detalle.local_id) return null;
    const actual = (typeof Store !== 'undefined' && Store.get) ? Store.get() : { inspecciones: [], ui: {} };
    const local = (actual.inspecciones || []).find(i => i.id === detalle.local_id) || null;
    const restaurada = { ...(local || {}), ...remoto, id: detalle.local_id };
    if (local?.firmas && !restaurada.firmas) restaurada.firmas = local.firmas;
    _conservarFotografias(local, restaurada);
    restaurada.actualizado_en = new Date().toISOString();
    const inspecciones = (actual.inspecciones || []).filter(i => i.id !== detalle.local_id);
    inspecciones.unshift(restaurada);
    const ui = { ...(actual.ui || {}), ...(parcial.ui || {}), screen: 'hacer' };
    Store.set({ inspecciones, currentId: detalle.local_id, ui });
    return restaurada;
  }
```

por:

```js
  function _restaurarEstadoRemoto(payloadEstado) {
    const remoto = payloadEstado?.inspeccion;
    const localId = payloadEstado?.local_id;
    if (!remoto?.programas?.length || !localId) return null;
    const actual = (typeof Store !== 'undefined' && Store.get) ? Store.get() : { inspecciones: [], ui: {} };
    const local = (actual.inspecciones || []).find(i => i.id === localId) || null;
    const restaurada = { ...(local || {}), ...remoto, id: localId };
    if (local?.firmas && !restaurada.firmas) restaurada.firmas = local.firmas;
    _conservarFotografias(local, restaurada);
    restaurada.actualizado_en = new Date().toISOString();
    const inspecciones = (actual.inspecciones || []).filter(i => i.id !== localId);
    inspecciones.unshift(restaurada);
    const screenReal = UI_SCREENS.includes(payloadEstado.ui?.screen) ? payloadEstado.ui.screen : 'hacer';
    const ui = { ...(actual.ui || {}), ...(payloadEstado.ui || {}), screen: screenReal };
    Store.set({ inspecciones, currentId: localId, ui });
    return restaurada;
  }

  // Wrapper delgado: único caller restante es revisarBorradoresRemotos (sin uso en UI, ver 4.3).
  function _restaurarBorradorLocal(detalle) {
    return _restaurarEstadoRemoto(detalle?.estado_parcial);
  }
```

- [ ] **Step 3: `guardarInforme` — construir y enviar `estado_estructurado` best-effort**

Reemplazar el cuerpo de `guardarInforme` (línea 337-388):

```js
  async function guardarInforme(payload) {
    const codigo = getCodigo();
    if (!codigo) return { ok: false, sinCodigo: true };

    let estadoEstructurado = null;
    try {
      const inspeccion = (typeof Store !== 'undefined' && Store.get)
        ? (Store.get().inspecciones || []).find(i => i.id === payload.localId) : null;
      if (inspeccion) estadoEstructurado = _crearEstadoParcial(inspeccion, null, 'finalizada');
    } catch (e) { estadoEstructurado = null; }

    const params = {
      p_codigo: codigo,
      p_establecimiento: payload.establecimiento || {},
      p_fecha: payload.fecha,
      p_html: payload.html,
      p_local_id: payload.localId || null,
      p_numero_acta: payload.numeroActa || null,
      p_nivel_cumplimiento: payload.nivelCumplimiento || null,
      p_aspectos_evaluados: Number.isFinite(payload.aspectosEvaluados) ? payload.aspectosEvaluados : null,
      p_aspectos_total: Number.isFinite(payload.aspectosTotal) ? payload.aspectosTotal : null,
      p_porcentaje_cumplimiento: Number.isFinite(payload.porcentajeCumplimiento) ? payload.porcentajeCumplimiento : null,
      p_estado_estructurado: estadoEstructurado,
    };
    try {
      const id = await _rpc('sc_guardar_informe', params);
      await _retirarBorradorPendiente(payload.localId);
      _registrarFinalDeSesion(payload.localId);
      return { ok: true, id };
    } catch (e) {
      if (/código de acceso inválido/i.test(e.message || '')) {
        return { ok: false, codigoInvalido: true };
      }
      const pendiente = {
        local_id: payload.localId || ('sc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
        codigo,
        establecimiento: payload.establecimiento || {},
        fecha: payload.fecha,
        html: payload.html,
        numero_acta: payload.numeroActa || null,
        nivel_cumplimiento: payload.nivelCumplimiento || null,
        aspectos_evaluados: Number.isFinite(payload.aspectosEvaluados) ? payload.aspectosEvaluados : null,
        aspectos_total: Number.isFinite(payload.aspectosTotal) ? payload.aspectosTotal : null,
        porcentaje_cumplimiento: Number.isFinite(payload.porcentajeCumplimiento) ? payload.porcentajeCumplimiento : null,
        estado_estructurado: estadoEstructurado,
      };
      try {
        await encolarPendiente(pendiente);
        await _retirarBorradorPendiente(payload.localId);
        return { ok: false, encolado: true, error: e.message };
      } catch (outboxError) {
        return {
          ok: false,
          outboxUnavailable: true,
          error: e.message,
          outboxError: outboxError.message,
        };
      }
    }
  }
```

- [ ] **Step 4: Reenvío desde el outbox — incluir `p_estado_estructurado`**

En `flushPendientes()`, dentro del bloque `else` (informe, línea 288-300), agregar el parámetro:

```js
          } else {
            await _rpc('sc_guardar_informe', {
              p_codigo: rec.codigo,
              p_establecimiento: rec.establecimiento,
              p_fecha: rec.fecha,
              p_html: rec.html,
              p_local_id: rec.local_id,
              p_numero_acta: rec.numero_acta || null,
              p_nivel_cumplimiento: rec.nivel_cumplimiento || null,
              p_aspectos_evaluados: Number.isFinite(rec.aspectos_evaluados) ? rec.aspectos_evaluados : null,
              p_aspectos_total: Number.isFinite(rec.aspectos_total) ? rec.aspectos_total : null,
              p_porcentaje_cumplimiento: Number.isFinite(rec.porcentaje_cumplimiento) ? rec.porcentaje_cumplimiento : null,
              p_estado_estructurado: rec.estado_estructurado || null,
            });
            await _idbDelete(rec.local_id);
          }
```

- [ ] **Step 5: Listados unificados y RPCs admin de borrador**

Agregar antes del `return` final (después de `cambiarPassword`, línea ~701):

```js
  function _fusionarUnificado(informes, borradores) {
    const marcados = [
      ...(informes || []).map(f => ({ ...f, _enCurso: false })),
      ...(borradores || []).map(f => ({ ...f, _enCurso: true })),
    ];
    return marcados.sort((a, b) => {
      const tsA = _fechaMs(a._enCurso ? (a.estado_parcial_actualizado_en || a.actualizado_en) : a.actualizado_en);
      const tsB = _fechaMs(b._enCurso ? (b.estado_parcial_actualizado_en || b.actualizado_en) : b.actualizado_en);
      return tsB - tsA;
    });
  }

  async function listMisInformesUnificado() {
    const [informes, borradores] = await Promise.all([listMisInformes(), listBorradores()]);
    return _fusionarUnificado(informes, borradores);
  }

  function listAdminBorradores() {
    return _rpc('sc_list_admin_borradores', { p_codigo: getCodigo() });
  }
  function getAdminBorrador(id) {
    return _rpc('sc_get_admin_borrador', { p_id: id, p_codigo: getCodigo() }).then(r => Array.isArray(r) ? r[0] : r);
  }

  async function listAdminInformesUnificado() {
    const [informes, borradores] = await Promise.all([listAdminInformes(), listAdminBorradores()]);
    return _fusionarUnificado(informes, borradores);
  }
```

Nota: `_fechaMs` ya existe (línea 561-564), se reutiliza sin cambios.

- [ ] **Step 6: Exportar las funciones nuevas**

Reemplazar el `return` final (línea 703-712):

```js
  return {
    getCodigo, setCodigo, clearSesion, getSesionCache, whoami, loginUsuario, esInformeFinalDeSesion,
    configurarPasswordInicial, esAdmin, eliminarUsuario, cambiarPassword,
    guardarInforme, flushPendientes, bindAutoRetry, encolarPendiente,
    guardarBorrador, scheduleBorrador, flushBorradorPendiente, programarBorradorActual,
    revisarBorradoresRemotos, listBorradores, getBorrador,
    listMisInformes, getInforme, updateInforme, deleteInforme,
    listAdminInformes, getAdminInforme, updateAdminInforme, deleteAdminInforme,
    listUsuarios, crearUsuario,
    restaurarEstadoRemoto: _restaurarEstadoRemoto,
    listMisInformesUnificado, listAdminInformesUnificado,
    listAdminBorradores, getAdminBorrador,
  };
```

- [ ] **Step 7: Ejecutar el test existente (no debe romperse)**

Run: `node test/sc-informes-borrador.test.js`
Expected: `ALL TESTS PASSED` (el sandbox del test define `state.ui = { screen: 'hacer', ... }` sin cambiarlo, así que `_crearEstadoParcial`/`_restaurarEstadoRemoto` siguen resolviendo `'hacer'`).

- [ ] **Step 8: Commit**

```bash
git add app/js/sc-informes.js
git commit -m "feat(sc-informes): estado_estructurado, restauración por fase real y listados unificados"
```

---

## Task 3: Cliente `app/js/sc-informes-ui.js` — lista unificada y restauración por tarjeta

**Files:**
- Modify: `app/js/sc-informes-ui.js`

**Interfaces:**
- Consumes: `ScInformes.listMisInformesUnificado`, `ScInformes.listAdminInformesUnificado`, `ScInformes.getBorrador`, `ScInformes.getAdminBorrador`, `ScInformes.restaurarEstadoRemoto` (Task 2). Filas con `_enCurso: true|false`.

- [ ] **Step 1: Helper de fecha local (para comparar timestamps en el handler de tarjeta)**

Agregar cerca de `_fmtFecha`/`_fmtHora` (línea 58-68):

```js
  function _fechaMsUi(value) {
    const time = Date.parse(value || '');
    return Number.isFinite(time) ? time : 0;
  }
```

- [ ] **Step 2: `_tablaInformes` — badge "En curso" y ocultar "Ver / PDF" en filas sin `informe_html`**

Reemplazar la función completa (línea 328-344):

```js
  function _tablaInformes(filas, opts) {
    if (!filas.length) {
      return '<p style="font-size:0.86rem;color:#6b7280;">Todavía no hay informes respaldados en la nube.</p>';
    }
    return `<div style="max-height:60vh;overflow:auto;display:grid;gap:10px;">
      ${filas.map(f => {
        const enCurso = !!f._enCurso;
        const m = _metaInforme(f);
        const color = m.estado === 'BUENO' ? 'var(--color-bueno)' : m.estado === 'DEFICIENTE' ? 'var(--color-deficiente)' : m.estado === 'REGULAR' ? 'var(--color-regular)' : 'var(--ink-55)';
        const aspectos = m.aspectos === null ? '—' : m.aspectos;
        const badgeEnCurso = enCurso ? '<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;background:#B45309;color:#fff;font-size:.7rem;font-weight:800;white-space:nowrap;box-shadow:0 2px 5px rgba(180,83,9,.25);">En curso</span>' : '';
        const badgeEstado = `<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;background:${color};color:#fff;font-size:.7rem;font-weight:800;white-space:nowrap;box-shadow:0 2px 5px rgba(10,46,35,.18);"><span style="width:6px;height:6px;border-radius:50%;background:#fff;"></span>${_esc(m.estado)}</span>`;
        const botonVer = enCurso ? '' : `<button type="button" data-sc-ver style="${_btnStyle('#1B4332','#fff')}">Ver / PDF</button>`;
        return `<article data-sc-id="${_esc(f.id)}" data-sc-editar-tarjeta="true" title="Toca la tarjeta para editar este informe" style="border:1px solid #DDE7E2;border-left:3px solid #0C8A5F;border-radius:12px;padding:13px;background:#fff;box-shadow:0 3px 12px rgba(10,46,35,.07);cursor:pointer;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;"><strong style="font-size:.95rem;color:var(--color-ink);">${_esc((f.establecimiento && f.establecimiento.nombre) || '—')}</strong><span style="font-size:.75rem;color:var(--color-ink3);white-space:nowrap;">${_esc(_fmtFecha(f.fecha))}</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:6px;font-size:.78rem;color:var(--color-ink2);"><span>${aspectos} aspectos evaluados</span><span style="display:inline-flex;gap:6px;align-items:center;">${badgeEnCurso}${badgeEstado}</span></div>
        <div style="margin-top:7px;display:grid;gap:3px;font-size:.78rem;color:#6B7280;">
          <span><strong style="color:#52635d;">Fecha:</strong> ${_esc(_fmtFecha(f.fecha))} · <strong style="color:#52635d;">Hora:</strong> ${_esc(_fmtHora(f.actualizado_en || f.estado_parcial_actualizado_en || f.creado_en))}</span>
          <span>${opts.admin ? `Profesional: ${_esc(f.tecnico_nombre || '—')} · ` : ''}Acta: ${_esc(f.numero_acta || '—')}</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:11px;">${botonVer}<button type="button" data-sc-eliminar style="${_btnStyle('#FFF1F2','#B91C1C')}">Eliminar</button></div>
      </article>`;
      }).join('')}
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
      </div>`;
  }
```

- [ ] **Step 3: `_wireAccionesTabla` — recibir `filas` y reescribir el handler de tarjeta**

Reemplazar la firma y el bloque `data-sc-editar-tarjeta` (línea 346-384):

```js
  function _wireAccionesTabla(opts, root, filas) {
    const get = opts.admin ? ScInformes.getAdminInforme : ScInformes.getInforme;
    const getBorradorRpc = opts.admin ? ScInformes.getAdminBorrador : ScInformes.getBorrador;
    const upd = opts.admin ? ScInformes.updateAdminInforme : ScInformes.updateInforme;
    const del = opts.admin ? ScInformes.deleteAdminInforme : ScInformes.deleteInforme;
    const recargar = opts.admin
      ? () => _renderAdmin()
      : () => _renderMisInformes(ScInformes.getSesionCache());

    const contenedor = root || _overlayEl;
    if (!contenedor) return;
    const recargarVista = opts.portada ? () => mostrarEnPortada(ScInformes.getSesionCache()) : recargar;
    contenedor.querySelectorAll('[data-sc-ver]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('[data-sc-id]').getAttribute('data-sc-id');
        try {
          const row = await get(id);
          _verHtml(row.informe_html);
        } catch (e) {
          window.Router && Router.toast && Router.toast('No se pudo abrir: ' + e.message);
        }
      });
    });
    contenedor.querySelectorAll('[data-sc-editar-tarjeta]').forEach(article => {
      article.addEventListener('click', async ev => {
        if (ev.target.closest('button')) return;
        const id = article.getAttribute('data-sc-id');
        const fila = (filas || []).find(f => f.id === id);
        try {
          const localId = fila?.local_id;
          const local = localId ? Store.get().inspecciones.find(i => i.id === localId) : null;
          const remotoMs = fila
            ? _fechaMsUi(fila._enCurso ? (fila.estado_parcial_actualizado_en || fila.actualizado_en) : fila.actualizado_en)
            : 0;
          const localMs = _fechaMsUi(local?.actualizado_en || local?.creado_en);

          if (local && localMs >= remotoMs) {
            Store.set({ currentId: local.id });
            if (Router && Router.go) Router.go('hacer');
            return;
          }

          let estadoRemoto = null;
          if (fila?._enCurso) {
            const detalle = await getBorradorRpc(id);
            estadoRemoto = detalle?.estado_parcial || null;
          } else {
            const row = await get(id);
            estadoRemoto = row?.estado_estructurado || null;
            if (!estadoRemoto) {
              Router.toast('Este informe no tiene datos editables guardados; solo se puede ver el PDF');
              return;
            }
          }
          if (!estadoRemoto) {
            Router.toast('Este informe no está disponible en este equipo para editarlo.');
            return;
          }
          const restaurada = ScInformes.restaurarEstadoRemoto(estadoRemoto);
          if (!restaurada) {
            Router.toast('Este informe no está disponible en este equipo para editarlo.');
            return;
          }
          const screenReal = Store.get().ui.screen;
          if (Router && Router.go) Router.go(screenReal);
          Router.toast('Progreso cargado desde la nube');
        } catch (e) { Router.toast(e.message || 'No se pudo abrir el informe'); }
      });
    });
    contenedor.querySelectorAll('[data-sc-eliminar]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('[data-sc-id]').getAttribute('data-sc-id');
        if (!confirm('¿Eliminar este informe respaldado? Esta acción no se puede deshacer.')) return;
        try {
          await del(id);
          await recargarVista();
        } catch (e) {
          window.Router && Router.toast && Router.toast('No se pudo eliminar: ' + e.message);
        }
      });
    });
    const btnCerrarSesion = contenedor.querySelector('[data-sc-cerrar-sesion]');
    if (btnCerrarSesion) {
      btnCerrarSesion.addEventListener('click', () => {
        ScInformes.clearSesion();
        if (opts.portada) {
          const bloque = document.getElementById('sc-registro-portada');
          if (bloque) bloque.remove();
        } else _cerrar();
      });
    }
  }
```

- [ ] **Step 4: `_renderAdmin` — usar lista unificada y pasar `filas`**

Reemplazar (línea 503-517):

```js
  async function _renderAdmin() {
    _abrirOverlay('Panel de informes (todos)', '<p style="font-size:0.8rem;color:#6b7280;">Cargando…</p>');
    let filas;
    try {
      filas = await ScInformes.listAdminInformesUnificado();
    } catch (e) {
      _abrirOverlay('Panel de informes (todos)', `<p role="alert" style="color:#b91c1c;">No se pudo cargar: ${_esc(e.message)}</p>`);
      return;
    }
    const cuerpo = _tablaInformes(filas || [], { admin: true }) + `
      <button type="button" data-sc-usuarios style="${_btnStyle('#0C8A5F','#fff')};margin-top:10px;width:100%;">Gestionar usuarios y códigos</button>`;
    _abrirOverlay('Panel de informes (todos)', cuerpo);
    _wireAccionesTabla({ admin: true }, null, filas);
    _overlayEl.querySelector('[data-sc-usuarios]').addEventListener('click', abrirGestionUsuarios);
  }
```

- [ ] **Step 5: `mostrarEnPortada` — lista unificada (técnico y admin) y `filas` en cada `_wireAccionesTabla`**

Reemplazar la función completa (línea 409-489). Los únicos cambios respecto al original: `ScInformes.listMisInformes()`/`listAdminInformes()` → variantes `Unificado`, y cada llamada a `_wireAccionesTabla` recibe ahora el arreglo de filas correspondiente a ese panel:

```js
  async function mostrarEnPortada(sesion) {
    if (!sesion) return;
    let filas;
    let usuarios = [];
    try {
      filas = sesion.rol === 'admin' ? await ScInformes.listAdminInformesUnificado() : await ScInformes.listMisInformesUnificado();
      if (sesion.rol === 'admin') usuarios = await ScInformes.listUsuarios();
    } catch (e) {
      Router.toast('No se pudieron cargar los informes: ' + (e.message || 'error'));
      return;
    }
    const contenido = document.querySelector('.home-content');
    if (!contenido) return;
    const anterior = document.getElementById('sc-registro-portada');
    if (anterior) anterior.remove();
    const bloque = document.createElement('section');
    bloque.id = 'sc-registro-portada';
    bloque.style.cssText = 'margin-top:var(--sp-lg);';
    const rolTexto = sesion.rol === 'admin' ? 'admin' : 'profesional';
    const tarjetas = _tablaInformes(filas || [], {admin: sesion.rol === 'admin'})
      .replace(/^<div style="max-height:60vh;overflow:auto;display:grid;gap:10px;">/, '')
      .replace(/<\/div>\s*<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">[\s\S]*?<\/div>\s*$/, '');
    let contenidoInformes = `<div style="display:grid;gap:10px;">${tarjetas}</div>`;
    let propiosAdmin = [];
    let profesionalesFilas = new Map();
    let historicosFilas = new Map();
    if (sesion.rol === 'admin') {
      const profesionales = (usuarios || []).filter(u => u.activo && u.rol === 'tecnico');
      const activosIds = new Set(profesionales.map(u => u.id));
      const historicos = [...new Map((filas || [])
        .filter(f => f.tecnico_id && !activosIds.has(f.tecnico_id) && f.tecnico_id !== sesion.id)
        .map(f => [f.tecnico_id, { id: f.tecnico_id, nombre: f.tecnico_nombre || 'Profesional eliminado' }])).values()];
      propiosAdmin = (filas || []).filter(f => f.tecnico_id === sesion.id);
      const misTarjetas = _tablaInformes(propiosAdmin, {admin:true})
        .replace(/^<div style="max-height:60vh;overflow:auto;display:grid;gap:10px;">/, '')
        .replace(/<\/div>\s*<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">[\s\S]*?<\/div>\s*$/, '');
      contenidoInformes = `<div class="home-section-title" style="margin-top:0;">Mis informes</div>
        <div data-sc-mis-admin="true" style="display:grid;gap:10px;margin-bottom:16px;">${misTarjetas}</div>
        <div class="home-section-title">Informes de profesionales</div>
        <p style="margin:0 0 10px;color:#52635d;font-size:.82rem;">Selecciona un profesional para ver sus informes sincronizados.</p>
        <div style="display:grid;gap:8px;">${profesionales.map(u => {
          const propios = (filas || []).filter(f => f.tecnico_id === u.id);
          profesionalesFilas.set(u.id, propios);
          const html = _tablaInformes(propios, {admin:true})
            .replace(/^<div style="max-height:60vh;overflow:auto;display:grid;gap:10px;">/, '')
            .replace(/<\/div>\s*<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">[\s\S]*?<\/div>\s*$/, '');
          return `<div><button type="button" data-sc-profesional="${_esc(u.id)}" style="width:100%;text-align:left;padding:15px;border:1px solid #DDE7E2;border-radius:12px;background:#fff;color:#0A2E23;font-size:.95rem;font-weight:700;cursor:pointer;">${_esc(u.nombre)}</button><div data-sc-reportes-prof="${_esc(u.id)}" style="display:none;margin:8px 0 4px 10px;gap:10px;">${html}</div></div>`;
        }).join('')}${historicos.map(u => {
          const propios = (filas || []).filter(f => f.tecnico_id === u.id);
          historicosFilas.set(u.id, propios);
          const html = _tablaInformes(propios, {admin:true})
            .replace(/^<div style="max-height:60vh;overflow:auto;display:grid;gap:10px;">/, '')
            .replace(/<\/div>\s*<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">[\s\S]*?<\/div>\s*$/, '');
          return `<div><button type="button" data-sc-profesional="${_esc(u.id)}" style="width:100%;text-align:left;padding:15px;border:1px solid #DDE7E2;border-radius:12px;background:#FBF7ED;color:var(--color-ink);font-size:.95rem;font-weight:700;cursor:pointer;">Histórico · ${_esc(u.nombre)}</button><div data-sc-reportes-prof="${_esc(u.id)}" style="display:none;margin:8px 0 4px 10px;gap:10px;">${html}</div></div>`;
        }).join('') || '<p style="font-size:.82rem;color:var(--color-ink3);">No hay informes de profesionales para consultar.</p>'}</div>`;
    }
    bloque.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;
        padding:12px 14px;margin-bottom:12px;background:var(--emerald-2);color:#fff;border-radius:10px;">
        <span style="font-size:.82rem;">Sesión: <strong>${_esc(sesion.nombre)}</strong> · ${rolTexto}</span>
        <span style="font-size:.78rem;white-space:nowrap;">Sesión activa</span>
      </div>
      <div class="home-section-title">${sesion.rol === 'admin' ? 'Panel administrador' : 'Mis informes'}</div>
      ${contenidoInformes}
      ${sesion.rol === 'admin' ? '<button type="button" data-sc-usuarios style="margin-top:12px;width:100%;' + _btnStyle('#0C8A5F','#fff') + '">Gestionar usuarios y códigos</button>' : ''}`;
    contenido.appendChild(bloque);
    if (sesion.rol === 'admin') {
      const misAdmin = bloque.querySelector('[data-sc-mis-admin]');
      if (misAdmin) _wireAccionesTabla({admin: true, portada: true}, misAdmin, propiosAdmin);
      bloque.querySelectorAll('[data-sc-reportes-prof]').forEach(panel => {
        const uid = panel.getAttribute('data-sc-reportes-prof');
        const propias = profesionalesFilas.get(uid) || historicosFilas.get(uid) || [];
        _wireAccionesTabla({admin: true, portada: true}, panel, propias);
      });
      bloque.querySelectorAll('[data-sc-profesional]').forEach(btn => {
        btn.addEventListener('click', () => {
          const panel = bloque.querySelector(`[data-sc-reportes-prof="${btn.getAttribute('data-sc-profesional')}"]`);
          if (panel) panel.style.display = panel.style.display === 'none' ? 'grid' : 'none';
        });
      });
    } else {
      _wireAccionesTabla({admin: false, portada: true}, bloque, filas);
    }
    const btnUsuarios = bloque.querySelector('[data-sc-usuarios]');
    if (btnUsuarios) btnUsuarios.addEventListener('click', abrirGestionUsuarios);
  }
```

- [ ] **Step 6: `iniciarSesionAutomatica` — retirar el aviso automático de borradores**

Reemplazar (línea 528-540):

```js
  async function iniciarSesionAutomatica() {
    const sesion = ScInformes.getSesionCache();
    if (sesion && sesion.usuario && ScInformes.getCodigo()) {
      await mostrarEnPortada(sesion);
      return sesion;
    }
    const nuevaSesion = await _requiereSesion();
    return nuevaSesion;
  }
```

- [ ] **Step 7: Verificación manual mínima en navegador**

No hay test automatizado de DOM para este archivo. Verificar manualmente (o con `claude-in-chrome`) tras Task 4:
1. Abrir la PWA, iniciar sesión, confirmar que "Mis informes" en portada muestra badge "En curso" en un borrador y no muestra "Ver / PDF" en esas tarjetas.
2. Confirmar que tarjetas finalizadas siguen mostrando "Ver / PDF".

- [ ] **Step 8: Commit**

```bash
git add app/js/sc-informes-ui.js
git commit -m "feat(sc-informes-ui): lista unificada de informes y restauración cross-device por tarjeta"
```

---

## Task 4: Disparar sincronización desde Planificar, Verificar, Actuar y Personalizar

**Files:**
- Modify: `app/js/phva/planificar.js:2455`, `app/js/phva/planificar.js:2513`, `app/js/phva/verificar.js:5`, `app/js/phva/actuar.js:22`, `app/js/phva/actuar.js:1429`, `app/js/phva/personalizar.js:21`

**Interfaces:**
- Consumes: `ScInformes.programarBorradorActual()` (ya existe en `sc-informes.js`, sin cambios — exportada desde PR #22 pero sin ningún caller hasta ahora).

- [ ] **Step 1: `planificar.js` — wizard V2 (línea 2455)**

```js
    Store.upsertInspeccion(inspeccion); Store.clearPlanificarDraft(); Store.setUI({ aspectoIdx: 0, programaIdx: 0 });
    if (typeof ScInformes !== 'undefined' && ScInformes.programarBorradorActual) ScInformes.programarBorradorActual();
    Router.go('personalizar');
```

- [ ] **Step 2: `planificar.js` — formulario clásico (línea 2513)**

```js
    Store.upsertInspeccion(inspeccion);
    Store.clearPlanificarDraft();
    Store.setUI({ aspectoIdx: 0, programaIdx: 0 });
    if (typeof ScInformes !== 'undefined' && ScInformes.programarBorradorActual) ScInformes.programarBorradorActual();
    Router.toast('Establecimiento guardado');
    Router.go('personalizar');
```

- [ ] **Step 3: `verificar.js` — render() (línea 5)**

```js
  function render() {
    const inspeccion = Store.getCurrentInspeccion(); if (!inspeccion) return _vacio();
    Scores.calcular(inspeccion); Hallazgos.actualizar(inspeccion); Store.upsertInspeccion(inspeccion);
    if (typeof ScInformes !== 'undefined' && ScInformes.programarBorradorActual) ScInformes.programarBorradorActual();
    const sc = inspeccion.score, hallazgos = inspeccion.hallazgos_criticos || [];
```

- [ ] **Step 4: `actuar.js` — render(), sincronización de número de acta (línea 17-23)**

```js
  function render() {
    const inspeccion = Store.getCurrentInspeccion();
    if (!inspeccion) return _sinInspeccion();

    if (_sincronizarNumeroActa(inspeccion)) {
      Store.upsertInspeccion(inspeccion);
      if (typeof ScInformes !== 'undefined' && ScInformes.programarBorradorActual) ScInformes.programarBorradorActual();
    }
```

- [ ] **Step 5: `actuar.js` — guardarFirmas() (línea 1429)**

```js
    Store.upsertInspeccion(inspeccion);
    if (typeof ScInformes !== 'undefined' && ScInformes.programarBorradorActual) ScInformes.programarBorradorActual();
    _forceCaptura = false;
    _respaldarEnNube(inspeccion); // usa la sesión iniciada, sin pedir código en Firmas
```

- [ ] **Step 6: `personalizar.js` — comenzar() (línea 21)**

```js
    inspeccion.fase_phva = 'H'; Scores.calcular(inspeccion); Store.upsertInspeccion(inspeccion);
    if (typeof ScInformes !== 'undefined' && ScInformes.programarBorradorActual) ScInformes.programarBorradorActual();
    Store.setUI({ programaIdx: 0, aspectoIdx: 0 }); Router.go('hacer');
```

- [ ] **Step 7: Verificación manual — el disparo no bloquea la navegación**

En navegador (con sesión SaniCheck activa): completar Planificar → Personalizar → avanzar a Verificar/Actuar, confirmar que no hay demoras ni errores de consola, y que el borrador remoto se actualiza (revisar Network → RPC `sc_guardar_borrador`).

- [ ] **Step 8: Commit**

```bash
git add app/js/phva/planificar.js app/js/phva/verificar.js app/js/phva/actuar.js app/js/phva/personalizar.js
git commit -m "feat(phva): sincronizar borrador remoto desde Planificar, Verificar, Actuar y Personalizar"
```

---

## Task 5: Pruebas automatizadas de continuidad por fase

**Files:**
- Create: `test/sc-informes-continuidad.test.js`

**Interfaces:**
- Consumes: `app/js/sc-informes.js` cargado vía `vm` (mismo patrón que `test/sc-informes-borrador.test.js`), específicamente `_crearEstadoParcial` (no exportada — se prueba indirectamente vía `scheduleBorrador`) y `ScInformes.restaurarEstadoRemoto`.

- [ ] **Step 1: Escribir el test**

```js
/**
 * Prueba de continuidad cross-device:
 * 1) el snapshot de borrador respeta la pantalla real (no fuerza 'hacer');
 * 2) restaurarEstadoRemoto navega a esa pantalla y conserva fotos locales por id.
 * Run: node test/sc-informes-continuidad.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app/js/sc-informes.js'), 'utf8');
const local = { sanicheck_sc_codigo_acceso: 'TEST-CODIGO' };
const state = { inspecciones: [], currentId: null, ui: { screen: 'verificar', programaIdx: 1, aspectoIdx: 2 } };
const rpcCalls = [];

function inspection() {
  return {
    id: 'psb-continuidad-001',
    fase_phva: 'V',
    establecimiento: { nombre: 'Establecimiento continuidad', nit: '900000002' },
    inspeccion: { fecha: '2026-09-02', numero_acta: 'PSB-2026-0002' },
    numero_acta: 'PSB-2026-0002',
    programas: [{
      id: 'edificacion',
      codigo: 'EDI',
      nombre: 'edificacion',
      aspectos: [{
        id: 'edificacion_1',
        texto: 'Aspecto 1',
        criterio: 'A',
        observaciones: '',
        fotografias: [{ id: 'foto-local-1', data: 'base64-local' }],
      }],
    }],
    score: { total: 1, pct_cumplimiento: 100 },
    creado_en: '2026-09-02T10:00:00.000Z',
    actualizado_en: '2026-09-02T10:00:00.000Z',
  };
}

const sandbox = {
  localStorage: {
    getItem: key => local[key] ?? null,
    setItem: (key, value) => { local[key] = String(value); },
    removeItem: key => { delete local[key]; },
  },
  window: {
    SC_INFORMES_CONFIG: { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'anon' },
    addEventListener: () => {},
    confirm: () => true,
  },
  document: { addEventListener: () => {} },
  navigator: { onLine: true },
  Store: {
    get: () => state,
    getCurrentInspeccion: () => state.inspecciones.find(i => i.id === state.currentId) || null,
    set: partial => Object.assign(state, partial),
  },
  Scores: { criterio: aspecto => aspecto.criterio || aspecto.evaluacion || null },
  Router: { go: () => {}, toast: () => {} },
  fetch: async (url, options) => {
    const body = JSON.parse(options.body || '{}');
    const rpc = url.split('/').pop();
    rpcCalls.push({ rpc, body });
    return { ok: true, text: async () => JSON.stringify([{ id: 'remote-continuidad-001' }]) };
  },
  console,
  setTimeout,
  clearTimeout,
  Date,
  JSON,
  Promise,
};

vm.createContext(sandbox);
vm.runInContext(source + '\nthis.ScInformes = ScInformes;', sandbox);

let failed = 0;
function assert(condition, message) {
  if (!condition) { console.error('FAIL:', message); failed++; }
  else console.log('OK:', message);
}
function waitTurn() { return new Promise(resolve => setTimeout(resolve, 0)); }

(async () => {
  const localInspection = inspection();
  state.inspecciones = [localInspection];
  state.currentId = localInspection.id;

  // 1) El snapshot respeta Store.ui.screen = 'verificar' (no fuerza 'hacer').
  sandbox.ScInformes.scheduleBorrador(localInspection, { force: true, aspectKey: 'edificacion:edificacion_1:base' });
  await waitTurn();
  const guardado = rpcCalls.find(c => c.rpc === 'sc_guardar_borrador');
  assert(!!guardado, 'se genera un guardado incremental');
  assert(guardado.body.p_estado_parcial.ui.screen === 'verificar',
    'el snapshot usa la pantalla real (verificar), no "hacer" fijo');

  // 2) restaurarEstadoRemoto navega a la pantalla recibida y conserva fotos locales por id.
  const payloadEstado = {
    local_id: localInspection.id,
    ui: { screen: 'actuar', programaIdx: 0, aspectoIdx: 0 },
    inspeccion: {
      ...guardado.body.p_estado_parcial.inspeccion,
      programas: [{
        id: 'edificacion',
        codigo: 'EDI',
        nombre: 'edificacion',
        aspectos: [{ id: 'edificacion_1', texto: 'Aspecto 1', criterio: 'A', observaciones: 'actualizado desde B' }],
      }],
    },
  };
  const restaurada = sandbox.ScInformes.restaurarEstadoRemoto(payloadEstado);
  assert(!!restaurada, 'restaurarEstadoRemoto devuelve la inspección restaurada');
  assert(state.ui.screen === 'actuar', 'Store.ui.screen navega a la pantalla recibida (actuar)');
  assert(restaurada.programas[0].aspectos[0].fotografias?.[0]?.id === 'foto-local-1',
    'las fotografías locales se conservan por id tras restaurar desde el remoto');
  assert(restaurada.programas[0].aspectos[0].observaciones === 'actualizado desde B',
    'el texto/observaciones del remoto reemplaza al local');

  if (failed) process.exit(1);
  console.log('\nALL TESTS PASSED');
})().catch(error => { console.error(error); process.exit(1); });
```

- [ ] **Step 2: Ejecutar y verificar**

Run: `node test/sc-informes-continuidad.test.js`
Expected: `ALL TESTS PASSED`

- [ ] **Step 3: Ejecutar también el test previo (regresión)**

Run: `node test/sc-informes-borrador.test.js`
Expected: `ALL TESTS PASSED`

- [ ] **Step 4: Commit**

```bash
git add test/sc-informes-continuidad.test.js
git commit -m "test(sc-informes): continuidad cross-device — pantalla real y fotos locales preservadas"
```

---

## Task 6: Build, verificación manual cross-device y despliegue

**Files:**
- Modify (generado por script, no a mano): `app/sw.js` (BUILD_HASH/CACHE), `app/version.json`, `package.json` (version, si aplica bump)

**Interfaces:**
- Consumes: `npm run build` (ya existente — `scripts/sync-version.js` + `scripts/generate-portal-config-secrets.js` + `build.js`).

- [ ] **Step 1: Regenerar versión/cache**

Run: `npm run build`
Expected: sin errores; `app/sw.js` tiene un `BUILD_HASH` nuevo distinto al commit `a507315`.

- [ ] **Step 2: Verificación manual cross-device (paso 6 del spec)**

1. Crear inspección en navegador A, avanzar hasta Planificar completo + algunas respuestas en Hacer, sin pasar por Verificar/Actuar.
2. Iniciar sesión con el mismo código en navegador B (perfil distinto/incógnito).
3. Abrir "Mis informes", confirmar que aparece con badge "En curso", tocarla.
4. Confirmar que carga en la fase correcta con todas las respuestas/hallazgos, y que se puede seguir editando y guardando desde B.
5. Finalizar el informe desde B, confirmar que aparece como finalizado en A al refrescar "Mis informes", y que tocarlo en A (sin haber estado nunca ahí) permite reabrir el checklist.

- [ ] **Step 3: Commit de versión/build**

```bash
git add app/sw.js app/version.json package.json
git commit -m "chore: bump SW cache hash [skip ci]"
```

- [ ] **Step 4: Verificación en producción tras el deploy**

Run: `curl -s https://sanicheck.pages.dev/app/version.json`
Expected: el campo `build` coincide con el `BUILD_HASH` del Step 1.

---

## Task 7: Admin continúa (no forkea) el borrador/informe de otro técnico

**Contexto (hallazgo de la revisión final de rama, no estaba en el diseño original):** `sc_guardar_borrador`/`sc_guardar_informe` hacen `ON CONFLICT (tecnico_id, local_id)`. Cuando un admin restaura y continúa editando el borrador — o reabre y vuelve a guardar el informe ya finalizado — de OTRO técnico, el primer guardado del admin usa su propio `tecnico_id` (distinto al del técnico original) y crea una **fila duplicada** en vez de continuar la original: el borrador del técnico queda huérfano "en curso" para siempre, y si el admin finaliza, el informe queda mal atribuido. El requerimiento original ("Admin: puede ver y **continuar** la inspección en curso de cualquier técnico") solo funciona a medias sin este fix.

**Files:**
- Create: `supabase/migrations/migration_sc_informes_admin_continuidad.sql`
- Modify: `app/js/sc-informes.js`
- Modify: `app/js/sc-informes-ui.js`
- Create: `test/sc-informes-admin-ajeno.test.js`

**Interfaces:**
- Produces: RPCs `sc_guardar_admin_borrador(p_id uuid, p_codigo text, p_estado_parcial jsonb)` y `sc_guardar_admin_informe(p_id uuid, p_codigo text, p_html text, p_numero_acta text DEFAULT NULL, p_nivel_cumplimiento text DEFAULT NULL, p_aspectos_evaluados integer DEFAULT NULL, p_aspectos_total integer DEFAULT NULL, p_porcentaje_cumplimiento integer DEFAULT NULL, p_estado_estructurado jsonb DEFAULT NULL)` — actualizan la fila original por `id`, sin tocar `tecnico_id`, admin-gated. Ambas son funciones nuevas (sin firma previa), así que `CREATE OR REPLACE FUNCTION` es seguro aquí (no aplica el problema de overload duplicado de la Tarea 1/6 — ese solo ocurre al agregar parámetros a una función YA existente).
- Consumes: nada nuevo del lado servidor — reutiliza `sc_resolver_actor`, `sc_sanitizar_html`, mismas validaciones de tamaño/fotografías que `sc_guardar_borrador`/`sc_guardar_informe`.

- [ ] **Step 1: Migración SQL**

```sql
-- migration_sc_informes_admin_continuidad.sql
-- Cierra el hueco encontrado en revisión final de la rama
-- feature/continuidad-cross-device: cuando un admin continúa (no solo ve) la
-- inspección en curso — o reabre y re-guarda el informe ya finalizado — de
-- OTRO técnico, sc_guardar_borrador/sc_guardar_informe usan
-- ON CONFLICT (tecnico_id, local_id): como el tecnico_id del admin es
-- distinto al del técnico original, el primer guardado del admin creaba una
-- fila DUPLICADA en vez de continuar la original. Se agregan 2 RPCs admin
-- que actualizan la fila original por id (sin tocar tecnico_id).

CREATE OR REPLACE FUNCTION public.sc_guardar_admin_borrador(
  p_id uuid,
  p_codigo text,
  p_estado_parcial jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor sc_usuarios;
BEGIN
  v_actor := public.sc_resolver_actor(p_codigo);
  IF v_actor.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  IF p_estado_parcial IS NULL
     OR jsonb_typeof(p_estado_parcial) <> 'object'
     OR COALESCE(p_estado_parcial->>'estado', '') <> 'en_curso'
     OR pg_column_size(p_estado_parcial) > 524288
     OR p_estado_parcial ? 'fotografias'
  THEN
    RAISE EXCEPTION 'Estado parcial inválido o demasiado grande';
  END IF;

  UPDATE public.sc_informes
     SET estado_parcial = p_estado_parcial,
         estado_parcial_actualizado_en = now(),
         estado_estructurado = p_estado_parcial,
         estado_estructurado_actualizado_en = now()
   WHERE id = p_id
     AND estado_parcial IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Borrador no encontrado';
  END IF;

  RETURN p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sc_guardar_admin_informe(
  p_id uuid,
  p_codigo text,
  p_html text,
  p_numero_acta text DEFAULT NULL,
  p_nivel_cumplimiento text DEFAULT NULL,
  p_aspectos_evaluados integer DEFAULT NULL,
  p_aspectos_total integer DEFAULT NULL,
  p_porcentaje_cumplimiento integer DEFAULT NULL,
  p_estado_estructurado jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor sc_usuarios;
BEGIN
  v_actor := public.sc_resolver_actor(p_codigo);
  IF v_actor.rol <> 'admin' THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  IF p_nivel_cumplimiento IS NOT NULL
     AND p_nivel_cumplimiento NOT IN ('BUENO','REGULAR','DEFICIENTE')
     OR p_aspectos_evaluados IS NOT NULL
     AND p_aspectos_evaluados < 0
     OR p_aspectos_total IS NOT NULL
     AND p_aspectos_total < 0
     OR p_porcentaje_cumplimiento IS NOT NULL
     AND p_porcentaje_cumplimiento NOT BETWEEN 0 AND 100
  THEN
    RAISE EXCEPTION 'Metadata de informe inválida';
  END IF;

  IF p_estado_estructurado IS NOT NULL
     AND (jsonb_typeof(p_estado_estructurado) <> 'object'
          OR pg_column_size(p_estado_estructurado) > 524288
          OR p_estado_estructurado ? 'fotografias')
  THEN
    RAISE EXCEPTION 'Estado estructurado inválido o demasiado grande';
  END IF;

  UPDATE public.sc_informes
     SET informe_html = public.sc_sanitizar_html(p_html),
         numero_acta = COALESCE(p_numero_acta, numero_acta),
         nivel_cumplimiento = COALESCE(p_nivel_cumplimiento, nivel_cumplimiento),
         aspectos_evaluados = COALESCE(p_aspectos_evaluados, aspectos_evaluados),
         aspectos_total = COALESCE(p_aspectos_total, aspectos_total),
         porcentaje_cumplimiento = COALESCE(p_porcentaje_cumplimiento, porcentaje_cumplimiento),
         estado_parcial = NULL,
         estado_parcial_actualizado_en = NULL,
         estado_estructurado = COALESCE(p_estado_estructurado, estado_estructurado),
         estado_estructurado_actualizado_en = CASE WHEN p_estado_estructurado IS NOT NULL
           THEN now() ELSE estado_estructurado_actualizado_en END,
         actualizado_en = now()
   WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Informe no encontrado';
  END IF;

  RETURN p_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.sc_guardar_admin_borrador(uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_guardar_admin_borrador(uuid,text,jsonb) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.sc_guardar_admin_informe(uuid,text,text,text,text,integer,integer,integer,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_guardar_admin_informe(uuid,text,text,text,text,integer,integer,integer,jsonb) TO anon, authenticated;
```

Este archivo NO se aplica solo con `npm run build` — requiere aplicarse contra Supabase (`isncjtomlvxyvcaohcpx`) igual que la Tarea 1, con confirmación explícita antes de tocar producción.

- [ ] **Step 2: `app/js/sc-informes.js` — bookkeeping de "borrador/informe ajeno bajo edición admin"**

Agregar constante junto a `LS_FINALES` (línea 18):

```js
  const LS_AJENOS  = 'sanicheck_sc_admin_ajenos';
```

Agregar helpers después de `esInformeFinalDeSesion` (después de línea 94, antes de `// ── RPC`):

```js
  // Cuando un admin continúa (no solo ve) el borrador o informe finalizado de
  // OTRO técnico, el guardado debe apuntar a la fila original por id (RPCs
  // sc_guardar_admin_borrador/sc_guardar_admin_informe) en vez de
  // sc_guardar_borrador/sc_guardar_informe (que conflictúan por
  // (tecnico_id, local_id) y crearían una fila duplicada, ya que el
  // tecnico_id del admin difiere del técnico dueño original).
  function _leerAjenos() {
    try { return JSON.parse(localStorage.getItem(LS_AJENOS) || '{}'); } catch (e) { return {}; }
  }
  function _marcarAjeno(localId, remoteId) {
    if (!localId || !remoteId) return;
    const map = _leerAjenos();
    map[localId] = remoteId;
    try { localStorage.setItem(LS_AJENOS, JSON.stringify(map)); } catch (e) {}
  }
  function _remoteIdAjeno(localId) {
    return _leerAjenos()[localId] || null;
  }
```

- [ ] **Step 3: `_restaurarEstadoRemoto` — marcar ajeno cuando corresponda**

Reemplazar (bloque actual, después de Tarea 2/3):

```js
  function _restaurarEstadoRemoto(payloadEstado) {
    const remoto = payloadEstado?.inspeccion;
    const localId = payloadEstado?.local_id;
    if (!remoto?.programas?.length || !localId) return null;
    const actual = (typeof Store !== 'undefined' && Store.get) ? Store.get() : { inspecciones: [], ui: {} };
    const local = (actual.inspecciones || []).find(i => i.id === localId) || null;
    const restaurada = { ...(local || {}), ...remoto, id: localId };
    if (local?.firmas && !restaurada.firmas) restaurada.firmas = local.firmas;
    _conservarFotografias(local, restaurada);
    restaurada.actualizado_en = new Date().toISOString();
    const inspecciones = (actual.inspecciones || []).filter(i => i.id !== localId);
    inspecciones.unshift(restaurada);
    const screenReal = UI_SCREENS.includes(payloadEstado.ui?.screen) ? payloadEstado.ui.screen : 'hacer';
    const ui = { ...(actual.ui || {}), ...(payloadEstado.ui || {}), screen: screenReal };
    Store.set({ inspecciones, currentId: localId, ui });
    return restaurada;
  }
```

por:

```js
  function _restaurarEstadoRemoto(payloadEstado, remoteId) {
    const remoto = payloadEstado?.inspeccion;
    const localId = payloadEstado?.local_id;
    if (!remoto?.programas?.length || !localId) return null;
    const actual = (typeof Store !== 'undefined' && Store.get) ? Store.get() : { inspecciones: [], ui: {} };
    const local = (actual.inspecciones || []).find(i => i.id === localId) || null;
    const restaurada = { ...(local || {}), ...remoto, id: localId };
    if (local?.firmas && !restaurada.firmas) restaurada.firmas = local.firmas;
    _conservarFotografias(local, restaurada);
    restaurada.actualizado_en = new Date().toISOString();
    const inspecciones = (actual.inspecciones || []).filter(i => i.id !== localId);
    inspecciones.unshift(restaurada);
    const screenReal = UI_SCREENS.includes(payloadEstado.ui?.screen) ? payloadEstado.ui.screen : 'hacer';
    const ui = { ...(actual.ui || {}), ...(payloadEstado.ui || {}), screen: screenReal };
    Store.set({ inspecciones, currentId: localId, ui });
    if (remoteId) _marcarAjeno(localId, remoteId);
    return restaurada;
  }
```

`_restaurarBorradorLocal` (wrapper delgado existente, sin cambios — sigue llamando con 1 solo argumento, nunca marca ajeno, correcto: su único caller `revisarBorradoresRemotos` solo usa el listado propio del técnico).

- [ ] **Step 4: `guardarInforme` — enrutar a la RPC admin cuando el informe es ajeno**

Reemplazar el cuerpo completo de `guardarInforme`:

```js
  async function guardarInforme(payload) {
    const codigo = getCodigo();
    if (!codigo) return { ok: false, sinCodigo: true };

    let estadoEstructurado = null;
    try {
      const inspeccion = (typeof Store !== 'undefined' && Store.get)
        ? (Store.get().inspecciones || []).find(i => i.id === payload.localId) : null;
      if (inspeccion) estadoEstructurado = _crearEstadoParcial(inspeccion, null, 'finalizada');
    } catch (e) { estadoEstructurado = null; }

    const ajenoId = _remoteIdAjeno(payload.localId);

    const params = ajenoId ? {
      p_id: ajenoId,
      p_codigo: codigo,
      p_html: payload.html,
      p_numero_acta: payload.numeroActa || null,
      p_nivel_cumplimiento: payload.nivelCumplimiento || null,
      p_aspectos_evaluados: Number.isFinite(payload.aspectosEvaluados) ? payload.aspectosEvaluados : null,
      p_aspectos_total: Number.isFinite(payload.aspectosTotal) ? payload.aspectosTotal : null,
      p_porcentaje_cumplimiento: Number.isFinite(payload.porcentajeCumplimiento) ? payload.porcentajeCumplimiento : null,
      p_estado_estructurado: estadoEstructurado,
    } : {
      p_codigo: codigo,
      p_establecimiento: payload.establecimiento || {},
      p_fecha: payload.fecha,
      p_html: payload.html,
      p_local_id: payload.localId || null,
      p_numero_acta: payload.numeroActa || null,
      p_nivel_cumplimiento: payload.nivelCumplimiento || null,
      p_aspectos_evaluados: Number.isFinite(payload.aspectosEvaluados) ? payload.aspectosEvaluados : null,
      p_aspectos_total: Number.isFinite(payload.aspectosTotal) ? payload.aspectosTotal : null,
      p_porcentaje_cumplimiento: Number.isFinite(payload.porcentajeCumplimiento) ? payload.porcentajeCumplimiento : null,
      p_estado_estructurado: estadoEstructurado,
    };
    try {
      const id = await _rpc(ajenoId ? 'sc_guardar_admin_informe' : 'sc_guardar_informe', params);
      await _retirarBorradorPendiente(payload.localId);
      _registrarFinalDeSesion(payload.localId);
      return { ok: true, id };
    } catch (e) {
      if (/código de acceso inválido/i.test(e.message || '')) {
        return { ok: false, codigoInvalido: true };
      }
      const pendiente = {
        local_id: payload.localId || ('sc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
        codigo,
        establecimiento: payload.establecimiento || {},
        fecha: payload.fecha,
        html: payload.html,
        numero_acta: payload.numeroActa || null,
        nivel_cumplimiento: payload.nivelCumplimiento || null,
        aspectos_evaluados: Number.isFinite(payload.aspectosEvaluados) ? payload.aspectosEvaluados : null,
        aspectos_total: Number.isFinite(payload.aspectosTotal) ? payload.aspectosTotal : null,
        porcentaje_cumplimiento: Number.isFinite(payload.porcentajeCumplimiento) ? payload.porcentajeCumplimiento : null,
        estado_estructurado: estadoEstructurado,
        ajeno_id: ajenoId || null,
      };
      try {
        await encolarPendiente(pendiente);
        await _retirarBorradorPendiente(payload.localId);
        return { ok: false, encolado: true, error: e.message };
      } catch (outboxError) {
        return {
          ok: false,
          outboxUnavailable: true,
          error: e.message,
          outboxError: outboxError.message,
        };
      }
    }
  }
```

- [ ] **Step 5: `guardarBorrador` — enrutar a la RPC admin cuando el borrador es ajeno**

Reemplazar el cuerpo completo de `guardarBorrador`:

```js
  async function guardarBorrador(payload) {
    const codigo = getCodigo();
    if (!codigo) return { ok: false, sinCodigo: true };
    const ajenoId = _remoteIdAjeno(payload.localId);
    const params = ajenoId ? {
      p_id: ajenoId,
      p_codigo: codigo,
      p_estado_parcial: payload.estadoParcial,
    } : {
      p_codigo: codigo,
      p_establecimiento: payload.establecimiento || {},
      p_fecha: payload.fecha,
      p_local_id: payload.localId,
      p_numero_acta: payload.numeroActa || null,
      p_estado_parcial: payload.estadoParcial,
    };
    try {
      const id = await _rpc(ajenoId ? 'sc_guardar_admin_borrador' : 'sc_guardar_borrador', params);
      return { ok: true, id };
    } catch (e) {
      if (/código de acceso inválido/i.test(e.message || '')) {
        return { ok: false, codigoInvalido: true };
      }
      const pendiente = {
        local_id: payload.localId,
        codigo,
        establecimiento: payload.establecimiento || {},
        fecha: payload.fecha,
        numero_acta: payload.numeroActa || null,
        estado_parcial: payload.estadoParcial,
        ajeno_id: ajenoId || null,
      };
      try {
        await encolarBorrador(pendiente);
        return { ok: false, encolado: true, error: e.message };
      } catch (outboxError) {
        return { ok: false, outboxUnavailable: true, error: e.message, outboxError: outboxError.message };
      }
    }
  }
```

- [ ] **Step 6: `flushPendientes` — reintento del outbox debe usar la RPC admin cuando `ajeno_id` está presente**

Reemplazar el `for (const rec of listos) { try { ... } ... }` (bloque `if (rec._tipoPendiente === 'borrador') { ... } else { ... }`) por:

```js
      for (const rec of listos) {
        try {
          if (rec._tipoPendiente === 'borrador') {
            if (rec.ajeno_id) {
              await _rpc('sc_guardar_admin_borrador', {
                p_id: rec.ajeno_id,
                p_codigo: rec.codigo,
                p_estado_parcial: rec.estado_parcial,
              });
            } else {
              await _rpc('sc_guardar_borrador', {
                p_codigo: rec.codigo,
                p_establecimiento: rec.establecimiento,
                p_fecha: rec.fecha,
                p_local_id: rec.local_id,
                p_numero_acta: rec.numero_acta || null,
                p_estado_parcial: rec.estado_parcial,
              });
            }
            await _idbDeleteDraft(rec.local_id);
          } else {
            if (rec.ajeno_id) {
              await _rpc('sc_guardar_admin_informe', {
                p_id: rec.ajeno_id,
                p_codigo: rec.codigo,
                p_html: rec.html,
                p_numero_acta: rec.numero_acta || null,
                p_nivel_cumplimiento: rec.nivel_cumplimiento || null,
                p_aspectos_evaluados: Number.isFinite(rec.aspectos_evaluados) ? rec.aspectos_evaluados : null,
                p_aspectos_total: Number.isFinite(rec.aspectos_total) ? rec.aspectos_total : null,
                p_porcentaje_cumplimiento: Number.isFinite(rec.porcentaje_cumplimiento) ? rec.porcentaje_cumplimiento : null,
                p_estado_estructurado: rec.estado_estructurado || null,
              });
            } else {
              await _rpc('sc_guardar_informe', {
                p_codigo: rec.codigo,
                p_establecimiento: rec.establecimiento,
                p_fecha: rec.fecha,
                p_html: rec.html,
                p_local_id: rec.local_id,
                p_numero_acta: rec.numero_acta || null,
                p_nivel_cumplimiento: rec.nivel_cumplimiento || null,
                p_aspectos_evaluados: Number.isFinite(rec.aspectos_evaluados) ? rec.aspectos_evaluados : null,
                p_aspectos_total: Number.isFinite(rec.aspectos_total) ? rec.aspectos_total : null,
                p_porcentaje_cumplimiento: Number.isFinite(rec.porcentaje_cumplimiento) ? rec.porcentaje_cumplimiento : null,
                p_estado_estructurado: rec.estado_estructurado || null,
              });
            }
            await _idbDelete(rec.local_id);
          }
          n++;
        } catch (e) {
          rec.intentos = (rec.intentos || 0) + 1;
          rec.ultimo_intento = Date.now();
          if (rec._tipoPendiente === 'borrador') await _idbPutDraft(rec);
          else await _idbPut(rec); // nunca se borra por fallo: no perder el informe
          console.warn('[ScInformes] reintento pendiente', rec.local_id, e.message);
        }
      }
```

(El resto de `flushPendientes` — `_syncing`, `_idbGetAll`/`_idbGetAllDrafts`, el filtro `listos`, el `finally` — no cambia.)

- [ ] **Step 7: `app/js/sc-informes-ui.js` — marcar ajeno al restaurar desde el handler de tarjeta**

En el handler `data-sc-editar-tarjeta` dentro de `_wireAccionesTabla`, reemplazar:

```js
          let estadoRemoto = null;
          if (fila?._enCurso) {
            const detalle = await getBorradorRpc(id);
            estadoRemoto = detalle?.estado_parcial || null;
          } else {
            const row = await get(id);
            estadoRemoto = row?.estado_estructurado || null;
            if (!estadoRemoto) {
              Router.toast('Este informe no tiene datos editables guardados; solo se puede ver el PDF');
              return;
            }
          }
          if (!estadoRemoto) {
            Router.toast('Este informe no está disponible en este equipo para editarlo.');
            return;
          }
          const restaurada = ScInformes.restaurarEstadoRemoto(estadoRemoto);
```

por:

```js
          // Un admin editando el borrador/informe de OTRO técnico debe seguir
          // guardando bajo el dueño original (sc_guardar_admin_borrador/
          // sc_guardar_admin_informe) — no forkear una fila nueva a su propio
          // tecnico_id. `id` es el uuid de la fila remota, el mismo que
          // necesitan esas RPCs.
          const esAjeno = !!(opts.admin && fila?.tecnico_id && fila.tecnico_id !== ScInformes.getSesionCache()?.id);

          let estadoRemoto = null;
          if (fila?._enCurso) {
            const detalle = await getBorradorRpc(id);
            estadoRemoto = detalle?.estado_parcial || null;
          } else {
            const row = await get(id);
            estadoRemoto = row?.estado_estructurado || null;
            if (!estadoRemoto) {
              Router.toast('Este informe no tiene datos editables guardados; solo se puede ver el PDF');
              return;
            }
          }
          if (!estadoRemoto) {
            Router.toast('Este informe no está disponible en este equipo para editarlo.');
            return;
          }
          const restaurada = ScInformes.restaurarEstadoRemoto(estadoRemoto, esAjeno ? id : null);
```

(El resto del handler — cálculo de `screenReal`, `Router.go`, toast final, catch — no cambia.)

- [ ] **Step 8: Test — `test/sc-informes-admin-ajeno.test.js`**

```js
/**
 * Prueba: un admin que continúa el borrador de OTRO técnico debe guardar
 * sobre la fila original (sc_guardar_admin_borrador/sc_guardar_admin_informe
 * por id), nunca crear una fila nueva vía sc_guardar_borrador/
 * sc_guardar_informe con su propio tecnico_id.
 * Run: node test/sc-informes-admin-ajeno.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app/js/sc-informes.js'), 'utf8');
const local = { sanicheck_sc_codigo_acceso: 'ADMIN-CODIGO' };
const state = { inspecciones: [], currentId: null, ui: { screen: 'hacer', programaIdx: 0, aspectoIdx: 0 } };
const rpcCalls = [];

function inspeccionAjena() {
  return {
    id: 'psb-ajeno-001',
    fase_phva: 'H',
    establecimiento: { nombre: 'Establecimiento de otro técnico', nit: '900000003' },
    inspeccion: { fecha: '2026-09-02', numero_acta: 'PSB-2026-0003' },
    numero_acta: 'PSB-2026-0003',
    programas: [{
      id: 'edificacion', codigo: 'EDI', nombre: 'edificacion',
      aspectos: [{ id: 'edificacion_1', texto: 'Aspecto 1', criterio: 'A', observaciones: '', fotografias: [] }],
    }],
    score: { total: 1, pct_cumplimiento: 100 },
    creado_en: '2026-09-02T10:00:00.000Z',
    actualizado_en: '2026-09-02T10:00:00.000Z',
  };
}

const sandbox = {
  localStorage: {
    getItem: key => local[key] ?? null,
    setItem: (key, value) => { local[key] = String(value); },
    removeItem: key => { delete local[key]; },
  },
  window: {
    SC_INFORMES_CONFIG: { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'anon' },
    addEventListener: () => {},
    confirm: () => true,
  },
  document: { addEventListener: () => {} },
  navigator: { onLine: true },
  Store: {
    get: () => state,
    getCurrentInspeccion: () => state.inspecciones.find(i => i.id === state.currentId) || null,
    set: partial => Object.assign(state, partial),
  },
  Scores: { criterio: aspecto => aspecto.criterio || aspecto.evaluacion || null },
  Router: { go: () => {}, toast: () => {} },
  fetch: async (url, options) => {
    const body = JSON.parse(options.body || '{}');
    const rpc = url.split('/').pop();
    rpcCalls.push({ rpc, body });
    return { ok: true, text: async () => JSON.stringify([{ id: 'remote-ajeno-001' }]) };
  },
  console,
  setTimeout,
  clearTimeout,
  Date,
  JSON,
  Promise,
};

vm.createContext(sandbox);
vm.runInContext(source + '\nthis.ScInformes = ScInformes;', sandbox);

let failed = 0;
function assert(condition, message) {
  if (!condition) { console.error('FAIL:', message); failed++; }
  else console.log('OK:', message);
}
function waitTurn() { return new Promise(resolve => setTimeout(resolve, 0)); }

(async () => {
  // 1) Restaurar como admin un borrador AJENO (con remoteId) marca el local_id como ajeno.
  const insp = inspeccionAjena();
  const payloadEstado = {
    local_id: insp.id,
    ui: { screen: 'verificar', programaIdx: 0, aspectoIdx: 0 },
    inspeccion: insp,
  };
  const restaurada = sandbox.ScInformes.restaurarEstadoRemoto(payloadEstado, 'remote-row-uuid-999');
  assert(!!restaurada, 'restaurarEstadoRemoto restaura la inspección ajena');
  assert(state.inspecciones.find(i => i.id === insp.id), 'la inspección ajena queda en Store');

  // 2) Guardar el borrador ajeno debe llamar sc_guardar_admin_borrador con p_id = remoteId,
  //    nunca sc_guardar_borrador.
  sandbox.ScInformes.scheduleBorrador(state.inspecciones[0], { force: true, flushOnExit: true, aspectKey: 'x' });
  await waitTurn();
  const llamadaBorrador = rpcCalls.find(c => c.rpc === 'sc_guardar_admin_borrador' || c.rpc === 'sc_guardar_borrador');
  assert(llamadaBorrador?.rpc === 'sc_guardar_admin_borrador', 'el guardado de borrador ajeno usa sc_guardar_admin_borrador, no sc_guardar_borrador');
  assert(llamadaBorrador?.body?.p_id === 'remote-row-uuid-999', 'sc_guardar_admin_borrador recibe el id de la fila remota original');
  assert(!('p_local_id' in (llamadaBorrador?.body || {})), 'sc_guardar_admin_borrador no manda p_local_id (no aplica ON CONFLICT por tecnico_id)');

  // 3) Finalizar (guardarInforme) el informe ajeno debe llamar sc_guardar_admin_informe,
  //    nunca sc_guardar_informe.
  const resInforme = await sandbox.ScInformes.guardarInforme({
    localId: insp.id,
    establecimiento: insp.establecimiento,
    fecha: insp.inspeccion.fecha,
    html: '<html>acta</html>',
    numeroActa: insp.numero_acta,
  });
  assert(resInforme.ok === true, 'guardarInforme del ajeno reporta ok');
  const llamadaInforme = rpcCalls.find(c => c.rpc === 'sc_guardar_admin_informe' || c.rpc === 'sc_guardar_informe');
  assert(llamadaInforme?.rpc === 'sc_guardar_admin_informe', 'el guardado de informe ajeno usa sc_guardar_admin_informe, no sc_guardar_informe');
  assert(llamadaInforme?.body?.p_id === 'remote-row-uuid-999', 'sc_guardar_admin_informe recibe el id de la fila remota original');
  assert(!('p_local_id' in (llamadaInforme?.body || {})), 'sc_guardar_admin_informe no manda p_local_id');

  // 4) Una inspección PROPIA (nunca restaurada como ajena) sigue usando las RPC normales.
  const propia = { ...inspeccionAjena(), id: 'psb-propia-001' };
  state.inspecciones.push(propia);
  sandbox.ScInformes.scheduleBorrador(propia, { force: true, flushOnExit: true, aspectKey: 'y' });
  await waitTurn();
  const llamadaPropia = rpcCalls.filter(c => c.body?.p_local_id === propia.id);
  assert(llamadaPropia.some(c => c.rpc === 'sc_guardar_borrador'), 'una inspección propia (nunca marcada ajena) sigue usando sc_guardar_borrador');

  if (failed) process.exit(1);
  console.log('\nALL TESTS PASSED');
})().catch(error => { console.error(error); process.exit(1); });
```

- [ ] **Step 9: Ejecutar los 3 tests (nuevo + 2 de regresión)**

Run: `node test/sc-informes-admin-ajeno.test.js && node test/sc-informes-continuidad.test.js && node test/sc-informes-borrador.test.js`
Expected: los 3 imprimen `ALL TESTS PASSED`.

- [ ] **Step 10: Aplicar la migración a Supabase — REQUIERE confirmación explícita del usuario antes de tocar producción** (mismo criterio que la Tarea 1: proyecto único `isncjtomlvxyvcaohcpx`, sin staging). No lo haga el implementador — lo hace el controlador con el usuario.

- [ ] **Step 11: Commit**

```bash
git add supabase/migrations/migration_sc_informes_admin_continuidad.sql app/js/sc-informes.js app/js/sc-informes-ui.js test/sc-informes-admin-ajeno.test.js
git commit -m "fix(sc-informes): admin continúa el borrador/informe de otro técnico sin forkear la fila"
```

## Task 8: Fixes Important de la revisión final (debounce en Verificar + idempotencia de la migración)

**Contexto (2 hallazgos Important de la revisión final de rama, independientes entre sí y de la Tarea 7 — no tocan los mismos archivos):**

1. `verificar.js` llama `ScInformes.programarBorradorActual()` dentro de `render()`, que se re-ejecuta en cada tap de filtro/categoría. `programarBorradorActual()` sin argumento usa `force = true` por defecto, lo cual fuerza `flushOnExit: true` en `scheduleBorrador` — es decir, **cada render sube de inmediato el snapshot completo (hasta 512 KB) sin pasar por el debounce de 30s**. Esto contradice la Global Constraint del plan ("mismo mecanismo ya probado: debounce 30s… no se introduce mecanismo nuevo") y puede saturar de requests un dispositivo con datos móviles al tocar filtros repetidamente.
2. `supabase/migrations/migration_sc_informes_continuidad.sql` usa `DROP FUNCTION IF EXISTS ... ; CREATE FUNCTION ...` (sin `OR REPLACE`) para `sc_guardar_informe`, `sc_get_informe` y `sc_get_admin_informe`. Si el archivo se corre una segunda vez contra una base ya migrada (ej. al montar un ambiente nuevo desde cero reproduciendo todas las migraciones en orden), el `CREATE FUNCTION` sin `OR REPLACE` falla con "function already exists" en la segunda pasada. Además, `sc_guardar_informe` tuvo un overload viejo de 6 argumentos en una migración muy anterior (`migration_sc_informes_tables.sql:157`) que nunca fue reemplazado in-place (mismo problema de fondo que motivó la Tarea 6): si alguien reproduce todas las migraciones desde cero, ese overload de 6 args revive. Verificado en la base real de producción (`isncjtomlvxyvcaohcpx`) que ese overload de 6 args NO existe hoy — este fix es solo para que el archivo sea correcto ante una futura reproducción desde cero, no requiere ninguna acción adicional contra producción.

**Files:**
- Modify: `app/js/phva/verificar.js`
- Modify: `supabase/migrations/migration_sc_informes_continuidad.sql`

**Interfaces:** ninguna nueva — ambos fixes son correcciones locales sin cambiar ninguna firma ni contrato ya usado por otras tareas.

- [ ] **Step 1: `verificar.js` — no forzar flush inmediato en cada render**

Localiza la llamada agregada en la Tarea 4 (dentro de `render()`, justo después de `Store.upsertInspeccion(inspeccion)`):

```js
    if (typeof ScInformes !== 'undefined' && ScInformes.programarBorradorActual) ScInformes.programarBorradorActual();
```

Reemplázala por:

```js
    if (typeof ScInformes !== 'undefined' && ScInformes.programarBorradorActual) ScInformes.programarBorradorActual(false);
```

(`programarBorradorActual(false)` → `scheduleBorrador(inspeccion, { force: false, flushOnExit: false })` → respeta el debounce normal de 30s en vez de subir de inmediato en cada render.)

- [ ] **Step 2: Migración — usar `CREATE OR REPLACE FUNCTION` en los 3 bloques DROP+CREATE, y dropear también el overload histórico de 6 args**

En `supabase/migrations/migration_sc_informes_continuidad.sql`:

a) Donde dice:
```sql
DROP FUNCTION IF EXISTS public.sc_guardar_informe(text,jsonb,date,text,text,text,text,integer,integer,integer);
CREATE FUNCTION public.sc_guardar_informe(
```
reemplazar por:
```sql
DROP FUNCTION IF EXISTS public.sc_guardar_informe(text,jsonb,date,text,text,text);
DROP FUNCTION IF EXISTS public.sc_guardar_informe(text,jsonb,date,text,text,text,text,integer,integer,integer);
CREATE OR REPLACE FUNCTION public.sc_guardar_informe(
```

b) Donde dice:
```sql
DROP FUNCTION IF EXISTS public.sc_get_informe(uuid, text);
CREATE FUNCTION public.sc_get_informe(p_id uuid, p_codigo text)
```
reemplazar por:
```sql
DROP FUNCTION IF EXISTS public.sc_get_informe(uuid, text);
CREATE OR REPLACE FUNCTION public.sc_get_informe(p_id uuid, p_codigo text)
```

c) Donde dice:
```sql
DROP FUNCTION IF EXISTS public.sc_get_admin_informe(uuid, text);
CREATE FUNCTION public.sc_get_admin_informe(p_id uuid, p_codigo text)
```
reemplazar por:
```sql
DROP FUNCTION IF EXISTS public.sc_get_admin_informe(uuid, text);
CREATE OR REPLACE FUNCTION public.sc_get_admin_informe(p_id uuid, p_codigo text)
```

No se toca nada más del archivo (los `$function$ ... $function$` completos, los REVOKE/GRANT existentes, ni el resto de bloques quedan igual).

- [ ] **Step 3: Verificación de sintaxis**

Run: `node --check app/js/phva/verificar.js`
Expected: sin salida (sin error).

El archivo SQL no tiene verificador local — se revisa por lectura (confirmar que los 3 bloques quedaron con `OR REPLACE` y que no se rompió ningún `$function$`).

- [ ] **Step 4: Ejecutar los tests existentes (regresión, no deberían verse afectados por estos 2 cambios)**

Run: `node test/sc-informes-borrador.test.js && node test/sc-informes-continuidad.test.js`
Expected: ambos imprimen `ALL TESTS PASSED`.

- [ ] **Step 5: Commit**

```bash
git add app/js/phva/verificar.js supabase/migrations/migration_sc_informes_continuidad.sql
git commit -m "fix: respetar debounce en Verificar y hacer idempotente la migración de continuidad"
```

Nota: este fix de migración es solo para el ARCHIVO (futuras reproducciones desde cero). No requiere ninguna acción contra la base de producción — ya se verificó que no existe el overload de 6 args ahí.

## Self-Review

**Cobertura del spec:**
- §3 Admin ve inspección en curso de cualquier técnico → Task 1 (`sc_list_admin_borradores`/`sc_get_admin_borrador`) + Task 3 (rutas admin en `_wireAccionesTabla`).
- §3 Lista unificada → Task 2 (`listMisInformesUnificado`/`listAdminInformesUnificado`) + Task 3 (`mostrarEnPortada`/`_renderAdmin`).
- §3 Fotos fuera de alcance → sin cambios a `_clonarSinFotos`/`_conservarFotografias` en ningún task; Task 5 lo verifica explícitamente.
- §3 Retirar aviso automático de login → Task 3 Step 6.
- §3 Informes finalizados reabribles → Task 1 (`estado_estructurado` en `sc_guardar_informe`/`sc_get_informe`/`sc_get_admin_informe`) + Task 2 Step 3 + Task 3 Step 3 (rama "fila finalizada").
- §4.1–4.4 → Tasks 1, 2, 3, 4 respectivamente.
- §6 Casos borde (tamaño, sin red, informe pre-cambio, last-write-wins) → validaciones en Task 1 SQL, outbox en Task 2 Step 4, mensaje de toast en Task 3 Step 3, comparación de timestamps (last-write-wins) en Task 3 Step 3.
- §7 Plan de verificación → Task 5 (automatizado) + Task 6 Steps 2 y 4 (manual/producción).

**Sin placeholders:** todos los pasos incluyen código completo o comandos exactos; ningún paso dice "similar a" o "agregar validación apropiada".

**Consistencia de tipos:** `_crearEstadoParcial(inspeccion, cursor, estadoLabel)` (Task 2 Step 1) es la única firma usada en Task 2 Step 3 (`guardarInforme`) y en `_crearPayloadBorrador` (sin cambios, 2 args → `estadoLabel` undefined → `'en_curso'`). `_restaurarEstadoRemoto(payloadEstado)` con shape `{ inspeccion, ui, local_id }` es consistente entre Task 2 Step 2 (definición), Task 2 Step 6 (export como `restaurarEstadoRemoto`) y Task 3 Step 3 (caller). `UI_SCREENS` se define una sola vez en `sc-informes.js` y se reutiliza en ambas funciones de Task 2; Task 3 no la duplica — lee `Store.get().ui.screen` después de llamar a `restaurarEstadoRemoto`.
