import { crearStore } from './store.js';
import { hoyISO, claveMes } from './dates.js';
import { h, limpiar } from './ui/dom.js';
import { barraNav, rutaActual } from './ui/nav.js';
import { montarMes } from './ui/mes.js';
import { montarMetas } from './ui/metas.js';
import { montarAjustes } from './ui/ajustes.js';

const raiz = document.getElementById('app');

function iniciar() {
  let store;
  try {
    if (!globalThis.localStorage) throw new Error();
    store = crearStore();
  } catch {
    limpiar(raiz, h('main', { class: 'pantalla' }, h('p', { class: 'error' },
      'Este navegador no permite guardar datos (¿modo incógnito?). Abre la app en una ventana normal de Chrome.')));
    return;
  }

  const vistas = { '#mes': montarMes, '#metas': montarMetas, '#ajustes': montarAjustes };
  const ctx = {
    hoy: () => hoyISO(),
    periodo: { tipo: 'mes', mes: claveMes(hoyISO()) }, // vuelve a "Mes" cada vez que se abre la app
    cambiarPeriodo(p) { ctx.periodo = p; pintar(); },
    instalacion: () => seccionInstalar(),
  };

  // Instalación como app (Chrome en Android) y protección de los datos.
  let avisoInstalar = null;
  let persistente = null;
  const instalada = () => matchMedia('(display-mode: standalone)').matches;
  window.addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); avisoInstalar = ev; pintar(); });
  window.addEventListener('appinstalled', () => { avisoInstalar = null; pintar(); });
  navigator.storage?.persist?.().then((ok) => { persistente = ok; pintar(); }).catch(() => {});
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

  function seccionInstalar() {
    const estadoDatos = persistente === true
      ? '🔒 Chrome no borrará tus datos automáticamente.'
      : 'Instala la app para que Chrome proteja tus datos y no los borre si le falta espacio.';
    if (instalada()) return h('section', {}, h('h2', {}, '📱 App instalada'), h('p', { class: 'texto-ayuda' }, estadoDatos));
    return h('section', {},
      h('h2', {}, '📱 Instalar en tu teléfono'),
      h('p', { class: 'texto-ayuda' }, estadoDatos, ' ',
        avisoInstalar ? '' : 'En Chrome, abre el menú ⋮ y elige “Instalar app” o “Agregar a pantalla principal”.'),
      avisoInstalar && h('button', { class: 'btn primario', onclick: async () => {
        avisoInstalar.prompt();
        await avisoInstalar.userChoice;
        avisoInstalar = null;
        pintar();
      } }, 'Instalar app'));
  }

  const principal = h('main', { class: 'pantalla' });
  const navHueco = h('div');
  limpiar(raiz, principal, navHueco);

  function pintar() {
    const ruta = rutaActual();
    (vistas[ruta] || vistas['#mes'])(principal, store, ctx);
    limpiar(navHueco, barraNav(ruta));
  }

  window.addEventListener('hashchange', () => { pintar(); window.scrollTo(0, 0); });
  store.suscribir(pintar);
  // Si la app queda abierta de un día para otro, refresca "hoy".
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { store.recargar(); pintar(); } });
  // Otra copia abierta (app instalada / pestaña) guardó cambios.
  window.addEventListener('storage', (ev) => { if (ev.key === null || ev.key === 'finanzas:v1') store.recargar(); });
  pintar();
  return { store, ctx, vistas, pintar };
}

export const app = iniciar();
