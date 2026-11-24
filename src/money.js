// Montos en centavos enteros. Formato MXN: $1,234.50

export function parsePesos(texto) {
  let s = String(texto ?? '').trim().replace(/^\$/, '').replace(/\s/g, '');
  // Coma seguida de 1–2 dígitos al final (y sin punto) = decimal; si no, separador de miles.
  if (/,\d{1,2}$/.test(s) && !s.includes('.')) s = s.replace(/,(\d{1,2})$/, '.$1');
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d{1,2})?$/.test(s)) throw new Error('Monto inválido');
  const [entero, dec = ''] = s.replace(/,/g, '').split('.');
  const centavos = Number(entero) * 100 + Number(dec.padEnd(2, '0'));
  if (!Number.isSafeInteger(centavos) || centavos <= 0) throw new Error('Monto inválido');
  return centavos;
}

export function formatPesos(centavos) {
  const signo = centavos < 0 ? '-' : '';
  const abs = Math.abs(centavos);
  const entero = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${signo}$${entero}.${String(abs % 100).padStart(2, '0')}`;
}
