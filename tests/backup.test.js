import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportarRespaldo, leerRespaldo, nombreArchivoRespaldo, necesitaRespaldo } from '../src/backup.js';
import { estadoInicial } from '../src/store.js';

function estadoConDatos() {
  const e = estadoInicial();
  const cat = e.categorias[0];
  e.metas.push({ id: 'v', tipo: 'ahorro', nombre: 'Viaje', monto: 100000, fechaObjetivo: null, creadoEn: '2026-11-01', completada: false, archivada: false });
  e.movimientos.push({ id: 'm1', tipo: 'gasto', monto: 18550, categoriaId: cat.id, metaId: null, fecha: '2026-11-24', nota: 'tacos', creadoEn: '2026-11-24T12:00:00Z' });
  return e;
}

test('respaldo ida y vuelta conserva el estado', () => {
  const e = estadoConDatos();
  assert.deepEqual(leerRespaldo(exportarRespaldo(e)), e);
});

test('respaldo incluye identificador de la app', () => {
  const j = JSON.parse(exportarRespaldo(estadoInicial()));
  assert.equal(j.app, 'finanzas-personales');
  assert.equal(j.version, 1);
});

const invalidos = {
  'texto no JSON': 'no json',
  'objeto vacío': '{}',
  'otra app': JSON.stringify({ app: 'otra', version: 1, estado: estadoInicial() }),
  'movimiento sin monto entero': (() => {
    const e = estadoConDatos(); e.movimientos[0].monto = '185.50';
    return exportarRespaldo(e);
  })(),
  'sin lista de categorías': JSON.stringify({ app: 'finanzas-personales', version: 1, estado: { ...estadoInicial(), categorias: null } }),
  'movimiento con categoría inexistente': (() => {
    const e = estadoConDatos(); e.movimientos[0].categoriaId = 'nada';
    return exportarRespaldo(e);
  })(),
};
for (const [nombre, texto] of Object.entries(invalidos)) {
  test(`leerRespaldo rechaza: ${nombre}`, () => assert.throws(() => leerRespaldo(texto), /Archivo de respaldo no válido/));
}

test('nombre de archivo', () => assert.equal(nombreArchivoRespaldo('2026-11-24'), 'finanzas-respaldo-2026-11-24.json'));

test('necesitaRespaldo', () => {
  assert.equal(necesitaRespaldo(null, '2026-11-24'), true);
  assert.equal(necesitaRespaldo('2026-10-25', '2026-11-24'), false);
  assert.equal(necesitaRespaldo('2026-11-24', '2026-11-24'), false);
  // octubre tiene 31 días: 10-25 → 11-24 son 30 días; 10-24 son 31.
  assert.equal(necesitaRespaldo('2026-10-24', '2026-11-24'), true);
});
