# ECODESA — Lecciones Aprendidas
*Anexo de prevención de errores · Uso obligatorio antes de intervenir código o infraestructura*

---

## Regla madre

**Nunca confiar en lo que dice una herramienta, una memoria guardada o un commit "exitoso" sin verificarlo contra la realidad.** Cada incidente de esta lista ocurrió porque algo *parecía* correcto (memoria, log, diseño) y no lo era.

---

## 1. Verificación de producción es obligatoria, no opcional

**Qué pasó:** Claude Code / Cursor reportaron "commit exitoso" y "deploy correcto" en múltiples ocasiones sin que el cambio existiera realmente en el sitio live.

**Causa raíz:** Confiar en el mensaje de la herramienta en vez de comprobar el artefacto final.

**Prevención — secuencia obligatoria en TODO deploy:**
```
git log → git status → web_fetch de la URL en producción
```
Nunca dar una tarea por cerrada sin el tercer paso.

---

## 2. GA4 estuvo ausente toda una campaña de Ads sin que nadie lo notara

**Qué pasó:** ecodesa.co corrió Google Ads durante semanas (458 clics, 0 conversiones) porque el tag de GA4 nunca estuvo instalado. Se asumió que "ya estaba" por estar documentado.

**Causa raíz:** Un tag de tracking (Ads) ≠ otro tag de tracking (GA4). Son propiedades distintas y deben verificarse por separado, cada una en su propia consola.

**Prevención:**
- Verificar cada tag de analítica/conversión **individualmente en su plataforma de origen** (GA4 Realtime, no solo el código fuente).
- Nunca asumir que "instalar un pixel" cubre a todos los demás.
- Checklist mínimo tras cualquier campaña nueva: tag base + evento de conversión + verificación Realtime, en ese orden.

---

## 3. La memoria/documentación puede estar desactualizada y mentir con confianza

**Qué pasó (SaniCheck, 2026-08-26):** El archivo `project_sanicheck_pwa_update.md` afirmaba que el "banner de actualización PWA" ya estaba implementado. Al auditar el código real, no existía ni un 0% — ni `updatefound`, ni `statechange`, ni `postMessage(SKIP_WAITING)`.

**Causa raíz:** La memoria se escribió en algún momento como plan o intención, y quedó registrada como hecho. Nadie la re-verificó contra el código antes de asumir que existía.

**Prevención:**
- Toda memoria operativa (`ECODESA-MEMORY/`, notas de proyecto) es **hipótesis a confirmar**, no fuente de verdad.
- Antes de auditar, corregir o construir sobre una feature "documentada", verificar en el código real (`grep`, `git log` del archivo).
- Si se detecta una memoria desactualizada, corregirla de inmediato — no dejarla para después, porque el siguiente agente (Camila, David, Carlos) la va a leer como verdad.

---

## 4. Versionado de cache en PWAs — el bug silencioso más caro

**Qué pasó (SaniCheck):** `CACHE = 'sanicheck-v2'` en `sw.js` no se incrementó durante 7 commits de cambios visuales/funcionales. El Service Worker seguía sirviendo la versión vieja vía cache-first porque el navegador nunca detectó bytes nuevos en `sw.js` — el único archivo que dispara la actualización.

**Causa raíz:** En una PWA offline-first, el navegador solo revisa actualización si el **propio archivo `sw.js` cambia de bytes**. Cambiar `app.js`, `brand.css` o `index.html` no es suficiente si el service worker no se toca.

**Prevención:**
- Todo cambio de asset cacheado exige bump manual del nombre/versión de `CACHE` en el mismo commit.
- Implementar banner real de actualización (no solo auto-skipWaiting silencioso): `updatefound` → `statechange 'installed'` → mostrar aviso → `postMessage(SKIP_WAITING)` → `controllerchange` → `reload()`.
- Correr script de verificación offline (`verify-sw-offline.mjs`) antes de cada deploy.
- iOS Safari en particular: nunca cachear respuestas con `.redirected = true` directamente — usar `_safeCachePut()`.

---

## 5. Selección de datos por múltiples dimensiones — no basta con "el más reciente"

**Qué pasó (ProyeCar):** El comparativo de inspecciones tomaba el registro más reciente que contenía el *frente*, pero no validaba que ese registro también tuviera datos del *área* específica (Ambiental vs. SST son independientes por registro). Resultado: comparaba contra fechas que no correspondían.

**Causa raíz:** Un filtro compuesto (frente + área) se trató como si una sola dimensión (frente) fuera suficiente.

**Prevención:**
- Cuando un dato depende de dos o más dimensiones independientes, el filtro debe validar **todas** antes de seleccionar, nunca solo la más obvia.
- Si no hay combinación válida, mostrar mensaje explícito ("sin datos anteriores para X+Y") en vez de comparar con el dato incorrecto más cercano.

---

## 6. Disciplina de Git — no negociable

