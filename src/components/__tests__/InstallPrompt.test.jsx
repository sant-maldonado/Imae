import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InstallPrompt from '../InstallPrompt'

const propsBase = {
  abierto: true,
  plataforma: null,
  evento: null,
  instalar: vi.fn(),
  cerrarTemporal: vi.fn(),
  descartar: vi.fn(),
}

const renderizar = (over = {}) => render(<InstallPrompt {...propsBase} {...over} />)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('InstallPrompt', () => {
  it('no renderiza nada si esta cerrado', () => {
    const { container } = renderizar({ abierto: false })
    expect(container).toBeEmptyDOMElement()
  })

  it('es un dialogo modal con titulo asociado', () => {
    renderizar()
    const dialogo = screen.getByRole('dialog')
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(dialogo).toHaveAttribute('aria-labelledby', 'titulo-instalar')
    expect(screen.getByText('Instala IMAE como app')).toBeInTheDocument()
  })

  it('no tiene descripcion, solo el titulo y los pasos', () => {
    renderizar({ plataforma: 'ios' })
    expect(screen.getByText('Instala IMAE como app')).toBeInTheDocument()
    // El titulo viejo, con su bajada, tiene que estar gone del todo.
    expect(screen.queryByText('Agregar IMAE a tu pantalla')).not.toBeInTheDocument()
    expect(screen.queryByText(/barra de navegador/)).not.toBeInTheDocument()
  })

  it('mueve el foco al panel al abrir', () => {
    renderizar()
    expect(screen.getByRole('dialog')).toHaveFocus()
  })

  it('no promete que funcione sin conexion', () => {
    renderizar({ plataforma: 'ios' })
    expect(screen.queryByText(/sin conexi/)).not.toBeInTheDocument()
    expect(screen.queryByText(/conexión/i)).not.toBeInTheDocument()
  })

  describe('pasos por plataforma', () => {
    it('en iOS guia por Compartir y Agregar a pantalla de inicio', () => {
      renderizar({ plataforma: 'ios' })
      expect(screen.getByText('Tocá Compartir')).toBeInTheDocument()
      expect(screen.getByText('Elegí Agregar a pantalla de inicio')).toBeInTheDocument()
    })

    it('en Android guia por el menu del navegador', () => {
      renderizar({ plataforma: 'android' })
      expect(screen.getByText('Abrí el menú del navegador')).toBeInTheDocument()
      expect(screen.getByText('Elegí Agregar a pantalla de inicio')).toBeInTheDocument()
    })

    it('en macOS guia por el menu Archivo y el Dock', () => {
      renderizar({ plataforma: 'mac' })
      expect(screen.getByText('Menú Archivo, arriba a la izquierda')).toBeInTheDocument()
      expect(screen.getByText('Agregar al Dock')).toBeInTheDocument()
    })

    it('en escritorio guia por el menu del navegador de Chromium', () => {
      renderizar({ plataforma: 'desktop' })
      expect(screen.getByText('Tocá el menú ⋮, arriba a la derecha')).toBeInTheDocument()
      expect(screen.getByText('Elegí Instalar página como app')).toBeInTheDocument()
    })

    it('sin plataforma no inventa pasos, porque no hay guia que dar', () => {
      renderizar({ plataforma: null })
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
    })
  })

  it('con evento de Chromium ofrece el boton Instalar y ningun paso', () => {
    renderizar({ evento: { prompt: vi.fn() } })
    expect(screen.getByRole('button', { name: 'Instalar' })).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('sin evento ofrece Entendido', () => {
    renderizar()
    expect(screen.getByRole('button', { name: 'Entendido' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Instalar' })).not.toBeInTheDocument()
  })

  it('Instalar delega en instalar', async () => {
    const instalar = vi.fn()
    renderizar({ evento: { prompt: vi.fn() }, instalar })
    await userEvent.click(screen.getByRole('button', { name: 'Instalar' }))
    expect(instalar).toHaveBeenCalledTimes(1)
  })

  // Solo el descarte explicito escribe la preferencia. Si el fondo o la X
  // escribieran el flag, un toque perdido dejaria al usuario sin prompt y sin
  // recuperacion automatica.
  it('Entendido delega en descartar', async () => {
    const descartar = vi.fn()
    renderizar({ descartar })
    await userEvent.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(descartar).toHaveBeenCalledTimes(1)
  })

  it('la X del titulo delega en descartar y lo dice en el nombre accesible', async () => {
    const descartar = vi.fn()
    renderizar({ descartar })
    const boton = screen.getByRole('button', { name: 'No mostrar de nuevo' })
    await userEvent.click(boton)
    expect(descartar).toHaveBeenCalledTimes(1)
  })

  it('un click en el fondo es un cierre temporal y uno dentro del panel no', async () => {
    const cerrarTemporal = vi.fn()
    const descartar = vi.fn()
    renderizar({ cerrarTemporal, descartar })

    await userEvent.click(screen.getByText('Instala IMAE como app'))
    expect(cerrarTemporal).not.toHaveBeenCalled()
    expect(descartar).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('dialog').parentElement)
    expect(cerrarTemporal).toHaveBeenCalledTimes(1)
    // Un toque en el fondo no puede descartar de verdad.
    expect(descartar).not.toHaveBeenCalled()
  })

  it('Escape es un cierre temporal', () => {
    const cerrarTemporal = vi.fn()
    const descartar = vi.fn()
    renderizar({ cerrarTemporal, descartar })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(cerrarTemporal).toHaveBeenCalledTimes(1)
    expect(descartar).not.toHaveBeenCalled()
  })

  it('otra tecla no cierra', () => {
    const cerrarTemporal = vi.fn()
    renderizar({ cerrarTemporal })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    expect(cerrarTemporal).not.toHaveBeenCalled()
  })
})
