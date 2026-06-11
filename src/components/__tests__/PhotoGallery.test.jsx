import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestWrapper } from '../../test/TestWrapper'
import PhotoGallery from '../PhotoGallery'

const mockFotos = [
  { id: 1, url: 'https://picsum.photos/200', nombre: 'foto1.jpg', descripcion: 'Vista general', createdAt: '2026-06-10', createdBy: 'u1' },
  { id: 2, url: 'https://picsum.photos/201', nombre: 'foto2.jpg', descripcion: null, createdAt: '2026-06-09', createdBy: 'u2' },
]

let mockFotosData = null

vi.mock('../../hooks/useApi', () => ({
  useFotos: () => ({ data: mockFotosData, isLoading: false }),
  useDeleteFoto: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ perfil: { id: 'u1', rol: 'admin' } }),
}))

describe('PhotoGallery', () => {
  it('renders section title', () => {
    mockFotosData = []
    render(<PhotoGallery ordenId="1" />, { wrapper: TestWrapper })
    expect(screen.getByText('Fotos de avance')).toBeInTheDocument()
  })

  it('shows empty state', () => {
    mockFotosData = []
    render(<PhotoGallery ordenId="1" />, { wrapper: TestWrapper })
    expect(screen.getByText('No hay fotos todavía')).toBeInTheDocument()
  })

  it('renders photo cards', () => {
    mockFotosData = mockFotos
    render(<PhotoGallery ordenId="1" />, { wrapper: TestWrapper })
    expect(screen.getByText('Vista general')).toBeInTheDocument()
  })

  it('opens lightbox on click', () => {
    mockFotosData = mockFotos
    render(<PhotoGallery ordenId="1" />, { wrapper: TestWrapper })
    const img = screen.getByAltText('foto1.jpg')
    img.click()
    expect(screen.getByText('Vista general')).toBeInTheDocument()
  })
})
