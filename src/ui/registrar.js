// Modal para registrar o editar un movimiento en pocos toques.
import { h, avisar, confirmar } from './dom.js';
import { parsePesos } from '../money.js';
import { hoyISO } from '../dates.js';

const TIPOS = [['gasto', 'Gasto'], ['ingreso', 'Ingreso'], ['aportacion', 'A meta']];
const NOMBRE_META = { ahorro: 'Ahorro', deuda: 'Deuda', tarjeta: 'Tarjeta' };

const montoATexto = (c) => (Math.abs(c) / 100).toFixed(2).replace(/\.00$/, '');

export function abrirRegistro(store, { movimiento = null, tipo = 'gasto', metaId = null } = {}) {
  return new Promise((resolver) => {
    const editando = Boolean(movimiento);
    const s = {
      tipo: movimiento?.tipo ?? tipo,
      categoriaId: movimiento?.categoriaId ?? null,
      metaId: movimiento?.metaId ?? metaId,
      retiro: movimiento ? movimiento.tipo === 'aportacion' && movimiento.monto < 0 : false,
    };
    if (!movimiento && metaId) s.tipo = 'aportacion';
    // Al cambiar de tipo, el metaId de "pagado con" y el de "a meta" no se mezclan.
    const metaGasto = { valor: s.tipo === 'gasto' ? s.metaId : null };
    const metaAporte = { valor: s.tipo === 'aportacion' ? s.metaId : null };

    const monto = h('input', { class: 'monto-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '0.00', 'aria-label': 'Monto', value: movimiento ? montoATexto(movimiento.monto) : '' });
    const fecha = h('input', { type: 'date', value: movimiento?.fecha ?? hoyISO(), 'aria-label': 'Fecha', required: true });
    const nota = h('input', { type: 'text', placeholder: 'Nota (opcional)', maxlength: 80, value: movimiento?.nota ?? '', 'aria-label': 'Nota' });
    const error = h('p', { class: 'error', role: 'alert' });
    const cuerpo = h('div', { class: 'registro-cuerpo' });
    const pestanas = h('div', { class: 'segmentado', role: 'tablist' });

    function chip(texto, activo, onclick, extra = {}) {
      return h('button', { type: 'button', class: `chip ${activo ? 'activo' : ''}`, 'aria-pressed': String(activo), onclick, ...extra }, texto);
    }

    function pintar() {
      const e = store.obtener();
      pestanas.replaceChildren(...TIPOS.map(([t, txt]) =>
        h('button', { type: 'button', role: 'tab', 'aria-selected': String(s.tipo === t), class: s.tipo === t ? 'activo' : '',
          onclick: () => { s.tipo = t; error.textContent = ''; pintar(); if (!monto.value) monto.focus(); } }, txt)));

      const bloques = [];
      if (s.tipo === 'gasto' || s.tipo === 'ingreso') {
        const cats = e.categorias.filter((c) => c.tipo === s.tipo && (!c.archivada || c.id === s.categoriaId));
        if (!cats.some((c) => c.id === s.categoriaId)) s.categoriaId = null;
        bloques.push(h('div', { class: 'cats', role: 'group', 'aria-label': 'Categoría' },
          cats.map((c) => h('button', { type: 'button', class: `cat ${c.id === s.categoriaId ? 'activo' : ''}`, 'aria-pressed': String(c.id === s.categoriaId),
            onclick: () => { s.categoriaId = c.id; pintar(); } },
            h('span', { class: 'cat-emoji', 'aria-hidden': 'true' }, c.emoji), h('span', {}, c.nombre)))));
      }
      if (s.tipo === 'gasto') {
        const tarjetas = e.metas.filter((m) => m.tipo === 'tarjeta' && (!m.archivada || m.id === metaGasto.valor));
        if (tarjetas.length) {
          bloques.push(h('div', { class: 'campo' }, h('span', { class: 'etiqueta' }, 'Pagado con'),
            h('div', { class: 'chips' },
              chip('💵 Efectivo / débito', !metaGasto.valor, () => { metaGasto.valor = null; pintar(); }),
              tarjetas.map((t) => chip(`💳 ${t.nombre}`, metaGasto.valor === t.id, () => { metaGasto.valor = t.id; pintar(); })))));
        } else metaGasto.valor = null;
      }
      if (s.tipo === 'aportacion') {
        const metas = e.metas.filter((m) => !m.archivada || m.id === metaAporte.valor);
        if (!metas.length) {
          bloques.push(h('p', { class: 'vacio' }, 'Aún no tienes metas. ', h('a', { href: '#metas', onclick: () => cerrar() }, 'Crea una en Metas'), '.'));
        } else {
          bloques.push(h('div', { class: 'campo' }, h('span', { class: 'etiqueta' }, '¿A qué meta?'),
            h('div', { class: 'chips' }, metas.map((m) => chip(`${m.nombre} · ${NOMBRE_META[m.tipo]}`, metaAporte.valor === m.id, () => { metaAporte.valor = m.id; pintar(); })))));
          const meta = metas.find((m) => m.id === metaAporte.valor);
          if (meta?.tipo === 'ahorro') {
            bloques.push(h('div', { class: 'chips' },
              chip('➕ Aportar', !s.retiro, () => { s.retiro = false; pintar(); }),
              chip('➖ Retirar', s.retiro, () => { s.retiro = true; pintar(); })));
          } else s.retiro = false;
        }
      }
      cuerpo.replaceChildren(...bloques);
    }

    async function guardar(ev) {
      ev.preventDefault();
      error.textContent = '';
      try {
        let centavos = parsePesos(monto.value);
        const datos = { tipo: s.tipo, fecha: fecha.value, nota: nota.value };
        if (s.tipo === 'aportacion') {
          if (s.retiro) centavos = -centavos;
          Object.assign(datos, { metaId: metaAporte.valor, categoriaId: null });
        } else {
          Object.assign(datos, { categoriaId: s.categoriaId, metaId: s.tipo === 'gasto' ? metaGasto.valor : null });
        }
        datos.monto = centavos;
        if (editando) store.editarMovimiento(movimiento.id, datos);
        else store.agregarMovimiento(datos);
        avisar(editando ? 'Cambios guardados' : 'Guardado ✓');
        cerrar();
      } catch (err) {
        error.textContent = err.message;
      }
    }

    async function borrar() {
      if (await confirmar('¿Borrar este movimiento?', { aceptar: 'Borrar', peligro: true })) {
        try { store.borrarMovimiento(movimiento.id); avisar('Movimiento borrado'); cerrar(); } catch (err) { error.textContent = err.message; }
      }
    }

    const dialogo = h('dialog', { class: 'hoja', 'aria-label': editando ? 'Editar movimiento' : 'Registrar' },
      h('form', { onsubmit: guardar },
        h('div', { class: 'hoja-cabecera' },
          h('h2', {}, editando ? 'Editar' : 'Registrar'),
          h('button', { type: 'button', class: 'btn-icono', 'aria-label': 'Cerrar', onclick: () => cerrar() }, '✕')),
        pestanas,
        h('label', { class: 'monto' }, h('span', { 'aria-hidden': 'true' }, '$'), monto),
        cuerpo,
        h('div', { class: 'fila' }, fecha, nota),
        error,
        h('div', { class: 'acciones' },
          editando && h('button', { type: 'button', class: 'btn peligro', onclick: borrar }, 'Borrar'),
          h('button', { type: 'submit', class: 'btn primario grande' }, 'Guardar'))));

    function cerrar() { if (dialogo.open) dialogo.close(); }
    dialogo.addEventListener('close', () => { dialogo.remove(); resolver(); });
    document.body.append(dialogo);
    pintar();
    dialogo.showModal();
    if (!editando) monto.focus();
  });
}
