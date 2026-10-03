import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestWrapper } from '../../test/TestWrapper'
import WorkOrderEdit from '../WorkOrderEdit'

const mockMutateAsync = vi.fn()
const mockLogMutate = vi.fn()
const mockNavigate = vi.fn()

const mockAuth = vi.hoisted(() => ({ perfil: { nombre: 'Admin', email: 'admin@imaemantenimiento.com', rol: 'admin' } }))
// Estado de la orden mockeada, para probar el caso de la orden completada.
const mockOrden = vi.hoisted(() => ({ estado: 'en_progreso' }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => mockAuth }))

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.perfil = { nombre: 'Admin', email: 'admin@imaemantenimiento.com', rol: 'admin' }
  mockOrden.estado = 'en_progreso'
})

vi.mock('../../hooks/useApi', () => ({
  useOrden: () => ({
    data: {
      id: 7,
      titulo: 'Revisar cojinete',
      descripcion: 'Vibracion en el husillo',
      equipoId: 'e1',
      tecnicoId: 't1',
      tecnicoNombre: 'Carlos',
      estado: mockOrden.estado,
      prioridad: 'alta',
      tipoMantenimiento: 'correctivo',
      fechaProgramada: '2026-06-15',
    },
    isLoading: false,
  }),
    useEditarOrden: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useCreateLog: () => ({ mutate: mockLogMutate }),
    useEquipos: () => ({ data: [{ id: 'e1', nombre: 'Torno CNC', codigo: 'TC-001' }] }),
    useTecnicos: () => ({
      data: [
        { id: 't1', nombre: 'Carlos', email: 'tec@imaemantenimiento.com', activo: true },
        { id: 't3', nombre: 'Beto', email: 'beto@imaemantenimiento.com', activo: true },
      ],
    }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useParams: () => ({ id: '7' }), useNavigate: () => mockNavigate }
})

describe('WorkOrderEdit page', () => {
  it('precarga los datos de la orden', () => {
    render(<WorkOrderEdit />, { wrapper: TestWrapper })
    expect(screen.getByLabelText('Título')).toHaveValue('Revisar cojinete')
    expect(screen.getByLabelText('Descripción')).toHaveValue('Vibracion en el husillo')
    expect(screen.getByLabelText('Prioridad')).toHaveValue('alta')
    expect(screen.getByLabelText('Tipo')).toHaveValue('correctivo')
    expect(screen.getByLabelText('Fecha Programada')).toHaveValue('2026-06-15')
    expect(screen.getByLabelText('Equipo')).toHaveValue('e1')
    expect(screen.getByLabelText('Técnico')).toHaveValue('t1')
  })

  it('muestra el id de la orden que esta editando', () => {
    render(<WorkOrderEdit />, { wrapper: TestWrapper })
    expect(screen.getByText('Editar Orden #7')).toBeInTheDocument()
  })

  it('guarda los cambios y vuelve al detalle', async () => {
    mockMutateAsync.mockResolvedValue({ id: 7 })
    const user = userEvent.setup()
    render(<WorkOrderEdit />, { wrapper: TestWrapper })

    const titulo = screen.getByLabelText('Título')
    await user.clear(titulo)
    await user.type(titulo, 'Revisar cojinete y husillo')
    await user.selectOptions(screen.getByLabelText('Prioridad'), 'urgente')
    await user.click(screen.getByText('Guardar Cambios'))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: '7',
        data: expect.objectContaining({
          titulo: 'Revisar cojinete y husillo',
          prioridad: 'urgente',
        }),
      })
    })
    expect(mockNavigate).toHaveBeenCalledWith('/ordenes/7')
  })

  it('muestra el error si la base rechaza el cambio', async () => {
    mockMutateAsync.mockRejectedValue(
      new Error('No tenés permiso para hacer esto. Hablá con un supervisor.')
    )
    const user = userEvent.setup()
    render(<WorkOrderEdit />, { wrapper: TestWrapper })

    await user.click(screen.getByText('Guardar Cambios'))
    await waitFor(() => {
      expect(
        screen.getByText('No tenés permiso para hacer esto. Hablá con un supervisor.')
      ).toBeInTheDocument()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('tiene enlace para volver al detalle sin guardar', () => {
    render(<WorkOrderEdit />, { wrapper: TestWrapper })
    const volver = screen.getByTestId('volver-detalle-orden')
    expect(volver).toHaveAttribute('href', '/ordenes/7')
  })
})

describe('WorkOrderEdit como tecnico', () => {
  const comoTecnico = () => {
    mockAuth.perfil = { nombre: 'Tec', email: 'tec@imaemantenimiento.com', rol: 'tecnico' }
  }

  it('no puede cambiar el tecnico asignado, lo muestra como texto', () => {
    comoTecnico()
    render(<WorkOrderEdit />, { wrapper: TestWrapper })

    expect(screen.queryByLabelText('Técnico')).not.toBeInTheDocument()
    expect(screen.getByText('Carlos')).toBeInTheDocument()
    expect(screen.getByText(/pedile a un supervisor/i)).toBeInTheDocument()
  })

  it('no manda tecnicoId en el payload, porque no puede reasignarse la orden', async () => {
    comoTecnico()
    mockMutateAsync.mockResolvedValue({ id: 7 })
    const user = userEvent.setup()
    render(<WorkOrderEdit />, { wrapper: TestWrapper })

    await user.click(screen.getByText('Guardar Cambios'))
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled())

    const payload = mockMutateAsync.mock.calls[0][0].data
    expect(payload).not.toHaveProperty('tecnicoId')
    expect(payload.titulo).toBe('Revisar cojinete')
  })

  it('no deja editar una orden completada', () => {
    comoTecnico()
    mockOrden.estado = 'completada'
    render(<WorkOrderEdit />, { wrapper: TestWrapper })

    expect(screen.getByText(/ya no se puede editar/i)).toBeInTheDocument()
    expect(screen.getByText('Guardar Cambios')).toBeDisabled()
  })

  it('un supervisor si puede corregir una orden completada', () => {
    mockOrden.estado = 'completada'
    render(<WorkOrderEdit />, { wrapper: TestWrapper })

    expect(screen.queryByText(/ya no se puede editar/i)).not.toBeInTheDocument()
    expect(screen.getByText('Guardar Cambios')).toBeEnabled()
    expect(screen.getByLabelText('Técnico')).toBeInTheDocument()
  })

  it('no manda tecnicoId ni en el submit de una completada', async () => {
    comoTecnico()
    mockOrden.estado = 'completada'
    const user = userEvent.setup()
    render(<WorkOrderEdit />, { wrapper: TestWrapper })

    await user.click(screen.getByText('Guardar Cambios'))
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })
})
