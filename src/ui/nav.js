import { h } from './dom.js';

export const RUTAS = [
  { hash: '#mes', icono: '📅', texto: 'Mes' },
  { hash: '#metas', icono: '🎯', texto: 'Metas' },
  { hash: '#ajustes', icono: '⚙️', texto: 'Ajustes' },
];

export function rutaActual() {
  return RUTAS.some((r) => r.hash === location.hash) ? location.hash : '#mes';
}

export function barraNav(actual) {
  return h('nav', { class: 'nav', 'aria-label': 'Secciones' },
    RUTAS.map((r) => h('a', { href: r.hash, class: r.hash === actual ? 'activo' : null, 'aria-current': r.hash === actual ? 'page' : null },
      h('span', { class: 'nav-icono', 'aria-hidden': 'true' }, r.icono), r.texto)));
}
