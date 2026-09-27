import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestWrapper } from '../../test/TestWrapper'
import PurchaseDetail from '../PurchaseDetail'

const mockUseCompra = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../../hooks/useApi', () => ({
  useCompra: (id) => mockUseCompra(id),
  useLogsCompra: () => ({ data: [] }),
  useDeleteCompra: () => ({ mutateAsync: vi.fn() }),
  useUpdateCompra: () => ({ mutateAsync: vi.fn() }),
  useCreateLogCompra: () => ({ mutate: vi.fn() }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PurchaseDetail vinculo con orden', () => {
  it('muestra el link a la orden vinculada', () => {
    mockUseCompra.mockReturnValue({
      isLoading: false,
      data: {
        id: 1,
        proveedor: 'Ferretería',
        articulo: 'Filtro de aire',
        cantidad: 2,
        unidad: 'unidades',
        estado: 'pendiente',
        ordenId: 3,
        ordenTitulo: 'Revisión de caldera',
      },
    })

    render(<PurchaseDetail />, { wrapper: TestWrapper })

    const link = screen.getByRole('link', { name: '#3 — Revisión de caldera' })
    expect(link).toHaveAttribute('href', '/ordenes/3')
  })

  it('muestra "Sin vincular" cuando la compra no tiene orden', () => {
    mockUseCompra.mockReturnValue({
      isLoading: false,
      data: {
        id: 1,
        proveedor: 'Ferretería',
        articulo: 'Filtro de aire',
        cantidad: 2,
        unidad: 'unidades',
        estado: 'pendiente',
        ordenId: null,
        ordenTitulo: null,
      },
    })

    render(<PurchaseDetail />, { wrapper: TestWrapper })

    expect(screen.getByText('Sin vincular')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /#/ })).not.toBeInTheDocument()
  })

  it('cae a "ver orden" si el embed vino sin titulo', () => {
    mockUseCompra.mockReturnValue({
      isLoading: false,
      data: {
        id: 1,
        proveedor: 'Ferretería',
        articulo: 'Filtro',
        cantidad: 1,
        unidad: 'unidades',
        estado: 'pendiente',
        ordenId: 9,
        ordenTitulo: null,
      },
    })

    render(<PurchaseDetail />, { wrapper: TestWrapper })

    expect(screen.getByRole('link', { name: '#9 — ver orden' })).toHaveAttribute('href', '/ordenes/9')
  })
})
