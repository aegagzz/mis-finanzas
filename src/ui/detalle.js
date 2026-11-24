// Hoja con los movimientos que forman el total de una categoría en el periodo.
import { h } from './dom.js';
import { formatPesos } from '../money.js';
import { etiquetaPeriodo } from '../dates.js';
import { detalleCategoria } from '../summary.js';
import { abrirRegistro } from './registrar.js';
import { textoCambio, fechaCorta } from './formato.js';

export function abrirDetalle(store, ctx, categoriaId) {
  const cuerpo = h('div', { class: 'detalle-cuerpo' });
  const dialogo = h('dialog', { class: 'hoja detalle', 'aria-label': 'Detalle de categoría' }, cuerpo);

  function pintar() {
    const e = store.obtener();
    const hoy = ctx.hoy();
    const cat = e.categorias.find((c) => c.id === categoriaId) || { emoji: '❔', nombre: 'Sin categoría', tipo: 'gasto' };
    const d = detalleCategoria(e, ctx.periodo, hoy, categoriaId);
    if (d.cantidad === 0) { // no hay (o se borró el último) movimiento
      if (dialogo.open) dialogo.close(); else { quitar(); dialogo.remove(); }
      return;
    }
    const tarjetas = new Map(e.metas.map((m) => [m.id, m]));
    const palabra = d.tipo === 'ingreso' ? (d.cantidad === 1 ? 'ingreso' : 'ingresos') : (d.cantidad === 1 ? 'gasto' : 'gastos');

    cuerpo.replaceChildren(
      h('div', { class: 'hoja-cabecera' },
        h('h2', {}, `${cat.emoji} ${cat.nombre}`),
        h('button', { type: 'button', class: 'btn-icono', 'aria-label': 'Cerrar', onclick: () => dialogo.close() }, '✕')),
      h('p', { class: 'meta-detalle detalle-periodo' }, etiquetaPeriodo(ctx.periodo, hoy)),
      h('div', { class: 'detalle-total' },
        h('strong', { class: d.tipo === 'ingreso' ? 'mov-monto ingreso' : 'mov-monto gasto' }, formatPesos(d.total)),
        h('span', { class: 'meta-detalle' }, `${d.cantidad} ${palabra}`, ' ', textoCambio(d.cambio, d.tipo))),
      h('ul', { class: 'lista' }, d.movimientos.map((m) => {
        const t = m.tipo === 'gasto' ? tarjetas.get(m.metaId) : null;
        return h('li', {}, h('button', { class: 'mov', onclick: () => abrirRegistro(store, { movimiento: m }) },
          h('span', { class: 'mov-texto' },
            h('span', { class: 'mov-titulo' }, m.nota || fechaCorta(m.fecha)),
            h('span', { class: 'mov-sub' }, [m.nota ? fechaCorta(m.fecha) : null, t ? `💳 ${t.nombre}` : null].filter(Boolean).join(' · '))),
          h('span', { class: `mov-monto ${m.tipo}` }, formatPesos(m.monto))));
      })));
  }

  const quitar = store.suscribir(() => { if (dialogo.isConnected) pintar(); });
  dialogo.addEventListener('close', () => { quitar(); dialogo.remove(); });
  document.body.append(dialogo);
  pintar();
  if (!dialogo.isConnected) return;
  dialogo.showModal();
}
