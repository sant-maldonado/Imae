import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestWrapper } from '../../test/TestWrapper'
import Reports from '../Reports'

const mockUseOrdenes = vi.fn()
const mockUseEquipos = vi.fn()
const mockUseTecnicos = vi.fn()

vi.mock('../../hooks/useApi', () => ({
  useOrdenes: () => mockUseOrdenes(),
  useEquipos: () => mockUseEquipos(),
  useTecnicos: () => mockUseTecnicos(),
}))

// Recharts necesita medir el contenedor y jsdom no tiene layout engine.
// Los mocks exponen la serie como JSON para poder verificar la agregacion.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  PieChart: ({ children }) => <div>{children}</div>,
  Pie: ({ data = [] }) => <div data-testid="pie-chart">{JSON.stringify(data)}</div>,
  Cell: () => null,
  BarChart: ({ data = [] }) => <div data-testid="bar-chart">{JSON.stringify(data)}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

const ordenes = [
  { id: 1, titulo: 'A', estado: 'completada', prioridad: 'media', tipoMantenimiento: 'preventivo', fechaCreacion: '2026-01-01', fechaProgramada: '2026-01-10' },
  { id: 2, titulo: 'B', estado: 'pendiente', prioridad: 'alta', tipoMantenimiento: 'preventivo', fechaCreacion: '2026-01-01', fechaProgramada: '2026-01-11' },
  { id: 3, titulo: 'C', estado: 'en_progreso', prioridad: 'urgente', tipoMantenimiento: 'correctivo', fechaCreacion: '2026-01-01', fechaProgramada: '2026-01-12' },
]

function seriePorNombre(testId) {
  return JSON.parse(screen.getByTestId(testId).textContent)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseOrdenes.mockReturnValue({ data: ordenes })
  mockUseEquipos.mockReturnValue({ data: [{ id: 1 }, { id: 2 }] })
  mockUseTecnicos.mockReturnValue({ data: [{ id: 1, activo: true }, { id: 2, activo: false }] })
})

describe('Reports page', () => {
  it('renders heading and summary with real counts', () => {
    render(<Reports />, { wrapper: TestWrapper })

    expect(screen.getByRole('heading', { name: 'Reportes' })).toBeInTheDocument()
    expect(screen.getByText('Total órdenes').nextSibling).toHaveTextContent('3')
    expect(screen.getByText('Equipos registrados').nextSibling).toHaveTextContent('2')
    expect(screen.getByText('Técnicos activos').nextSibling).toHaveTextContent('1')
    expect(screen.getByText('Órdenes completadas').nextSibling).toHaveTextContent('1')
    expect(screen.getByText('Órdenes pendientes').nextSibling).toHaveTextContent('1')
  })

  it('agregates estados reales en el grafico de torta', () => {
    render(<Reports />, { wrapper: TestWrapper })

    expect(seriePorNombre('pie-chart')).toEqual([
      { name: 'Pendientes', value: 1 },
      { name: 'En Progreso', value: 1 },
      { name: 'Completadas', value: 1 },
    ])
  })

  it('agrega por tipo sin inventar porcentajes', () => {
    render(<Reports />, { wrapper: TestWrapper })
    const serie = seriePorNombre('bar-chart')

    // preventivo: 1 completada + 1 sin completar.
    // Antes devolvia Math.floor(2 * 0.7)=1 y Math.floor(2 * 0.3)=0.
    const preventivo = serie.find((d) => d.name === 'Preventivo')
    expect(preventivo.completadas).toBe(1)
    expect(preventivo.sinCompletar).toBe(1)

    // correctivo: 1 en_progreso. Antes Math.floor(1 * 0.5) + Math.floor(1 * 0.5) = 0 y 0.
    const correctivo = serie.find((d) => d.name === 'Correctivo')
    expect(correctivo.completadas).toBe(0)
    expect(correctivo.sinCompletar).toBe(1)

    // el total de cada tipo tiene que coincidir con la cantidad real de ordenes de ese tipo
    const totalSerie = serie.reduce((acc, d) => acc + d.completadas + d.sinCompletar, 0)
    expect(totalSerie).toBe(ordenes.length)
  })

  it('filtra por rango de fechas', () => {
    render(<Reports />, { wrapper: TestWrapper })
    expect(screen.getByText('3 de 3 órdenes')).toBeInTheDocument()

    // desde 2026-01-11 quedan las ordenes B y C
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-01-11' } })
    expect(screen.getByText('2 de 3 órdenes')).toBeInTheDocument()
    expect(screen.getByText('Total órdenes').nextSibling).toHaveTextContent('2')
    expect(screen.getByText('Órdenes completadas').nextSibling).toHaveTextContent('0')
    expect(screen.getByText('Órdenes pendientes').nextSibling).toHaveTextContent('1')

    // acotando hasta 2026-01-11 queda solo B, que esta pendiente
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-01-11' } })
    expect(screen.getByText('1 de 3 órdenes')).toBeInTheDocument()
    expect(screen.getByText('Órdenes completadas').nextSibling).toHaveTextContent('0')
    expect(screen.getByText('Órdenes pendientes').nextSibling).toHaveTextContent('1')
  })

  it('limpia los filtros', async () => {
    render(<Reports />, { wrapper: TestWrapper })
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-01-11' } })
    expect(screen.getByText('2 de 3 órdenes')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(screen.getByText('3 de 3 órdenes')).toBeInTheDocument()
    expect(screen.getByLabelText('Desde')).toHaveValue('')
  })

  it('exporta CSV con una fila por orden', async () => {
    const createObjectURL = vi.fn(() => 'blob:mock')
    vi.stubGlobal('URL', { ...URL, createObjectURL })

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<Reports />, { wrapper: TestWrapper })
    await userEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }))

    expect(createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()

    clickSpy.mockRestore()
    vi.unstubAllGlobals()
  })

  it('no rompe cuando no hay ordenes', () => {
    mockUseOrdenes.mockReturnValue({ data: [] })
    render(<Reports />, { wrapper: TestWrapper })

    expect(screen.getByText('Total órdenes').nextSibling).toHaveTextContent('0')
    expect(seriePorNombre('bar-chart')).toEqual([
      { name: 'Preventivo', completadas: 0, sinCompletar: 0 },
      { name: 'Correctivo', completadas: 0, sinCompletar: 0 },
      { name: 'Predictivo', completadas: 0, sinCompletar: 0 },
    ])
  })
})
