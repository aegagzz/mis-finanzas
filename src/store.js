// Estado completo en un único JSON en localStorage. Toda mutación valida, guarda y avisa.
import { hoyISO } from './dates.js';

export const CLAVE = 'finanzas:v1';

const id = () => globalThis.crypto.randomUUID();

const CATEGORIAS = [
  ['🍔', 'Comida', 'gasto'], ['🚗', 'Transporte', 'gasto'], ['🏠', 'Casa', 'gasto'],
  ['🎉', 'Ocio', 'gasto'], ['💊', 'Salud', 'gasto'], ['🛍️', 'Compras', 'gasto'],
  ['💡', 'Servicios', 'gasto'], ['📦', 'Otros', 'gasto'],
  ['💼', 'Sueldo', 'ingreso'], ['✨', 'Extra', 'ingreso'],
];

export function estadoInicial() {
  return {
    version: 1,
    categorias: CATEGORIAS.map(([emoji, nombre, tipo]) => ({ id: id(), nombre, emoji, tipo, archivada: false })),
    metas: [],
    movimientos: [],
    ajustes: { ultimoRespaldo: null },
  };
}

const esEntero = (n) => Number.isSafeInteger(n);
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function validarMovimiento(m, estado) {
  if (!['gasto', 'ingreso', 'aportacion'].includes(m.tipo)) throw new Error('Tipo de movimiento inválido');
  if (!esEntero(m.monto) || m.monto === 0) throw new Error('Monto inválido');
  if (!FECHA.test(m.fecha || '')) throw new Error('Fecha inválida');
  if (m.tipo === 'aportacion') {
    const meta = estado.metas.find((x) => x.id === m.metaId);
    if (!meta) throw new Error('Elige una meta');
    if (m.monto < 0 && meta.tipo !== 'ahorro') throw new Error('Sólo se puede retirar de metas de ahorro');
    return;
  }
  if (m.monto < 0) throw new Error('Monto inválido');
  const cat = estado.categorias.find((c) => c.id === m.categoriaId);
  if (!cat || cat.tipo !== m.tipo) throw new Error('Elige una categoría');
  if (m.metaId) {
    if (m.tipo !== 'gasto') throw new Error('Sólo los gastos pueden pagarse con tarjeta');
    const meta = estado.metas.find((x) => x.id === m.metaId);
    if (!meta || meta.tipo !== 'tarjeta') throw new Error('Tarjeta inválida');
  }
}

function validarMeta(meta) {
  if (!['ahorro', 'deuda', 'tarjeta'].includes(meta.tipo)) throw new Error('Tipo de meta inválido');
  if (!String(meta.nombre || '').trim()) throw new Error('Ponle un nombre');
  if (!esEntero(meta.monto) || meta.monto < 0 || (meta.tipo !== 'tarjeta' && meta.monto === 0)) throw new Error('Monto inválido');
}

function validarCategoria(c) {
  if (!['gasto', 'ingreso'].includes(c.tipo)) throw new Error('Tipo de categoría inválido');
  if (!String(c.nombre || '').trim()) throw new Error('Ponle un nombre');
}

const estructuraValida = (e) => e && e.version === 1 && Array.isArray(e.categorias) && Array.isArray(e.metas)
  && Array.isArray(e.movimientos) && e.ajustes && typeof e.ajustes === 'object';

