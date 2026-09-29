import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestWrapper } from '../../../test/TestWrapper'
import Sidebar from '../Sidebar'

const mockLogout = vi.fn()
const mockAuth = vi.hoisted(() => ({
  perfil: { nombre: 'Admin User', email: 'admin@test.com', rol: 'admin', avatar_url: 'http://img.com/a.jpg' },
}))

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: mockAuth.perfil.email },
    perfil: mockAuth.perfil,
    loading: false,
    logout: mockLogout,
  }),
}))

beforeEach(() => {
  mockAuth.perfil = {
    nombre: 'Admin User',
    email: 'admin@test.com',
    rol: 'admin',
    avatar_url: 'http://img.com/a.jpg',
  }
})

describe('Sidebar', () => {
  it('shows navigation links', () => {
    render(<Sidebar onClose={() => {}} />, { wrapper: TestWrapper })
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Órdenes')).toBeInTheDocument()
    expect(screen.getByText('Equipos')).toBeInTheDocument()
    expect(screen.getByText('Técnicos')).toBeInTheDocument()
    expect(screen.getByText('Calendario')).toBeInTheDocument()
    expect(screen.getByText('Compras')).toBeInTheDocument()
    expect(screen.getByText('Reportes')).toBeInTheDocument()
  })

  it('al tecnico no le aparece el item Tecnicos', () => {
    mockAuth.perfil = { nombre: 'Tec', email: 'tec@test.com', rol: 'tecnico' }
    render(<Sidebar onClose={() => {}} />, { wrapper: TestWrapper })

    expect(screen.queryByText('Técnicos')).not.toBeInTheDocument()
    // pero el resto de las secciones que si puede usar siguen ahi
    expect(screen.getByText('Órdenes')).toBeInTheDocument()
    expect(screen.getByText('Compras')).toBeInTheDocument()
    expect(screen.getByText('Equipos')).toBeInTheDocument()
    expect(screen.getByText('Calendario')).toBeInTheDocument()
  })

  it('al tecnico tampoco le aparece Reportes', () => {
    mockAuth.perfil = { nombre: 'Tec', email: 'tec@test.com', rol: 'tecnico' }
    render(<Sidebar onClose={() => {}} />, { wrapper: TestWrapper })

    expect(screen.queryByText('Reportes')).not.toBeInTheDocument()
  })

  it('el operador si ve Tecnicos pero no Reportes', () => {
    mockAuth.perfil = { nombre: 'Op', email: 'op@test.com', rol: 'operador' }
    render(<Sidebar onClose={() => {}} />, { wrapper: TestWrapper })

    expect(screen.getByText('Técnicos')).toBeInTheDocument()
    expect(screen.queryByText('Reportes')).not.toBeInTheDocument()
  })

  it('mientras carga el perfil no muestra links restringidos', () => {
    mockAuth.perfil = { nombre: 'Tec', email: 'tec@test.com', rol: 'tecnico' }
    render(<Sidebar onClose={() => {}} />, { wrapper: TestWrapper })
    expect(screen.queryByText('Técnicos')).not.toBeInTheDocument()
  })

  it('shows user avatar when available', () => {
    render(<Sidebar onClose={() => {}} />, { wrapper: TestWrapper })
    const img = screen.getByAltText('')
    expect(img).toHaveAttribute('src', 'http://img.com/a.jpg')
  })

  it('shows user name and role', () => {
    render(<Sidebar onClose={() => {}} />, { wrapper: TestWrapper })
    expect(screen.getByText('Admin User')).toBeInTheDocument()
    expect(screen.getByText('admin')).toBeInTheDocument()
  })

  it('has logout button', () => {
    render(<Sidebar onClose={() => {}} />, { wrapper: TestWrapper })
    expect(screen.getByText('Cerrar sesión')).toBeInTheDocument()
  })
})

describe('Sidebar - promo de instalacion', () => {
  it('ofrece agregar a la pantalla cuando la app se puede instalar', () => {
    render(<Sidebar onClose={() => {}} instalable onInstall={vi.fn()} />, { wrapper: TestWrapper })
    expect(screen.getByText('Agregar a la pantalla')).toBeInTheDocument()
  })

  it('no lo ofrece si la app ya esta instalada o no se puede instalar', () => {
    render(<Sidebar onClose={() => {}} instalable={false} onInstall={vi.fn()} />, { wrapper: TestWrapper })
    expect(screen.queryByText('Agregar a la pantalla')).not.toBeInTheDocument()
  })

  it('lo esconde si nadie lo pasa, como en los renders sueltos', () => {
    render(<Sidebar onClose={() => {}} />, { wrapper: TestWrapper })
    expect(screen.queryByText('Agregar a la pantalla')).not.toBeInTheDocument()
  })

  it('al tocarlo abre el prompt y cierra el drawer', async () => {
    const onInstall = vi.fn()
    const onClose = vi.fn()
    render(<Sidebar onClose={onClose} instalable onInstall={onInstall} />, { wrapper: TestWrapper })

    await userEvent.click(screen.getByText('Agregar a la pantalla'))

    expect(onInstall).toHaveBeenCalledTimes(1)
    // El sidebar en el celu es un drawer: si queda abierto tapa el sheet.
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
