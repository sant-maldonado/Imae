// Deteccion de capacidad de instalacion y copy de la guia manual.
//
// Son dos capacidades distintas y conviene no confundirlas. La de instalar con
// un boton la tiene el evento beforeinstallprompt, que es de Chromium. La guia
// paso a paso la necesitan los que no lo disparan: Safari en iOS y macOS, y los
// navegadores de Android, que exponen "Agregar a pantalla de inicio" en el menu
// pero no el evento.

export const CLAVE = 'installDismissed'

// El descarte no es eterno. Sin vencimiento, en el celu no hay forma de recuperar
// el cartel: no hay DevTools para limpiar la clave, y la nota del login tampoco
// ayuda porque se oculta con el mismo descarte. Un toque perdido en la X dejaba
// al usuario sin prompt para siempre. Con el plazo, vuelve solo.
export const DIAS_REAPARICION = 7
const MS_POR_DIA = 86_400_000

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
  // WebView de una app: WhatsApp, Instagram, Facebook. Adentro no hay forma de
  // instalar, porque el menu de la WebView no tiene "Agregar a pantalla de
  // inicio". La guia no es para instalar ahi, es para salir a Chrome, que es el
  // unico lugar donde la instalacion existe.
  'in-app': [
    { n: 1, icono: 'tres-puntos', texto: 'Tocá ⋮, arriba a la derecha' },
    { n: 2, icono: 'externo', texto: 'Elegí Abrir en Chrome' },
  ],
  mac: [
    { n: 1, icono: 'menu', texto: 'Menú Archivo, arriba a la izquierda' },
    { n: 2, icono: 'monitor', texto: 'Agregar al Dock' },
  ],
  // Chromium de escritorio (Chrome, Edge). Ahi el item de menu esta disponible
  // aunque la pagina todavia no cumpla los criterios de instalabilidad, asi que
  // si hay guia manual. Un solo copy para los dos: exponen el mismo item.
  desktop: [
    { n: 1, icono: 'tres-puntos', texto: 'Tocá el menú ⋮, arriba a la derecha' },
    { n: 2, icono: 'monitor', texto: 'Elegí Instalar página como app' },
  ],
}

// Titulo del cartel por plataforma. En un in-app, "Instala IMAE como app" no
// describe lo que el usuario tiene que hacer primero, que es salir a Chrome.
export const TITULO_POR_DEFECTO = 'Instala IMAE como app'
export const TITULOS = { 'in-app': 'Abrí IMAE en Chrome para instalarla' }

// Motores que no son Chromium y por lo tanto nunca disparan el evento, aunque
// se anuncien como Safari o traigan un UA con "Safari" adentro. Chrome de
// escritorio importa tanto como CriOS: los dos terminan en "Safari/537.36".
const NO_CHROMIUM =
  /Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg\/|OPiOS|OPT\/|OPR|Opera|SamsungBrowser|FBAN|FBAV|Instagram|WhatsApp|MicroMessenger|Line\/|Twitter|TwitterAndroid/i

// WebViews de aplicaciones, donde no hay agregar a pantalla de inicio. La senal
// firme es el token ;wv) del WebView de Android; la lista de nombres de app es
// el respaldo para las pocas que no lo traen. Sigue siendo una heuristica: un
// in-app desconocido cae en la guia y la guia no le va a andar.
const WEBVIEW_ANDROID = /;\s*wv\)/i
const IN_APP = /FBAN|FBAV|Instagram|WhatsApp|MicroMessenger|Line\/|Twitter|TwitterAndroid/i

function esInApp(ua) {
  return WEBVIEW_ANDROID.test(ua) || IN_APP.test(ua)
}

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
  if (esInApp(ua)) return 'in-app'
  if (/Android/.test(ua)) return 'android'
  if (/Macintosh/.test(ua) && esSafariReal()) return 'mac'
  // Cualquier otro Chromium de escritorio. Va al final a proposito: si no
  // dispara el evento, no puede instalar (Firefox de escritorio) y hay que
  // quedarse en null para no ofrecer un menu que no existe.
  if (soportaEvento()) return 'desktop'
  return null
}

// El unico camino de la WebView de Android a Chrome. intent:// es un esquema de
// Android: el sistema lo entrega al paquete pedido y, si no esta, abre el
// fallback. Se arma desde window.location para no clavar dominio ni esquema.
export function urlAbrirEnChrome() {
  if (!/Android/.test(navigator.userAgent)) return null
  const { host, pathname, search, protocol, href } = window.location
  const esquema = protocol.replace(':', '')
  const fallback = encodeURIComponent(href)
  return `intent://${host}${pathname}${search}#Intent;scheme=${esquema};package=com.android.chrome;S.browser_fallback_url=${fallback};end`
}

// Que el descarte siga vigente, o sea que el usuario todavia no esta en el plazo
// de calma. El valor legacy '1' no necesita migracion: Number('1') es epoch ms
// de 1970, o sea vencido, asi que a todo el mundo le vuelve a salir el cartel una
// sola vez al deploy. Lo mismo con cualquier basura: no se puede suprimir.
export function descartadaVigente() {
  const guardado = Number(localStorage.getItem(CLAVE))
  if (!Number.isFinite(guardado) || guardado <= 0) return false
  return Date.now() - guardado < DIAS_REAPARICION * MS_POR_DIA
}

export function marcarDescartada() {
  localStorage.setItem(CLAVE, String(Date.now()))
}
