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
