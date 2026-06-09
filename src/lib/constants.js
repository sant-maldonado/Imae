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
  return `${d}/${m}/${y}`
}
