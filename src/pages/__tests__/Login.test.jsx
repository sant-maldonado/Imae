import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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

const UA_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const UA_IOS_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.0.0 Mobile/15E148 Safari/604.1'

function definir(valor, prop) {
  Object.defineProperty(navigator, prop, { value: valor, configurable: true })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  delete navigator.standalone
  delete navigator.maxTouchPoints
  definir('MacIntel', 'platform')
  definir(0, 'maxTouchPoints')
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

// La nota vive aca y no solo en Layout: el que abre el link desde el celu sin
// tener sesion es justo el que nunca veia el aviso.
describe('Login page - aviso de instalacion', () => {
  it('en Safari de iPhone ofrece la guia sin pedir que inicie sesion', () => {
    definir(UA_IPHONE, 'userAgent')
    render(<Login />, { wrapper: TestWrapper })

    const nota = screen.getByRole('region', { name: 'Instalar IMAE' })
    expect(nota).toBeInTheDocument()
    expect(screen.getByText('Tocá Compartir')).toBeInTheDocument()
    expect(screen.getByText('Elegí Agregar a pantalla de inicio')).toBeInTheDocument()
  })

  it('va debajo del formulario y no lo tapa', () => {
    definir(UA_IPHONE, 'userAgent')
    render(<Login />, { wrapper: TestWrapper })

    const nota = screen.getByRole('region', { name: 'Instalar IMAE' })
    const ingresar = screen.getByRole('button', { name: 'Ingresar' })
    const crear = screen.getByText('Crear cuenta nueva')

    // DOCUMENT_POSITION_FOLLOWING: la nota viene despues de los dos.
    expect(ingresar.compareDocumentPosition(nota) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(crear.compareDocumentPosition(nota) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('no es un dialogo: no roba el foco ni se.modaliza', () => {
    definir(UA_IPHONE, 'userAgent')
    render(<Login />, { wrapper: TestWrapper })

    const nota = screen.getByRole('region', { name: 'Instalar IMAE' })
    expect(nota).not.toHaveAttribute('aria-modal')
    expect(nota).not.toHaveAttribute('role', 'dialog')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('tampoco se queda el foco, la nota no puede desviarlo del formulario', () => {
    definir(UA_IPHONE, 'userAgent')
    render(<Login />, { wrapper: TestWrapper })

    // Nada de autofocus en la nota: el login arranca con el foco en el body.
    expect(screen.getByPlaceholderText('email@ejemplo.com')).not.toHaveFocus()
  })

  it('no aparece en navegadores que no pueden instalar', () => {
    definir(UA_IOS_CHROME, 'userAgent')
    render(<Login />, { wrapper: TestWrapper })

    expect(screen.queryByRole('region', { name: 'Instalar IMAE' })).not.toBeInTheDocument()
  })

  it('tampoco aparece en un escritorio sin via de instalacion', () => {
    render(<Login />, { wrapper: TestWrapper })
    expect(screen.queryByRole('region', { name: 'Instalar IMAE' })).not.toBeInTheDocument()
  })

  it('descartarla guarda la preferencia y la saca de la pantalla', async () => {
    const user = userEvent.setup()
    definir(UA_IPHONE, 'userAgent')
    render(<Login />, { wrapper: TestWrapper })

    await user.click(screen.getByRole('button', { name: 'No mostrar de nuevo' }))

    expect(localStorage.getItem('installDismissed')).toBe('1')
    expect(screen.queryByRole('region', { name: 'Instalar IMAE' })).not.toBeInTheDocument()
  })

  it('no vuelve a aparecer si ya la habian descartado antes', () => {
    localStorage.setItem('installDismissed', '1')
    definir(UA_IPHONE, 'userAgent')
    render(<Login />, { wrapper: TestWrapper })

    expect(screen.queryByRole('region', { name: 'Instalar IMAE' })).not.toBeInTheDocument()
  })

  it('tampoco aparece si la app ya esta instalada', () => {
    definir(UA_IPHONE, 'userAgent')
    definir(true, 'standalone')
    render(<Login />, { wrapper: TestWrapper })

    expect(screen.queryByRole('region', { name: 'Instalar IMAE' })).not.toBeInTheDocument()
  })
})
