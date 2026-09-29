import { useEffect, useRef } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { useToast } from './Toast'

// El service worker se registra una sola vez por vida de la pagina. En un
// desktop-installed el usuario puede tener varias pestanas y cada una corre su
// propio registro, que es lo esperado.
export default function PwaUpdates() {
  const toast = useToast()
  // En ref y no en deps: Toast.jsx arma el objeto del context inline, asi que
  // useToast() devuelve una identidad nueva en cada render y un effect
  // dependiente de el volveria a registrar el SW cada vez.
  const toastRef = useRef(toast)
  useEffect(() => {
    toastRef.current = toast
  })

  useEffect(() => {
    // En jsdom y en navegadores viejos no hay service worker. El import de
    // arriba sigue resolviendo, pero registrar no.
    if (!('serviceWorker' in navigator)) return

    const updateSW = registerSW({
      onNeedRefresh() {
        toastRef.current
          ?.confirm('Hay una versión nueva de IMAE. ¿Recargar ahora?')
          .then((ok) => {
            if (ok) updateSW(true)
          })
      },
      onOfflineReady() {
        toastRef.current?.success('IMAE quedó listo para usar sin conexión.')
      },
    })
  }, [])

  return null
}
