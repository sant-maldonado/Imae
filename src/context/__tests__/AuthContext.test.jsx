import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'

const {
  mockGetSession, mockGetUser, mockSignIn, mockSignUp, mockSignOut,
  mockFrom, mockOnAuthStateChange, authState,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetUser: vi.fn(),
  mockSignIn: vi.fn(),
  mockSignUp: vi.fn(),
  mockSignOut: vi.fn(),
  mockFrom: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  authState: { handler: null },
}))

vi.mock('../../lib/supabase', () => ({
  supabaseUrl: 'https://test.supabase.co',
  supabase: {
    auth: {
      getSession: mockGetSession,
      getUser: mockGetUser,
      signInWithPassword: mockSignIn,
      signUp: mockSignUp,
      signOut: mockSignOut,
      updateUser: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      onAuthStateChange: mockOnAuthStateChange,
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

function perfilQueryResuelve(nombre) {
  const q = { select: vi.fn(), eq: vi.fn(), single: vi.fn() }
  q.select.mockReturnThis()
  q.eq.mockReturnThis()
  q.single.mockResolvedValue({ data: { id: '1', nombre }, error: null })
  return q
}

beforeEach(() => {
  vi.clearAllMocks()
  authState.handler = null
  mockGetSession.mockResolvedValue({ data: { session: null } })
  mockGetUser.mockResolvedValue({ data: { user: null } })
  mockOnAuthStateChange.mockImplementation((cb) => {
    authState.handler = cb
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })
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

  // Regresion: si la sesion muere en el servidor (p. ej. por un cambio de
  // password que revoca los refresh tokens), el contexto tiene que limpiar el
  // usuario para que ProtectedRoute.devuelva al login. Antes no habia
  // suscripcion a onAuthStateChange y la app quedaba mostrando listas vacias.
  it('clears the user when the session dies with SIGNED_OUT', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: '1', email: 'a@b.com' } } },
    })
    mockGetUser.mockResolvedValue({ data: { user: { id: '1', email: 'a@b.com' } } })
    mockFrom.mockReturnValue(perfilQueryResuelve('Test User'))

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('a@b.com')
    })

    await act(async () => {
      authState.handler('SIGNED_OUT', null)
      await new Promise((r) => setTimeout(r, 0))
    })

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('no-user')
    })
  })

  // El getUser() es lo que valida el token contra el servidor. Si devuelve
  // null, la sesion guardada en localStorage esta muerta y no hay que dejar
  // que la app siga creyendo que el usuario esta logueado.
  it('drops a stored session that getUser no longer validates', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: '1', email: 'a@b.com' } } },
    })
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded')
    })
    expect(screen.getByTestId('user').textContent).toBe('no-user')
  })
})
