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
// (dos veces, en el detalle y en el Registro Fotográfico); se referencian
// por data-foto-path y se hidratan con un script propio dentro del acta,
// porque el HTML se persiste y puede reabrirse días después en otra sesión.
assert.doesNotMatch(source, /_comprimirFotoRegistro|_crearInspeccionParaRegistro|options\.compacto/,
  'no debe quedar la ruta muerta de compresión del Registro (reemplazada por Storage)');
assert.match(source, /data-foto-path/, 'las fotos del acta se referencian por path de Storage, no por dataURL embebido');
assert.match(source, /fotosHidratacionScript/, 'el acta persistida incluye el script que hidrata las fotos desde Storage al reabrirse');
assert.match(source, /fotosUrls: _recolectarFotosUrls\(inspeccion\)/, '_crearPayloadInforme envía los paths de fotos a guardarInforme');

console.log('ALL TESTS PASSED');
