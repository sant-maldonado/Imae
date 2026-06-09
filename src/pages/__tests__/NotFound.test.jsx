import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestWrapper } from '../../test/TestWrapper'
import NotFound from '../NotFound'

describe('NotFound page', () => {
  it('renders 404 heading', () => {
    render(<NotFound />, { wrapper: TestWrapper })
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('Página no encontrada')).toBeInTheDocument()
  })

  it('has link back to home', () => {
    render(<NotFound />, { wrapper: TestWrapper })
    expect(screen.getByText('Volver al inicio').closest('a')).toHaveAttribute('href', '/')
  })
})
