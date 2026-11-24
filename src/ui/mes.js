// Pantalla principal: el periodo elegido de un vistazo (por defecto, el mes actual).
import { h, limpiar } from './dom.js';
import { formatPesos } from '../money.js';
import { resumenPeriodo } from '../summary.js';
import { necesitaRespaldo } from '../backup.js';
import { abrirRegistro } from './registrar.js';
import { abrirDetalle } from './detalle.js';
import { selectorPeriodo } from './periodo.js';
import { textoCambio, fechaCorta } from './formato.js';

function seccionCategorias(store, ctx, { titulo, vacio, lista, tipo, cat }) {
  const maximo = Math.max(1, ...lista.map((c) => c.total));
  return h('section', { class: `categorias ${tipo}`, 'aria-label': titulo },
    h('h2', {}, titulo),
    lista.length === 0
      ? h('p', { class: 'vacio' }, vacio)
      : h('ul', { class: 'barras' }, lista.map((c) => {
          const info = cat.get(c.categoriaId) || { emoji: '❔', nombre: 'Sin categoría' };
          return h('li', {}, h('button', { class: 'barra-boton', 'aria-label': `Ver detalle de ${info.nombre}`, onclick: () => abrirDetalle(store, ctx, c.categoriaId) },
            h('div', { class: 'barra-texto' },
              h('span', {}, `${info.emoji} ${info.nombre}`),
              h('span', { class: 'barra-monto' }, formatPesos(c.total), ' ', textoCambio(c.cambio, tipo), h('span', { class: 'chevron', 'aria-hidden': 'true' }, ' ›'))),
            h('div', { class: 'barra', role: 'presentation' }, h('div', { class: 'barra-relleno', style: { width: `${(c.total / maximo) * 100}%` } }))));
        })));
}

export function montarMes(contenedor, store, ctx) {
  const e = store.obtener();
  const hoy = ctx.hoy();
  const r = resumenPeriodo(e, ctx.periodo, hoy);
  const cat = new Map(e.categorias.map((c) => [c.id, c]));
  const meta = new Map(e.metas.map((m) => [m.id, m]));

  const danados = store.datosDanados
    ? h('a', { class: 'banner', href: '#ajustes' }, '⚠️ Tus datos guardados estaban dañados y no se pudieron abrir. Se guardó una copia aparte; toca aquí para restaurar tu último respaldo.')
    : null;
  const aviso = necesitaRespaldo(e.ajustes.ultimoRespaldo, hoy) && e.movimientos.length > 0
    ? h('a', { class: 'banner', href: '#ajustes' }, e.ajustes.ultimoRespaldo
        ? '💾 Hace más de un mes que no respaldas tus datos. Toca para hacer un respaldo.'
        : '💾 Aún no has respaldado tus datos. Toca para hacer tu primer respaldo.')
    : null;

  const tarjetas = h('section', { class: 'resumen', 'aria-label': 'Resumen del periodo' },
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

  const gastos = seccionCategorias(store, ctx, { titulo: '¿En qué se fue?', vacio: 'No hay gastos en este periodo.', lista: r.porCategoria, tipo: 'gasto', cat });
  const ingresos = seccionCategorias(store, ctx, { titulo: '¿De dónde vino?', vacio: 'No hay ingresos en este periodo.', lista: r.porCategoriaIngreso, tipo: 'ingreso', cat });

  const lista = h('section', { class: 'movimientos', 'aria-label': 'Movimientos' },
    h('h2', {}, 'Movimientos'),
    r.movimientos.length === 0
      ? h('p', { class: 'vacio' }, 'Toca + para registrar un gasto o ingreso.')
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

  limpiar(contenedor, danados, aviso, selectorPeriodo(ctx), tarjetas, apartado, gastos, ingresos, lista, fab);
}
