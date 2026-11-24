// Metas: ahorro, deudas fijas y tarjetas de crédito.
import { h, limpiar, avisar, confirmar } from './dom.js';
import { formatPesos, parsePesos } from '../money.js';
import { progresoMeta } from '../goals.js';
import { abrirRegistro } from './registrar.js';

const GRUPOS = [
  { tipo: 'ahorro', titulo: '🐷 Ahorro', boton: 'Aportar' },
  { tipo: 'deuda', titulo: '📉 Deudas', boton: 'Pagar' },
  { tipo: 'tarjeta', titulo: '💳 Tarjetas de crédito', boton: 'Pagar' },
];
const fechaLarga = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
const fechaCorta = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

function tarjetaMeta(store, meta, grupo) {
  const e = store.obtener();
  const p = progresoMeta(meta, e.movimientos);
  const lograda = p.pct >= 1;
  const detalle = meta.tipo === 'ahorro'
    ? `Llevas ${formatPesos(p.aportado)} de ${formatPesos(meta.monto)}`
    : p.debe <= 0 ? 'No debes nada 🎉' : `Debes ${formatPesos(p.debe)}`;

  const historial = e.movimientos
    .filter((m) => m.metaId === meta.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return h('article', { class: `meta ${lograda ? 'lograda' : ''}` },
    h('div', { class: 'meta-cabecera' },
      h('span', { class: 'meta-nombre' }, meta.nombre),
      lograda && meta.tipo !== 'tarjeta' ? h('span', { class: 'insignia' }, '¡Lograda!') : h('span', { class: 'meta-detalle' }, `${Math.round(p.pct * 100)}%`)),
    h('div', { class: 'barra' }, h('div', { class: 'barra-relleno', style: { width: `${p.pct * 100}%` } })),
    h('span', { class: 'meta-detalle' }, detalle, meta.fechaObjetivo ? ` · para el ${fechaLarga(meta.fechaObjetivo)}` : ''),
    historial.length > 0 && h('details', {},
      h('summary', { class: 'meta-detalle' }, `Historial (${historial.length})`),
      h('ul', { class: 'historial' }, historial.map((m) => h('li', {},
        h('span', {}, `${fechaCorta(m.fecha)} · ${m.tipo === 'gasto' ? 'Compra' : m.monto < 0 ? 'Retiro' : meta.tipo === 'ahorro' ? 'Aportación' : 'Pago'}${m.nota ? ` · ${m.nota}` : ''}`),
        h('span', {}, formatPesos(m.monto)))))),
    h('div', { class: 'meta-acciones' },
      h('button', { class: 'btn primario', onclick: () => abrirRegistro(store, { metaId: meta.id }) }, grupo.boton),
      h('button', { class: 'btn', onclick: () => abrirFormMeta(store, meta) }, 'Editar'),
      h('button', { class: 'btn peligro', onclick: () => borrarMeta(store, meta) }, 'Borrar')));
}

async function borrarMeta(store, meta) {
  const usada = store.obtener().movimientos.some((m) => m.metaId === meta.id);
  const texto = usada
    ? `“${meta.nombre}” tiene movimientos. Se ocultará de tus metas, pero sus movimientos seguirán en tu historial. ¿Continuar?`
    : `¿Borrar la meta “${meta.nombre}”?`;
  if (!(await confirmar(texto, { aceptar: 'Borrar', peligro: true }))) return;
  try { store.borrarMeta(meta.id); avisar('Meta borrada'); } catch (err) { avisar(err.message, 'error'); }
}

const ETIQUETA_MONTO = {
  ahorro: '¿Cuánto quieres juntar?',
  deuda: '¿Cuánto debes hoy?',
  tarjeta: '¿Cuánto debes hoy en la tarjeta? (0 si nada)',
};

export function abrirFormMeta(store, meta = null) {
  let tipo = meta?.tipo ?? 'ahorro';
  const usada = meta && store.obtener().movimientos.some((m) => m.metaId === meta.id);
  const nombre = h('input', { type: 'text', maxlength: 40, required: true, value: meta?.nombre ?? '', placeholder: 'Ej. Viaje a la playa' });
  const monto = h('input', { type: 'text', inputmode: 'decimal', value: meta ? (meta.monto / 100).toFixed(2) : '', placeholder: '0.00' });
  const fecha = h('input', { type: 'date', value: meta?.fechaObjetivo ?? '' });
  const etiquetaMonto = h('span');
  const campoFecha = h('label', {}, 'Fecha objetivo (opcional)', fecha);
  const error = h('p', { class: 'error', role: 'alert' });
  const tipos = h('div', { class: 'segmentado' });

  function pintar() {
    tipos.replaceChildren(...GRUPOS.map((g) => h('button', {
      type: 'button', class: g.tipo === tipo ? 'activo' : '', disabled: usada && g.tipo !== tipo,
      onclick: () => { tipo = g.tipo; pintar(); } }, g.titulo.split(' ').slice(1).join(' ').replace('Tarjetas de crédito', 'Tarjeta'))));
    etiquetaMonto.textContent = ETIQUETA_MONTO[tipo];
    campoFecha.hidden = tipo === 'tarjeta';
    nombre.placeholder = { ahorro: 'Ej. Viaje a la playa', deuda: 'Ej. Préstamo del coche', tarjeta: 'Ej. Visa Banorte' }[tipo];
  }

  const dialogo = h('dialog', { class: 'hoja' },
    h('form', { onsubmit: (ev) => {
      ev.preventDefault();
      error.textContent = '';
      try {
        const texto = monto.value.trim();
        const centavos = tipo === 'tarjeta' && (texto === '' || /^\$?0+([.,]0+)?$/.test(texto)) ? 0 : parsePesos(texto);
        const datos = { tipo, nombre: nombre.value, monto: centavos, fechaObjetivo: tipo !== 'tarjeta' && fecha.value ? fecha.value : null };
        if (meta) store.editarMeta(meta.id, datos); else store.agregarMeta(datos);
        avisar(meta ? 'Meta actualizada' : 'Meta creada ✓');
        dialogo.close();
      } catch (err) { error.textContent = err.message; }
    } },
      h('div', { class: 'hoja-cabecera' },
        h('h2', {}, meta ? 'Editar meta' : 'Nueva meta'),
        h('button', { type: 'button', class: 'btn-icono', 'aria-label': 'Cerrar', onclick: () => dialogo.close() }, '✕')),
      tipos,
      h('div', { class: 'form-grid' },
        h('label', {}, 'Nombre', nombre),
        h('label', {}, etiquetaMonto, monto),
        campoFecha),
      error,
      h('div', { class: 'acciones' }, h('button', { type: 'submit', class: 'btn primario grande' }, 'Guardar'))));
  dialogo.addEventListener('close', () => dialogo.remove());
  document.body.append(dialogo);
  pintar();
  dialogo.showModal();
}

export function montarMetas(contenedor, store) {
  const metas = store.obtener().metas.filter((m) => !m.archivada);
  const nueva = h('button', { class: 'btn primario', onclick: () => abrirFormMeta(store) }, '＋ Nueva meta');
  const cabecera = h('header', { class: 'mes-cabecera' }, h('h1', { class: 'titulo-pantalla' }, 'Metas'), nueva);

  if (metas.length === 0) {
    limpiar(contenedor, cabecera, h('section', {},
      h('p', { class: 'vacio' }, 'Crea una meta para ahorrar para algo, salir de una deuda o llevar el control de tu tarjeta de crédito.')));
    return;
  }
  limpiar(contenedor, cabecera, GRUPOS.map((g) => {
    const delGrupo = metas.filter((m) => m.tipo === g.tipo);
    return delGrupo.length > 0 && h('section', { class: 'grupo-metas' }, h('h2', {}, g.titulo), delGrupo.map((m) => tarjetaMeta(store, m, g)));
  }));
}
