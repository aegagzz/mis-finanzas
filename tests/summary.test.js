import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumenMes } from '../src/summary.js';
import { progresoMeta } from '../src/goals.js';

function estadoBase() {
  return {
    version: 1,
    categorias: [
      { id: 'comida', nombre: 'Comida', emoji: '🍔', tipo: 'gasto', archivada: false },
      { id: 'ocio', nombre: 'Ocio', emoji: '🎉', tipo: 'gasto', archivada: true },
      { id: 'sueldo', nombre: 'Sueldo', emoji: '💼', tipo: 'ingreso', archivada: false },
    ],
    metas: [
      { id: 'visa', tipo: 'tarjeta', nombre: 'Visa', monto: 0 },
      { id: 'viaje', tipo: 'ahorro', nombre: 'Viaje', monto: 1500000 },
    ],
    movimientos: [],
    ajustes: { ultimoRespaldo: null },
  };
}
let n = 0;
const mov = (tipo, monto, fecha, extra = {}) => ({ id: `m${n++}`, tipo, monto, fecha, categoriaId: null, metaId: null, nota: '', creadoEn: `${fecha}T12:00:00Z`, ...extra });

test('ejemplo del spec: compra con tarjeta y pago no cuentan doble', () => {
  const e = estadoBase();
  e.movimientos.push(
    mov('ingreso', 1000000, '2026-11-01', { categoriaId: 'sueldo' }),
    mov('gasto', 50000, '2026-11-05', { categoriaId: 'comida', metaId: 'visa' }),
    mov('aportacion', 50000, '2026-11-20', { metaId: 'visa' }),
  );
  const r = resumenMes(e, '2026-11', '2026-11-24');
  assert.equal(r.ingresos, 1000000);
  assert.equal(r.gastos, 50000);
  assert.equal(r.gastosTarjeta, 50000);
  assert.equal(r.gastosEfectivo, 0);
  assert.equal(r.pagosDeuda, 50000);
  assert.equal(r.queda, 950000);
  assert.equal(progresoMeta(e.metas[0], e.movimientos).debe, 0);
});

test('aportación a ahorro no es gasto y baja lo que queda', () => {
  const e = estadoBase();
  e.movimientos.push(
    mov('ingreso', 1000000, '2026-11-01', { categoriaId: 'sueldo' }),
    mov('gasto', 20000, '2026-11-02', { categoriaId: 'comida' }),
    mov('aportacion', 100000, '2026-11-03', { metaId: 'viaje' }),
  );
  const r = resumenMes(e, '2026-11', '2026-11-24');
  assert.equal(r.gastos, 20000);
  assert.equal(r.ahorro, 100000);
  assert.equal(r.queda, 1000000 - 20000 - 100000);
});

test('comparación por categoría usa mismo rango de días', () => {
  const e = estadoBase();
  e.movimientos.push(
    mov('gasto', 30000, '2026-11-10', { categoriaId: 'comida' }),
    mov('gasto', 20000, '2026-10-15', { categoriaId: 'comida' }),
    mov('gasto', 99999, '2026-10-28', { categoriaId: 'comida' }),
  );
  const r = resumenMes(e, '2026-11', '2026-11-24');
  const comida = r.porCategoria.find((c) => c.categoriaId === 'comida');
  assert.equal(comida.total, 30000);
  assert.equal(comida.anterior, 20000);
  assert.equal(comida.cambio, 0.5);
});

test('cambio es null si el mes anterior no tuvo gasto', () => {
  const e = estadoBase();
  e.movimientos.push(mov('gasto', 30000, '2026-11-10', { categoriaId: 'comida' }));
  assert.equal(resumenMes(e, '2026-11', '2026-11-24').porCategoria[0].cambio, null);
});

test('gastos de categoría archivada siguen contando', () => {
  const e = estadoBase();
  e.movimientos.push(mov('gasto', 7000, '2026-11-10', { categoriaId: 'ocio' }));
  const r = resumenMes(e, '2026-11', '2026-11-24');
  assert.equal(r.gastos, 7000);
  assert.equal(r.porCategoria[0].categoriaId, 'ocio');
});

