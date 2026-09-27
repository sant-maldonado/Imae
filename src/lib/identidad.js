// El puente perfil -> tecnico es por EMAIL, no por id: perfiles.id es un uuid y
// tecnicos.id es un int, no hay FK entre las dos tablas. La app lo resuelve
// igual que lo hace la funcion mi_tecnico_id() del RLS (lower en los dos lados).
//
// Si tocas una de las dos reglas, toca la otra. Si no coinciden, el tecnico ve
// un select de asignacion vacio en la UI pero la base le asigna ordenes
// ajenas, o al reves: la UI le ofrece un tecnico que la base le rechaza.
export function miTecnicoId(tecnicos, perfil) {
  const email = perfil?.email
  if (!tecnicos || !email) return null
  const mio = tecnicos.find(
    (t) => t.email && t.email.toLowerCase() === email.toLowerCase()
  )
  return mio?.id ?? null
}

// Un tecnico sin fila en la tabla tecnicos no es un caso teorico: si alguien
// se registra y el alta del tecnico falla, el perfil queda con rol 'tecnico' y
// sin id. Con eso el select de asignacion queda vacio y la orden se crea sin
// tecnico, en vez de avisar que la cuenta quedo a medio migración.
export function tecnicoNoResuelto(tecnicos, perfil) {
  return perfil?.rol === 'tecnico' && miTecnicoId(tecnicos, perfil) === null
}