export function crearStore(storage = globalThis.localStorage) {
  let estado;
  let ultimoLeido = null; // texto tal como está en storage la última vez que lo leímos/escribimos
  let datosDanados = false;

  // Lee storage. Si el contenido está dañado, lo copia a CLAVE:danado (sin pisar una copia previa)
  // para que nunca se pierda, y arranca vacío avisando.
  function leer() {
    const crudo = storage.getItem(CLAVE);
    ultimoLeido = crudo;
    if (!crudo) { estado = estadoInicial(); return; }
    try {
      const datos = JSON.parse(crudo);
      if (!estructuraValida(datos)) throw new Error();
      estado = datos;
    } catch {
      datosDanados = true;
      if (storage.getItem(`${CLAVE}:danado`) == null) {
        try { storage.setItem(`${CLAVE}:danado`, crudo); } catch { /* se reintenta en la próxima carga */ }
      }
      estado = estadoInicial();
    }
  }
  try { leer(); } catch { estado = estadoInicial(); }
  const oyentes = new Set();
  const avisar = () => oyentes.forEach((o) => { try { o(estado); } catch (err) { console.error(err); } });

  function mutar(fn) {
    // Otra copia abierta (la app instalada y una pestaña) pudo guardar cambios: partimos de ellos.
    const actual = storage.getItem(CLAVE);
    if (actual !== ultimoLeido && actual) {
      try {
        const datos = JSON.parse(actual);
        if (estructuraValida(datos)) { estado = datos; ultimoLeido = actual; }
      } catch { /* contenido ajeno dañado: se conserva lo que tenemos en memoria */ }
    }
    const borrador = structuredClone(estado);
    const resultado = fn(borrador);
    const texto = JSON.stringify(borrador);
    try {
      storage.setItem(CLAVE, texto);
    } catch {
      throw new Error('No se pudo guardar. Revisa el espacio de tu teléfono.');
    }
    estado = borrador;
    ultimoLeido = texto;
    avisar();
    return resultado;
  }

  const buscar = (lista, idX) => {
    const x = lista.find((e) => e.id === idX);
    if (!x) throw new Error('No encontrado');
    return x;
  };
  const enUso = (e, campo, idX) => e.movimientos.some((m) => m[campo] === idX);
  const borrarOArchivar = (e, lista, campo, idX) => {
    if (enUso(e, campo, idX)) buscar(e[lista], idX).archivada = true;
    else e[lista] = e[lista].filter((x) => x.id !== idX);
  };

  return {
    get datosDanados() { return datosDanados; },
    obtener: () => estado,
    recargar() {
      const antes = ultimoLeido;
      leer();
      if (ultimoLeido !== antes) avisar();
    },
    suscribir(fn) { oyentes.add(fn); return () => oyentes.delete(fn); },

    agregarMovimiento: (datos) => mutar((e) => {
      const m = { id: id(), categoriaId: null, metaId: null, nota: '', ...datos, creadoEn: new Date().toISOString() };
      if (m.tipo === 'aportacion') m.categoriaId = null;
      m.nota = String(m.nota || '').trim();
      validarMovimiento(m, e);
      e.movimientos.push(m);
      return m;
    }),
    editarMovimiento: (idX, cambios) => mutar((e) => {
      const m = buscar(e.movimientos, idX);
      Object.assign(m, cambios, { id: m.id, creadoEn: m.creadoEn });
      if (m.tipo === 'aportacion') m.categoriaId = null;
      validarMovimiento(m, e);
      return m;
    }),
    borrarMovimiento: (idX) => mutar((e) => { e.movimientos = e.movimientos.filter((m) => m.id !== idX); }),

    agregarCategoria: (d) => mutar((e) => {
      const c = { id: id(), emoji: '🏷️', archivada: false, ...d, nombre: String(d.nombre || '').trim() };
      validarCategoria(c);
      e.categorias.push(c);
      return c;
    }),
    editarCategoria: (idX, cambios) => mutar((e) => {
      const c = buscar(e.categorias, idX);
      if (cambios.tipo && cambios.tipo !== c.tipo && enUso(e, 'categoriaId', idX)) throw new Error('No puedes cambiar el tipo de una categoría con movimientos');
      Object.assign(c, cambios, { id: c.id });
      validarCategoria(c);
      return c;
    }),
    borrarCategoria: (idX) => mutar((e) => borrarOArchivar(e, 'categorias', 'categoriaId', idX)),

    agregarMeta: (d) => mutar((e) => {
      const meta = { id: id(), fechaObjetivo: null, completada: false, archivada: false, creadoEn: hoyISO(), ...d, nombre: String(d.nombre || '').trim() };
      validarMeta(meta);
      e.metas.push(meta);
      return meta;
    }),
    editarMeta: (idX, cambios) => mutar((e) => {
      const meta = buscar(e.metas, idX);
      if (cambios.tipo && cambios.tipo !== meta.tipo && enUso(e, 'metaId', idX)) throw new Error('No puedes cambiar el tipo de una meta con movimientos');
      Object.assign(meta, cambios, { id: meta.id });
      validarMeta(meta);
      return meta;
    }),
    borrarMeta: (idX) => mutar((e) => borrarOArchivar(e, 'metas', 'metaId', idX)),

    reemplazarTodo: (nuevo) => mutar((e) => { Object.keys(e).forEach((k) => delete e[k]); Object.assign(e, structuredClone(nuevo)); }),
    borrarTodo: () => mutar((e) => { Object.keys(e).forEach((k) => delete e[k]); Object.assign(e, estadoInicial()); }),
    marcarRespaldo: (fecha) => mutar((e) => { e.ajustes.ultimoRespaldo = fecha; }),
  };
}
