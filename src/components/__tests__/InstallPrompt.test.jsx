import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InstallPrompt from '../InstallPrompt'

const propsBase = {
  abierto: true,
  plataforma: 'otro',
  evento: null,
  instalar: vi.fn(),
  cerrar: vi.fn(),
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
    expect(screen.getByText('Agregar IMAE a tu pantalla')).toBeInTheDocument()
  })

  it('mueve el foco al panel al abrir', () => {
    renderizar()
    expect(screen.getByRole('dialog')).toHaveFocus()
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

    it('sin plataforma conocida no inventa pasos', () => {
      renderizar({ plataforma: 'otro' })
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

  it('Entendido delega en cerrar', async () => {
    const cerrar = vi.fn()
    renderizar({ cerrar })
    await userEvent.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('la X del titulo delega en cerrar', async () => {
    const cerrar = vi.fn()
    renderizar({ cerrar })
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('un click en el fondo cierra y uno dentro del panel no', async () => {
    const cerrar = vi.fn()
    renderizar({ cerrar })

    await userEvent.click(screen.getByText('Agregar IMAE a tu pantalla'))
    expect(cerrar).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('dialog').parentElement)
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('Escape cierra', () => {
    const cerrar = vi.fn()
    renderizar({ cerrar })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('otra tecla no cierra', () => {
    const cerrar = vi.fn()
    renderizar({ cerrar })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    expect(cerrar).not.toHaveBeenCalled()
  })
})
