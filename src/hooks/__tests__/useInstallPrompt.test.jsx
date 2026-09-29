import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import useInstallPrompt from '../useInstallPrompt'

const UA_CHROME =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const UA_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const UA_IPAD =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
const UA_MAC_SAFARI = UA_IPAD
const UA_ANDROID =
  'Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0'
const UA_ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
const UA_FIREFOX_DESKTOP =
  'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0'
const UA_IOS_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.0.0 Mobile/15E148 Safari/604.1'
const UA_MAC_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

function definir(valor, prop) {
  Object.defineProperty(navigator, prop, { value: valor, configurable: true })
}

const definirUserAgent = (v) => definir(v, 'userAgent')
const definirPlatform = (v) => definir(v, 'platform')
const definirMaxTouchPoints = (v) => definir(v, 'maxTouchPoints')
const definirStandalone = (v) => definir(v, 'standalone')

// El descarte se guarda como timestamp, asi que "es 1" ya no alcanza para
// distinguishinglo: un epoch ms real arranca en 2021 y no tiene nada que ver.
const EPOCH_MINIMO = 1_600_000_000_000
const guardado = () => Number(localStorage.getItem('installDismissed'))

// El objeto del evento no existe en jsdom, se arma a mano. cancelable para que
// preventDefault no entre en conflicto.
function dispararBeforeInstallPrompt({ outcome = 'accepted' } = {}) {
  const evento = new Event('beforeinstallprompt', { cancelable: true })
  evento.prompt = vi.fn().mockResolvedValue(undefined)
  evento.userChoice = Promise.resolve({ outcome })
  act(() => {
    window.dispatchEvent(evento)
  })
  return evento
}

beforeEach(() => {
  localStorage.clear()
  delete navigator.standalone
  delete navigator.maxTouchPoints
  definirUserAgent(UA_CHROME)
  definirPlatform('Linux x86_64')
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: false,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useInstallPrompt - deteccion de plataforma', () => {
  it('reconoce iPhone', () => {
    definirUserAgent(UA_IPHONE)
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.plataforma).toBe('ios')
  })

  it('reconoce al iPad, que se reporta como MacIntel', () => {
    definirUserAgent(UA_IPAD)
    definirPlatform('MacIntel')
    definirMaxTouchPoints(5)
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.plataforma).toBe('ios')
  })

  it('no confunde un Mac de verdad con un iPad', () => {
    definirUserAgent(UA_MAC_SAFARI)
    definirPlatform('MacIntel')
    definirMaxTouchPoints(0)
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.plataforma).toBe('mac')
  })

  it('reconoce Android', () => {
    definirUserAgent(UA_ANDROID)
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.plataforma).toBe('android')
  })

  it('deja en null a Firefox de escritorio, que no instala', () => {
    definirUserAgent(UA_FIREFOX_DESKTOP)
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.plataforma).toBeNull()
  })

  it('no ofrece la guia de iOS en Chrome de iOS, que no puede instalar', () => {
    definirUserAgent(UA_IOS_CHROME)
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.plataforma).toBeNull()
    expect(result.current.instalable).toBe(false)
  })

  it('ofrece la guia de escritorio en Chrome, que tiene item de menu propio', () => {
    definirUserAgent(UA_MAC_CHROME)
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.plataforma).toBe('desktop')
    expect(result.current.instalable).toBe(true)
  })
})

describe('useInstallPrompt - no ofrece nada donde no se puede', () => {
  it('no escucha el evento en iOS, donde es WebKit bajo el capote', () => {
    definirUserAgent(UA_IOS_CHROME)
    const quitar = vi.spyOn(window, 'removeEventListener')
    const { result, unmount } = renderHook(() => useInstallPrompt())
    const evento = new Event('beforeinstallprompt', { cancelable: true })
    evento.prompt = vi.fn().mockResolvedValue(undefined)
    evento.userChoice = Promise.resolve({ outcome: 'accepted' })
    act(() => {
      window.dispatchEvent(evento)
    })

    expect(result.current.evento).toBeNull()
    expect(result.current.instalable).toBe(false)
    unmount()
    expect(quitar).not.toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
  })

  it('en iOS Safari ofrece la guia pero no el boton', () => {
    definirUserAgent(UA_IPHONE)
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.plataforma).toBe('ios')
    expect(result.current.instalable).toBe(true)
  })

  it('no registra ningun listener si no hay ni evento ni guia', () => {
    definirUserAgent(UA_FIREFOX_DESKTOP)
    const quitar = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useInstallPrompt())
    unmount()
    expect(quitar).not.toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
  })
})

