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
  const data = await exec(
    supabase.from('compras').select('*, ordenes(id, titulo)').order('id', { ascending: false })
  )
  return data.map((c) => ({
    ...c,
    ordenTitulo: c.ordenes?.titulo || null,
  }))
}

export async function fetchCompra(id) {
  const compra = await exec(supabase.from('compras').select('*, ordenes(id, titulo)').eq('id', id).single())
  return { ...compra, ordenTitulo: compra.ordenes?.titulo || null }
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

export async function fetchFotos(ordenId) {
  return exec(supabase.from('fotos_orden').select('*').eq('orden_id', ordenId).order('id', { ascending: true }))
}

export async function fetchLogs(ordenId) {
  return exec(supabase.from('logs_orden').select('*').eq('orden_id', ordenId).order('id', { ascending: false }))
}

export async function fetchLogsCompra(compraId) {
  return exec(supabase.from('logs_compra').select('*').eq('compra_id', compraId).order('id', { ascending: false }))
}

async function createLogEn(tabla, data) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('nombre').eq('id', user.id).single()
  return exec(supabase.from(tabla).insert({ ...snakeize(cleanEmpty(data)), usuario_nombre: perfil?.nombre || user.email }).select().single())
}

export async function createLog(data) {
  return createLogEn('logs_orden', data)
}

export async function createLogCompra(data) {
  return createLogEn('logs_compra', data)
}

export async function deleteFoto(id) {
  const { error } = await supabase.from('fotos_orden').delete().eq('id', id)
  if (error) throw error
  return true
}
