/**
 * Regresión de producto: ACTUAR debe conservar el flujo estable de guardar el
 * acta en Registro de Informes sin abrir una pestaña en blanco.
 * Run: node test/actuar-generar-pdf.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'app/js/phva/actuar.js'), 'utf8');

assert.match(source, /onclick="Actuar\.guardarPDF\(\)"/, 'el botón ACTUAR usa el flujo estable de guardar PDF');
assert.match(source, /GUARDAR PDF/, 'el botón conserva la etiqueta del flujo comprobado');
assert.match(source, /const html = await _generarActaHtmlCompleta\(inspeccion\)/, 'el Registro recibe el acta completa');
assert.match(source, /ScInformes\.guardarInforme\(_crearPayloadInforme\(inspeccion, html\)\)/, 'el acta se guarda en Registro de Informes');
assert.match(source, /function generarPDF\(\) \{ return guardarPDF\(\); \}/, 'el nombre nuevo conserva compatibilidad sin abrir una pestaña extra');

// Migración fotos → Supabase Storage: las fotos ya no se embeben en base64
// (dos veces, en el detalle y en el Registro Fotográfico); se referencian por
// data-foto-path y la hidratación vive en el VISOR (sc-informes-ui.js), no en
// un <script> dentro del acta: la RPC lo borra al guardar (sc_sanitizar_html),
// el visor lo vuelve a borrar al leer (_htmlEditableSeguro) y el iframe del
// visor no tiene allow-scripts, así que nunca llegaba a ejecutarse.
assert.doesNotMatch(source, /_comprimirFotoRegistro|_crearInspeccionParaRegistro|options\.compacto/,
  'no debe quedar la ruta muerta de compresión del Registro (reemplazada por Storage)');
assert.match(source, /data-foto-path/, 'las fotos del acta se referencian por path de Storage, no por dataURL embebido');
assert.doesNotMatch(source, /fotosHidratacionScript/,
  'no debe quedar el script hidratador embebido en el acta (código muerto: se borra al guardar y no se ejecuta al leer)');
assert.match(source, /fotosUrls: _recolectarFotosUrls\(inspeccion\)/, '_crearPayloadInforme envía los paths de fotos a guardarInforme');

// El visor es ahora el responsable de hidratar: descarga cada path de
// fotos_urls y le inyecta el src al <img data-foto-path> antes del iframe.
const visor = fs.readFileSync(path.join(__dirname, '..', 'app/js/sc-informes-ui.js'), 'utf8');
assert.match(visor, /async function _hidratarFotosActa\(html, fotosUrls\)/,
  'el visor hidrata las fotos del acta desde fotos_urls');
assert.match(visor, /await _verHtml\(row\.informe_html, row\.fotos_urls\)/,
  'el visor recibe fotos_urls de la RPC de lectura, no solo el HTML');
assert.match(visor, /sandbox="allow-modals allow-same-origin"/,
  'el iframe necesita allow-same-origin para leer las blob: URL, y sigue SIN allow-scripts');
assert.doesNotMatch(visor, /sandbox="[^"]*allow-scripts/,
  'el HTML ajeno del informe nunca puede ejecutar scripts en el visor');

// Regresión P1: un path de foto que no llegó ni al bucket ni al outbox no debe
// publicarse en fotos_urls (dejaría un <img> roto en el acta).
assert.match(source, /if \(f\.path && f\.subida !== false\) urls\.push\(f\.path\)/,
  '_recolectarFotosUrls omite las fotos cuya subida se perdió (subida === false)');

console.log('ALL TESTS PASSED');
