// Resumen de un mes: totales, "Queda" y comparación por categoría.
import { rangoMes, rangoComparacion } from './dates.js';

const enRango = (f, r) => f >= r.desde && f <= r.hasta;
const suma = (lista) => lista.reduce((t, m) => t + m.monto, 0);

export function resumenMes(estado, clave, hoy) {
  const mes = rangoMes(clave);
  const comp = rangoComparacion(clave, hoy);
  const tipoMeta = new Map(estado.metas.map((m) => [m.id, m.tipo]));

  const delMes = estado.movimientos.filter((m) => enRango(m.fecha, mes));
  const gastos = delMes.filter((m) => m.tipo === 'gasto');
  const aportaciones = delMes.filter((m) => m.tipo === 'aportacion');
  const esPago = (m) => ['deuda', 'tarjeta'].includes(tipoMeta.get(m.metaId));

  const ingresos = suma(delMes.filter((m) => m.tipo === 'ingreso'));
  const gastosTarjeta = suma(gastos.filter((m) => m.metaId));
  const gastosEfectivo = suma(gastos.filter((m) => !m.metaId));
  const pagosDeuda = suma(aportaciones.filter(esPago));
  const ahorro = suma(aportaciones.filter((m) => !esPago(m)));

  // total = mes completo (para la barra); cambio = rango comparable vs mismo rango del mes anterior.
  const porId = new Map();
  for (const m of gastos) {
    const c = porId.get(m.categoriaId) || { categoriaId: m.categoriaId, total: 0, comparable: 0, anterior: 0 };
    c.total += m.monto;
    if (enRango(m.fecha, comp.actual)) c.comparable += m.monto;
    porId.set(m.categoriaId, c);
  }
  for (const m of estado.movimientos) {
    if (m.tipo === 'gasto' && porId.has(m.categoriaId) && enRango(m.fecha, comp.anterior)) porId.get(m.categoriaId).anterior += m.monto;
  }
  const porCategoria = [...porId.values()]
    .map(({ comparable, ...c }) => ({ ...c, cambio: c.anterior ? (comparable - c.anterior) / c.anterior : null }))
    .sort((a, b) => b.total - a.total);

  const movimientos = [...delMes].sort((a, b) => (b.fecha + b.creadoEn).localeCompare(a.fecha + a.creadoEn));

  return {
    ingresos, gastos: gastosEfectivo + gastosTarjeta, gastosEfectivo, gastosTarjeta, ahorro, pagosDeuda,
    queda: ingresos - gastosEfectivo - ahorro - pagosDeuda,
    porCategoria, movimientos,
  };
}
