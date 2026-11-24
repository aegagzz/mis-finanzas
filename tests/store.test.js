import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearStore, estadoInicial } from '../src/store.js';

function storageMemoria() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}
const catGasto = (e) => e.categorias.find((c) => c.tipo === 'gasto');
const gasto = (e, extra = {}) => ({ tipo: 'gasto', monto: 18550, categoriaId: catGasto(e).id, fecha: '2026-11-24', nota: '', ...extra });

test('estado inicial trae 8 categorías de gasto y 2 de ingreso', () => {
  const e = estadoInicial();
  assert.equal(e.categorias.filter((c) => c.tipo === 'gasto').length, 8);
  assert.equal(e.categorias.filter((c) => c.tipo === 'ingreso').length, 2);
  assert.equal(e.version, 1);
});

test('agregar gasto persiste entre instancias', () => {
  const st = storageMemoria();
  const s = crearStore(st);
  s.agregarMovimiento(gasto(s.obtener()));
  assert.equal(crearStore(st).obtener().movimientos.length, 1);
});

test('borrar categoría con movimientos la archiva', () => {
  const s = crearStore(storageMemoria());
  const cat = catGasto(s.obtener());
  s.agregarMovimiento(gasto(s.obtener()));
  s.borrarCategoria(cat.id);
  const e = s.obtener();
  assert.equal(e.categorias.find((c) => c.id === cat.id).archivada, true);
  assert.equal(e.movimientos.length, 1);
});

test('borrar categoría sin movimientos la elimina', () => {
  const s = crearStore(storageMemoria());
  const cat = catGasto(s.obtener());
  s.borrarCategoria(cat.id);
  assert.equal(s.obtener().categorias.some((c) => c.id === cat.id), false);
});

test('borrar meta con movimientos la archiva; sin movimientos la elimina', () => {
  const s = crearStore(storageMemoria());
  const a = s.agregarMeta({ tipo: 'ahorro', nombre: 'Viaje', monto: 1500000 });
  const b = s.agregarMeta({ tipo: 'ahorro', nombre: 'Otro', monto: 1000 });
  s.agregarMovimiento({ tipo: 'aportacion', monto: 1000, metaId: a.id, fecha: '2026-11-24' });
  s.borrarMeta(a.id);
  s.borrarMeta(b.id);
  const e = s.obtener();
  assert.equal(e.metas.find((m) => m.id === a.id).archivada, true);
  assert.equal(e.metas.some((m) => m.id === b.id), false);
});

test('si el storage falla, la mutación se revierte y lanza', () => {
  const st = storageMemoria();
  const s = crearStore(st);
  st.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.throws(() => s.agregarMovimiento(gasto(s.obtener())), /No se pudo guardar/);
  assert.equal(s.obtener().movimientos.length, 0);
});

test('gasto con monto 0 se rechaza', () => {
  const s = crearStore(storageMemoria());
  assert.throws(() => s.agregarMovimiento(gasto(s.obtener(), { monto: 0 })));
});

test('gasto con categoría de ingreso se rechaza', () => {
  const s = crearStore(storageMemoria());
  const ing = s.obtener().categorias.find((c) => c.tipo === 'ingreso');
  assert.throws(() => s.agregarMovimiento(gasto(s.obtener(), { categoriaId: ing.id })));
});

test('retiro (aportación negativa) sólo en metas de ahorro', () => {
  const s = crearStore(storageMemoria());
  const deuda = s.agregarMeta({ tipo: 'deuda', nombre: 'Préstamo', monto: 800000 });
  const ahorro = s.agregarMeta({ tipo: 'ahorro', nombre: 'Viaje', monto: 1500000 });
  assert.throws(() => s.agregarMovimiento({ tipo: 'aportacion', monto: -500, metaId: deuda.id, fecha: '2026-11-24' }));
  s.agregarMovimiento({ tipo: 'aportacion', monto: -500, metaId: ahorro.id, fecha: '2026-11-24' });
  assert.equal(s.obtener().movimientos.length, 1);
});