describe('useInstallPrompt - Android tiene las dos vias', () => {
  it('abre la guia al cumplirse el retardo aunque el evento no llegue', () => {
    vi.useFakeTimers()
    definirUserAgent(UA_ANDROID_CHROME)
    const { result } = renderHook(() => useInstallPrompt())

    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.abierto).toBe(true)
    // Es la guia manual, no el boton de verdad.
    expect(result.current.evento).toBeNull()
  })

  it('el sheet que ya estaba abierto sube a boton Instalar si llega el evento', () => {
    vi.useFakeTimers()
    definirUserAgent(UA_ANDROID_CHROME)
    const { result } = renderHook(() => useInstallPrompt())

    act(() => vi.advanceTimersByTime(1000))
    const evento = dispararBeforeInstallPrompt()

    expect(result.current.evento).toBe(evento)
    expect(result.current.abierto).toBe(true)
  })
})

describe('useInstallPrompt - visibilidad', () => {
  it('no hace nada si la app ya esta instalada en standalone', () => {
    definirUserAgent(UA_IPHONE)
    window.matchMedia.mockReturnValue({ matches: true })
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.instalado).toBe(true)
    expect(result.current.instalable).toBe(false)
    expect(result.current.abierto).toBe(false)
  })

  it('detecta la instalacion con navigator.standalone de WebKit', () => {
    definirUserAgent(UA_IPHONE)
    definirStandalone(true)
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.instalado).toBe(true)
  })

  it('no vuelve a preguntar si lo descartaron hace poco', () => {
    localStorage.setItem('installDismissed', String(Date.now()))
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.descartada).toBe(true)
    expect(result.current.abierto).toBe(false)
  })

  it('el "1" de las versiones viejas ya no suprime, y el cartel vuelve', () => {
    localStorage.setItem('installDismissed', '1')
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.descartada).toBe(false)
  })

  it('en las plataformas manuales espera antes de abrir el sheet', () => {
    vi.useFakeTimers()
    definirUserAgent(UA_IPHONE)
    const { result } = renderHook(() => useInstallPrompt())

    expect(result.current.abierto).toBe(false)
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.abierto).toBe(true)
  })

  it('en Firefox de escritorio no abre nada, porque no puede instalar', () => {
    vi.useFakeTimers()
    definirUserAgent(UA_FIREFOX_DESKTOP)
    const { result } = renderHook(() => useInstallPrompt())

    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.abierto).toBe(false)
    expect(result.current.instalable).toBe(false)
  })

  it('el evento de Chromium abre el sheet y guarda el evento', () => {
    const { result } = renderHook(() => useInstallPrompt())
    const evento = dispararBeforeInstallPrompt()

    expect(result.current.abierto).toBe(true)
    expect(result.current.evento).toBe(evento)
    expect(result.current.instalable).toBe(true)
  })

  it('evita el mini-infobar del navegador', () => {
    const { result } = renderHook(() => useInstallPrompt())
    const evento = new Event('beforeinstallprompt', { cancelable: true })
    evento.prompt = vi.fn().mockResolvedValue(undefined)
    evento.userChoice = Promise.resolve({ outcome: 'accepted' })
    act(() => {
      window.dispatchEvent(evento)
    })
    expect(evento.defaultPrevented).toBe(true)
    expect(result.current.abierto).toBe(true)
  })
})

