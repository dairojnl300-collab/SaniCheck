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
assert.match(source, /const html = await _generarActaHtmlCompleta\(inspeccion\)/, 'el Registro recibe el acta completa sin compresión previa');
assert.match(source, /ScInformes\.guardarInforme\(_crearPayloadInforme\(inspeccion, html\)\)/, 'el acta se guarda en Registro de Informes');
assert.match(source, /function generarPDF\(\) \{ return guardarPDF\(\); \}/, 'el nombre nuevo conserva compatibilidad sin abrir una pestaña extra');
console.log('ALL TESTS PASSED');
