import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestWrapper } from '../../test/TestWrapper'
import PurchaseForm from '../PurchaseForm'

const mockMutateAsync = vi.fn()
const mockNavigate = vi.fn()
const mockUseOrdenes = vi.fn()

vi.mock('../../hooks/useApi', () => ({
  useCreateCompra: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useOrdenes: () => mockUseOrdenes(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

beforeEach(() => {
  vi.clearAllMocks()
  mockUseOrdenes.mockReturnValue({ data: [] })
})

describe('PurchaseForm page', () => {
  it('renders all form fields', () => {
    render(<PurchaseForm />, { wrapper: TestWrapper })
    expect(screen.getByPlaceholderText('Nombre del proveedor')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Descripción del artículo')).toBeInTheDocument()
    expect(screen.getByText('Crear Compra')).toBeInTheDocument()
    expect(screen.getByText('Cancelar')).toBeInTheDocument()
  })

  it('submit calls createCompra with form data and navigates on success', async () => {
    mockMutateAsync.mockResolvedValue({ id: 1 })
    const user = userEvent.setup()
    render(<PurchaseForm />, { wrapper: TestWrapper })

    await user.type(screen.getByPlaceholderText('Nombre del proveedor'), 'Test Prov')
    await user.type(screen.getByPlaceholderText('Descripción del artículo'), 'Test Art')
    await user.type(screen.getByRole('spinbutton'), '5')
    await user.click(screen.getByText('Crear Compra'))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/compras')
    })
  })

  it('shows error message on mutation failure', async () => {
    mockMutateAsync.mockRejectedValue(new Error('RLS: permission denied'))
    const user = userEvent.setup()
    render(<PurchaseForm />, { wrapper: TestWrapper })

    await user.type(screen.getByPlaceholderText('Nombre del proveedor'), 'Test')
    await user.type(screen.getByPlaceholderText('Descripción del artículo'), 'Test')
    await user.type(screen.getByRole('spinbutton'), '3')
    await user.click(screen.getByText('Crear Compra'))

    await waitFor(() => {
      expect(screen.getByText('RLS: permission denied')).toBeInTheDocument()
    })
  })

  describe('vinculo con orden de trabajo', () => {
    const ordenes = [
      { id: 1, titulo: 'Revisión de caldera' },
      { id: 7, titulo: 'Cambio de aceite' },
    ]

    it('lista las ordenes disponibles y ofrece "Sin vincular"', () => {
      mockUseOrdenes.mockReturnValue({ data: ordenes })
      render(<PurchaseForm />, { wrapper: TestWrapper })

      const select = screen.getByLabelText('Orden de trabajo vinculada')
      expect(select).toBeInTheDocument()
      expect(within(select).getByRole('option', { name: 'Sin vincular' })).toBeInTheDocument()
      expect(within(select).getByRole('option', { name: '#1 — Revisión de caldera' })).toBeInTheDocument()
      expect(within(select).getByRole('option', { name: '#7 — Cambio de aceite' })).toBeInTheDocument()
    })

    it('envia ordenId como numero al crear la compra', async () => {
      mockUseOrdenes.mockReturnValue({ data: ordenes })
      mockMutateAsync.mockResolvedValue({ id: 1 })
      const user = userEvent.setup()
      render(<PurchaseForm />, { wrapper: TestWrapper })

      await user.type(screen.getByPlaceholderText('Nombre del proveedor'), 'Proveedor')
      await user.type(screen.getByPlaceholderText('Descripción del artículo'), 'Filtro')
      await user.type(screen.getByRole('spinbutton'), '2')
      await user.selectOptions(screen.getByLabelText('Orden de trabajo vinculada'), '7')
      await user.click(screen.getByText('Crear Compra'))

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ ordenId: 7 })
        )
      })
    })

    it('envia ordenId null cuando no se vincula ninguna orden', async () => {
      mockUseOrdenes.mockReturnValue({ data: ordenes })
      mockMutateAsync.mockResolvedValue({ id: 1 })
      const user = userEvent.setup()
      render(<PurchaseForm />, { wrapper: TestWrapper })

      await user.type(screen.getByPlaceholderText('Nombre del proveedor'), 'Proveedor')
      await user.type(screen.getByPlaceholderText('Descripción del artículo'), 'Filtro')
      await user.type(screen.getByRole('spinbutton'), '2')
      await user.click(screen.getByText('Crear Compra'))

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ ordenId: null })
        )
      })
    })
  })
})
