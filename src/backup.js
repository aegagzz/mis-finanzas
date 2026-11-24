// Respaldo manual: exportar/importar todo el estado como un archivo .json.
import { validarMovimiento } from './store.js';

const APP = 'finanzas-personales';
const INVALIDO = 'Archivo de respaldo no válido';

export function exportarRespaldo(estado) {
  return JSON.stringify({ app: APP, version: 1, exportadoEn: new Date().toISOString(), estado }, null, 2);
}

export const nombreArchivoRespaldo = (hoy) => `finanzas-respaldo-${hoy}.json`;

const esTexto = (x) => typeof x === 'string' && x.trim() !== '';

export function leerRespaldo(texto) {
  try {
    const datos = JSON.parse(texto);
    if (datos?.app !== APP || datos.version !== 1) throw 0;
    const e = datos.estado;
    if (!e || e.version !== 1 || !Array.isArray(e.categorias) || !Array.isArray(e.metas) || !Array.isArray(e.movimientos) || typeof e.ajustes !== 'object' || !e.ajustes) throw 0;
    for (const c of e.categorias) if (!esTexto(c.id) || !esTexto(c.nombre) || !['gasto', 'ingreso'].includes(c.tipo)) throw 0;
    for (const m of e.metas) if (!esTexto(m.id) || !esTexto(m.nombre) || !['ahorro', 'deuda', 'tarjeta'].includes(m.tipo) || !Number.isSafeInteger(m.monto)) throw 0;
    for (const m of e.movimientos) {
      if (!esTexto(m.id)) throw 0;
      validarMovimiento(m, e);
    }
    return e;
  } catch {
    throw new Error(INVALIDO);
  }
}

const dia = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000;

export function necesitaRespaldo(ultimoRespaldo, hoy) {
  return !ultimoRespaldo || dia(hoy) - dia(ultimoRespaldo) > 30;
}
