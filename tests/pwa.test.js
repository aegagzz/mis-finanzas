import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const raiz = new URL('../', import.meta.url);
const leer = (p) => readFileSync(new URL(p, raiz), 'utf8');
const listaSW = () => JSON.parse(`[${leer('sw.js').match(/const ARCHIVOS = \[([\s\S]*?)\];/)[1].replace(/'/g, '"').replace(/,\s*$/, '')}]`);

test('el service worker guarda en caché todos los módulos de la app', () => {
  const enCache = new Set(listaSW());
  const modulos = [
    ...readdirSync(new URL('src/', raiz)).filter((f) => f.endsWith('.js')).map((f) => `src/${f}`),
    ...readdirSync(new URL('src/ui/', raiz)).filter((f) => f.endsWith('.js')).map((f) => `src/ui/${f}`),
  ];
  for (const m of modulos) assert.ok(enCache.has(m), `falta ${m} en sw.js`);
});

test('todos los archivos del service worker existen', () => {
  for (const f of listaSW()) if (f !== './') assert.ok(existsSync(new URL(f, raiz)), `no existe ${f}`);
});

test('el manifest usa rutas relativas e iconos existentes', () => {
  const m = JSON.parse(leer('manifest.webmanifest'));
  assert.equal(m.start_url, './');
  assert.equal(m.display, 'standalone');
  for (const i of m.icons) {
    assert.ok(!i.src.startsWith('/'), `ruta absoluta en ${i.src}`);
    assert.ok(existsSync(new URL(i.src, raiz)), `no existe ${i.src}`);
  }
  assert.ok(m.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'));
});
