// Hoja con el estado de resultados del periodo y su conciliación hasta "Te queda".
import { h } from './dom.js';
import { formatPesos } from '../money.js';
import { etiquetaPeriodo } from '../dates.js';
import { estadoResultados } from '../summary.js';
import { abrirDetalle } from './detalle.js';

const textoPct = (p) => (p == null ? '' : `${Math.round(p * 100)}%`);

export function abrirEstado(store, ctx) {
  const cuerpo = h('div', { class: 'detalle-cuerpo estado' });
  const dialogo = h('dialog', { class: 'hoja detalle', 'aria-label': 'Estado de resultados' }, cuerpo);

  function pintar() {
    const e = store.obtener();
    const hoy = ctx.hoy();
    const r = estadoResultados(e, ctx.periodo, hoy);
    const cat = new Map(e.categorias.map((c) => [c.id, c]));

    const fila = (texto, monto, pct, { clase = '', onclick } = {}) => {
      const contenido = [h('span', { class: 'er-texto' }, texto), h('span', { class: 'er-monto' }, formatPesos(monto)), h('span', { class: 'er-pct' }, textoPct(pct))];
      return onclick
        ? h('li', {}, h('button', { class: `er-fila er-boton ${clase}`, onclick }, contenido))
        : h('li', { class: `er-fila ${clase}` }, contenido);
    };
    const renglones = (lista) => lista.map((c) => {
      const info = cat.get(c.categoriaId) || { emoji: '❔', nombre: 'Sin categoría' };
      return fila(`${info.emoji} ${info.nombre}`, c.total, c.pct, { onclick: () => abrirDetalle(store, ctx, c.categoriaId) });
    });
    const vacio = (texto) => h('li', { class: 'er-fila er-vacio' }, texto);

    cuerpo.replaceChildren(
      h('div', { class: 'hoja-cabecera' },
        h('h2', {}, 'Estado de resultados'),
        h('button', { type: 'button', class: 'btn-icono', 'aria-label': 'Cerrar', onclick: () => dialogo.close() }, '✕')),
      h('p', { class: 'meta-detalle detalle-periodo' }, etiquetaPeriodo(ctx.periodo, hoy)),

      h('h3', { class: 'er-titulo' }, 'Ingresos'),
      h('ul', { class: 'er-lista' },
        r.ingresos.length ? renglones(r.ingresos) : vacio('Sin ingresos en este periodo'),
        fila('Total ingresos', r.totalIngresos, r.totalIngresos ? 1 : null, { clase: 'er-total ingreso' })),

      h('h3', { class: 'er-titulo' }, 'Gastos'),
      h('ul', { class: 'er-lista' },
        r.gastos.length ? renglones(r.gastos) : vacio('Sin gastos en este periodo'),
        fila('Total gastos', r.totalGastos, r.pctGastos, { clase: 'er-total gasto' })),

      h('ul', { class: 'er-lista er-resultado' },
        fila('Resultado del periodo (ingresos − gastos)', r.resultado, r.pctResultado, { clase: `er-total ${r.resultado < 0 ? 'negativo' : 'positivo'}` })),

      h('h3', { class: 'er-titulo' }, 'De resultado a “Te queda”'),
      h('ul', { class: 'er-lista er-conciliacion' },
        fila('Resultado del periodo', r.resultado, null),
        fila('+ Gastos pagados con tarjeta', r.comprasTarjeta, null),
        fila('− Pagos de tarjeta y deudas', r.pagosDeuda, null),
        fila(r.ahorro < 0 ? '− Ahorro (neto, hubo retiros)' : '− Ahorro', r.ahorro, null),
        fila('= Te queda', r.queda, null, { clase: `er-total ${r.queda < 0 ? 'negativo' : ''}` })),
      h('p', { class: 'texto-ayuda' }, 'Los gastos con tarjeta no salen de tu bolsillo al comprar; salen cuando pagas la tarjeta. Los porcentajes son sobre tus ingresos del periodo. Toca una categoría para ver sus movimientos.'));
  }

  const quitar = store.suscribir(() => { if (dialogo.isConnected) pintar(); });
  dialogo.addEventListener('close', () => { quitar(); dialogo.remove(); });
  document.body.append(dialogo);
  pintar();
  dialogo.showModal();
}
