import { supabase, camelize, snakeize } from '../lib/supabase'

async function exec(promise) {
  const { data, error } = await promise
  if (error) throw error
  return camelize(data)
}

function cleanEmpty(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === '' ? null : v])
  )
}

export async function fetchPerfil() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  return exec(supabase.from('perfiles').select('*').eq('id', user.id).single())
}

export async function fetchEquipos() {
  return exec(supabase.from('equipos').select('*').order('id', { ascending: true }))
}

export async function fetchEquipo(id) {
  return exec(supabase.from('equipos').select('*').eq('id', id).single())
}

export async function fetchTecnicos() {
  const data = await exec(
    supabase.from('tecnicos').select('*, perfiles!created_by(avatar_url)').order('id', { ascending: true })
  )
  return data.map((t) => ({
    ...t,
    avatarUrl: t.perfiles?.avatarUrl || null,
  }))
}

export async function fetchTecnico(id) {
  return exec(supabase.from('tecnicos').select('*').eq('id', id).single())
}

export async function fetchOrdenes() {
  const data = await exec(supabase.from('ordenes').select('*, equipos(nombre), tecnicos(nombre)').order('id', { ascending: false }))
  return data.map((o) => ({
    ...o,
    equipoNombre: o.equipos?.nombre,
    tecnicoNombre: o.tecnicos?.nombre,
  }))
}

export async function fetchOrden(id) {
  const data = await exec(supabase.from('ordenes').select('*, equipos(nombre), tecnicos(nombre)').eq('id', id).single())
  return { ...data, equipoNombre: data.equipos?.nombre, tecnicoNombre: data.tecnicos?.nombre }
}

export async function createOrden(data) {
  const { data: { user } } = await supabase.auth.getUser()
  return exec(supabase.from('ordenes').insert({ ...snakeize(cleanEmpty(data)), created_by: user.id }).select().single())
}

export async function updateOrden(id, data) {
  const { error } = await supabase.from('ordenes').update(snakeize(cleanEmpty(data))).eq('id', id)
  if (error) throw error
  return { id, ...data }
}

export async function deleteOrden(id) {
  const { error } = await supabase.from('ordenes').delete().eq('id', id)
  if (error) throw error
  return true
}

export async function fetchCompras() {
  return exec(supabase.from('compras').select('*').order('id', { ascending: false }))
}

export async function fetchCompra(id) {
  return exec(supabase.from('compras').select('*').eq('id', id).single())
}

export async function createCompra(data) {
  const { data: { user } } = await supabase.auth.getUser()
  return exec(supabase.from('compras').insert({ ...snakeize(cleanEmpty(data)), created_by: user.id }).select().single())
}

export async function updateCompra(id, data) {
  const { error } = await supabase.from('compras').update(snakeize(cleanEmpty(data))).eq('id', id)
  if (error) throw error
  return { id, ...data }
}

export async function deleteCompra(id) {
  const { error } = await supabase.from('compras').delete().eq('id', id)
  if (error) throw error
  return true
}

export async function fetchDashboardStats() {
  const [ordenes, equipos, tecnicos] = await Promise.all([
    exec(supabase.from('ordenes').select('*')),
    exec(supabase.from('equipos').select('*')),
    exec(supabase.from('tecnicos').select('*').eq('activo', true)),
  ])

  const total = ordenes?.length || 0
  const pendientes = ordenes?.filter((o) => o.estado === 'pendiente').length || 0
  const enProgreso = ordenes?.filter((o) => o.estado === 'en_progreso').length || 0
  const completadas = ordenes?.filter((o) => o.estado === 'completada').length || 0
  const urgentes = ordenes?.filter((o) => o.prioridad === 'urgente' && o.estado !== 'completada').length || 0
  const equiposOperativos = equipos?.filter((e) => e.estado === 'operativo').length || 0
  const equiposAveriados = equipos?.filter((e) => e.estado === 'averiado').length || 0

  const ordenesPorMes = Array.from({ length: 6 }, (_, i) => {
    const mes = new Date()
    mes.setMonth(mes.getMonth() - (5 - i))
    const mesStr = mes.toLocaleString('es', { month: 'short' })
    const count = ordenes?.filter((o) => {
      const fecha = new Date(o.fechaCreacion)
      return fecha.getMonth() === mes.getMonth() && fecha.getFullYear() === mes.getFullYear()
    }).length || 0
    return { mes: mesStr, completadas: Math.floor(count * 0.6), pendientes: count }
  })

  return {
    total,
    pendientes,
    enProgreso,
    completadas,
    urgentes,
    equiposOperativos,
    equiposAveriados,
    totalEquipos: equipos?.length || 0,
    totalTecnicos: tecnicos?.length || 0,
    ordenesPorMes,
  }
}
