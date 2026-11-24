import { test } from 'node:test';
import assert from 'node:assert/strict';
import { progresoMeta } from '../src/goals.js';

const ap = (metaId, monto) => ({ tipo: 'aportacion', monto, metaId, fecha: '2026-11-01' });
const gt = (metaId, monto) => ({ tipo: 'gasto', monto, metaId, categoriaId: 'c', fecha: '2026-11-01' });

test('ahorro: aportaciones suman y retiro resta', () => {
  const meta = { id: 'v', tipo: 'ahorro', monto: 100000 };
  const p = progresoMeta(meta, [ap('v', 60000), ap('v', -30000), ap('otra', 5000)]);
  assert.equal(p.aportado, 30000);
  assert.equal(p.objetivo, 100000);
  assert.equal(p.debe, null);
  assert.equal(p.pct, 0.3);
});

test('ahorro: pct limitado a 1', () => {
  assert.equal(progresoMeta({ id: 'v', tipo: 'ahorro', monto: 100 }, [ap('v', 500)]).pct, 1);
});

test('deuda: debe = saldo inicial − pagos', () => {
  const p = progresoMeta({ id: 'd', tipo: 'deuda', monto: 800000 }, [ap('d', 200000)]);
  assert.equal(p.aportado, 200000);
  assert.equal(p.debe, 600000);
  assert.equal(p.pct, 0.25);
});

test('tarjeta: compras suben lo que debes, pagos lo bajan', () => {
  const meta = { id: 't', tipo: 'tarjeta', monto: 100000 };
  const p = progresoMeta(meta, [gt('t', 50000), ap('t', 75000)]);
  assert.equal(p.debe, 75000);
  assert.equal(p.aportado, 75000);
  assert.equal(p.pct, 0.5);
});

test('tarjeta sin saldo ni compras está al 100%', () => {
  const p = progresoMeta({ id: 't', tipo: 'tarjeta', monto: 0 }, []);
  assert.equal(p.debe, 0);
  assert.equal(p.pct, 1);
});
