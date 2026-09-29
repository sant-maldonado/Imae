import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InstallNote from '../InstallNote'

const propsBase = {
  plataforma: 'ios',
  evento: null,
  instalar: vi.fn(),
  descartar: vi.fn(),
}

const renderizar = (over = {}) => render(<InstallNote {...propsBase} {...over} />)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('InstallNote', () => {
  it('es una region, no un dialogo, y tiene nombre accesible', () => {
    renderizar()
    const nota = screen.getByRole('region', { name: 'Instalar IMAE' })
    expect(nota).not.toHaveAttribute('aria-modal')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('describe el beneficio sin prometer uso sin conexion', () => {
    renderizar()
    expect(screen.getByText('Instalá IMAE como app')).toBeInTheDocument()
    expect(screen.getByText(/sin barra de navegador/)).toBeInTheDocument()
    expect(screen.queryByText(/conexi/)).not.toBeInTheDocument()
  })

  it('lista los pasos de la plataforma', () => {
    renderizar({ plataforma: 'android' })
    expect(screen.getByText('Abrí el menú del navegador')).toBeInTheDocument()
    expect(screen.getByText('Elegí Agregar a pantalla de inicio')).toBeInTheDocument()
  })

  it('sin plataforma no inventa pasos', () => {
    renderizar({ plataforma: null })
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('con evento de Chromium cambia los pasos por el boton Instalar', () => {
    renderizar({ evento: { prompt: vi.fn() }, plataforma: null })
    expect(screen.getByRole('button', { name: 'Instalar' })).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('Instalar delega en instalar', async () => {
    const instalar = vi.fn()
    renderizar({ evento: { prompt: vi.fn() }, instalar })
    await userEvent.click(screen.getByRole('button', { name: 'Instalar' }))
    expect(instalar).toHaveBeenCalledTimes(1)
  })

  it('el cierre descarta de verdad y lo dice en el nombre accesible', async () => {
    const descartar = vi.fn()
    renderizar({ descartar })
    await userEvent.click(screen.getByRole('button', { name: 'No mostrar de nuevo' }))
    expect(descartar).toHaveBeenCalledTimes(1)
  })
})
