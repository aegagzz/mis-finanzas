// Accesos directos del ícono (manifest "shortcuts"): ./?accion=gasto | ingreso | semana
const ACCIONES = new Set(['gasto', 'ingreso', 'semana']);

export function accionDeInicio(search) {
  const accion = new URLSearchParams(search).get('accion');
  return ACCIONES.has(accion) ? accion : null;
}