test('gasto con metaId sólo si la meta es tarjeta', () => {
  const s = crearStore(storageMemoria());
  const ahorro = s.agregarMeta({ tipo: 'ahorro', nombre: 'Viaje', monto: 1500000 });
  const tarjeta = s.agregarMeta({ tipo: 'tarjeta', nombre: 'Visa', monto: 0 });
  assert.throws(() => s.agregarMovimiento(gasto(s.obtener(), { metaId: ahorro.id })));
  s.agregarMovimiento(gasto(s.obtener(), { metaId: tarjeta.id }));
  assert.equal(s.obtener().movimientos[0].metaId, tarjeta.id);
});

test('aportación sin meta se rechaza', () => {
  const s = crearStore(storageMemoria());
  assert.throws(() => s.agregarMovimiento({ tipo: 'aportacion', monto: 100, fecha: '2026-11-24' }));
});

test('editar y borrar movimiento', () => {
  const s = crearStore(storageMemoria());
  const m = s.agregarMovimiento(gasto(s.obtener()));
  s.editarMovimiento(m.id, { monto: 999 });
  assert.equal(s.obtener().movimientos[0].monto, 999);
  assert.throws(() => s.editarMovimiento(m.id, { monto: -1 }));
  s.borrarMovimiento(m.id);
  assert.equal(s.obtener().movimientos.length, 0);
});

test('suscribir recibe el estado tras cada mutación', () => {
  const s = crearStore(storageMemoria());
  const vistos = [];
  const quitar = s.suscribir((e) => vistos.push(e.movimientos.length));
  s.agregarMovimiento(gasto(s.obtener()));
  quitar();
  s.agregarMovimiento(gasto(s.obtener()));
  assert.deepEqual(vistos, [1]);
});

test('datos guardados corruptos se conservan aparte y se avisa', () => {
  const st = storageMemoria();
  st.setItem('finanzas:v1', '{"version":1,"movimientos":[ roto');
  const s = crearStore(st);
  assert.equal(s.datosDanados, true);
  s.agregarMovimiento(gasto(s.obtener()));
  assert.equal(st.getItem('finanzas:v1:danado'), '{"version":1,"movimientos":[ roto');
});

test('datos con estructura inválida también cuentan como dañados', () => {
  const st = storageMemoria();
  st.setItem('finanzas:v1', '{"hola":1}');
  assert.equal(crearStore(st).datosDanados, true);
  assert.equal(st.getItem('finanzas:v1:danado'), '{"hola":1}');
});

test('datos sanos no se marcan como dañados', () => {
  const st = storageMemoria();
  const s = crearStore(st);
  s.agregarMovimiento(gasto(s.obtener()));
  assert.equal(crearStore(st).datosDanados, false);
});

test('dos copias abiertas no se pisan los cambios', () => {
  const st = storageMemoria();
  crearStore(st).marcarRespaldo('2026-11-01'); // datos ya guardados que ambas copias leen
  const a = crearStore(st);
  const b = crearStore(st);
  a.agregarMovimiento(gasto(a.obtener(), { nota: 'desde A' }));
  b.agregarMovimiento(gasto(b.obtener(), { nota: 'desde B' }));
  assert.deepEqual(crearStore(st).obtener().movimientos.map((m) => m.nota).sort(), ['desde A', 'desde B']);
});

test('recargar() toma los cambios hechos por otra copia', () => {
  const st = storageMemoria();
  const a = crearStore(st);
  const b = crearStore(st);
  a.agregarMovimiento(gasto(a.obtener()));
  b.recargar();
  assert.equal(b.obtener().movimientos.length, 1);
});

test('marcarRespaldo y reemplazarTodo', () => {
  const s = crearStore(storageMemoria());
  s.marcarRespaldo('2026-11-24');
  assert.equal(s.obtener().ajustes.ultimoRespaldo, '2026-11-24');
  const nuevo = estadoInicial();
  s.reemplazarTodo(nuevo);
  assert.equal(s.obtener().ajustes.ultimoRespaldo, null);
});
