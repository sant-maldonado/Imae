import { supabase, camelize, snakeize } from '../lib/supabase'

// PostgREST devuelve 42501 cuando una politica RLS rechaza la peticion. El
// mensaje crudo no le dice nada a un tecnico, asi que se traduce y se conserva
// el codigo original en error.originalMessage para los tests.
const MENSAJES_PERMISO = {
  '42501': 'No tenés permiso para hacer esto. Hablá con un supervisor.',
}

function lanzar(error) {
  if (!error) return
  const legible = MENSAJES_PERMISO[error.code]
  if (!legible) throw error
  const err = new Error(legible)
  err.code = error.code
  err.originalMessage = error.message
  throw err
}

async function exec(promise) {
  const { data, error } = await promise
  lanzar(error)
  return camelize(data)
}

// La funcion de SQL todavia no existe mientras el RLS no este aplicado.
function faltaLaFuncion(error) {
  // PGRST202 es lo que devuelve PostgREST cuando la funcion no esta creada
  // todavia. 42883 y el texto en ingles son los que devuelve Postgres.
  return (
    error?.code === '42883' ||
    error?.code === 'PGRST202' ||
    String(error?.message || '').includes('does not exist')
  )
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

// Completar pasa por una funcion de SQL porque el RLS no puede restringir
// columnas: con una politica sola, un tecnico podria cambiarle el id o el
// created_by a su propia orden. El UPDATE directo esta revocado.
export async function completarOrden(id) {
  const { data, error } = await supabase.rpc('completar_orden', { p_id: Number(id) })
  if (faltaLaFuncion(error)) {
    // El SQL todavia no esta aplicado. Caemos al UPDATE directo: queda tan
    // inseguro como antes, pero la app no se rompe en medio de la migracion.
    // Cuando el RLS este activo este camino va a fallar siempre y se apaga solo.
    const { error: fallback } = await supabase
      .from('ordenes')
      .update({ estado: 'completada', fecha_completada: new Date().toISOString().slice(0, 10) })
      .eq('id', id)
    lanzar(fallback)
    return { id, estado: 'completada' }
  }
  lanzar(error)
  return camelize(data)
}

// Editar campos: solo administracion, validado del lado de la base.
export async function editarOrden(id, data) {
  const { data: orden, error } = await supabase.rpc('actualizar_orden', {
    p_id: Number(id),
    p_datos: snakeize(cleanEmpty(data)),
  })
  // A diferencia de completar, aca no hay fallback a UPDATE directo: justamente
  // se esta sacando ese permiso. Si la funcion todavia no existe, es que la
  // migracion no se aplico, y conviene decirlo en vez de largar un 404 de
  // PostgREST.
  if (faltaLaFuncion(error)) {
    const err = new Error(
      'La edición de órdenes todavía no está habilitada en esta base. Hay que aplicar la migración de permisos.'
    )
    err.code = error.code
    throw err
  }
  lanzar(error)
  return camelize(orden)
}

// logs_orden y fotos_orden cuelgan de la orden con ON DELETE CASCADE
// (schema.sql:75,85), asi que un DELETE se lleva el historial y las fotos junto
// con el registro. Para un area de Calidad eso no es un borrado: es borrar la
// evidencia de lo que paso.
//
// Por eso el borrado se frena en cuanto hay algo que registrar. Y no hace falta
// una tabla de auditoria aparte para cubrir el borrado: si solo se puede borrar
// lo que no tiene evidencia, no queda nada del borrado que auditar.
//
// La garantia es de la app, no de la base: un DELETE por REST la esquivaria. Para
// que sea UVBaja de sistema hace falta un trigger, que es el paso siguiente.
// limpiar.mjs borra por REST a proposito: es el script de limpieza de datos de
// prueba y tiene que poder borrar si o si.
export async function deleteOrden(id) {
  // head: true hace que PostgREST devuelva solo el conteo y no las filas: para
  // preguntar "hay evidencia" no hace falta traerla.
  const [resLogs, resFotos] = await Promise.all([
    supabase.from('logs_orden').select('id', { count: 'exact', head: true }).eq('orden_id', id),
    supabase.from('fotos_orden').select('id', { count: 'exact', head: true }).eq('orden_id', id),
  ])
  lanzar(resLogs.error)
  lanzar(resFotos.error)

  const conHistorial = resLogs.count || 0
  const conFotos = resFotos.count || 0

  if (conHistorial || conFotos) {
    throw new Error(
      'Esta orden tiene historial o fotos de evidencia, y no se puede eliminar: el registro es el respaldo. Exportala en PDF para archivarla.'
    )
  }

  const { error } = await supabase.from('ordenes').delete().eq('id', id)
  lanzar(error)
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
  lanzar(error)
  return { id, ...data }
}

export async function deleteCompra(id) {
  const { error } = await supabase.from('compras').delete().eq('id', id)
  lanzar(error)
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
  lanzar(error)
  return true
}
