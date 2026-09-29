import { useCallback, useEffect, useState } from 'react'
import {
  descartadaVigente,
  detectarPlataformaManual,
  marcarDescartada,
  soportaEvento,
  yaEstaInstalada,
} from '../lib/instalacion'

// Retardo antes de abrir la guia sola. Es tambien la ventana de gracia para que
// dispare el evento: si llega antes, gana el boton Instalar.
const RETARDO_MS = 1000

export default function useInstallPrompt() {
  const [instalado] = useState(yaEstaInstalada)
  // plataforma: para que guia manual mostrar, o null si este navegador no tiene.
  // escuchaEvento: si hay que esperar beforeinstallprompt para ofrecer instalar.
  const [plataforma] = useState(detectarPlataformaManual)
  const [escuchaEvento] = useState(soportaEvento)
  const [evento, setEvento] = useState(null)
  const [descartada, setDescartada] = useState(descartadaVigente)
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    if (instalado || descartada) return

    // Con guia manual se abre sola, pero despues del retardo: es la unica senal
    // de interes disponible y al menos no compite con la carga de la pantalla.
    const t = plataforma ? setTimeout(() => setAbierto(true), RETARDO_MS) : null

    if (!escuchaEvento) return () => clearTimeout(t)

    // Si el evento llega despues, el sheet que ya estaba abierto pasa a ofrecer
    // el boton de verdad. En Android puede pasar, y por eso conviven las dos vias
    // en vez de elegirse una: si el evento nunca llega, la guia es el plan B.
    const alPedirInstalacion = (e) => {
      e.preventDefault()
      setEvento(e)
      setAbierto(true)
    }
    const alInstalar = () => {
      marcarDescartada()
      setAbierto(false)
    }
    window.addEventListener('beforeinstallprompt', alPedirInstalacion)
    window.addEventListener('appinstalled', alInstalar)
    return () => {
      clearTimeout(t)
      window.removeEventListener('beforeinstallprompt', alPedirInstalacion)
      window.removeEventListener('appinstalled', alInstalar)
    }
  }, [instalado, descartada, plataforma, escuchaEvento])

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
        marcarDescartada()
        setDescartada(true)
      })
  }, [evento])

  // Cerrar sin decidir. El overlay cubre toda la pantalla en un celular, asi que
  // un toque perdido no puede dejar al usuario sin prompt y sin segunda
  // oportunidad: esto no escribe la preferencia y vuelve a salir la proxima vez.
  const cerrarTemporal = useCallback(() => setAbierto(false), [])

  // Descartar de verdad, con el boton. Ahi el usuario si dijo que no, pero solo
  // por el plazo: si lo deixa pasar, el cartel le vuelve a salir solo.
  const descartar = useCallback(() => {
    marcarDescartada()
    setDescartada(true)
    setAbierto(false)
  }, [])

  // Con evento sin usar alcanza el boton. En las plataformas manuales la guia
  // siempre esta disponible. Si no hay ninguna de las dos vias, no hay nada que
  // ofrecer y el item del sidebar desaparece solo.
  const hayGuia = !instalado && (Boolean(evento) || Boolean(plataforma))

  // En un in-app hay cartel, porque hay que sacar al usuario de la WebView, pero
  // no item en el sidebar: "Agregar a la pantalla" ahi no agrega nada.
  const instalable = hayGuia && plataforma !== 'in-app'

  return {
    abierto,
    plataforma,
    evento,
    hayGuia,
    instalable,
    instalado,
    descartada,
    abrir: () => setAbierto(true),
    instalar,
    cerrarTemporal,
    descartar,
  }
}
