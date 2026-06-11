import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TestWrapper } from '../../test/TestWrapper'
import Purchases from '../Purchases'
import '../../components/Skeleton'

const mockCompras = [
  { id: 1, articulo: 'Sellos hidráulicos', proveedor: 'Repuestos García', cantidad: 3, unidad: 'unidades', fechaSolicitud: '2026-05-22', fechaEntrega: '2026-05-28', estado: 'en_curso' },
  { id: 2, articulo: 'Aceite ISO 46', proveedor: 'Suministros SA', cantidad: 20, unidad: 'litros', fechaSolicitud: '2026-05-20', fechaEntrega: null, estado: 'pendiente' },
]

let mockLoading = false

vi.mock('../../hooks/useApi', () => ({
  useCompras: () => ({ data: mockCompras, isLoading: mockLoading }),
}))

describe('Purchases page', () => {
  it('renders table with purchases', () => {
    render(<Purchases />, { wrapper: TestWrapper })
    expect(screen.getByText('Sellos hidráulicos')).toBeInTheDocument()
    expect(screen.getByText('Repuestos García')).toBeInTheDocument()
  })

  it('filters by estado', () => {
    render(<Purchases />, { wrapper: TestWrapper })
    expect(screen.getAllByRole('row')).toHaveLength(3)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'pendiente' } })
    expect(screen.getByText('Aceite ISO 46')).toBeInTheDocument()
    expect(screen.queryByText('Sellos hidráulicos')).not.toBeInTheDocument()
  })

  it('has link to create new purchase', () => {
    render(<Purchases />, { wrapper: TestWrapper })
    expect(screen.getByText('+ Nueva Compra').closest('a')).toHaveAttribute('href', '/compras/nueva')
  })

  it('shows loading state', () => {
    mockLoading = true
    const { container } = render(<Purchases />, { wrapper: TestWrapper })
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })
})
