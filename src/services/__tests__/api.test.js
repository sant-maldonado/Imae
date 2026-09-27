import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuthGetUser = vi.fn()

function deepCamelize(val) {
  if (Array.isArray(val)) return val.map(deepCamelize)
  if (val && typeof val === 'object' && val.constructor === Object) {
    return Object.fromEntries(
      Object.entries(val).map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
        deepCamelize(v),
      ])
    )
  }
  return val
}

function makeChain(resolved) {
  const chain = {
    select: vi.fn(() => chain),
    order: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    then: (resolve) => resolve(resolved),
  }
  return chain
}

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: mockAuthGetUser },
    from: vi.fn(),
    rpc: vi.fn(),
  },
  camelize: deepCamelize,
  snakeize: (val) => val,
}))

const api = await import('../api')
const { supabase } = await import('../../lib/supabase')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchTecnicos', () => {
  it('returns flattened data with avatarUrl', async () => {
    const raw = [
      { id: 1, nombre: 'Carlos', email: 'c@c.com', perfiles: { avatar_url: 'http://img.jpg' } },
      { id: 2, nombre: 'Ana', email: 'a@a.com', perfiles: null },
    ]
    const chain = makeChain({ data: raw, error: null })
    supabase.from.mockReturnValue(chain)

    const result = await api.fetchTecnicos()
    expect(result[0].avatarUrl).toBe('http://img.jpg')
    expect(result[1].avatarUrl).toBeNull()
    expect(supabase.from).toHaveBeenCalledWith('tecnicos')
  })
})

describe('fetchOrdenes', () => {
  it('flattens equipoNombre and tecnicoNombre', async () => {
    const raw = [
      { id: 1, titulo: 'Fix A', equipos: { nombre: 'Torno' }, tecnicos: { nombre: 'Carlos' } },
    ]
    const chain = makeChain({ data: raw, error: null })
    supabase.from.mockReturnValue(chain)

    const result = await api.fetchOrdenes()
    expect(result[0].equipoNombre).toBe('Torno')
    expect(result[0].tecnicoNombre).toBe('Carlos')
  })
})

describe('createCompra', () => {
  it('inserts with created_by from auth user', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'uuid-1' } } })
    const chain = makeChain({ data: { id: 1 }, error: null })
    supabase.from.mockReturnValue(chain)

    const result = await api.createCompra({ proveedor: 'Proveedor X' })
    expect(result.id).toBe(1)
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: 'uuid-1' })
    )
  })
})

describe('createOrden', () => {
  it('inserts with created_by from auth user', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'uuid-2' } } })
    const chain = makeChain({ data: { id: 5 }, error: null })
    supabase.from.mockReturnValue(chain)

    const result = await api.createOrden({ titulo: 'New Order' })
    expect(result.id).toBe(5)
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: 'uuid-2' })
    )
  })
})

describe('error handling', () => {
  it('throws when query fails', async () => {
    const chain = makeChain({ data: null, error: new Error('DB error') })
    supabase.from.mockReturnValue(chain)

    await expect(api.fetchEquipos()).rejects.toThrow('DB error')
  })
})

describe('logs de compras', () => {
  it('fetchLogsCompra filtra por compra_id', async () => {
    const chain = makeChain({ data: [{ id: 1, accion: 'estado_cambiado' }], error: null })
    supabase.from.mockReturnValue(chain)

    const result = await api.fetchLogsCompra(7)
    expect(result).toHaveLength(1)
    expect(supabase.from).toHaveBeenCalledWith('logs_compra')
    expect(chain.eq).toHaveBeenCalledWith('compra_id', 7)
  })

  it('createLogCompra escribe en logs_compra con compra_id, no en logs_orden', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'uuid-3', email: 'a@a.com' } } })
    const insertChain = makeChain({ data: { id: 1 }, error: null })
    supabase.from.mockImplementation((tabla) =>
      tabla === 'perfiles'
        ? makeChain({ data: { nombre: 'Admin' }, error: null })
        : insertChain
    )

    await api.createLogCompra({ compra_id: 7, accion: 'estado_cambiado', valor_anterior: 'pendiente', valor_nuevo: 'recibido' })

    expect(supabase.from).toHaveBeenCalledWith('logs_compra')
    expect(supabase.from).not.toHaveBeenCalledWith('logs_orden')
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ compra_id: 7, usuario_nombre: 'Admin' })
    )
  })

  it('createLog escribe en logs_orden con orden_id', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'uuid-4', email: 'a@a.com' } } })
    const insertChain = makeChain({ data: { id: 1 }, error: null })
    supabase.from.mockImplementation((tabla) =>
      tabla === 'perfiles'
        ? makeChain({ data: { nombre: 'Admin' }, error: null })
        : insertChain
    )

    await api.createLog({ orden_id: 3, accion: 'estado_cambiado' })

    expect(supabase.from).toHaveBeenCalledWith('logs_orden')
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ orden_id: 3 })
    )
  })
})

