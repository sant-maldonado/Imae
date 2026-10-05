import fs from 'node:fs'
import path from 'node:path'
import { expect } from '@playwright/test'

// Los tiempos de las escenas se miden con el reloj de la corrida y no se
// estiman a mano. Eso es lo que hace que el .srt encaje con el video cuando
// despues se graba la voz encima: si un tiempo fuera aproximado, la voz se
// correria de a poco a lo largo de los dos minutos.

let t0 = Date.now()
const escenas = []

export function reiniciar() {
  t0 = Date.now()
  escenas.length = 0
}

function reloj() {
  return Date.now() - t0
}

// aSrt y no srt porque en escribirGuion hay una variable local llamada "srt" que
// la tapaba, y adentro del .map la llamada srt(...) caia en esa variable sin
// inicializar.
function aSrt(ms) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const c = Math.floor(ms % 1000)
  const dos = (n) => String(n).padStart(2, '0')
  return `${dos(h)}:${dos(m)}:${dos(s)},${String(c).padStart(3, '0')}`
}

// El overlay va en el DOM y no en el video porque el navegador lo graba como
// parte de la pantalla. La alternativa (drawtext de ffmpeg) no esta en la build
// de Playwright, y asi el estilo es el que queremos en vez de un subtitulo
// generico. pointer-events:none para que nunca robe un click.
const CSS = `
#demo-caption {
  position: fixed; left: 50%; bottom: 34px; transform: translateX(-50%);
  max-width: 900px; padding: 14px 26px; border-radius: 14px;
  background: rgba(9, 14, 28, .90); color: #fff;
  font: 600 26px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif;
  text-align: center; letter-spacing: -.01em;
  box-shadow: 0 10px 40px rgba(0,0,0,.45);
  border: 1px solid rgba(255,255,255,.14);
  z-index: 2147483646; pointer-events: none;
  opacity: 0; transition: opacity .28s ease;
}
#demo-caption.visible { opacity: 1; }
#demo-card {
  position: fixed; inset: 0; display: none; flex-direction: column;
  align-items: center; justify-content: center; gap: 22px; padding: 0 90px;
  background: linear-gradient(150deg, #0b1220 0%, #111c33 52%, #0b1220 100%);
  color: #fff; z-index: 2147483647; pointer-events: none;
}
#demo-card.visible { display: flex; }
#demo-card .t { font: 700 62px/1.1 system-ui, sans-serif; letter-spacing: -.02em; }
#demo-card .b { font: 400 29px/1.5 system-ui, sans-serif; color: #93a4c4; text-align: center; }
#demo-card .r { width: 88px; height: 4px; border-radius: 4px; background: #3b82f6; }

/* Cartela de contacto: foto + datos, en vez del titulo grande. Es la que cierra
   el video del tecnico. */
#demo-card.contacto { gap: 26px; }
#demo-card.contacto .fila {
  display: flex; align-items: center; gap: 44px; max-width: 980px;
}
#demo-card.contacto .retrato {
  width: 196px; height: 196px; border-radius: 50%; object-fit: cover; flex: 0 0 auto;
  border: 3px solid rgba(255,255,255,.16); background: #1b2a47;
}
#demo-card.contacto .texto { text-align: left; }
#demo-card.contacto .nombre {
  font: 700 54px/1.12 system-ui, sans-serif; letter-spacing: -.02em;
}
#demo-card.contacto .rol {
  font: 600 27px/1.3 system-ui, sans-serif; color: #60a5fa; margin-top: 4px;
}
#demo-card.contacto .contacto {
  font: 400 25px/1.62 system-ui, sans-serif; color: #cbd8ee; margin-top: 18px;
}
#demo-card.contacto .contacto span { color: #6b7f9e; margin-right: 10px; }
#demo-card.contacto .firma {
  font: 400 19px/1 system-ui, sans-serif; color: #6b7f9e; letter-spacing: .13em;
}
#demo-marca {
  position: fixed; top: 18px; right: 22px; padding: 7px 14px; border-radius: 9px;
  background: rgba(9, 14, 28, .62); color: #dbe6f8;
  font: 700 15px/1 system-ui, sans-serif; letter-spacing: .16em;
  border: 1px solid rgba(255,255,255,.13);
  z-index: 2147483645; pointer-events: none; opacity: 0;
  transition: opacity .3s ease;
}
#demo-marca.visible { opacity: 1; }
`

