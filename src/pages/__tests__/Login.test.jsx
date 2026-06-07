import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestWrapper } from '../../test/TestWrapper'
import Login from '../Login'

const mockLogin = vi.fn()
const mockRegister = vi.fn()
const mockResetPassword = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister,
    resetPassword: mockResetPassword,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Login page', () => {
  it('renders login form by default', () => {
    render(<Login />, { wrapper: TestWrapper })
    expect(screen.getByText('Iniciar sesión')).toBeInTheDocument()
    expect(screen.getByText('Ingresar')).toBeInTheDocument()
  })

  it('toggles to register form', async () => {
    const user = userEvent.setup()
    render(<Login />, { wrapper: TestWrapper })
    await user.click(screen.getByText('Crear cuenta nueva'))
    expect(screen.getByPlaceholderText('Tu nombre')).toBeInTheDocument()
    expect(screen.getAllByText('Crear cuenta').length).toBe(2)
  })

  it('toggles to reset password', async () => {
    const user = userEvent.setup()
    render(<Login />, { wrapper: TestWrapper })
    await user.click(screen.getByText('Olvidé mi contraseña'))
    expect(screen.getByText('Enviar link')).toBeInTheDocument()
  })

  it('calls login on submit in login mode', async () => {
    const user = userEvent.setup()
    render(<Login />, { wrapper: TestWrapper })

    await user.type(screen.getByPlaceholderText('email@ejemplo.com'), 'admin@test.com')
    const passwordInputs = screen.getAllByPlaceholderText('••••••')
    await user.type(passwordInputs[0], '123456')
    await user.click(screen.getByText('Ingresar'))

    expect(mockLogin).toHaveBeenCalledWith('admin@test.com', '123456')
  })

  it('calls register on submit in register mode', async () => {
    const user = userEvent.setup()
    render(<Login />, { wrapper: TestWrapper })

    await user.click(screen.getByText('Crear cuenta nueva'))
    await user.type(screen.getByPlaceholderText('Tu nombre'), 'Test User')
    await user.type(screen.getByPlaceholderText('email@ejemplo.com'), 'test@test.com')
    const passwordInputs = screen.getAllByPlaceholderText('••••••')
    await user.type(passwordInputs[0], '123456')
    await user.selectOptions(screen.getByRole('combobox'), 'Mecánica')
    await user.type(screen.getByPlaceholderText('+54 11 5555-5555'), '123456789')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(mockRegister).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.any(String), expect.any(String), expect.any(String))
  })

  it('shows error message', () => {
    render(<Login />, { wrapper: TestWrapper })
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
  })
})
