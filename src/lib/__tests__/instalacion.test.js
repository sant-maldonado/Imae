import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  CLAVE,
  DIAS_REAPARICION,
  PASOS,
  descartadaVigente,
  detectarPlataformaManual,
  esIOS,
  esSafariReal,
  marcarDescartada,
  soportaEvento,
  urlAbrirEnChrome,
  yaEstaInstalada,
} from '../instalacion'

// User agents reales, porque la deteccion es toda regex sobre el UA y los
// valores inventados se pasan por alto los casos que importan.
const UA = {
  iOS_SAFARI:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  iOS_CHROME:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.0.0 Mobile/15E148 Safari/604.1',
  iOS_EDGE:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/131.0.0.0 Version/17.0 Mobile/15E148 Safari/605.1.15',
  iOS_INSTAGRAM:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21E198 Instagram 300.0.0.0 (iPhone13,2)',
  // El iPad y el Mac comparten cadena: se diferencian por platform y maxTouchPoints.
  MAC_SAFARI:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  IPAD_SAFARI:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  MAC_CHROME:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  MAC_EDGE:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  ANDROID_CHROME:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  ANDROID_FIREFOX: 'Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0',
  ANDROID_SAMSUNG:
    'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36',
  ANDROID_INSTAGRAM:
    'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36 Instagram 300.0.0.0 Android',
  // WebView pura, sin nombre de app en el UA. Es la que no cubre la lista de
  // nombres y por eso se detecta por el token ;wv).
  ANDROID_WEBVIEW:
    'Mozilla/5.0 (Linux; Android 14; SM-S911B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.0.0 Mobile Safari/537.36',
  LINUX_CHROME:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  WINDOWS_CHROME:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  FIREFOX_DESKTOP: 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
}

function definir(valor, prop) {
  Object.defineProperty(navigator, prop, { value: valor, configurable: true })
}

const comoUserAgent = (ua) => {
  definir(ua, 'userAgent')
  definir(/Android/.test(ua) ? 'Linux armv8l' : 'MacIntel', 'platform')
  definir(0, 'maxTouchPoints')
}

const comoIPad = () => {
  definir(5, 'maxTouchPoints')
}

function mockMatchMedia(matches) {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })
}