export async function montarOverlay(page) {
  await page.addStyleTag({ content: CSS })
  await page.evaluate(() => {
    if (document.getElementById('demo-caption')) return
    const marca = document.createElement('div')
    marca.id = 'demo-marca'
    marca.textContent = 'IMAE'

    const caption = document.createElement('div')
    caption.id = 'demo-caption'

    const card = document.createElement('div')
    card.id = 'demo-card'
    card.innerHTML =
      '<div class="r"></div><div class="t"></div><div class="b"></div>' +
      '<div class="fila"><img class="retrato" alt="" />' +
      '<div class="texto"><div class="nombre"></div><div class="rol"></div>' +
      '<div class="contacto"></div></div></div><div class="firma"></div>'

    document.body.append(marca, caption, card)
  })
}

// La navegacion va clickeando el sidebar, no con goto. Dos razones: el menu es
// lo que un usuario real toca, y goto recarga la pagina y se lleva el overlay
// puesto.
//
// El scope a "aside nav" es obligatorio: los tiles del Dashboard son <Link> con
// el mismo texto que el menu ("Ordenes pendientes", "Equipos averiados"), asi
// que un getByRole('link', {name: /Ordenes/}) global clickearia el tile y no el
// item del menu.
export async function irA(page, etiqueta) {
  const link = page.locator('aside nav').getByRole('link', { name: etiqueta }).first()
  await expect(link).toBeVisible()
  await link.click()
}

export async function marcaVisible(page, visible = true) {
  await page.evaluate((v) => {
    document.getElementById('demo-marca')?.classList.toggle('visible', v)
  }, visible)
}

export async function leyenda(page, texto) {
  await page.evaluate((t) => {
    const c = document.getElementById('demo-caption')
    if (!c) return
    c.textContent = t
    c.classList.add('visible')
  }, texto)
}


// Multiplicador de ritmo. Leer una leyenda de dos lineas comfy son 4 o 5
// segundos, asi que los tiempos que pasan los specs son "lo que se ve bien" y
// no lo que dura la escena en el guion. Si el video queda largo, se baja aca en
// vez de editar veinte numeros.
const RITMO = 1.45

// Si los tres cartones que defines aca estan vacios, el video se graba sin banda
// de subtitulos: la app se ve limpia de punta a punta.
//
// El flag va aca y no en cada escena porque la banda es una sola decision para
// los dos videos, y porque las tres cosas que se pueden poner abajo (subtitulo,
// marca de IMAE, cartel de instalacion de la PWA) compiten por el mismo lugar en
// pantalla. Con el subtitulo puesto hay que sacar el cartel de instalacion, si
// no el overlay z-50 se come los clicks a media demo; sin el, se puede dejar.
//
// Que no haya banda NO borra el guion: escena() sigue anotando el texto y el
// .srt se sigue escribiendo, porque voz.mjs lo usa para saber en que milisegundo
// va cada frase. Lo que se apaga es unicamente que se vea.
const CARTELES = { subtitulo: '', marca: '', instalacion: '' }

// El ritmo en el tiempo de cada escena.
function Ritmo(ms) {
  return Math.round(ms * RITMO)
}

