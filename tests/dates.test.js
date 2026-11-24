import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hoyISO, claveMes, rangoMes, rangoComparacion, mesAnterior, nombreMes } from '../src/dates.js';

test('hoyISO usa hora local', () => assert.equal(hoyISO(new Date(2026, 10, 24, 23, 59)), '2026-11-24'));
test('claveMes', () => assert.equal(claveMes('2026-11-24'), '2026-11'));
test('rangoMes febrero', () => assert.deepEqual(rangoMes('2026-02'), { desde: '2026-02-01', hasta: '2026-02-28' }));
test('rangoComparacion limita día 31 a febrero', () => {
  const r = rangoComparacion('2026-03', '2026-03-31');
  assert.deepEqual(r.anterior, { desde: '2026-02-01', hasta: '2026-02-28' });
  assert.equal(r.actual.hasta, '2026-03-31');
});
test('rangoComparacion mes actual usa mismo rango de días', () => {
  assert.deepEqual(rangoComparacion('2026-11', '2026-11-24'), {
    actual: { desde: '2026-11-01', hasta: '2026-11-24' },
    anterior: { desde: '2026-10-01', hasta: '2026-10-24' },
  });
});
test('rangoComparacion mes pasado usa meses completos', () => {
  assert.deepEqual(rangoComparacion('2026-09', '2026-11-24'), {
    actual: { desde: '2026-09-01', hasta: '2026-09-30' },
    anterior: { desde: '2026-08-01', hasta: '2026-08-31' },
  });
});
test('mesAnterior cruza año', () => assert.equal(mesAnterior('2026-01'), '2025-12'));
test('nombreMes', () => assert.equal(nombreMes('2026-11'), 'noviembre 2026'));
