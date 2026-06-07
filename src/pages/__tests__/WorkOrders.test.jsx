import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TestWrapper } from '../../test/TestWrapper'
import WorkOrders from '../WorkOrders'

const mockUseOrdenes = vi.fn()
const mockUseTecnicos = vi.fn()

vi.mock('../../hooks/useMockData', () => ({
  useOrdenes: (...args) => mockUseOrdenes(...args),
  useTecnicos: (...args) => mockUseTecnicos(...args),
}))

const mockOrdenes = [
  { id: 1, titulo: 'Fix Torno', equipoNombre: 'Torno CNC', tecnicoNombre: 'Carlos', prioridad: 'urgente', estado: 'pendiente', fechaProgramada: '2026-06-01', tipoMantenimiento: 'correctivo' },
  { id: 2, titulo: 'Oil Change', equipoNombre: 'Prensa', tecnicoNombre: 'Ana', prioridad: 'baja', estado: 'completada', fechaProgramada: '2026-05-20', tipoMantenimiento: 'preventivo' },
]

describe('WorkOrders page', () => {
  it('renders table with order data', () => {
    mockUseOrdenes.mockReturnValue({ data: mockOrdenes, isLoading: false })
    mockUseTecnicos.mockReturnValue({ data: [], isLoading: false })
    render(<WorkOrders />, { wrapper: TestWrapper })
    expect(screen.getByText('Fix Torno')).toBeInTheDocument()
    expect(screen.getByText('Oil Change')).toBeInTheDocument()
    expect(screen.getByText('Carlos')).toBeInTheDocument()
  })

  it('filters by status', () => {
    mockUseOrdenes.mockReturnValue({ data: mockOrdenes, isLoading: false })
    mockUseTecnicos.mockReturnValue({ data: [], isLoading: false })
    render(<WorkOrders />, { wrapper: TestWrapper })
    expect(screen.getAllByRole('row')).toHaveLength(3)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'completada' } })
    expect(screen.getByText('Oil Change')).toBeInTheDocument()
    expect(screen.queryByText('Fix Torno')).not.toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockUseOrdenes.mockReturnValue({ data: [], isLoading: true })
    mockUseTecnicos.mockReturnValue({ data: [], isLoading: false })
    render(<WorkOrders />, { wrapper: TestWrapper })
    expect(screen.getByText(/cargando/i)).toBeInTheDocument()
  })

  it('has link to create new order', () => {
    mockUseOrdenes.mockReturnValue({ data: mockOrdenes, isLoading: false })
    mockUseTecnicos.mockReturnValue({ data: [], isLoading: false })
    render(<WorkOrders />, { wrapper: TestWrapper })
    expect(screen.getByText('+ Nueva Orden').closest('a')).toHaveAttribute('href', '/ordenes/nueva')
  })
})