// Escena con leyenda: es la unidad basica del guion. La leyenda queda el tiempo
// que le pases y queda anotada para el .srt.
//
// Ademas se autocomprueba. No puedo mirar el video renderizado, asi que la unica
// forma de saber que la leyenda se ve de verdad es preguntarle a la pagina: que
// el nodo exista, tenga el texto puesto, este con la clase visible, y entre en la
// pantalla sin desbordar. Si algo de eso falla, el test se cae y el video se
// regraba, en vez de entregar un video sin subtitulos.
//
// Sin banda (CARTELES.subtitulo vacio) los chequeos visuales no tienen a que
// mirar, porque no hay nada dibujado, pero el texto se sigue anotando en el
// guion. Eso es lo que mantiene la voz en su lugar.
export async function escena(page, texto, ms = 2600) {
  const ini = reloj()

  if (!CARTELES.subtitulo) {
    await page.waitForTimeout(Ritmo(ms))
    escenas.push({ ini, fin: reloj(), texto })
    return
  }

  await leyenda(page, texto)

  // La leyenda tiene transition de .28s, asi que recien despues de agregar la
  // clase el getComputedStyle sigue devolviendo opacity 0. Hay que esperarla.
  await page.waitForTimeout(380)

  const estado = await page.evaluate(() => {
    const c = document.getElementById('demo-caption')
    if (!c) return { existe: false }
    const r = c.getBoundingClientRect()
    return {
      existe: true,
      texto: c.textContent,
      visible: c.classList.contains('visible'),
      opacidad: getComputedStyle(c).opacity,
      desborda: r.width > window.innerWidth,
      alto: r.height,
    }
  })

  if (!estado.existe) throw new Error(`No esta el nodo de la leyenda para "${texto}"`)
  if (estado.texto !== texto) throw new Error(`La leyenda dice "${estado.texto}" y el guion pedia "${texto}"`)
  if (!estado.visible) throw new Error(`La leyenda de "${texto}" quedo sin la clase visible`)
  if (estado.opacidad !== '1') throw new Error(`La leyenda de "${texto}" quedo con opacidad ${estado.opacidad}`)
  if (estado.desborda) throw new Error(`La leyenda de "${texto}" es mas ancha que la pantalla`)

  await page.waitForTimeout(Ritmo(ms))
  escenas.push({ ini, fin: reloj(), texto })
}

// Portada o cierre: tapa la app de punta a punta con un fondo propio, en vez de
// tratar de componer la pantalla con la app de fondo.
export async function cartela(page, titulo, bajada, ms = 3200) {
  const ini = reloj()
  await marcarMarca(page, false)
  await page.evaluate(
    ({ t, b }) => {
      const card = document.getElementById('demo-card')
      if (!card) throw new Error('No esta el nodo de la cartela')
      card.querySelector('.t').textContent = t
      card.querySelector('.b').textContent = b
      card.classList.add('visible')
    },
    { t: titulo, b: bajada }
  )
  await page.waitForTimeout(Ritmo(ms))
  // Solo la bajada, nunca el titulo. El titulo de las tres cartelas de los dos
  // videos es "IMAE", y edge-tts no lo lee como palabra: lo deletrea letra por
  // letra. En pantalla queda, que es lo que importa, pero la voz arranca en la
  // bajada. Si alguna vez una cartela necesita que se narre el titulo, se
  // escribe en la bajada.
  escenas.push({ ini, fin: reloj(), texto: bajada })
  await page.evaluate(() => document.getElementById('demo-card')?.classList.remove('visible'))
  await marcarMarca(page, true)
}

async function marcarMarca(page, visible) {
  await marcaVisible(page, visible)
}

// La navegacion va con mas margen que el resto. Se graba contra produccion y
// una instancia de Vercel en plan hobby tiene arranques en frios: se la midio
// responding en 34s cuando normalmente va en 100ms, y con los 20s del default
// la grabacion se cae entera y hay que empezar de cero.
export const TIMEOUT_NAVEGACION = 60000

// ------------------------------------------------------------------ contacto

// Los datos de la tarjeta final NO van en el spec: el spec se commitea y la app
// es publica, asi que un telefono o un correo ahi quedan en el historial de Git
// para siempre. Se leen de interno/, que ya esta en .gitignore.
//
// datos.json espera:
//   { "nombre": "...", "rol": "...", "telefono": "...", "email": "...",
//     "foto": "foto.jpg" }
const DIR_CONTACTO = 'interno/contacto'

