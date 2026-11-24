// Carga sw.js en un entorno simulado para comprobar que las actualizaciones llegan al teléfono.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const codigo = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const ORIGEN = 'https://ejemplo.github.io';

function entorno({ enCache = {}, red = (url) => new Response(`nuevo:${url}`), }) {
  const almacen = new Map(Object.entries(enCache));
  const cache = {
    match: async (req) => { const t = almacen.get(req.url ?? req); return t == null ? undefined : new Response(t); },
    put: async (req, res) => { almacen.set(req.url ?? req, await res.text()); },
    addAll: async (reqs) => { for (const r of reqs) { precargas.push(r); almacen.set(r.url ?? r, `pre:${r.url ?? r}`); } },
  };
  const precargas = [];
  const pedidos = [];
  const oyentes = {};
  const self = {
    location: { origin: ORIGEN, href: `${ORIGEN}/mis-finanzas/sw.js` },
    addEventListener: (t, fn) => { oyentes[t] = fn; },
    skipWaiting: async () => {}, clients: { claim: async () => {} },
  };
  const ctx = {
    self, location: self.location, Request, Response, URL, console, setTimeout, clearTimeout,
    caches: { open: async () => cache, keys: async () => [], match: (r) => cache.match(r) },
    fetch: async (req) => { pedidos.push(req); return red(req.url ?? req); },
  };
  vm.runInNewContext(codigo, ctx);
  return { oyentes, almacen, pedidos, precargas };
}

async function pedir(env, ruta) {
  let respuesta;
  const espera = [];
  env.oyentes.fetch({
    request: new Request(`${ORIGEN}${ruta}`),
    respondWith: (p) => { respuesta = p; },
    waitUntil: (p) => espera.push(p),
  });
  const r = await respuesta;
  await Promise.all(espera);
  return r ? r.text() : null;
}

test('con red, responde la versión nueva y la guarda en caché', async () => {
  const url = `${ORIGEN}/src/app.js`;
  const env = entorno({ enCache: { [url]: 'viejo' } });
  assert.equal(await pedir(env, '/src/app.js'), `nuevo:${url}`);
  assert.equal(env.almacen.get(url), `nuevo:${url}`);
});

test('las peticiones a la red evitan la caché HTTP del navegador', async () => {
  const env = entorno({});
  await pedir(env, '/src/app.js');
  assert.equal(env.pedidos[0].cache, 'no-cache');
});

test('sin red, responde desde la caché', async () => {
  const url = `${ORIGEN}/src/app.js`;
  const env = entorno({ enCache: { [url]: 'guardado' }, red: () => { throw new TypeError('sin red'); } });
  assert.equal(await pedir(env, '/src/app.js'), 'guardado');
});

test('la instalación precarga evitando la caché HTTP', async () => {
  const env = entorno({});
  let espera;
  env.oyentes.install({ waitUntil: (p) => { espera = p; } });
  await espera;
  assert.ok(env.precargas.length > 5);
  for (const r of env.precargas) assert.equal(r.cache, 'reload', `precarga sin evitar caché: ${r.url ?? r}`);
});
