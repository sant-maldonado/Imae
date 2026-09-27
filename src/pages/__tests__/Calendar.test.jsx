import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('Calendar month navigation', () => {
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  function tituloActual() {
    const h3 = document.querySelector('h3')
    return h3.textContent.trim()
  }

  function neighbour(mes, delta) {
    return new Date(new Date().getFullYear(), mes + delta, 1).getMonth()
  }

  it('navigates to next and previous month', async () => {
    mockUseOrdenes.mockReturnValue({ data: [], isLoading: false })
    render(<Calendar />, { wrapper: TestWrapper })

    const inicial = tituloActual()
    const mesInicial = new Date().getMonth()

    await userEvent.click(screen.getByLabelText('Mes siguiente'))
    expect(tituloActual()).toBe(`${meses[neighbour(mesInicial, 1)]} ${new Date().getFullYear()}`)

    await userEvent.click(screen.getByLabelText('Mes anterior'))
    expect(tituloActual()).toBe(inicial)
  })

  it('wraps December to next year going forward', async () => {
    mockUseOrdenes.mockReturnValue({ data: [], isLoading: false })
    render(<Calendar />, { wrapper: TestWrapper })

    // avanzar 12 meses desde el mes actual siempre termina en el mismo mes, un año después
    for (let i = 0; i < 12; i++) {
      await userEvent.click(screen.getByLabelText('Mes siguiente'))
    }

    const year = new Date().getFullYear() + 1
    expect(tituloActual()).toBe(`${meses[new Date().getMonth()]} ${year}`)
  })

  it('"Hoy" button is disabled on the current month and returns after navigating', async () => {
    mockUseOrdenes.mockReturnValue({ data: [], isLoading: false })
    render(<Calendar />, { wrapper: TestWrapper })

    const hoy = screen.getByRole('button', { name: 'Hoy' })
    expect(hoy).toBeDisabled()

    const tituloInicial = tituloActual()
    await userEvent.click(screen.getByLabelText('Mes siguiente'))
    expect(tituloActual()).not.toBe(tituloInicial)
    expect(hoy).toBeEnabled()

    await userEvent.click(hoy)
    expect(tituloActual()).toBe(tituloInicial)
    expect(hoy).toBeDisabled()
  })
})
