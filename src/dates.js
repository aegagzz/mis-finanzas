// Fechas como cadenas ISO locales 'YYYY-MM-DD'; meses como 'YYYY-MM'.

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const p2 = (n) => String(n).padStart(2, '0');

export function hoyISO(d = new Date()) {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

export const claveMes = (fechaISO) => fechaISO.slice(0, 7);

function diasDelMes(clave) {
  const [a, m] = clave.split('-').map(Number);
  return new Date(a, m, 0).getDate();
}

export function rangoMes(clave) {
  return { desde: `${clave}-01`, hasta: `${clave}-${p2(diasDelMes(clave))}` };
}

export function mesAnterior(clave) {
  const [a, m] = clave.split('-').map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${p2(m - 1)}`;
}

export function mesSiguiente(clave) {
  const [a, m] = clave.split('-').map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${p2(m + 1)}`;
}

export function rangoComparacion(clave, hoy) {
  const prev = mesAnterior(clave);
  if (claveMes(hoy) !== clave) return { actual: rangoMes(clave), anterior: rangoMes(prev) };
  const dia = Math.min(Number(hoy.slice(8, 10)), diasDelMes(prev));
  return {
    actual: { desde: `${clave}-01`, hasta: hoy },
    anterior: { desde: `${prev}-01`, hasta: `${prev}-${p2(dia)}` },
  };
}

export function nombreMes(clave) {
  const [a, m] = clave.split('-').map(Number);
  return `${MESES[m - 1]} ${a}`;
}

// ── Periodos ─────────────────────────────────────────────────────────────────
// periodo: {tipo:'semana', inicio (lunes)} | {tipo:'mes', mes} | {tipo:'anio'} | {tipo:'personalizado', desde, hasta}

const aDia = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000;
const deDia = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export const sumarDias = (fecha, n) => deDia(aDia(fecha) + n);

// Las semanas van de lunes a domingo.
export function lunesDe(fecha) {
  const diaSemana = new Date(aDia(fecha) * 86400000).getUTCDay(); // 0 = domingo
  return sumarDias(fecha, -((diaSemana + 6) % 7));
}

export function restarMeses(fecha, n) {
  let clave = claveMes(fecha);
  for (let i = 0; i < n; i++) clave = mesAnterior(clave);
  const dia = Math.min(Number(fecha.slice(8, 10)), diasDelMes(clave));
  return `${clave}-${p2(dia)}`;
}

export function rangoPeriodo(periodo, hoy) {
  switch (periodo.tipo) {
    case 'mes': return rangoMes(periodo.mes);
    case 'semana': return { desde: periodo.inicio, hasta: sumarDias(periodo.inicio, 6) };
    case 'anio': return { desde: `${hoy.slice(0, 4)}-01-01`, hasta: hoy };
    case 'personalizado': {
      const { desde, hasta } = periodo;
      if (!FECHA_ISO.test(desde || '') || !FECHA_ISO.test(hasta || '')) throw new Error('Elige las dos fechas');
      if (desde > hasta) throw new Error('La fecha inicial debe ser anterior a la final');
      return { desde, hasta };
    }
    default: throw new Error('Periodo inválido');
  }
}

export function rangosComparacionPeriodo(periodo, hoy) {
  if (periodo.tipo === 'mes') return rangoComparacion(periodo.mes, hoy);
  const actual = rangoPeriodo(periodo, hoy);
  if (periodo.tipo === 'personalizado') {
    // Sólo se comparan días que ya pasaron; si todo el rango es futuro, no hay comparación.
    if (actual.desde > hoy) return { actual, anterior: null };
    const hasta = actual.hasta > hoy ? hoy : actual.hasta;
    const n = aDia(hasta) - aDia(actual.desde) + 1;
    return { actual: { desde: actual.desde, hasta }, anterior: { desde: sumarDias(actual.desde, -n), hasta: sumarDias(actual.desde, -1) } };
  }
  if (periodo.tipo === 'semana') {
    // Semana en curso: lunes..hoy contra los mismos días de la semana anterior.
    if (actual.desde > hoy) return { actual, anterior: null };
    const hasta = actual.hasta > hoy ? hoy : actual.hasta;
    return { actual: { desde: actual.desde, hasta }, anterior: { desde: sumarDias(actual.desde, -7), hasta: sumarDias(hasta, -7) } };
  }
  return { actual, anterior: { desde: restarMeses(actual.desde, 12), hasta: restarMeses(actual.hasta, 12) } };
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fechaCorta = (iso) => `${Number(iso.slice(8, 10))} ${MESES_CORTOS[Number(iso.slice(5, 7)) - 1]}`;

export function etiquetaPeriodo(periodo, hoy) {
  if (periodo.tipo === 'mes') return nombreMes(periodo.mes);
  if (periodo.tipo === 'anio') return `Este año (${hoy.slice(0, 4)})`;
  const { desde, hasta } = rangoPeriodo(periodo, hoy);
  const mismoAnio = desde.slice(0, 4) === hasta.slice(0, 4);
  // En una semana dentro del mismo mes basta con el día: "23 – 29 nov 2026".
  const inicio = periodo.tipo === 'semana' && desde.slice(0, 7) === hasta.slice(0, 7) ? String(Number(desde.slice(8, 10))) : fechaCorta(desde);
  return `${inicio}${mismoAnio ? '' : ` ${desde.slice(0, 4)}`} – ${fechaCorta(hasta)} ${hasta.slice(0, 4)}`;
}
