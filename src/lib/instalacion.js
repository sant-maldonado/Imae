// Deteccion de capacidad de instalacion y copy de la guia manual.
//
// Son dos capacidades distintas y conviene no confundirlas. La de instalar con
// un boton la tiene el evento beforeinstallprompt, que es de Chromium. La guia
// paso a paso la necesitan los que no lo disparan: Safari en iOS y macOS, y los
// navegadores de Android, que exponen "Agregar a pantalla de inicio" en el menu
// pero no el evento.

export const CLAVE = 'installDismissed'

// Los nombres de los items de menu cambian por idioma, asi que cada paso
// describe donde mirarlo ademas de citar la etiqueta.
export const PASOS = {
  ios: [
    { n: 1, icono: 'compartir', texto: 'Tocá Compartir' },
    { n: 2, icono: 'movil', texto: 'Elegí Agregar a pantalla de inicio' },
  ],
  android: [
    { n: 1, icono: 'tres-puntos', texto: 'Abrí el menú del navegador' },
    { n: 2, icono: 'movil', texto: 'Elegí Agregar a pantalla de inicio' },
  ],
  mac: [
    { n: 1, icono: 'menu', texto: 'Menú Archivo, arriba a la izquierda' },
    { n: 2, icono: 'monitor', texto: 'Agregar al Dock' },
  ],
}

// Motores que no son Chromium y por lo tanto nunca disparan el evento, aunque
// se anuncien como Safari o traigan un UA con "Safari" adentro. Chrome de
// escritorio importa tanto como CriOS: los dos terminan en "Safari/537.36".
const NO_CHROMIUM =
  /Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg\/|OPiOS|OPT\/|OPR|Opera|SamsungBrowser|FBAN|FBAV|Instagram|WhatsApp|MicroMessenger|Line\/|Twitter|TwitterAndroid/i

// WebViews de aplicaciones que no dan agregar a pantalla de inicio. La lista es
// una heuristica y no una garantia: un in-app browser desconocido va a caer en
// la guia y la guia no le va a andar. Sumar el token cuando aparezca.
const IN_APP = /FBAN|FBAV|Instagram|WhatsApp|MicroMessenger|Line\/|Twitter|TwitterAndroid/i

// iPadOS se reporta como MacIntel, asi que con el userAgent no alcanza y hay
// que separarlo por maxTouchPoints.
export function esIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function esSafariReal() {
  return /Safari/.test(navigator.userAgent) && !NO_CHROMIUM.test(navigator.userAgent)
}

// La unica senal de que ya esta instalada. En iOS no hay ninguna otra:
// navigator.standalone es de WebKit y display-mode la sirve el manifest.
export function yaEstaInstalada() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    window.navigator.standalone === true
  )
}

// Chromium y derivados disparan beforeinstallprompt. En iOS no: Chrome, Edge y
// Opera ahi son WebKit bajo el capote y no instalan PWA de ninguna forma, asi
// que para ese caso la guia manual tampoco sirve y no hay nada que ofrecer.
export function soportaEvento() {
  if (esIOS()) return false
  return /Chrome|Chromium|Edg\/|OPR|Opera|SamsungBrowser|Vivaldi|Brave/i.test(navigator.userAgent)
}

// Que guia manual corresponde, o null si este navegador no tiene forma de
// agregar la app. Devolver null es lo que evita prometer instrucciones que no
// funcionan: mejor no mostrar nada que mostrar un menu inexistente.
export function detectarPlataformaManual() {
  const ua = navigator.userAgent
  if (esIOS()) return esSafariReal() ? 'ios' : null
  if (IN_APP.test(ua)) return null
  if (/Android/.test(ua)) return 'android'
  if (/Macintosh/.test(ua) && esSafariReal()) return 'mac'
  return null
}