function leerContacto() {
  const archivo = path.join(DIR_CONTACTO, 'datos.json')
  if (!fs.existsSync(archivo)) {
    throw new Error(
      `Falta ${archivo}. Copiar ${path.join(DIR_CONTACTO, 'ejemplo.json')} a datos.json y completarlo con tus datos, o el video se graba con placeholders.`
    )
  }
  const datos = JSON.parse(fs.readFileSync(archivo, 'utf8'))
  for (const clave of ['nombre', 'rol', 'telefono', 'email', 'foto']) {
    if (!datos[clave]) throw new Error(`En ${archivo} falta "${clave}"`)
  }
  const foto = path.join(DIR_CONTACTO, datos.foto)
  if (!fs.existsSync(foto)) throw new Error(`No esta la foto ${foto}`)
  return { ...datos, foto }
}

// Cierre del video del tecnico: la foto, el nombre, el rol y como contactarte.
//
// No se narra, y eso es a proposito: un telefono o un correo leidos en voz alta
// suenan mal. Por eso la escena se anota en el guion pero con texto vacio, y
// escribirGuion() deja esa escena fuera del .srt. Es el mismo mecanismo que usa
// el guion para separar "lo que se ve" de "lo que se dice".
//
// El retrato va en base64 y no como URL porque el navegador graba la pantalla, no
// la red: si la imagen se pidiera por http capaz que entre el video y se pierde.
//
// Y antes de seguir hay que esperar a que la imagen cargue. Un <img> con data URI
// decodifica despues de que el nodo este en el DOM, asi que sin esta espera el
// video arranca capturando un marco con el circulo vacio.
export async function cartelaContacto(page, ms = 4200) {
  const ini = reloj()
  const d = leerContacto()
  const fotoBase64 = fs.readFileSync(d.foto).toString('base64')

  await marcarMarca(page, false)
  await page.evaluate(
    ({ nombre, rol, telefono, email, foto, firma }) => {
      const card = document.getElementById('demo-card')
      if (!card) throw new Error('No esta el nodo de la cartela')
      card.classList.add('contacto')
      // La portada y el cierre comparten el mismo nodo. Sin sacar el texto de la
      // anterior, el nombre del proyecto queda escrito arriba de la foto.
      card.querySelector('.t').textContent = ''
      card.querySelector('.b').textContent = ''
      card.querySelector('.nombre').textContent = nombre
      card.querySelector('.rol').textContent = rol
      card.querySelector('.contacto').innerHTML =
        `<div><span>Tel</span>${telefono}</div><div><span>Mail</span>${email}</div>`
      card.querySelector('.firma').textContent = firma
      card.querySelector('.retrato').src = `data:image/jpeg;base64,${foto}`
      card.classList.add('visible')
    },
    { nombre: d.nombre, rol: d.rol, telefono: d.telefono, email: d.email, foto: fotoBase64, firma: 'IMAE · Control de mantenimiento' }
  )

  await page.waitForFunction(
    () => {
      const img = document.querySelector('#demo-card .retrato')
      return img && img.complete && img.naturalWidth > 0
    },
    null,
    { timeout: 15000 }
  )

  const estado = await page.evaluate(() => {
    const card = document.getElementById('demo-card')
    const fila = card.querySelector('.fila').getBoundingClientRect()
    const img = card.querySelector('.retrato')
    return {
      nombre: card.querySelector('.nombre').textContent,
      rol: card.querySelector('.rol').textContent,
      foto: img.naturalWidth,
      desborde: fila.width > window.innerWidth || fila.right > window.innerWidth,
      alto: card.getBoundingClientRect().height,
    }
  })

  if (!estado.nombre) throw new Error('La cartela de contacto quedo sin nombre')
  if (!estado.rol) throw new Error('La cartela de contacto quedo sin rol')
  if (estado.foto < 1) throw new Error('La foto de la cartela de contacto no cargo')
  if (estado.desborde) throw new Error('La cartela de contacto es mas ancha que la pantalla')
  if (estado.alto > 720) throw new Error(`La cartela de contacto mide ${estado.alto}px y no entra en 720`)

  await page.waitForTimeout(Ritmo(ms))

  // La frase anterior viene con audio y esta no, asi que hace falta un respiro
  // entre las dos. El de 350ms que ya trae cada escena no alcanza: la tarjeta
  // entra a pantalla completa y corta de golpe, y un corte pegado al final de
  // una frase se ve como un error de edicion. Lo pone el spec; aca se verifica
  // que siga puesto.
  if (escenas.length) {
    const previa = escenas[escenas.length - 1]
    if (ini - previa.fin < 500) {
      throw new Error(
        `La cartela de contacto arranca ${ini - previa.fin}ms despues de la frase anterior; hace falta un respiro de 500ms (ver el spec)`
      )
    }
  }

  // texto vacio = se anota en el guion pero no se narra.
  escenas.push({ ini, fin: reloj(), texto: '' })

  await page.evaluate(() => {
    const card = document.getElementById('demo-card')
    card.classList.remove('visible')
    card.classList.remove('contacto')
  })
  await marcarMarca(page, true)
}

