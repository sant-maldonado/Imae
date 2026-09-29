import { useCallback, useEffect, useState } from 'react'

const CLAVE = 'installDismissed'

// El manual de web.dev pide esperar a una senal de interes antes de empujar la
// instalacion. En iOS no hay evento que sirva de senal, asi que se retrasa un
// poco para no competir con la carga de la primera pantalla.
const RETARDO_MS = 1000

// iPadOS se reporta como MacIntel, asi que con el userAgent no alcanza y hay
// que separarlo por maxTouchPoints.
function esIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

// La unica senal de que ya esta instalada. En iOS no hay ninguna otra:
// navigator.standalone es de WebKit y display-mode la sirve el manifest.
function yaEstaInstalada() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    window.navigator.standalone === true
  )
}

// Que navegador es y si puede instalar. 'otro' agrupa los que no instalan por
// la via manual y tampoco disparan beforeinstallprompt (Firefox de escritorio),
// y para esos no hay nada que ofrecer.
function detectarPlataforma() {
  if (esIOS()) return 'ios'
  const ua = navigator.userAgent
  if (/Android/.test(ua)) return 'android'
  // Safari de macOS instala a la mano (Archivo > Agregar al Dock) y nunca
  // dispara el evento, asi que cuenta como via manual.
  if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|CriOS/.test(ua)) return 'mac'
  return 'otro'
}

export default function useInstallPrompt() {
  const [instalado] = useState(yaEstaInstalada)
  const [plataforma] = useState(detectarPlataforma)
  const [evento, setEvento] = useState(null)
  const [descartada, setDescartada] = useState(() => Boolean(localStorage.getItem(CLAVE)))
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    if (instalado || descartada) return

    if (plataforma === 'otro') {
      const alPedirInstalacion = (e) => {
        e.preventDefault()
        setEvento(e)
        setAbierto(true)
      }
      const alInstalar = () => {
        localStorage.setItem(CLAVE, '1')
        setAbierto(false)
      }
      window.addEventListener('beforeinstallprompt', alPedirInstalacion)
      window.addEventListener('appinstalled', alInstalar)
      return () => {
        window.removeEventListener('beforeinstallprompt', alPedirInstalacion)
        window.removeEventListener('appinstalled', alInstalar)
      }
    }

    const t = setTimeout(() => setAbierto(true), RETARDO_MS)
    return () => clearTimeout(t)
  }, [instalado, descartada, plataforma])

  // El evento se puede usar una sola vez, asi que se descarta en el momento.
  // Guardar la preferencia tambien cuando lo rechazan evita que reaparezca en
  // cada carga si ya les molesto.
  const instalar = useCallback(() => {
    if (!evento) return
    const pendiente = evento
    setEvento(null)
    setAbierto(false)
    pendiente
      .prompt()
      .then(() => pendiente.userChoice)
      .catch(() => {})
      .finally(() => {
        localStorage.setItem(CLAVE, '1')
        setDescartada(true)
      })
  }, [evento])

  const cerrar = useCallback(() => {
    localStorage.setItem(CLAVE, '1')
    setDescartada(true)
    setAbierto(false)
  }, [])

  // Con evento sin usar alcanza el boton. En las plataformas manuales la guia
  // siempre esta disponible. Si el evento se gasto y no hay guia, ya no queda
  // nada que ofrecer y el item del sidebar desaparece solo.
  const instalable = !instalado && (Boolean(evento) || plataforma !== 'otro')

  return {
    abierto,
    plataforma,
    evento,
    instalable,
    instalado,
    descartada,
    abrir: () => setAbierto(true),
    instalar,
    cerrar,
  }
}
