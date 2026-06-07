import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestWrapper } from '../../test/TestWrapper'
import Dashboard from '../Dashboard'

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'admin@test.com' },
    perfil: { nombre: 'Admin User', email: 'admin@test.com', rol: 'admin', avatar_url: null },
    loading: false,
  }),
}))

describe('Dashboard page', () => {
  it('renders 4 quick-access cards', () => {
    render(<Dashboard />, { wrapper: TestWrapper })
    expect(screen.getByText('Ver Órdenes')).toBeInTheDocument()
    expect(screen.getByText('Calendario')).toBeInTheDocument()
    expect(screen.getByText('Equipos')).toBeInTheDocument()
    expect(screen.getByText('Compras')).toBeInTheDocument()
  })

  it('shows user name, email and role', () => {
    render(<Dashboard />, { wrapper: TestWrapper })
    expect(screen.getByText('Admin User')).toBeInTheDocument()
    expect(screen.getByText('admin@test.com')).toBeInTheDocument()
    expect(screen.getByText('Administrador')).toBeInTheDocument()
  })

  it('shows user initial when no avatar', () => {
    render(<Dashboard />, { wrapper: TestWrapper })
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('cards link to correct routes', () => {
    render(<Dashboard />, { wrapper: TestWrapper })
    expect(screen.getByText('Ver Órdenes').closest('a')).toHaveAttribute('href', '/ordenes')
    expect(screen.getByText('Equipos').closest('a')).toHaveAttribute('href', '/equipos')
    expect(screen.getByText('Compras').closest('a')).toHaveAttribute('href', '/compras')
  })
})
