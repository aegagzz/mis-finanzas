import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sumarDias, restarMeses, rangoPeriodo, rangosComparacionPeriodo, rangoComparacion, etiquetaPeriodo } from '../src/dates.js';

const HOY = '2026-11-24';

test('sumarDias cruza meses', () => {
  assert.equal(sumarDias('2026-03-01', -1), '2026-02-28');
  assert.equal(sumarDias('2026-12-31', 1), '2027-01-01');
});
test('restarMeses limita el día', () => assert.equal(restarMeses('2026-05-31', 3), '2026-02-28'));

test('rango de últimos 3 meses', () => assert.deepEqual(rangoPeriodo({ tipo: '3meses' }, HOY), { desde: '2026-09-01', hasta: HOY }));
test('rango de este año', () => assert.deepEqual(rangoPeriodo({ tipo: 'anio' }, HOY), { desde: '2026-01-01', hasta: HOY }));
test('rango de un mes', () => assert.deepEqual(rangoPeriodo({ tipo: 'mes', mes: '2026-02' }, HOY), { desde: '2026-02-01', hasta: '2026-02-28' }));
test('rango personalizado', () => assert.deepEqual(rangoPeriodo({ tipo: 'personalizado', desde: '2026-11-10', hasta: '2026-11-19' }, HOY), { desde: '2026-11-10', hasta: '2026-11-19' }));
test('personalizado invertido se rechaza', () => {
  assert.throws(() => rangoPeriodo({ tipo: 'personalizado', desde: '2026-11-20', hasta: '2026-11-10' }, HOY), /anterior a la final/);
});
test('personalizado incompleto se rechaza', () => {
  assert.throws(() => rangoPeriodo({ tipo: 'personalizado', desde: '', hasta: '2026-11-10' }, HOY), /fecha/i);
});

test('comparación de 3 meses: 3 meses antes, mismos días', () => {
  assert.deepEqual(rangosComparacionPeriodo({ tipo: '3meses' }, HOY).anterior, { desde: '2026-06-01', hasta: '2026-08-24' });
});
test('comparación del año: mismo tramo del año anterior', () => {
  assert.deepEqual(rangosComparacionPeriodo({ tipo: 'anio' }, HOY).anterior, { desde: '2025-01-01', hasta: '2025-11-24' });
});
test('comparación del año desde 29 de febrero', () => {
  assert.equal(rangosComparacionPeriodo({ tipo: 'anio' }, '2028-02-29').anterior.hasta, '2027-02-28');
});
test('comparación personalizada: los N días anteriores', () => {
  const r = rangosComparacionPeriodo({ tipo: 'personalizado', desde: '2026-11-10', hasta: '2026-11-19' }, HOY);
  assert.deepEqual(r.actual, { desde: '2026-11-10', hasta: '2026-11-19' });
  assert.deepEqual(r.anterior, { desde: '2026-10-31', hasta: '2026-11-09' });
});
test('comparación de mes igual a la regla actual', () => {
  assert.deepEqual(rangosComparacionPeriodo({ tipo: 'mes', mes: '2026-11' }, HOY), rangoComparacion('2026-11', HOY));
});

test('etiquetas', () => {
  assert.equal(etiquetaPeriodo({ tipo: 'mes', mes: '2026-11' }, HOY), 'noviembre 2026');
  assert.equal(etiquetaPeriodo({ tipo: '3meses' }, HOY), 'Últimos 3 meses');
  assert.equal(etiquetaPeriodo({ tipo: 'anio' }, HOY), 'Este año (2026)');
  assert.equal(etiquetaPeriodo({ tipo: 'personalizado', desde: '2026-09-01', hasta: '2026-11-24' }, HOY), '1 sep – 24 nov 2026');
});

test('personalizado que termina en el futuro compara sólo hasta hoy', () => {
  const r = rangosComparacionPeriodo({ tipo: 'personalizado', desde: '2026-11-01', hasta: '2026-11-30' }, HOY);
  assert.deepEqual(r.actual, { desde: '2026-11-01', hasta: HOY }); // 24 días
  assert.deepEqual(r.anterior, { desde: '2026-10-08', hasta: '2026-10-31' });
});

test('personalizado que empieza en el futuro no tiene comparación', () => {
  assert.equal(rangosComparacionPeriodo({ tipo: 'personalizado', desde: '2026-12-01', hasta: '2026-12-31' }, HOY).anterior, null);
});
