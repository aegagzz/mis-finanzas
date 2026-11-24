// Piezas de presentación compartidas entre pantallas.
import { h } from './dom.js';

export const fechaCorta = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });

// Para gastos, subir es malo (rojo); para ingresos, subir es bueno (verde).
export function textoCambio(cambio, tipo = 'gasto') {
  if (cambio == null) return null;
  const pct = Math.round(cambio * 100);
  if (pct === 0) return h('span', { class: 'cambio igual' }, '= vs periodo ant.');
  const bueno = tipo === 'ingreso' ? pct > 0 : pct < 0;
  return h('span', { class: `cambio ${bueno ? 'baja' : 'sube'}`, title: 'Comparado con el periodo anterior de la misma duración' },
    `${pct > 0 ? '▲ +' : '▼ '}${pct}%`);
}
