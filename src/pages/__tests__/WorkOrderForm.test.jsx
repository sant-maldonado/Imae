import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestWrapper } from '../../test/TestWrapper'
import WorkOrderForm from '../WorkOrderForm'

const mockMutateAsync = vi.fn()
const mockNavigate = vi.fn()
const mockGetUser = vi.fn()

vi.mock('../../hooks/useApi', () => ({
  useCreateOrden: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useEquipos: () => ({ data: [{ id: 'e1', nombre: 'Torno CNC', codigo: 'TC-001' }], isLoading: false }),
  useTecnicos: () => ({
    data: [
      { id: 't1', nombre: 'Carlos', email: 'tec@imaemantenimiento.com', activo: true },
      { id: 't2', nombre: 'Ana', email: 'ana@imaemantenimiento.com', activo: false },
      { id: 't3', nombre: 'Beto', email: 'beto@imaemantenimiento.com', activo: true },
    ],
    isLoading: false,
  }),
}))

// El select de Tecnico se acota cuando el usuario es tecnico, asi que el mock
// trae el email: es por ahi como se resuelve la ficha propia.
const mockAuth = vi.hoisted(() => ({ perfil: { nombre: 'Admin', email: 'admin@imaemantenimiento.com', rol: 'admin' } }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => mockAuth }))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { getUser: () => mockGetUser() } },
}))

vi.mock('../../lib/cloudinary', () => ({
  uploadToCloudinary: () => Promise.resolve('https://res.cloudinary.com/dsrtlwbgi/image/upload/test.jpg'),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.perfil = { nombre: 'Admin', email: 'admin@imaemantenimiento.com', rol: 'admin' }
})

describe('WorkOrderForm page', () => {
  it('renders form title and buttons', () => {
    render(<WorkOrderForm />, { wrapper: TestWrapper })
    expect(screen.getByText('Nueva Orden de Trabajo')).toBeInTheDocument()
    expect(screen.getByText('Crear Orden')).toBeInTheDocument()
    expect(screen.getByText('Cancelar')).toBeInTheDocument()
  })

  it('shows equipment options from API', () => {
    render(<WorkOrderForm />, { wrapper: TestWrapper })
    expect(screen.getByText('Torno CNC (TC-001)')).toBeInTheDocument()
  })

  it('only shows active technicians', () => {
    render(<WorkOrderForm />, { wrapper: TestWrapper })
    expect(screen.getByText('Carlos')).toBeInTheDocument()
    expect(screen.queryByText('Ana')).not.toBeInTheDocument()
  })

  it('calls createOrden and navigates on submit', async () => {
    mockMutateAsync.mockResolvedValue({ id: 99 })
    const user = userEvent.setup()
    const { container } = render(<WorkOrderForm />, { wrapper: TestWrapper })

    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Fix something')
    await user.type(inputs[1], 'Need to fix')
    const combos = screen.getAllByRole('combobox')
    await user.selectOptions(combos[1], 't1')
    await user.type(container.querySelector('input[type="date"]'), '2026-06-15')
    await user.click(screen.getByText('Crear Orden'))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/ordenes')
    })
  })

  it('shows error when mutation fails', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Database error'))
    const user = userEvent.setup()
    const { container } = render(<WorkOrderForm />, { wrapper: TestWrapper })

    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Test')
    const combos = screen.getAllByRole('combobox')
    await user.selectOptions(combos[1], 't1')
    await user.type(container.querySelector('input[type="date"]'), '2026-06-15')
    await user.click(screen.getByText('Crear Orden'))

    await waitFor(() => {
      expect(screen.getByText('Database error')).toBeInTheDocument()
    })
  })

  it('navigates back on cancel', async () => {
    const user = userEvent.setup()
    render(<WorkOrderForm />, { wrapper: TestWrapper })
    await user.click(screen.getByText('Cancelar'))
    expect(mockNavigate).toHaveBeenCalledWith('/ordenes')
  })

  it('ofrece un enlace visible para volver al listado', () => {
    render(<WorkOrderForm />, { wrapper: TestWrapper })
    const volver = screen.getByTestId('volver-ordenes')
    expect(volver).toHaveAttribute('href', '/ordenes')
    expect(volver).toHaveTextContent('Órdenes')
  })
})

describe('WorkOrderForm como tecnico', () => {
  const comoTecnico = () => {
    mockAuth.perfil = { nombre: 'Tec', email: 'tec@imaemantenimiento.com', rol: 'tecnico' }
  }

  it('el select de tecnico solo ofrece su propio nombre', () => {
    comoTecnico()
    render(<WorkOrderForm />, { wrapper: TestWrapper })

    const select = screen.getByLabelText('Técnico (vos)')
    const nombres = [...select.options].map((o) => o.textContent)
    expect(nombres).toEqual(expect.arrayContaining(['Carlos', 'Sin asignar']))
    expect(nombres).not.toContain('Beto')
  })

  it('se autoselecciona, porque el default es su propia ficha', async () => {
    comoTecnico()
    render(<WorkOrderForm />, { wrapper: TestWrapper })

    await waitFor(() => {
      expect(screen.getByLabelText('Técnico (vos)')).toHaveValue('t1')
    })
  })

  it('puede dejar la orden sin asignar', async () => {
    comoTecnico()
    const user = userEvent.setup()
    render(<WorkOrderForm />, { wrapper: TestWrapper })

    await waitFor(() => {
      expect(screen.getByLabelText('Técnico (vos)')).toHaveValue('t1')
    })
    await user.selectOptions(screen.getByLabelText('Técnico (vos)'), '')

    // Sin asignar es valido para el tecnico, asi que el campo no lo bloquea
    expect(screen.getByLabelText('Técnico (vos)')).not.toBeRequired()
    expect(screen.getByLabelText('Técnico (vos)')).toHaveValue('')
  })

  it('avisa si la cuenta no tiene ficha en la tabla de tecnicos', () => {
    mockAuth.perfil = { nombre: 'Huerfano', email: 'nadie@imaemantenimiento.com', rol: 'tecnico' }
    render(<WorkOrderForm />, { wrapper: TestWrapper })

    expect(screen.getByText(/no tiene ficha en la lista de técnicos/i)).toBeInTheDocument()
  })

  it('un supervisor si ve todos los tecnicos activos', () => {
    render(<WorkOrderForm />, { wrapper: TestWrapper })

    const select = screen.getByLabelText('Técnico')
    const nombres = [...select.options].map((o) => o.textContent)
    expect(nombres).toContain('Carlos')
    expect(nombres).toContain('Beto')
    expect(nombres).not.toContain('Ana')
  })
})
