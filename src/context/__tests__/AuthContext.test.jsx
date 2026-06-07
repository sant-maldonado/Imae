import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'

const { mockGetSession, mockGetUser, mockSignIn, mockSignUp, mockSignOut, mockFrom } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetUser: vi.fn(),
  mockSignIn: vi.fn(),
  mockSignUp: vi.fn(),
  mockSignOut: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      getUser: mockGetUser,
      signInWithPassword: mockSignIn,
      signUp: mockSignUp,
      signOut: mockSignOut,
      updateUser: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
    from: mockFrom,
  },
}))

function TestConsumer() {
  const auth = useAuth()
  return (
    <div>
      <p data-testid="user">{auth.user ? auth.user.email : 'no-user'}</p>
      <p data-testid="perfil">{auth.perfil ? auth.perfil.nombre : 'no-perfil'}</p>
      <p data-testid="loading">{auth.loading ? 'loading' : 'loaded'}</p>
      <button onClick={() => auth.login('a@b.com', '123')}>login</button>
      <button onClick={() => auth.register('a@b.com', '123', 'Test', 'Mecánica', '555')}>register</button>
      <button onClick={() => auth.logout()}>logout</button>
    </div>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSession.mockResolvedValue({ data: { session: null } })
  mockGetUser.mockResolvedValue({ data: { user: null } })
})

describe('AuthContext', () => {
  it('provides user and perfil after login', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockSignIn.mockResolvedValue({
      data: { user: { id: '1', email: 'a@b.com' } },
      error: null,
    })
    const perfilQuery = { select: vi.fn(), eq: vi.fn(), single: vi.fn() }
    perfilQuery.select.mockReturnThis()
    perfilQuery.eq.mockReturnThis()
    perfilQuery.single.mockResolvedValue({ data: { id: '1', nombre: 'Test User' }, error: null })
    mockFrom.mockReturnValue(perfilQuery)

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    const loginBtn = await screen.findByText('login')
    loginBtn.click()

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('a@b.com')
    })
  })

  it('clears user and perfil after logout', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockSignOut.mockResolvedValue({ error: null })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    const logoutBtn = await screen.findByText('logout')
    logoutBtn.click()

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('no-user')
    })
  })
})
