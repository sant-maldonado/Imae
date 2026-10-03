export const estados = {
  pendiente: 'Pendiente',
  en_progreso: 'En Progreso',
  completada: 'Completada',
}

export const prioridades = {
  urgente: 'Urgente',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

export const tiposMantenimiento = {
  preventivo: 'Preventivo',
  correctivo: 'Correctivo',
  predictivo: 'Predictivo',
}

export const estadosCompra = {
  pendiente: 'Pendiente',
  en_curso: 'En Curso',
  recibido: 'Recibido',
}

export const priorityColors = {
  urgente: 'bg-red-100 text-red-700 border-red-200',
  alta: 'bg-amber-100 text-amber-700 border-amber-200',
  media: 'bg-blue-100 text-blue-700 border-blue-200',
  baja: 'bg-slate-100 text-slate-700 border-slate-200',
}

export const statusColors = {
  pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
  en_progreso: 'bg-blue-50 text-blue-700 border-blue-200',
  completada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export const statusCompraColors = {
  pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
  en_curso: 'bg-blue-50 text-blue-700 border-blue-200',
  recibido: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export const estadoColors = {
  operativo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  averiado: 'bg-red-100 text-red-700 border-red-200',
  mantenimiento: 'bg-amber-100 text-amber-700 border-amber-200',
}

export const estadoLabels = {
  operativo: 'Operativo',
  averiado: 'Averiado',
  mantenimiento: 'En Mantenimiento',
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  // Las columnas created_at son TIMESTAMPTZ, asi que PostgREST devuelve
  // "2026-09-27T19:46:29.524591+00:00" y al hacer split('-') el dia se
  // arrastra con la hora. Hay que cortar en la 'T'.
  return `${d.split('T')[0]}/${m}/${y}`
}

// La hora va en hora local, no en la del servidor. Los logs guardan TIMESTAMPTZ
// y PostgREST los devuelve con "+00:00", asi que mostrar el numero tal cual
// correria el registro segun el UTC del servidor y no segun la hora del taller,
// que es la que sirve para reconstruir un hecho.
//
// Un campo DATE (como fecha_programada) viene sin hora: "2026-10-15". Esos NO
// pasan por Date, porque new Date('2026-10-15') se interpreta como medianoche
// UTC y en un huso negativo como el de Argentina se imprimiria un dia antes.
export function formatDateTime(dateStr) {
  if (!dateStr) return ''
  if (!dateStr.includes('T')) return formatDate(dateStr)
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return formatDate(dateStr)
  return d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}
