import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { accionDeInicio } from '../src/inicio.js';

const manifest = JSON.parse(readFileSync(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));

test('el manifest tiene los tres accesos directos con rutas relativas', () => {
  const accesos = manifest.shortcuts.map((s) => [s.name, s.url]);
  assert.deepEqual(accesos, [
    ['Registrar gasto', './?accion=gasto'],
    ['Registrar ingreso', './?accion=ingreso'],
    ['Ver semana', './?accion=semana'],
  ]);
});

test('cada acceso directo lleva a una acción que la app entiende', () => {
  for (const s of manifest.shortcuts) {
    assert.notEqual(accionDeInicio(new URL(s.url, 'https://x.github.io/mis-finanzas/').search), null, s.url);
  }
});

test('accionDeInicio interpreta la URL', () => {
  assert.equal(accionDeInicio('?accion=gasto'), 'gasto');
  assert.equal(accionDeInicio('?accion=ingreso'), 'ingreso');
  assert.equal(accionDeInicio('?accion=semana'), 'semana');
  assert.equal(accionDeInicio(''), null);
  assert.equal(accionDeInicio('?accion=borrar-todo'), null);
});
