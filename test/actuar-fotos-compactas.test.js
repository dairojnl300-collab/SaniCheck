/**
 * Regresión: la copia que se sube al Registro conserva todas las fotos, pero
 * cada una queda reducida para no volver a enviar el estado pesado completo.
 * Run: node test/actuar-fotos-compactas.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app/js/phva/actuar.js'), 'utf8');
const marker = '  return { render, attach, compartir, abrirPDF, generarPDF, guardarPDF, limpiarFirma, cargarFirmaImagen, guardarFirmas, editarFirmas, cancelarEdicionFirmas };';
const instrumented = source.replace(marker,
  '  this.__crearInspeccionParaRegistro = _crearInspeccionParaRegistro;\n' + marker);
if (instrumented === source) throw new Error('No se pudo instrumentar Actuar para la prueba');

class FakeImage {
  set src(value) {
    this.naturalWidth = 1600;
    this.naturalHeight = 1200;
    setTimeout(() => this.onload && this.onload(), 0);
  }
}
const compactData = 'data:image/jpeg;base64,' + 'z'.repeat(100);
const sandbox = {
  Image: FakeImage,
  document: { createElement: () => ({
    getContext: () => ({ drawImage: () => {} }),
    toDataURL: () => compactData,
  }) },
  window: {},
  setTimeout,
  clearTimeout,
  Promise,
  Date,
  JSON,
  console,
};
vm.createContext(sandbox);
vm.runInContext(instrumented, sandbox);

const heavyData = 'data:image/jpeg;base64,' + 'x'.repeat(200_000);
const inspection = {
  id: 'pesada-001',
  programas: [{
    id: 'programa-1',
    aspectos: [{
      id: 'aspecto-1',
      fotografias: Array.from({ length: 28 }, (_, index) => ({ id: `foto-${index}`, data: heavyData })),
      criterios_extra: [{ fotografias: [{ id: 'extra-1', data: heavyData }] }],
    }],
  }],
};

(async () => {
  const compact = await sandbox.__crearInspeccionParaRegistro(inspection);
  const fotos = [
    ...compact.programas[0].aspectos[0].fotografias,
    ...compact.programas[0].aspectos[0].criterios_extra[0].fotografias,
  ];
  assert.equal(fotos.length, 29, 'la copia remota conserva todas las fotografías');
  assert(fotos.every(foto => foto.data.length < heavyData.length),
    'la copia remota reduce el peso de cada fotografía');
  assert.equal(inspection.programas[0].aspectos[0].fotografias[0].data, heavyData,
    'la compresión no modifica las fotografías originales locales');
  console.log('ALL TESTS PASSED');
})().catch(error => { console.error('FAIL:', error.message); process.exit(1); });