test('totales del mes ignoran otros meses y lista va más reciente primero', () => {
  const e = estadoBase();
  e.movimientos.push(
    mov('gasto', 100, '2026-11-02', { categoriaId: 'comida' }),
    mov('gasto', 200, '2026-11-20', { categoriaId: 'comida' }),
    mov('gasto', 999, '2026-12-01', { categoriaId: 'comida' }),
  );
  const r = resumenMes(e, '2026-11', '2026-11-24');
  assert.equal(r.gastos, 300);
  assert.deepEqual(r.movimientos.map((m) => m.monto), [200, 100]);
});

test('porCategoria ordenado por total descendente', () => {
  const e = estadoBase();
  e.movimientos.push(
    mov('gasto', 100, '2026-11-02', { categoriaId: 'comida' }),
    mov('gasto', 500, '2026-11-03', { categoriaId: 'ocio' }),
  );
  assert.deepEqual(resumenMes(e, '2026-11', '2026-11-24').porCategoria.map((c) => c.categoriaId), ['ocio', 'comida']);
});

// ── Periodos y detalle ───────────────────────────────────────────────────────
import { resumenPeriodo, detalleCategoria } from '../src/summary.js';

test('resumen del año suma movimientos de varios meses', () => {
  const e = estadoBase();
  e.movimientos.push(
    mov('gasto', 1000, '2026-02-10', { categoriaId: 'comida' }),
    mov('gasto', 2000, '2026-11-10', { categoriaId: 'comida' }),
    mov('gasto', 9999, '2025-12-31', { categoriaId: 'comida' }),
  );
  const r = resumenPeriodo(e, { tipo: 'anio' }, '2026-11-24');
  assert.equal(r.gastos, 3000);
  assert.deepEqual(r.rango, { desde: '2026-01-01', hasta: '2026-11-24' });
});

test('ingresos por categoría en el periodo', () => {
  const e = estadoBase();
  e.movimientos.push(
    mov('ingreso', 500000, '2026-10-01', { categoriaId: 'sueldo' }),
    mov('ingreso', 500000, '2026-11-01', { categoriaId: 'sueldo' }),
  );
  const r = resumenPeriodo(e, { tipo: 'anio' }, '2026-11-24');
  assert.deepEqual(r.porCategoriaIngreso.map((c) => [c.categoriaId, c.total]), [['sueldo', 1000000]]);
  assert.equal(r.porCategoria.length, 0);
});

test('categoría con gastos sólo en el periodo anterior no aparece', () => {
  const e = estadoBase();
  e.movimientos.push(mov('gasto', 700, '2026-10-05', { categoriaId: 'comida' }));
  assert.equal(resumenPeriodo(e, { tipo: 'mes', mes: '2026-11' }, '2026-11-24').porCategoria.length, 0);
});

test('detalle de una categoría: sólo sus movimientos del periodo, más reciente primero', () => {
  const e = estadoBase();
  e.movimientos.push(
    mov('gasto', 100, '2026-11-02', { categoriaId: 'comida' }),
    mov('gasto', 300, '2026-11-20', { categoriaId: 'comida', metaId: 'visa' }),
    mov('gasto', 999, '2026-11-21', { categoriaId: 'ocio' }),
    mov('gasto', 200, '2026-10-05', { categoriaId: 'comida' }),
  );
  const d = detalleCategoria(e, { tipo: 'mes', mes: '2026-11' }, '2026-11-24', 'comida');
  assert.equal(d.tipo, 'gasto');
  assert.equal(d.total, 400);
  assert.equal(d.cantidad, 2);
  assert.equal(d.cambio, 1); // 400 vs 200
  assert.deepEqual(d.movimientos.map((m) => m.monto), [300, 100]);
});

test('detalle de categoría sin movimientos en el periodo', () => {
  const d = detalleCategoria(estadoBase(), { tipo: 'anio' }, '2026-11-24', 'comida');
  assert.equal(d.total, 0);
  assert.equal(d.cantidad, 0);
  assert.equal(d.cambio, null);
});

test('periodo futuro: sin porcentaje de cambio', () => {
  const e = estadoBase();
  e.movimientos.push(mov('gasto', 500, '2026-12-05', { categoriaId: 'comida' }));
  const p = { tipo: 'personalizado', desde: '2026-12-01', hasta: '2026-12-31' };
  assert.equal(resumenPeriodo(e, p, '2026-11-24').porCategoria[0].cambio, null);
  assert.equal(detalleCategoria(e, p, '2026-11-24', 'comida').cambio, null);
});
