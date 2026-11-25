// Service worker: la app funciona sin internet y se actualiza sola.
// Estrategia "primero la red": con conexión siempre se usa la versión más nueva (y se guarda);
// sin conexión, o si la red tarda más de 3 s, se usa la copia guardada.
const CACHE = 'finanzas';
const ESPERA_RED_MS = 3000;
const ARCHIVOS = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'src/app.js', 'src/store.js', 'src/money.js', 'src/dates.js', 'src/summary.js', 'src/goals.js', 'src/backup.js', 'src/inicio.js',
  'src/ui/dom.js', 'src/ui/formato.js', 'src/ui/periodo.js', 'src/ui/detalle.js', 'src/ui/estado.js', 'src/ui/nav.js', 'src/ui/mes.js', 'src/ui/registrar.js', 'src/ui/metas.js', 'src/ui/ajustes.js',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE)
    // cache: 'reload' evita que el navegador devuelva archivos viejos de su propia caché HTTP.
    .then((c) => c.addAll(ARCHIVOS.map((a) => new Request(new URL(a, self.location.href), { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys()
    .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function desdeRed(request) {
  return new Promise((resolver, rechazar) => {
    const t = setTimeout(() => rechazar(new Error('lento')), ESPERA_RED_MS);
    fetch(new Request(request, { cache: 'no-cache' })).then(
      (r) => { clearTimeout(t); r.ok ? resolver(r) : rechazar(new Error(String(r.status))); },
      (e) => { clearTimeout(t); rechazar(e); });
  });
}

self.addEventListener('fetch', (ev) => {
  const { request } = ev;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const red = desdeRed(request);
  // Aunque se responda desde la caché por lentitud, la versión nueva se guarda al llegar.
  ev.waitUntil(red.then((r) => caches.open(CACHE).then((c) => c.put(request, r.clone()))).catch(() => {}));
  ev.respondWith(red.then((r) => r.clone()).catch(() =>
    caches.open(CACHE).then((c) => c.match(request, { ignoreSearch: true }))
      .then((r) => r || Response.error())));
});
