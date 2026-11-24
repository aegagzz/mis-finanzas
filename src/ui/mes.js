// Pantalla principal: el mes de un vistazo.
import { h, limpiar } from './dom.js';
import { formatPesos } from '../money.js';
import { nombreMes, mesAnterior, mesSiguiente, claveMes } from '../dates.js';
import { resumenMes } from '../summary.js';
import { necesitaRespaldo } from '../backup.js';
import { abrirRegistro } from './registrar.js';

const fechaCorta = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });

function textoCambio(cambio) {
  if (cambio == null) return null;
  const pct = Math.round(cambio * 100);
  if (pct === 0) return h('span', { class: 'cambio igual' }, '= vs mes ant.');
  return h('span', { class: `cambio ${pct > 0 ? 'sube' : 'baja'}`, title: 'Comparado con los mismos días del mes anterior' },
    `${pct > 0 ? '▲ +' : '▼ '}${pct}%`);
}

export function montarMes(contenedor, store, ctx) {
  const e = store.obtener();
  const hoy = ctx.hoy();
  const clave = ctx.mes;
  const r = resumenMes(e, clave, hoy);
  const cat = new Map(e.categorias.map((c) => [c.id, c]));
  const meta = new Map(e.metas.map((m) => [m.id, m]));
  const maximo = Math.max(1, ...r.porCategoria.map((c) => c.total));
  const esMesActual = clave === claveMes(hoy);

  const danados = store.datosDanados
    ? h('a', { class: 'banner', href: '#ajustes' }, '⚠️ Tus datos guardados estaban dañados y no se pudieron abrir. Se guardó una copia aparte; toca aquí para restaurar tu último respaldo.')
    : null;
  const aviso = necesitaRespaldo(e.ajustes.ultimoRespaldo, hoy) && e.movimientos.length > 0
    ? h('a', { class: 'banner', href: '#ajustes' }, e.ajustes.ultimoRespaldo
        ? '💾 Hace más de un mes que no respaldas tus datos. Toca para hacer un respaldo.'
        : '💾 Aún no has respaldado tus datos. Toca para hacer tu primer respaldo.')
    : null;

  const cabecera = h('header', { class: 'mes-cabecera' },
    h('button', { class: 'btn-icono', 'aria-label': 'Mes anterior', onclick: () => ctx.irAMes(mesAnterior(clave)) }, '‹'),
    h('h1', {}, nombreMes(clave)),
    h('button', { class: 'btn-icono', 'aria-label': 'Mes siguiente', disabled: esMesActual, onclick: () => ctx.irAMes(mesSiguiente(clave)) }, '›'));

  const tarjetas = h('section', { class: 'resumen', 'aria-label': 'Resumen del mes' },
    h('div', { class: 'tarjeta ingreso' }, h('span', {}, 'Ingresos'), h('strong', {}, formatPesos(r.ingresos))),
    h('div', { class: 'tarjeta gasto' }, h('span', {}, 'Gastos'), h('strong', {}, formatPesos(r.gastos)),
      r.gastosTarjeta > 0 && h('small', {}, `${formatPesos(r.gastosTarjeta)} con tarjeta`)),
    h('details', { class: `tarjeta queda ${r.queda < 0 ? 'negativo' : ''}` },
      h('summary', {}, h('span', {}, 'Te queda'), h('strong', {}, formatPesos(r.queda)), h('small', {}, 'Toca para ver el cálculo')),
      h('dl', { class: 'desglose' },
        h('dt', {}, 'Ingresos'), h('dd', {}, formatPesos(r.ingresos)),
        h('dt', {}, '− Gastos en efectivo / débito'), h('dd', {}, formatPesos(r.gastosEfectivo)),
        h('dt', {}, '− Ahorro'), h('dd', {}, formatPesos(r.ahorro)),
        h('dt', {}, '− Pagos de deuda / tarjeta'), h('dd', {}, formatPesos(r.pagosDeuda)),
        h('dt', { class: 'nota-desglose' }, 'Las compras con tarjeta se descuentan cuando pagas la tarjeta.'))));

  const apartado = (r.ahorro !== 0 || r.pagosDeuda !== 0)
    ? h('section', { class: 'apartado', 'aria-label': 'Ahorro y pagos de deuda' },
        h('h2', {}, 'Ahorro / pagos de deuda'),
        h('div', { class: 'apartado-fila' },
          h('div', {}, h('span', {}, '🐷 Ahorro'), h('strong', {}, formatPesos(r.ahorro))),
          h('div', {}, h('span', {}, '💳 Pagos de deuda'), h('strong', {}, formatPesos(r.pagosDeuda)))))
    : null;

  const categorias = h('section', { class: 'categorias', 'aria-label': 'Gastos por categoría' },
    h('h2', {}, '¿En qué se fue?'),
    r.porCategoria.length === 0
      ? h('p', { class: 'vacio' }, 'Todavía no hay gastos este mes.')
      : h('ul', { class: 'barras' }, r.porCategoria.map((c) => {
          const info = cat.get(c.categoriaId) || { emoji: '❔', nombre: 'Sin categoría' };
          return h('li', {},
            h('div', { class: 'barra-texto' },
              h('span', {}, `${info.emoji} ${info.nombre}`),
              h('span', { class: 'barra-monto' }, formatPesos(c.total), ' ', textoCambio(c.cambio))),
            h('div', { class: 'barra', role: 'presentation' }, h('div', { class: 'barra-relleno', style: { width: `${(c.total / maximo) * 100}%` } })));
        })));

  const lista = h('section', { class: 'movimientos', 'aria-label': 'Movimientos' },
    h('h2', {}, 'Movimientos'),
    r.movimientos.length === 0
      ? h('p', { class: 'vacio' }, 'Toca + para registrar tu primer gasto o ingreso.')
      : h('ul', { class: 'lista' }, r.movimientos.map((m) => {
          const c = cat.get(m.categoriaId);
          const mt = meta.get(m.metaId);
          let icono, titulo, clase, signo;
          if (m.tipo === 'aportacion') {
            icono = mt?.tipo === 'ahorro' ? '🐷' : '💳';
            titulo = m.monto < 0 ? `Retiro de ${mt?.nombre ?? 'meta'}` : `${mt?.tipo === 'ahorro' ? 'Ahorro' : 'Pago'}: ${mt?.nombre ?? 'meta'}`;
            clase = 'aporte'; signo = '';
          } else {
            icono = c?.emoji ?? '❔'; titulo = c?.nombre ?? 'Sin categoría';
            clase = m.tipo; signo = m.tipo === 'ingreso' ? '+' : '−';
          }
          return h('li', {}, h('button', { class: 'mov', onclick: () => abrirRegistro(store, { movimiento: m }) },
            h('span', { class: 'mov-icono', 'aria-hidden': 'true' }, icono),
            h('span', { class: 'mov-texto' },
              h('span', { class: 'mov-titulo' }, titulo),
              h('span', { class: 'mov-sub' }, [fechaCorta(m.fecha), m.tipo === 'gasto' && mt ? `💳 ${mt.nombre}` : null, m.nota || null].filter(Boolean).join(' · '))),
            h('span', { class: `mov-monto ${clase}` }, `${signo}${formatPesos(Math.abs(m.monto))}`)));
        })));

  const fab = h('button', { class: 'fab', 'aria-label': 'Registrar gasto o ingreso', onclick: () => abrirRegistro(store) }, '+');

  limpiar(contenedor, danados, aviso, cabecera, tarjetas, apartado, categorias, lista, fab);
}