**Regla fija:** branch → commit → push → PR → merge manual. Nunca push directo a `main` salvo confirmación explícita y puntual.

**Por qué importa:** Antes de tocar un archivo con historial, revisar `git log` — evita revertir trabajo de una sesión anterior (de otro agente, de Claude Code, o de una sesión de Codex distinta) sin darse cuenta.

**Caso real:** `index.html` de ecodesa-web traía cambios sin commitear de una sesión previa (count-badges, `loading="lazy"`) mezclados con un fix nuevo de GA4. Se resolvió aislando el commit solo al cambio aprobado (`git add -p`), dejando el WIP ajeno intacto para revisión aparte.

---

## 7. Entornos y herramientas — incompatibilidades conocidas

| Problema | Causa | Solución |
|---|---|---|
| Conector OAuth de Supabase falla | `client_id` hardcodeado inválido en el plugin | Usar MCP directo vía `npx @supabase/mcp-server-supabase` |
| PowerShell rompe rutas con espacios (`C:\Users\DAIRON NARVAEZ`) | Sintaxis CLI de Windows | Usar `cmd /c` o crear junction (`C:\DN`) |
| Fórmulas cross-sheet en Excel dan `#N/A` en LibreOffice/recalc | openpyxl escribe `.` (sintaxis LibreOffice) en vez de `!` (sintaxis Excel) para referencias entre hojas | Verificar siempre el separador `!` en fórmulas `='Hoja'!$A$1` |
| Herramientas UI dependientes de React (21st.dev Magic, Framer Motion) | Incompatibles con stack vanilla JS/CSS de ECODESA | Usar CSS-nativo; herramientas React solo como referencia visual |
| Apps sin número de versión visible | No hay forma de confirmar que un fix llegó a producción | Incrementar versión en cada cambio funcional, visible en UI |

---

## 8. Memoria compartida entre herramientas — límites reales

**Qué pasó:** Se asumió que la memoria operativa (`ECODESA-MEMORY/`) funcionaría igual en Claude Desktop que en Codex/Claude Code.

**Causa raíz:** Codex y Claude Code leen archivos directo del disco tras un activador. Claude Desktop no tiene ese acceso — requiere carga manual como "conocimiento del proyecto", y **no se autoactualiza**.

**Prevención:**
- Si se usa Claude Desktop en paralelo, resubir manualmente los 4 archivos (`INDEX.md`, `decisiones-usuario.md`, `errores-y-soluciones.md`, `aprendizajes/por-agente.md`) cada vez que cambien — no asumir sincronía automática.

---

## Checklist rápido antes de cualquier tarea de código o deploy

- [ ] ¿Revisé `git log` del archivo antes de editar?
- [ ] ¿La memoria/documentación que estoy usando fue verificada contra el código real, o solo la estoy asumiendo?
- [ ] Si es PWA: ¿bumpeé la versión del Service Worker junto con los assets?
- [ ] Si hay filtro por más de una dimensión: ¿validé todas, no solo la principal?
- [ ] ¿Seguí branch → commit → push → PR → merge, sin atajos a `main`?
- [ ] Tras el deploy: ¿hice `git log` → `git status` → `web_fetch` en producción, no solo confié en el mensaje de la herramienta?
- [ ] Si toca tracking/analítica: ¿verifiqué cada tag por separado en su consola de origen (Realtime), no solo en el código fuente?

## 9. Paginación del PDF responsive en teléfonos — tarjetas completas

**Qué pasó (SaniCheck, 2026-08-31):** En Chrome móvil, al generar el PDF A4, las tarjetas de aspectos se cortaban entre páginas. Los saltos aplicados directamente a elementos hijos de una cuadrícula CSS no eran respetados de forma consistente.

**Solución estable:** Mantener el diseño existente de PC/tablet y, únicamente para teléfonos, renderizar una variante del detalle con páginas explícitas (`acta-mobile-page`). Cada página contiene hasta **6 tarjetas en 2 columnas** (3 filas), con `break-after: page`; la última página no fuerza una página en blanco.

**Reglas obligatorias para futuros cambios:**
- No aplicar saltos de página a tarjetas que sean hijas directas de CSS Grid esperando que Chrome móvil los respete.
- En teléfonos, agrupar las tarjetas dentro de contenedores de página completos y mantener `break-inside: avoid` en cada tarjeta.
- Conservar siempre 2 columnas; el sexto aspecto continúa en la tercera fila de la misma página cuando quepa.
- La variante móvil debe activarse solo durante la impresión/generación del PDF en teléfonos; PC y tablet conservan el layout de dos columnas ya validado.
- Después de cada cambio: `node --check`, `npm run build`, publicar, verificar el JS servido en `https://sanicheck.pages.dev/app/` y probar un PDF nuevo en Chrome móvil.

---

*Última actualización: 26 de agosto de 2026 · Mantener este archivo vivo — agregar cada incidente nuevo con causa raíz y prevención concreta, no solo la descripción del síntoma.*
