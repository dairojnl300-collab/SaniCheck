/**
 * Regresión de producto: ACTUAR debe abrir el PDF/impresión y usar ese mismo
 * evento para pedir la copia remota que habilita la liberación local.
 * Run: node test/actuar-generar-pdf.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'app/js/phva/actuar.js'), 'utf8');

assert.match(source, /onclick="Actuar\.generarPDF\(\)"/, 'el botón ACTUAR usa el flujo generar PDF');
assert.match(source, /GENERAR PDF \/ IMPRIMIR/, 'el botón explica que genera o imprime el acta');
assert.match(source, /liberarFotosAlConfirmar:\s*true/, 'la copia remota solicita liberar fotos solo al confirmarse');
assert.match(source, /_guardarCopiaRegistro\(inspeccion, html\)/, 'el Registro recibe exactamente el HTML compacto que se abrió para imprimir');
assert.match(source, /function _escribirErrorActaEnVentana/, 'una falla de preparación se muestra dentro de la ventana y no deja una pestaña blanca');
assert.match(source, /console\.error\('\[Actuar\] No se pudo preparar el PDF'/, 'la falla de preparación queda registrada en consola');
console.log('ALL TESTS PASSED');
