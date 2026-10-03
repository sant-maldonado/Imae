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

    render(<LogHistory logs={logs} />)

    expect(screen.getByRole('heading', { name: 'Historial de cambios' })).toBeInTheDocument()
    expect(screen.getByText('Estado cambiado')).toBeInTheDocument()
    expect(screen.getByText('Creada')).toBeInTheDocument()
    expect(screen.getByText('20/05/2026 — Ana')).toBeInTheDocument()
    expect(screen.getByText('19/05/2026 — Carlos')).toBeInTheDocument()
  })

  it('traduce los enums que quedaron crudos en la base', () => {
    // Los logs que ya existian guardan 'pendiente' y 'completada', no el label.
    // Si no se traducieran, el papel y la pantalla dirian una cosa y otra.
    const logs = [
      { id: 1, accion: 'estado_cambiado', campo: 'estado', valorAnterior: 'pendiente', valorNuevo: 'completada', usuarioNombre: 'Ana', createdAt: '2026-05-20' },
    ]
    const { container } = render(<LogHistory logs={logs} />)

    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText('Completada')).toBeInTheDocument()
    expect(container).toHaveTextContent('Estado: Pendiente → Completada')
  })

  it('muestra la hora cuando el log trae timestamp', () => {
    // created_at es TIMESTAMPTZ. Sin la hora, dos hechos del mismo dia son
    // indistinguibles y el historial no sirve para reconstruir un hecho.
    const logs = [{ id: 1, accion: 'creada', usuarioNombre: 'Ana', createdAt: '2026-05-20T14:32:00+00:00' }]
    const { container } = render(<LogHistory logs={logs} />)

    expect(container.textContent).toMatch(/\d{1,2}:\d{2}/)
  })

  it('deja pasar el nombre guardado en equipo y tecnico', () => {
    // El log guarda el texto, no el id. Si despues se renombra o se da de baja
    // la persona, el registro tiene que seguir diciendo como se llamaba cuando
    // ocurrio el hecho.
    const logs = [
      { id: 1, accion: 'actualizada', campo: 'tecnico', valorAnterior: 'Sin asignar', valorNuevo: 'Marta López', usuarioNombre: 'Ana', createdAt: '2026-05-20' },
    ]
    render(<LogHistory logs={logs} />)

    expect(screen.getByText('Marta López')).toBeInTheDocument()
    expect(screen.getByText('Sin asignar')).toBeInTheDocument()
  })

  it('falls back to the raw accion and campo when unlabelled', () => {
    const { container } = render(
      <LogHistory logs={[{ id: 1, accion: 'accion_desconocida', campo: 'campo_x', usuarioNombre: 'Luis', createdAt: '2026-01-02' }]} />
    )

    expect(screen.getByText('accion_desconocida')).toBeInTheDocument()
    expect(container).toHaveTextContent('campo_x')
  })
})