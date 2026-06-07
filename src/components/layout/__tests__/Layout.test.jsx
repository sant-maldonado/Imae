import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestWrapper } from '../../../test/TestWrapper'
import Layout from '../Layout'

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'admin@test.com' },
    perfil: { nombre: 'Admin', email: 'admin@test.com', rol: 'admin', avatar_url: null },
    loading: false,
    logout: vi.fn(),
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Page Content</div>,
  }
})

describe('Layout', () => {
  it('renders sidebar and outlet', () => {
    render(<Layout />, { wrapper: TestWrapper })
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getByTestId('outlet')).toBeInTheDocument()
  })
})
