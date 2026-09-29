import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

  it('tiene titulo y nada mas, sin descripcion', () => {
    renderizar()
    expect(screen.getByText('Instala IMAE como app')).toBeInTheDocument()
    expect(screen.queryByText(/barra de navegador/)).not.toBeInTheDocument()
  })

  it('no promete que funcione sin conexion', () => {
    renderizar()
    expect(screen.queryByText(/conexi/)).not.toBeInTheDocument()
  })

  it('lista los pasos de la plataforma', () => {
    renderizar({ plataforma: 'android' })
    expect(screen.getByText('Abrí el menú del navegador')).toBeInTheDocument()
    expect(screen.getByText('Elegí Agregar a pantalla de inicio')).toBeInTheDocument()
  })

  it('en escritorio usa los pasos del menu de Chromium', () => {
    renderizar({ plataforma: 'desktop' })
    expect(screen.getByText('Tocá el menú ⋮, arriba a la derecha')).toBeInTheDocument()
    expect(screen.getByText('Elegí Instalar página como app')).toBeInTheDocument()
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

// La nota del login es la que ve el que abre el link desde WhatsApp sin sesion.
// Adentro de la WebView no hay instalar, asi que la nota tiene que empujar a
// Chrome en vez de listar un menu que no existe.
describe('InstallNote en un in-app browser', () => {
  const original = navigator.userAgent
  const UA_WEBVIEW =
    'Mozilla/5.0 (Linux; Android 14; SM-S911B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.0.0 Mobile Safari/537.36'

  beforeEach(() => {
    Object.defineProperty(navigator, 'userAgent', { value: UA_WEBVIEW, configurable: true })
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', { value: original, configurable: true })
  })

  it('cambia el titulo y apila los pasos en una linea', () => {
    renderizar({ plataforma: 'in-app' })
    expect(screen.getByText('Abrí IMAE en Chrome para instalarla')).toBeInTheDocument()
    // La lista numerada se reemplaza por una linea suelta: con el boton de Chrome
    // abajo, la nota no entraba en 360x640 y quedaba abajo del pliegue.
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByText(/Si no abre, tocá ⋮/)).toBeInTheDocument()
  })

  it('agrega el enlace a Chrome, que es la accion real de la nota', () => {
    renderizar({ plataforma: 'in-app' })
    const enlace = screen.getByRole('link', { name: 'Abrir en Chrome' })
    expect(enlace).toHaveAttribute('href', expect.stringContaining('package=com.android.chrome'))
  })
})
