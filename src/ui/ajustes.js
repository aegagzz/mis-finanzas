// Ajustes: categorías, respaldo/restaurar, instalar y borrar todo.
import { h, limpiar, avisar, confirmar } from './dom.js';
import { exportarRespaldo, leerRespaldo, nombreArchivoRespaldo } from '../backup.js';

const fechaLarga = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

function filaCategoria(store, c) {
  const emoji = h('input', { type: 'text', class: 'emoji', value: c.emoji, maxlength: 4, 'aria-label': 'Emoji' });
  const nombre = h('input', { type: 'text', class: 'crece', value: c.nombre, maxlength: 24, 'aria-label': 'Nombre' });
  const guardar = () => {
    if (emoji.value === c.emoji && nombre.value.trim() === c.nombre) return;
    try { store.editarCategoria(c.id, { emoji: emoji.value.trim() || '🏷️', nombre: nombre.value }); avisar('Categoría guardada'); }
    catch (err) { avisar(err.message, 'error'); nombre.value = c.nombre; }
  };
  emoji.addEventListener('change', guardar);
  nombre.addEventListener('change', guardar);
  return h('div', { class: 'ajuste-fila' }, emoji, nombre,
    h('button', { class: 'btn-icono', 'aria-label': `Borrar ${c.nombre}`, onclick: async () => {
      const usada = store.obtener().movimientos.some((m) => m.categoriaId === c.id);
      const texto = usada
        ? `“${c.nombre}” tiene movimientos. Se ocultará al registrar, pero tus movimientos la conservan. ¿Continuar?`
        : `¿Borrar la categoría “${c.nombre}”?`;
      if (await confirmar(texto, { aceptar: 'Borrar', peligro: true })) {
        try { store.borrarCategoria(c.id); avisar('Categoría borrada'); } catch (err) { avisar(err.message, 'error'); }
      }
    } }, '🗑️'));
}

function nuevaCategoria(store, tipo) {
  const emoji = h('input', { type: 'text', class: 'emoji', placeholder: '🏷️', maxlength: 4, 'aria-label': 'Emoji' });
  const nombre = h('input', { type: 'text', class: 'crece', placeholder: 'Nueva categoría', maxlength: 24, 'aria-label': 'Nombre de la nueva categoría' });
  return h('form', { class: 'ajuste-fila', onsubmit: (ev) => {
    ev.preventDefault();
    try { store.agregarCategoria({ tipo, emoji: emoji.value.trim() || '🏷️', nombre: nombre.value }); avisar('Categoría agregada'); }
    catch (err) { avisar(err.message, 'error'); }
  } }, emoji, nombre, h('button', { type: 'submit', class: 'btn' }, 'Agregar'));
}

async function descargarRespaldo(store, ctx) {
  const texto = exportarRespaldo(store.obtener());
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  const a = h('a', { href: url, download: nombreArchivoRespaldo(ctx.hoy()) });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  // Sólo se marca como hecho si el usuario confirma que el archivo sí se descargó.
  if (!(await confirmar('¿Se descargó el archivo de respaldo? Revisa tus descargas.', { aceptar: 'Sí, se descargó' }))) {
    avisar('El respaldo no se marcó como hecho. Inténtalo de nuevo.', 'error');
    return;
  }
  try { store.marcarRespaldo(ctx.hoy()); avisar('Respaldo listo ✓'); } catch (err) { avisar(err.message, 'error'); }
}

async function restaurar(store, archivo) {
  let estado;
  try {
    estado = leerRespaldo(await archivo.text());
  } catch (err) {
    avisar(err.message, 'error');
    return;
  }
  const n = estado.movimientos.length;
  if (!(await confirmar(`Esto reemplaza todos tus datos actuales con el respaldo (${n} movimiento${n === 1 ? '' : 's'}). ¿Continuar?`, { aceptar: 'Restaurar', peligro: true }))) return;
  try { store.reemplazarTodo(estado); avisar('Datos restaurados ✓'); } catch (err) { avisar(err.message, 'error'); }
}

export function montarAjustes(contenedor, store, ctx) {
  const e = store.obtener();
  const activas = (tipo) => e.categorias.filter((c) => c.tipo === tipo && !c.archivada);
  const archivo = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: (ev) => {
    const f = ev.target.files[0];
    ev.target.value = '';
    if (f) restaurar(store, f);
  } });

  limpiar(contenedor,
    h('header', { class: 'mes-cabecera' }, h('h1', { class: 'titulo-pantalla' }, 'Ajustes')),

    h('section', {},
      h('h2', {}, '💾 Respaldo'),
      h('p', { class: 'texto-ayuda' },
        'Tus datos sólo viven en este teléfono. Descarga un respaldo de vez en cuando y guárdalo en un lugar seguro (por ejemplo, Google Drive). ',
        e.ajustes.ultimoRespaldo ? `Último respaldo: ${fechaLarga(e.ajustes.ultimoRespaldo)}.` : 'Aún no has hecho ningún respaldo.'),
      h('div', { class: 'botonera' },
        h('button', { class: 'btn primario', onclick: () => descargarRespaldo(store, ctx) }, 'Descargar respaldo'),
        h('button', { class: 'btn', onclick: () => archivo.click() }, 'Restaurar desde archivo'),
        archivo)),

    ctx.instalacion?.(),

    h('section', {},
      h('h2', {}, 'Categorías de gasto'),
      activas('gasto').map((c) => filaCategoria(store, c)),
      nuevaCategoria(store, 'gasto')),

    h('section', {},
      h('h2', {}, 'Categorías de ingreso'),
      activas('ingreso').map((c) => filaCategoria(store, c)),
      nuevaCategoria(store, 'ingreso')),

    h('section', { class: 'seccion-peligro' },
      h('h2', {}, 'Borrar todo'),
      h('p', { class: 'texto-ayuda' }, 'Elimina todos tus movimientos, metas y categorías de este teléfono. No se puede deshacer.'),
      h('button', { class: 'btn peligro', onclick: async () => {
        if (!(await confirmar('¿Seguro que quieres borrar TODOS tus datos? Te recomendamos descargar un respaldo antes.', { aceptar: 'Continuar', peligro: true }))) return;
        if (!(await confirmar('Última confirmación: se borrará todo y no se puede deshacer.', { aceptar: 'Borrar todo', peligro: true }))) return;
        try { store.borrarTodo(); avisar('Se borraron todos los datos'); location.hash = '#mes'; } catch (err) { avisar(err.message, 'error'); }
      } }, 'Borrar todos mis datos')));
}
