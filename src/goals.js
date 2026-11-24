// Progreso de metas de ahorro, deudas fijas y tarjetas de crédito.

const clamp = (x) => Math.max(0, Math.min(1, x));
const suma = (lista) => lista.reduce((t, m) => t + m.monto, 0);

export function progresoMeta(meta, movimientos) {
  const propios = movimientos.filter((m) => m.metaId === meta.id);
  const aportado = suma(propios.filter((m) => m.tipo === 'aportacion'));
  if (meta.tipo === 'ahorro') {
    return { tipo: meta.tipo, aportado, objetivo: meta.monto, debe: null, pct: clamp(aportado / meta.monto) };
  }
  if (meta.tipo === 'deuda') {
    return { tipo: meta.tipo, aportado, objetivo: meta.monto, debe: meta.monto - aportado, pct: clamp(aportado / meta.monto) };
  }
  const cargos = suma(propios.filter((m) => m.tipo === 'gasto'));
  const total = meta.monto + cargos;
  const debe = total - aportado;
  return { tipo: meta.tipo, aportado, objetivo: total, debe, pct: debe <= 0 ? 1 : clamp(aportado / total) };
}