describe('vinculo compra <-> orden', () => {
  it('fetchCompras hace join a ordenes y expone ordenTitulo', async () => {
    const chain = makeChain({
      data: [
        { id: 1, proveedor: 'A', orden_id: 3, ordenes: { id: 3, titulo: 'Revisión de caldera' } },
        { id: 2, proveedor: 'B', orden_id: null, ordenes: null },
      ],
      error: null,
    })
    supabase.from.mockReturnValue(chain)

    const result = await api.fetchCompras()

    expect(chain.select).toHaveBeenCalledWith('*, ordenes(id, titulo)')
    expect(result[0].ordenTitulo).toBe('Revisión de caldera')
    expect(result[1].ordenId).toBeNull()
    expect(result[1].ordenTitulo).toBeNull()
  })

  it('fetchCompra resuelve ordenTitulo desde el embed', async () => {
    const chain = makeChain({
      data: { id: 1, proveedor: 'A', orden_id: 3, ordenes: { id: 3, titulo: 'Cambio de aceite' } },
      error: null,
    })
    supabase.from.mockReturnValue(chain)

    const result = await api.fetchCompra(1)

    expect(chain.eq).toHaveBeenCalledWith('id', 1)
    expect(result.ordenId).toBe(3)
    expect(result.ordenTitulo).toBe('Cambio de aceite')
  })

  it('fetchCompra no rompe cuando la compra no tiene orden vinculada', async () => {
    const chain = makeChain({ data: { id: 1, orden_id: null, ordenes: null }, error: null })
    supabase.from.mockReturnValue(chain)

    const result = await api.fetchCompra(1)

    expect(result.ordenId).toBeNull()
    expect(result.ordenTitulo).toBeNull()
  })
})

const SIN_PERMISO = 'No tenés permiso para hacer esto. Hablá con un supervisor.'

describe('permisos en la capa de API', () => {
  it('traduce el 42501 de Postgres a un mensaje legible al completar', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'new row violates row-level security policy' } })

    await expect(api.completarOrden(7)).rejects.toThrow(SIN_PERMISO)
  })

  it('traduce el 42501 al eliminar una orden', async () => {
    supabase.from.mockReturnValue(makeChain({ data: null, error: { code: '42501', message: 'row-level security' } }))

    await expect(api.deleteOrden(7)).rejects.toThrow(SIN_PERMISO)
  })

  it('traduce el 42501 al cambiar el estado de una compra', async () => {
    supabase.from.mockReturnValue(makeChain({ data: null, error: { code: '42501', message: 'row-level security' } }))

    await expect(api.updateCompra(1, { estado: 'en_curso' })).rejects.toThrow(SIN_PERMISO)
  })

  it('deja pasar otros errores sin traducir', async () => {
    supabase.from.mockReturnValue(makeChain({ data: null, error: { code: '23503', message: 'violates foreign key' } }))

    await expect(api.deleteOrden(7)).rejects.toThrow('violates foreign key')
  })

  it('completa por la funcion RPC cuando ya existe', async () => {
    supabase.rpc.mockResolvedValue({ data: { id: 7, estado: 'completada' }, error: null })

    const result = await api.completarOrden(7)

    expect(supabase.rpc).toHaveBeenCalledWith('completar_orden', { p_id: 7 })
    expect(result.estado).toBe('completada')
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('cae al UPDATE directo si la funcion RPC todavia no esta creada', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'function public.completar_orden does not exist' } })
    const chain = makeChain({ data: null, error: null })
    supabase.from.mockReturnValue(chain)

    const result = await api.completarOrden(7)

    expect(chain.update).toHaveBeenCalled()
    expect(result).toEqual({ id: 7, estado: 'completada' })
  })

  it('no aplica el fallback si el RPC falla por permisos', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'denied' } })
    supabase.from.mockReturnValue(makeChain({ data: null, error: null }))

    await expect(api.completarOrden(7)).rejects.toThrow(SIN_PERMISO)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('edita por la funcion RPC', async () => {
    supabase.rpc.mockResolvedValue({ data: { id: 7 }, error: null })

    await api.editarOrden(7, { titulo: 'Nuevo titulo' })

    expect(supabase.rpc).toHaveBeenCalledWith('actualizar_orden', {
      p_id: 7,
      p_datos: { titulo: 'Nuevo titulo' },
    })
  })

  it('editarOrden no tiene fallback: sin la funcion avisa que falta la migracion', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.actualizar_orden' } })

    await expect(api.editarOrden(7, { titulo: 'X' })).rejects.toThrow(
      /todav.a no est. habilitada/
    )
    expect(supabase.from).not.toHaveBeenCalled()
  })
})
