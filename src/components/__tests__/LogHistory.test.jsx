import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LogHistory from '../LogHistory'

describe('LogHistory', () => {
  it('renders nothing when there are no logs', () => {
    const { container } = render(<LogHistory logs={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when logs are undefined', () => {
    const { container } = render(<LogHistory />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders one entry per log with date and author', () => {
    const logs = [
      { id: 1, accion: 'estado_cambiado', campo: 'estado', valorAnterior: 'pendiente', valorNuevo: 'completada', usuarioNombre: 'Ana', createdAt: '2026-05-20' },
      { id: 2, accion: 'creada', usuarioNombre: 'Carlos', createdAt: '2026-05-19' },
    ]

    const { container } = render(<LogHistory logs={logs} />)

    expect(screen.getByRole('heading', { name: 'Historial de cambios' })).toBeInTheDocument()
    expect(screen.getByText('Estado cambiado')).toBeInTheDocument()
    expect(screen.getByText('Creada')).toBeInTheDocument()
    expect(screen.getByText('pendiente')).toBeInTheDocument()
    expect(screen.getByText('completada')).toBeInTheDocument()
    expect(screen.getByText('20/05/2026 — Ana')).toBeInTheDocument()
    expect(screen.getByText('19/05/2026 — Carlos')).toBeInTheDocument()

    // el campo y la flecha viven en nodos de texto separados
    expect(container).toHaveTextContent('Estado: pendiente → completada')
  })

  it('falls back to the raw accion and campo when unlabelled', () => {
    const { container } = render(
      <LogHistory logs={[{ id: 1, accion: 'accion_desconocida', campo: 'campo_x', usuarioNombre: 'Luis', createdAt: '2026-01-02' }]} />
    )

    expect(screen.getByText('accion_desconocida')).toBeInTheDocument()
    expect(container).toHaveTextContent('campo_x')
  })
})
