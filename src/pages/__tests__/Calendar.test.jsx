import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestWrapper } from '../../test/TestWrapper'
import Calendar from '../Calendar'

const mockUseOrdenes = vi.fn()

vi.mock('../../hooks/useApi', () => ({
  useOrdenes: (...args) => mockUseOrdenes(...args),
}))

describe('Calendar page', () => {
  it('shows loading state', () => {
    mockUseOrdenes.mockReturnValue({ data: null, isLoading: true })
    const { container } = render(<Calendar />, { wrapper: TestWrapper })
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows error when ordenes is null (not loading)', () => {
    mockUseOrdenes.mockReturnValue({ data: null, isLoading: false })
    render(<Calendar />, { wrapper: TestWrapper })
    expect(screen.getByText('Error al cargar calendario')).toBeInTheDocument()
  })

  it('renders month and year title with day headers', () => {
    mockUseOrdenes.mockReturnValue({ data: [], isLoading: false })
    render(<Calendar />, { wrapper: TestWrapper })
    expect(screen.getByText(/Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre/)).toBeInTheDocument()
    expect(screen.getByText('Dom')).toBeInTheDocument()
    expect(screen.getByText('Lun')).toBeInTheDocument()
    expect(screen.getByText('Sáb')).toBeInTheDocument()
  })

  it('shows order titles on correct dates', () => {
    const today = new Date()
    const dia = String(today.getDate()).padStart(2, '0')
    const mes = String(today.getMonth() + 1).padStart(2, '0')
    const fechaStr = `${today.getFullYear()}-${mes}-${dia}`

    mockUseOrdenes.mockReturnValue({
      data: [
        { id: 1, titulo: 'Reparación urgente', prioridad: 'urgente', estado: 'pendiente', fechaProgramada: fechaStr },
      ],
      isLoading: false,
    })

    render(<Calendar />, { wrapper: TestWrapper })
    expect(screen.getByText('Reparación urgente')).toBeInTheDocument()
    expect(screen.getByText('Reparación urgente').closest('a')).toHaveAttribute('href', '/ordenes/1')
  })

  it('shows +N more for days with >3 orders', () => {
    const today = new Date()
    const dia = String(today.getDate()).padStart(2, '0')
    const mes = String(today.getMonth() + 1).padStart(2, '0')
    const fechaStr = `${today.getFullYear()}-${mes}-${dia}`

    const ordenes = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      titulo: `Orden ${i + 1}`,
      prioridad: 'media',
      estado: 'pendiente',
      fechaProgramada: fechaStr,
    }))

    mockUseOrdenes.mockReturnValue({ data: ordenes, isLoading: false })
    render(<Calendar />, { wrapper: TestWrapper })
    expect(screen.getByText('+2 más')).toBeInTheDocument()
  })
})
