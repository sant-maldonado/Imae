import { useEffect } from 'react'
import { registerSW } from 'virtual:pwa-register'

// Registra el service worker. Con registerType 'autoUpdate' no hay nada que
// preguntar: el worker nuevo hace skipWaiting, toma control, y el cliente de
// vite-plugin-pwa recarga solo.
//
// Antes esto mostraba un confirm para que el usuario aceptara la version nueva.
// Mientras ese aviso estaba ahi y nadie lo aceptaba, el worker viejo seguia
// sirviendo el bundle viejo de la precache, indefinidamente. Eso se veía como un
// aviso de instalacion que no aparecia, sin ninguna razon visible.
export default function PwaUpdates() {
  useEffect(() => {
    // En jsdom y en navegadores viejos no hay service worker. El import de
    // arriba sigue resolviendo, pero registrar no.
    if (!('serviceWorker' in navigator)) return
    // registerSW sin callbacks: el reload automatico lo hace el cliente cuando el
    // worker nuevo se activa. Nada de onOfflineReady a proposito, solo se cachea
    // el shell, y con sesion abierta AuthContext manda al login ante cualquier
    // fallo de red: prometer que IMAE queda listo sin conexion sigue siendo falso.
    registerSW()
  }, [])

  return null
}
