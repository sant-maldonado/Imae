import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestWrapper } from '../../test/TestWrapper'
import WorkOrderEdit from '../WorkOrderEdit'

const mockMutateAsync = vi.fn()
const mockNavigate = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

vi.mock('../../hooks/useApi', () => ({
  useOrden: () => ({
    data: {
      id: 7,
      titulo: 'Revisar cojinete',
      descripcion: 'Vibracion en el husillo',
      equipoId: 'e1',
      tecnicoId: 't1',
      prioridad: 'alta',
      tipoMantenimiento: 'correctivo',
      fechaProgramada: '2026-06-15',
    },
    isLoading: false,
  }),
  useEditarOrden: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useEquipos: () => ({ data: [{ id: 'e1', nombre: 'Torno CNC', codigo: 'TC-001' }] }),
  useTecnicos: () => ({ data: [{ id: 't1', nombre: 'Carlos', activo: true }] }),
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
