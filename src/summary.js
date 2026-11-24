// Resumen de un periodo: totales, "Queda", categorías de gasto e ingreso y detalle por categoría.
import { rangoPeriodo, rangosComparacionPeriodo } from './dates.js';

const enRango = (f, r) => Boolean(r) && f >= r.desde && f <= r.hasta;
const suma = (lista) => lista.reduce((t, m) => t + m.monto, 0);
const recientePrimero = (a, b) => (b.fecha + b.creadoEn).localeCompare(a.fecha + a.creadoEn);
const cambioPct = (comparable, anterior) => (anterior ? (comparable - anterior) / anterior : null);

// total = periodo completo (para la barra); cambio = rango comparable vs el rango anterior.
function agrupar(estado, delPeriodo, comp, tipo) {
  const porId = new Map();
  for (const m of delPeriodo) {
    if (m.tipo !== tipo) continue;
    const c = porId.get(m.categoriaId) || { categoriaId: m.categoriaId, total: 0, comparable: 0, anterior: 0 };
    c.total += m.monto;
    if (enRango(m.fecha, comp.actual)) c.comparable += m.monto;
    porId.set(m.categoriaId, c);
  }
  for (const m of estado.movimientos) {
    if (m.tipo === tipo && porId.has(m.categoriaId) && enRango(m.fecha, comp.anterior)) porId.get(m.categoriaId).anterior += m.monto;
  }
  return [...porId.values()]
    .map(({ comparable, ...c }) => ({ ...c, cambio: cambioPct(comparable, c.anterior) }))
    .sort((a, b) => b.total - a.total);
}

export function resumenPeriodo(estado, periodo, hoy) {
  const rango = rangoPeriodo(periodo, hoy);
  const comp = rangosComparacionPeriodo(periodo, hoy);
  const tipoMeta = new Map(estado.metas.map((m) => [m.id, m.tipo]));

  const delPeriodo = estado.movimientos.filter((m) => enRango(m.fecha, rango));
  const gastos = delPeriodo.filter((m) => m.tipo === 'gasto');
  const aportaciones = delPeriodo.filter((m) => m.tipo === 'aportacion');
  const esPago = (m) => ['deuda', 'tarjeta'].includes(tipoMeta.get(m.metaId));

  const ingresos = suma(delPeriodo.filter((m) => m.tipo === 'ingreso'));
  const gastosTarjeta = suma(gastos.filter((m) => m.metaId));
  const gastosEfectivo = suma(gastos.filter((m) => !m.metaId));
  const pagosDeuda = suma(aportaciones.filter(esPago));
  const ahorro = suma(aportaciones.filter((m) => !esPago(m)));

  return {
    rango,
    ingresos, gastos: gastosEfectivo + gastosTarjeta, gastosEfectivo, gastosTarjeta, ahorro, pagosDeuda,
    queda: ingresos - gastosEfectivo - ahorro - pagosDeuda,
    porCategoria: agrupar(estado, delPeriodo, comp, 'gasto'),
    porCategoriaIngreso: agrupar(estado, delPeriodo, comp, 'ingreso'),
    movimientos: [...delPeriodo].sort(recientePrimero),
  };
}

export const resumenMes = (estado, clave, hoy) => resumenPeriodo(estado, { tipo: 'mes', mes: clave }, hoy);

export function detalleCategoria(estado, periodo, hoy, categoriaId) {
  const rango = rangoPeriodo(periodo, hoy);
  const comp = rangosComparacionPeriodo(periodo, hoy);
  const tipo = estado.categorias.find((c) => c.id === categoriaId)?.tipo ?? 'gasto';
  const propios = estado.movimientos.filter((m) => m.categoriaId === categoriaId && m.tipo === tipo);
  const movimientos = propios.filter((m) => enRango(m.fecha, rango)).sort(recientePrimero);
  const comparable = suma(propios.filter((m) => enRango(m.fecha, comp.actual)));
  const anterior = suma(propios.filter((m) => enRango(m.fecha, comp.anterior)));
  return {
    categoriaId, tipo,
    total: suma(movimientos),
    cantidad: movimientos.length,
    cambio: movimientos.length ? cambioPct(comparable, anterior) : null,
    movimientos,
  };
}
