// Matriz de permisos por rol.
//
// Esta es la fuente de verdad para la UI: decide que botones se muestran.
// El BACKSTOP real es el RLS de Supabase en interno/aplicar_rls_ordenes.sql,
// que aplica la misma matriz en la base. Si tocás una, actualiza la otra,
// o el usuario va a ver botones que la base le rechaza.
//
// Un rol desconocido cae en NINGUNO: preferimos esconder de mas que exponer.

const TODAS = {
  verTodasLasOrdenes: true,
  crearOrden: true,
  editarOrden: true,
  completarOrden: true,
  borrarOrden: true,
  crearCompra: true,
  cambiarEstadoCompra: true,
  borrarCompra: true,
  verReportes: true,
  verTecnicos: true,
}

const MATRIZ = {
  // administracion: todo
  admin: { ...TODAS },
  supervisor: { ...TODAS },

  // tecnico: trabaja sus ordenes. Las ve y las edita, pero no puede reasignar
  // el tecnico, mover el estado a mano ni tocar una orden ya completada: eso lo
  // decide supervision. Genera listas de compra, asi que entra a Compras.
  // El select de tecnico y el de asignar orden se le acotan a el mismo en la UI.
  tecnico: {
    verTodasLasOrdenes: false,
    crearOrden: true,
    editarOrden: true,
    completarOrden: true,
    borrarOrden: false,
    crearCompra: true,
    cambiarEstadoCompra: false,
    borrarCompra: false,
    verReportes: false,
    verTecnicos: false,
  },

  // operador: solo mira. No escribe nada en ningun lado.
  operador: {
    verTodasLasOrdenes: true,
    crearOrden: false,
    editarOrden: false,
    completarOrden: false,
    borrarOrden: false,
    crearCompra: false,
    cambiarEstadoCompra: false,
    borrarCompra: false,
    verReportes: false,
    verTecnicos: true,
  },
}

const NINGUNO = Object.fromEntries(Object.keys(TODAS).map((k) => [k, false]))

export function permisos(rol) {
  return MATRIZ[rol] || NINGUNO
}

export function puede(rol, capacidad) {
  return permisos(rol)[capacidad] === true
}

export function esSupervision(rol) {
  return rol === 'admin' || rol === 'supervisor'
}
