import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestWrapper } from '../../../test/TestWrapper'
import Header from '../Header'

const mockAuth = vi.hoisted(() => ({
  perfil: { nombre: 'Admin', email: 'admin@test.com', rol: 'admin', avatar_url: null },
}))

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

const SIN_FOTO = { nombre: 'Admin', email: 'admin@test.com', rol: 'admin', avatar_url: null }

function renderHeader(path = '/') {
  return render(
    <TestWrapper initialEntries={[path]}>
      <Header onToggleSidebar={vi.fn()} />
    </TestWrapper>
  )
}

beforeEach(() => {
  mockAuth.perfil = { ...SIN_FOTO }
})

describe('Header', () => {
  it('muestra la inicial cuando el perfil no tiene foto', () => {
    const { container } = renderHeader()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('muestra la foto cuando el perfil tiene avatar_url', () => {
    mockAuth.perfil = { ...SIN_FOTO, avatar_url: 'https://img.com/admin.jpg' }
    const { container } = renderHeader()
    const img = container.querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://img.com/admin.jpg')
    // la inicial no debe quedar montada a la vez que la foto
    expect(screen.queryByText('A')).not.toBeInTheDocument()
  })

  it('cae a la inicial si el nombre viene vacio', () => {
    mockAuth.perfil = { ...SIN_FOTO, nombre: '' }
    renderHeader()
    expect(screen.getByText('U')).toBeInTheDocument()
  })

  it('muestra el nombre del perfil', () => {
    mockAuth.perfil = { ...SIN_FOTO, nombre: 'Zoe' }
    renderHeader()
    expect(screen.getByText('Zoe')).toBeInTheDocument()
  })

  it('resuelve el titulo de la seccion a partir del primer segmento', () => {
    renderHeader('/ordenes/8')
    expect(screen.getByRole('heading', { name: 'Órdenes de Trabajo' })).toBeInTheDocument()
  })
})
