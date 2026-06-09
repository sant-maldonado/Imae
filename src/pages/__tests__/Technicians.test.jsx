import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestWrapper } from '../../test/TestWrapper'
import Technicians from '../Technicians'

const mockTecnicos = [
  { id: 1, nombre: 'Carlos López', especialidad: 'Mecánica', telefono: '555-0101', email: 'carlos@test.com', activo: true, avatarUrl: 'https://img.com/avatar.jpg' },
  { id: 2, nombre: 'Ana Martínez', especialidad: 'Electricidad', telefono: '555-0102', email: 'ana@test.com', activo: false, avatarUrl: null },
]

vi.mock('../../hooks/useApi', () => ({
  useTecnicos: () => ({ data: mockTecnicos, isLoading: false }),
}))

describe('Technicians page', () => {
  it('shows image when avatarUrl is present', () => {
    render(<Technicians />, { wrapper: TestWrapper })
    const img = screen.getByAltText('')
    expect(img.tagName).toBe('IMG')
    expect(img).toHaveAttribute('src', 'https://img.com/avatar.jpg')
  })

  it('shows initials when no avatarUrl', () => {
    render(<Technicians />, { wrapper: TestWrapper })
    expect(screen.getByText('AM')).toBeInTheDocument()
  })

  it('shows Activo badge for active technicians', () => {
    render(<Technicians />, { wrapper: TestWrapper })
    expect(screen.getByText('Activo')).toBeInTheDocument()
  })

  it('shows Inactivo badge for inactive technicians', () => {
    render(<Technicians />, { wrapper: TestWrapper })
    expect(screen.getByText('Inactivo')).toBeInTheDocument()
  })
})
