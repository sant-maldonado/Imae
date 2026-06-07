import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestWrapper } from '../../../test/TestWrapper'
import Sidebar from '../Sidebar'

const mockLogout = vi.fn()

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'admin@test.com' },
    perfil: { nombre: 'Admin User', email: 'admin@test.com', rol: 'admin', avatar_url: 'http://img.com/a.jpg' },
    loading: false,
    logout: mockLogout,
  }),
}))

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