// El login se escribe a mano con pressSequentially. El .fill() de los E2E pega
// el texto de golpe y el video se ve como que nadie esta tipeando.
export async function ingresar(page, email, password) {
  await page.goto('/login', { timeout: TIMEOUT_NAVEGACION })
  // El goto de arriba recarga el documento y se lleva el overlay puesto, asi
  // que hay que volver a montarlo. Sin esto, las leyendas siguientes quedan
  // invisibles (leyenda() no falla si no encuentra el nodo) y la cartela final
  // revienta al buscar .t dentro de null.
  await montarOverlay(page)
  await page.evaluate(() => {
    const c = document.getElementById('demo-caption')
    if (c) c.classList.remove('visible')
  })
  const correo = page.locator('input[type="email"]')
  await expect(correo).toBeVisible()
  await correo.click()
  await correo.pressSequentially(email, { delay: 55 })
  const clave = page.locator('input[type="password"]')
  await clave.click()
  await clave.pressSequentially(password, { delay: 55 })
  await page.waitForTimeout(320)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/', { timeout: 25000 })
  await page.waitForTimeout(700)
}

export function escribirGuion(nombre) {
  const dir = 'videos'
  fs.mkdirSync(dir, { recursive: true })

  // El .srt solo lleva las escenas que se narran. La cartela de contacto se
  // anota con el texto vacio justamente para esto: queda en el guion como
  // referencia de lo que se ve, pero voz.mjs no la encuentra y deja ahi el
  // silencio. Si se metiera en el .srt, la voz leeria un telefono.
  const narradas = escenas.filter((s) => s.texto)
  const srt = narradas
    .map((s, i) => `${i + 1}\n${aSrt(s.ini)} --> ${aSrt(s.fin)}\n${s.texto}\n`)
    .join('\n')
  fs.writeFileSync(path.join(dir, `${nombre}.srt`), srt, 'utf8')

  const tabla = escenas
    .map((s, i) => {
      const dur = Math.round((s.fin - s.ini) / 100) / 10
      // El guion marca cuales son solo imagen para que al leerlo no parezca que
      // se perdio una frase.
      const texto = s.texto || '_(cartela de contacto, sin voz)_'
      return `| ${i + 1} | ${aSrt(s.ini).slice(0, 8)} | ${dur}s | ${texto} |`
    })
    .join('\n')
  fs.writeFileSync(
    path.join(dir, `${nombre}.guion.md`),
    `## ${nombre}\n\nTotal: ${aSrt(reloj())}\n\n| # | Arranca | Duración | Texto |\n|---|---|---|---|\n${tabla}\n`,
    'utf8'
  )

  return { srt: path.join(dir, `${nombre}.srt`), guion: path.join(dir, `${nombre}.guion.md`) }
}
