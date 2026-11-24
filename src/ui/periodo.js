// Selector de periodo: Semana (‹ ›) · Mes (‹ ›) · Año · Elegir (del ___ al ___).
import { h } from './dom.js';
import { claveMes, mesAnterior, mesSiguiente, nombreMes, etiquetaPeriodo, rangoPeriodo, lunesDe, sumarDias } from '../dates.js';

const OPCIONES = [['semana', 'Semana'], ['mes', 'Mes'], ['anio', 'Año'], ['personalizado', 'Elegir']];

function navegador(etiqueta, { anterior, siguiente, haySiguiente, nombre }) {
  return h('div', { class: 'mes-cabecera' },
    h('button', { class: 'btn-icono', 'aria-label': `${nombre} anterior`, onclick: anterior }, '‹'),
    h('h1', {}, etiqueta),
    h('button', { class: 'btn-icono', 'aria-label': `${nombre} siguiente`, disabled: !haySiguiente, onclick: siguiente }, '›'));
}

export function selectorPeriodo(ctx) {
  const hoy = ctx.hoy();
  const p = ctx.periodo;
  const mesActual = claveMes(hoy);

  function elegir(tipo) {
    if (tipo === p.tipo) return;
    if (tipo === 'mes') ctx.cambiarPeriodo({ tipo: 'mes', mes: mesActual });
    else if (tipo === 'semana') ctx.cambiarPeriodo({ tipo: 'semana', inicio: lunesDe(hoy) });
    else if (tipo === 'personalizado') {
      const r = rangoPeriodo(p, hoy); // empieza con el rango que ya estaba a la vista
      ctx.cambiarPeriodo({ tipo, desde: r.desde < hoy ? r.desde : hoy, hasta: r.hasta < hoy ? r.hasta : hoy });
    } else ctx.cambiarPeriodo({ tipo });
  }

  const pestanas = h('div', { class: 'segmentado periodo-tipos', role: 'tablist', 'aria-label': 'Periodo' },
    OPCIONES.map(([tipo, texto]) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(p.tipo === tipo),
      class: p.tipo === tipo ? 'activo' : '', onclick: () => elegir(tipo) }, texto)));

  let detalle;
  if (p.tipo === 'mes') {
    detalle = navegador(nombreMes(p.mes), {
      nombre: 'Mes', haySiguiente: p.mes < mesActual,
      anterior: () => ctx.cambiarPeriodo({ tipo: 'mes', mes: mesAnterior(p.mes) }),
      siguiente: () => ctx.cambiarPeriodo({ tipo: 'mes', mes: mesSiguiente(p.mes) }),
    });
  } else if (p.tipo === 'semana') {
    detalle = navegador(etiquetaPeriodo(p, hoy), {
      nombre: 'Semana', haySiguiente: p.inicio < lunesDe(hoy),
      anterior: () => ctx.cambiarPeriodo({ tipo: 'semana', inicio: sumarDias(p.inicio, -7) }),
      siguiente: () => ctx.cambiarPeriodo({ tipo: 'semana', inicio: sumarDias(p.inicio, 7) }),
    });
  } else if (p.tipo === 'personalizado') {
    const desde = h('input', { type: 'date', value: p.desde, max: hoy, 'aria-label': 'Desde' });
    const hasta = h('input', { type: 'date', value: p.hasta, max: hoy, 'aria-label': 'Hasta' });
    const error = h('p', { class: 'error', role: 'alert' });
    detalle = h('form', { class: 'periodo-rango', onsubmit: (ev) => {
      ev.preventDefault();
      const nuevo = { tipo: 'personalizado', desde: desde.value, hasta: hasta.value };
      try { rangoPeriodo(nuevo, hoy); ctx.cambiarPeriodo(nuevo); } catch (err) { error.textContent = err.message; }
    } },
      h('label', {}, 'Del', desde), h('label', {}, 'al', hasta),
      h('button', { type: 'submit', class: 'btn primario' }, 'Ver'),
      error,
      h('h1', { class: 'periodo-titulo' }, etiquetaPeriodo(p, hoy)));
  } else {
    const r = rangoPeriodo(p, hoy);
    detalle = h('div', { class: 'periodo-titulo-bloque' },
      h('h1', { class: 'periodo-titulo' }, etiquetaPeriodo(p, hoy)),
      h('span', { class: 'meta-detalle' }, etiquetaPeriodo({ tipo: 'personalizado', ...r }, hoy)));
  }
  return h('header', { class: 'periodo' }, pestanas, detalle);
}