describe('useInstallPrompt - instalar y descartar', () => {
  it('llama a prompt() una sola vez y guarda la preferencia', async () => {
    const { result } = renderHook(() => useInstallPrompt())
    const evento = dispararBeforeInstallPrompt()

    await act(async () => {
      result.current.instalar()
    })

    expect(evento.prompt).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(guardado()).toBeGreaterThan(EPOCH_MINIMO))
    expect(result.current.abierto).toBe(false)
  })

  it('guarda la preferencia aunque lo rechacen', async () => {
    const { result } = renderHook(() => useInstallPrompt())
    dispararBeforeInstallPrompt({ outcome: 'dismissed' })

    await act(async () => {
      result.current.instalar()
    })

    await waitFor(() => expect(guardado()).toBeGreaterThan(EPOCH_MINIMO))
  })

  it('gasta el evento, pero la guia de escritorio queda como plan B', async () => {
    definirUserAgent(UA_MAC_CHROME)
    const { result } = renderHook(() => useInstallPrompt())
    dispararBeforeInstallPrompt()

    await act(async () => {
      result.current.instalar()
    })

    expect(result.current.evento).toBeNull()
    // Antes el item del sidebar desaparecia al gastarse el evento, porque en
    // escritorio no habia ninguna otra via. Ahora queda la guia del menu.
    expect(result.current.instalable).toBe(true)
  })

  it('descartar guarda la preferencia y oculta el sheet', () => {
    definirUserAgent(UA_IPHONE)
    const { result } = renderHook(() => useInstallPrompt())

    act(() => result.current.abrir())
    expect(result.current.abierto).toBe(true)

    act(() => result.current.descartar())
    expect(result.current.abierto).toBe(false)
    expect(guardado()).toBeGreaterThan(EPOCH_MINIMO)
  })

  it('cerrarTemporal no guarda la preferencia, asi que puede volver a salir', () => {
    definirUserAgent(UA_IPHONE)
    const { result } = renderHook(() => useInstallPrompt())

    act(() => result.current.abrir())
    act(() => result.current.cerrarTemporal())

    expect(result.current.abierto).toBe(false)
    expect(localStorage.getItem('installDismissed')).toBeNull()
    expect(result.current.descartada).toBe(false)
    expect(result.current.instalable).toBe(true)
  })

  it('el descarte se vence solo, asi que el cartel vuelve sin DevTools', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-01T12:00:00Z'))
    definirUserAgent(UA_IPHONE)

    const primera = renderHook(() => useInstallPrompt())
    act(() => primera.result.current.descartar())
    expect(primera.result.current.descartada).toBe(true)
    primera.unmount()

    // A mitad de plazo todavia no vuelve.
    vi.setSystemTime(new Date('2026-03-04T12:00:00Z'))
    const dentro = renderHook(() => useInstallPrompt())
    expect(dentro.result.current.descartada).toBe(true)
    dentro.unmount()

    // Vencido: se abre solo, que es el punto de que el plazo exista.
    vi.setSystemTime(new Date('2026-03-09T12:00:00Z'))
    const vencida = renderHook(() => useInstallPrompt())
    expect(vencida.result.current.descartada).toBe(false)
    act(() => vi.advanceTimersByTime(1000))
    expect(vencida.result.current.abierto).toBe(true)
  })

  it('un toque perdido no deja al usuario sin recuperacion', () => {
    definirUserAgent(UA_IPHONE)
    const { result, rerender } = renderHook(() => useInstallPrompt())

    act(() => result.current.abrir())
    act(() => result.current.cerrarTemporal())
    // Remontar es lo que pasa al recargar o al navegar de vuelta.
    rerender()

    act(() => result.current.abrir())
    expect(result.current.abierto).toBe(true)
  })

  it('abrir a mano funciona aunque ya la hayan descartado', () => {
    definirUserAgent(UA_IPHONE)
    const { result } = renderHook(() => useInstallPrompt())

    act(() => result.current.descartar())
    act(() => result.current.abrir())

    // El item del sidebar es la segunda chance, no se deshabilita solo.
    expect(result.current.abierto).toBe(true)
    expect(result.current.instalable).toBe(true)
  })

  it('appinstalled cierra y guarda la preferencia', () => {
    const { result } = renderHook(() => useInstallPrompt())
    dispararBeforeInstallPrompt()

    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })

    expect(guardado()).toBeGreaterThan(EPOCH_MINIMO)
    expect(result.current.abierto).toBe(false)
  })

  it('instalar sin evento no rompe', () => {
    const { result } = renderHook(() => useInstallPrompt())
    expect(() => act(() => result.current.instalar())).not.toThrow()
    expect(localStorage.getItem('installDismissed')).toBeNull()
  })

  it('deja de escuchar cuando se desmonta', () => {
    const quitar = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useInstallPrompt())
    unmount()

    expect(quitar).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    expect(quitar).toHaveBeenCalledWith('appinstalled', expect.any(Function))
  })
})
