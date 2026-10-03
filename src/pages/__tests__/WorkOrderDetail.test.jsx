import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestWrapper } from '../../test/TestWrapper'
import WorkOrderDetail from '../WorkOrderDetail'

const mockCompletar = vi.fn()
// Estado de la orden mockeada, para probar que la completada queda congelada.
const mockOrden = vi.hoisted(() => ({ estado: 'en_progreso' }))

vi.mock('../../hooks/useApi', () => ({
  useOrden: () => ({
    data: {
      id: 7,
      titulo: 'Revisar cojinete',
      descripcion: 'Vibracion',
      estado: mockOrden.estado,
      prioridad: 'alta',
      tipoMantenimiento: 'correctivo',
      equipoNombre: 'Torno CNC',
      tecnicoNombre: 'Carlos',
      fechaProgramada: '2026-06-15',
      fechaCreacion: '2026-06-01',
    },
    isLoading: false,
  }),
  useFotos: () => ({ data: [] }),
  useDeleteFoto: () => ({ mutate: vi.fn() }),
  useLogs: () => ({ data: [] }),
  useCreateLog: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
  useCompletarOrden: () => ({ mutateAsync: mockCompletar, isPending: false }),
  useDeleteOrden: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useParams: () => ({ id: '7' }) }
})

const mockAuth = vi.hoisted(() => ({ perfil: { nombre: 'Admin', rol: 'admin' } }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => mockAuth }))

function renderComo(rol) {
  mockAuth.perfil = { nombre: 'User', rol }
  mockOrden.estado = 'en_progreso'
  return render(<WorkOrderDetail />, { wrapper: TestWrapper })
}

describe('WorkOrderDetail permisos por rol', () => {
  it('admin ve completar, editar y eliminar', () => {
    renderComo('admin')
    expect(screen.getByText('Completar')).toBeInTheDocument()
    expect(screen.getByText('Editar')).toBeInTheDocument()
    expect(screen.getByText('Eliminar')).toBeInTheDocument()
  })

  it('el tecnico completa y edita, pero no elimina', () => {
    renderComo('tecnico')
    expect(screen.getByText('Completar')).toBeInTheDocument()
    expect(screen.getByText('Editar')).toBeInTheDocument()
    expect(screen.queryByText('Eliminar')).not.toBeInTheDocument()
  })

  it('el operador no ve ningun boton de escritura', () => {
    renderComo('operador')
    expect(screen.queryByText('Completar')).not.toBeInTheDocument()
    expect(screen.queryByText('Editar')).not.toBeInTheDocument()
    expect(screen.queryByText('Eliminar')).not.toBeInTheDocument()
  })

  it('el PDF es para todos', () => {
    renderComo('operador')
    expect(screen.getByText('PDF')).toBeInTheDocument()
  })

  it('el boton Editar apunta a la ruta de edicion', () => {
    renderComo('admin')
    expect(screen.getByText('Editar').closest('a')).toHaveAttribute('href', '/ordenes/7/editar')
  })

  it('el tecnico no ve Editar en una orden completada', () => {
    // Seteamos el mock a mano: renderComo tambien renderiza, y dos renders en
    // el mismo test dejan dos copias del boton en el documento.
    mockAuth.perfil = { nombre: 'Tec', rol: 'tecnico' }
    mockOrden.estado = 'completada'
    render(<WorkOrderDetail />, { wrapper: TestWrapper })

    expect(screen.queryByText('Editar')).not.toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
  })

  it('un supervisor si ve Editar en una orden completada', () => {
    mockAuth.perfil = { nombre: 'Sup', rol: 'supervisor' }
    mockOrden.estado = 'completada'
    render(<WorkOrderDetail />, { wrapper: TestWrapper })

    expect(screen.getByText('Editar')).toBeInTheDocument()
    expect(screen.getByText('Eliminar')).toBeInTheDocument()
  })
})
