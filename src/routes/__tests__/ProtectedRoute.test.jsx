import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProtectedRoute from '../ProtectedRoute'

const mockUser = { id: '1', email: 'test@test.com' }
let mockUserValue = null

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUserValue, loading: false }),
}))

const wrapper = ({ children }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  mockUserValue = null
})

describe('ProtectedRoute', () => {
  it('renders children when user is authenticated', () => {
    mockUserValue = mockUser
    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      { wrapper }
    )
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects to /login when user is not authenticated', () => {
    const { container } = render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      { wrapper }
    )
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})
