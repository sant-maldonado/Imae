import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestWrapper } from '../../test/TestWrapper'
import Dashboard from '../Dashboard'

// vi.mock se hoistea, asi que los datos tienen que salir de vi.hoisted
const datos = vi.hoisted(() => ({
  ordenes: [
    { id: 1, titulo: 'Cambio de aceite', estado: 'pendiente', prioridad: 'urgente', tecnicoNombre: 'Carlos López', fechaProgramada: '2026-05-12' },
    { id: 2, titulo: 'Reparación de fuga', estado: 'en_progreso', prioridad: 'media', tecnicoNombre: 'Juan Pérez' },
    { id: 3, titulo: 'Revisión de caldera', estado: 'pendiente', prioridad: 'baja', tecnicoNombre: 'Ana Martínez' },
    { id: 4, titulo: 'Inspección de grúa', estado: 'pendiente', prioridad: 'alta', tecnicoNombre: 'Diego Ramírez' },
  ],
  equipos: [
    { id: 1, nombre: 'Prensa', estado: 'averiado' },
    { id: 2, nombre: 'Fresadora', estado: 'operativo' },
    { id: 3, nombre: 'Caldera', estado: 'averiado' },
  ],
  compras: [
    { id: 1, estado: 'pendiente' },
    { id: 2, estado: 'recibido' },
  ],
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'admin@test.com' },
    perfil: { nombre: 'Admin User', email: 'admin@test.com', rol: 'admin', avatar_url: null },
    loading: false,
  }),
}))

vi.mock('../../hooks/useApi', () => ({
  useOrdenes: () => ({ data: datos.ordenes, isLoading: false }),
  useEquipos: () => ({ data: datos.equipos, isLoading: false }),
  useCompras: () => ({ data: datos.compras, isLoading: false }),
}))

describe('Dashboard page', () => {
  it('muestra los conteos calculados de cada seccion', () => {
    render(<Dashboard />, { wrapper: TestWrapper })
    expect(screen.getByTestId('stat-pendientes')).toHaveTextContent('3')
    expect(screen.getByTestId('stat-en-progreso')).toHaveTextContent('1')
    expect(screen.getByTestId('stat-averiados')).toHaveTextContent('2')
    expect(screen.getByTestId('stat-compras')).toHaveTextContent('1')
  })

  it('lista las ordenes pendientes ordenadas por prioridad', () => {
    render(<Dashboard />, { wrapper: TestWrapper })
    const filas = screen.getAllByTestId('orden-pendiente')
    expect(filas).toHaveLength(3)
    expect(filas[0]).toHaveTextContent('Cambio de aceite')
    expect(filas[0]).toHaveTextContent('Urgente')
    expect(filas[1]).toHaveTextContent('Inspección de grúa')
  })

  it('cada stat enlaza a su seccion', () => {
    render(<Dashboard />, { wrapper: TestWrapper })
    expect(screen.getByTestId('stat-pendientes')).toHaveAttribute('href', '/ordenes')
    expect(screen.getByTestId('stat-averiados')).toHaveAttribute('href', '/equipos')
    expect(screen.getByTestId('stat-compras')).toHaveAttribute('href', '/compras')
  })

  it('el CTA abre el formulario de nueva orden', () => {
    render(<Dashboard />, { wrapper: TestWrapper })
    expect(screen.getByTestId('cta-nueva-orden')).toHaveAttribute('href', '/ordenes/nueva')
  })

  it('muestra el resumen segun cuantos pendientes hay', () => {
    render(<Dashboard />, { wrapper: TestWrapper })
    expect(screen.getByText(/3 órdenes esperan atención/)).toBeInTheDocument()
  })

  it('la tarjeta de perfil lleva a /perfil', () => {
    render(<Dashboard />, { wrapper: TestWrapper })
    expect(screen.getByTestId('tarjeta-perfil')).toHaveAttribute('href', '/perfil')
  })

  it('shows user name, email and role', () => {
    render(<Dashboard />, { wrapper: TestWrapper })
    expect(screen.getByText('Admin User')).toBeInTheDocument()
    expect(screen.getByText('admin@test.com')).toBeInTheDocument()
    expect(screen.getByText('Administrador')).toBeInTheDocument()
  })

  it('shows user initial when no avatar', () => {
    render(<Dashboard />, { wrapper: TestWrapper })
    expect(screen.getByText('A')).toBeInTheDocument()
  })
})