beforeEach(() => {
  delete navigator.standalone
  delete navigator.maxTouchPoints
  definir('MacIntel', 'platform')
  definir(0, 'maxTouchPoints')
  comoUserAgent(UA.LINUX_CHROME)
  mockMatchMedia(false)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('instalacion - esIOS', () => {
  it('reconoce iPhone, iPad e iPod por el userAgent', () => {
    comoUserAgent(UA.iOS_SAFARI)
    expect(esIOS()).toBe(true)
  })

  it('reconoce el iPad, que se reporta como MacIntel y hay que separar por el táctil', () => {
    comoUserAgent(UA.IPAD_SAFARI)
    comoIPad()
    expect(esIOS()).toBe(true)
  })

  it('no confunde un Mac de verdad con un iPad', () => {
    comoUserAgent(UA.MAC_SAFARI)
    expect(esIOS()).toBe(false)
  })

  it('da falso en Android y en escritorio', () => {
    comoUserAgent(UA.ANDROID_CHROME)
    expect(esIOS()).toBe(false)
    comoUserAgent(UA.WINDOWS_CHROME)
    expect(esIOS()).toBe(false)
  })
})

describe('instalacion - esSafariReal', () => {
  it('acepta Safari de iOS y de macOS', () => {
    comoUserAgent(UA.iOS_SAFARI)
    expect(esSafariReal()).toBe(true)
    comoUserAgent(UA.MAC_SAFARI)
    expect(esSafariReal()).toBe(true)
  })

  it('rechaza los navegadores de iOS que se anuncian con Safari en el UA', () => {
    // Chrome, Edge y los in-app de iOS copian el token Safari del WebKit pero
    // no instalan PWA, que es justo el caso que rompia la guia.
    for (const ua of [UA.iOS_CHROME, UA.iOS_EDGE, UA.iOS_INSTAGRAM]) {
      comoUserAgent(ua)
      expect(esSafariReal()).toBe(false)
    }
  })

  it('rechaza Chrome y Edge de escritorio', () => {
    comoUserAgent(UA.MAC_CHROME)
    expect(esSafariReal()).toBe(false)
    comoUserAgent(UA.MAC_EDGE)
    expect(esSafariReal()).toBe(false)
  })

  it('rechaza Firefox de Android, que no trae el token Safari', () => {
    comoUserAgent(UA.ANDROID_FIREFOX)
    expect(esSafariReal()).toBe(false)
  })
})

describe('instalacion - soportaEvento', () => {
  it('da true en Chromium de escritorio y de Android', () => {
    for (const ua of [UA.LINUX_CHROME, UA.WINDOWS_CHROME, UA.MAC_CHROME, UA.MAC_EDGE, UA.ANDROID_CHROME, UA.ANDROID_SAMSUNG]) {
      comoUserAgent(ua)
      expect(soportaEvento()).toBe(true)
    }
  })

  it('da false en Safari, que no implementa beforeinstallprompt', () => {
    comoUserAgent(UA.MAC_SAFARI)
    expect(soportaEvento()).toBe(false)
  })

  it('da false en iOS aunque el UA diga Chrome o Edge', () => {
    // Los navegadores de iOS son WebKit bajo el capote: no disparan el evento
    // ni instalan de otra forma, asi que no hay nada que escuchar.
    for (const ua of [UA.iOS_SAFARI, UA.iOS_CHROME, UA.iOS_EDGE]) {
      comoUserAgent(ua)
      expect(soportaEvento()).toBe(false)
    }
  })

  it('da false en Firefox de escritorio, que no instala', () => {
    comoUserAgent(UA.FIREFOX_DESKTOP)
    expect(soportaEvento()).toBe(false)
  })
})

describe('instalacion - detectarPlataformaManual', () => {
  it('ofrece la guia de iOS solo en Safari', () => {
    comoUserAgent(UA.iOS_SAFARI)
    expect(detectarPlataformaManual()).toBe('ios')
    comoUserAgent(UA.iOS_CHROME)
    expect(detectarPlataformaManual()).toBeNull()
    comoUserAgent(UA.iOS_EDGE)
    expect(detectarPlataformaManual()).toBeNull()
  })

  it('trata el iPad como iOS', () => {
    comoUserAgent(UA.IPAD_SAFARI)
    comoIPad()
    expect(detectarPlataformaManual()).toBe('ios')
  })

  it('ofrece la guia de macOS solo en Safari', () => {
    comoUserAgent(UA.MAC_SAFARI)
    expect(detectarPlataformaManual()).toBe('mac')
    // Chrome de macOS no tiene "Agregar al Dock", que es un item de Safari, pero
    // si tiene su menu de instalacion.
    comoUserAgent(UA.MAC_CHROME)
    expect(detectarPlataformaManual()).toBe('desktop')
  })

  it('ofrece la guia de escritorio en cualquier Chromium', () => {
    for (const ua of [UA.LINUX_CHROME, UA.WINDOWS_CHROME, UA.MAC_EDGE]) {
      comoUserAgent(ua)
      expect(detectarPlataformaManual()).toBe('desktop')
    }
  })

  it('ofrece la guia en los navegadores de Android que agregan a pantalla de inicio', () => {
    for (const ua of [UA.ANDROID_CHROME, UA.ANDROID_FIREFOX, UA.ANDROID_SAMSUNG]) {
      comoUserAgent(ua)
      expect(detectarPlataformaManual()).toBe('android')
    }
  })

  it('manda a salir a Chrome dentro de un in-app browser de Android', () => {
    comoUserAgent(UA.ANDROID_INSTAGRAM)
    expect(detectarPlataformaManual()).toBe('in-app')
  })

  it('reconoce la WebView por el token ;wv), aunque el UA no diga de que app es', () => {
    comoUserAgent(UA.ANDROID_WEBVIEW)
    expect(detectarPlataformaManual()).toBe('in-app')
  })

  it('no ofrece nada en Firefox de escritorio, que no puede instalar PWA', () => {
    comoUserAgent(UA.FIREFOX_DESKTOP)
    expect(detectarPlataformaManual()).toBeNull()
  })

  it('tambien manda a salir a Chrome en un in-app browser de escritorio', () => {
    // El UA se miente y dice Chrome, asi que sin el filtro de in-app se le
    // prometeria el menu de instalacion de Chrome, que la WebView no tiene.
    comoUserAgent(UA.LINUX_CHROME.replace('Chrome', 'Chrome FBAN'))
    expect(detectarPlataformaManual()).toBe('in-app')
  })
})

describe('instalacion - urlAbrirEnChrome', () => {
  it('arma un intent:// que apunta al paquete de Chrome en Android', () => {
    comoUserAgent(UA.ANDROID_WEBVIEW)
    const url = urlAbrirEnChrome()
    expect(url).toMatch(/^intent:\/\//)
    expect(url).toContain('package=com.android.chrome')
    expect(url).toContain('#Intent;scheme=http;')
    expect(url).toContain('S.browser_fallback_url=')
    expect(url.endsWith(';end')).toBe(true)
  })

  it('da null fuera de Android, donde intent:// no existe', () => {
    comoUserAgent(UA.LINUX_CHROME)
    expect(urlAbrirEnChrome()).toBeNull()
    comoUserAgent(UA.iOS_SAFARI)
    expect(urlAbrirEnChrome()).toBeNull()
  })
})

describe('instalacion - yaEstaInstalada', () => {
  it('detecta standalone por display-mode', () => {
    mockMatchMedia(true)
    expect(yaEstaInstalada()).toBe(true)
  })

  it('detecta standalone por navigator.standalone, que es de WebKit', () => {
    definir(true, 'standalone')
    expect(yaEstaInstalada()).toBe(true)
  })

  it('da falso en una pestana normal', () => {
    expect(yaEstaInstalada()).toBe(false)
  })

  it('no rompe si no hay matchMedia', () => {
    definir(undefined, 'matchMedia')
    expect(yaEstaInstalada()).toBe(false)
  })
})

describe('instalacion - copy', () => {
  it('usa la misma clave que el hook para la preferencia', () => {
    expect(CLAVE).toBe('installDismissed')
  })

  it('tiene pasos numerados para todas las guias', () => {
    for (const plataforma of ['ios', 'android', 'in-app', 'mac', 'desktop']) {
      expect(PASOS[plataforma]).toHaveLength(2)
      expect(PASOS[plataforma].map((p) => p.n)).toEqual([1, 2])
    }
  })

  it('usa nombres de icono, no componentes, para no acoplar la lib a react-icons', () => {
    const permitidos = ['compartir', 'tres-puntos', 'movil', 'menu', 'monitor', 'externo']
    for (const pasos of Object.values(PASOS)) {
      for (const paso of pasos) {
        expect(permitidos).toContain(paso.icono)
        expect(typeof paso.texto).toBe('string')
      }
    }
  })
})

describe('instalacion - el descarte se vence', () => {
  // En el celu no hay DevTools para limpiar la clave, asi que si el descarte no
  // tiene vencimiento el cartel no vuelve nunca. Un toque perdido en la X era
  // suficiente para perderlo para siempre.
  const DIA = 86_400_000

  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('guarda la hora del descarte, no un flag', () => {
    marcarDescartada()
    expect(Number(localStorage.getItem(CLAVE))).toBe(Date.now())
  })

  it('inmediatamente despues sigue vigente', () => {
    marcarDescartada()
    expect(descartadaVigente()).toBe(true)
  })

  it('aguanta hasta el ultimo momento del plazo', () => {
    marcarDescartada()
    vi.setSystemTime(new Date(Date.now() + DIAS_REAPARICION * DIA - 1000))
    expect(descartadaVigente()).toBe(true)
  })

  it('al cumplirse el plazo deja de suprimir, y el cartel vuelve solo', () => {
    marcarDescartada()
    vi.setSystemTime(new Date(Date.now() + DIAS_REAPARICION * DIA + 1000))
    expect(descartadaVigente()).toBe(false)
  })

  it('el "1" de las versiones viejas esta vencido, sin migracion', () => {
    localStorage.setItem(CLAVE, '1')
    expect(descartadaVigente()).toBe(false)
  })

  it('una basura tampoco suprime: no se puede dejar trabado el cartel', () => {
    for (const basura of ['', 'si', 'null', 'NaN', '0', '-1']) {
      localStorage.setItem(CLAVE, basura)
      expect(descartadaVigente()).toBe(false)
    }
  })

  it('sin nada guardado no hay descarte', () => {
    expect(descartadaVigente()).toBe(false)
  })

  it('un reloj que atrasa no resurrecta el descarte para siempre', () => {
    marcarDescartada()
    vi.setSystemTime(new Date(Date.now() - DIA))
    // Sigue vigente, que es lo tolerable: es peor dejar de suppressar que alargar.
    expect(descartadaVigente()).toBe(true)
  })
})
