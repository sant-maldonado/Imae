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
    card.innerHTML = '<div class="r"></div><div class="t"></div><div class="b"></div>'

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
export async function escena(page, texto, ms = 2600) {
  const ini = reloj()
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
  escenas.push({ ini, fin: reloj(), texto: `${titulo} — ${bajada}` })
  await page.evaluate(() => document.getElementById('demo-card')?.classList.remove('visible'))
  await marcarMarca(page, true)
}

async function marcarMarca(page, visible) {
  await marcaVisible(page, visible)
}

// El login se escribe a mano con pressSequentially. El .fill() de los E2E pega
// el texto de golpe y el video se ve como que nadie esta tipeando.
export async function ingresar(page, email, password) {
  await page.goto('/login')
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

  const srt = escenas
    .map((s, i) => `${i + 1}\n${aSrt(s.ini)} --> ${aSrt(s.fin)}\n${s.texto}\n`)
    .join('\n')
  fs.writeFileSync(path.join(dir, `${nombre}.srt`), srt, 'utf8')

  const tabla = escenas
    .map(
      (s, i) =>
        `| ${i + 1} | ${aSrt(s.ini).slice(0, 8)} | ${Math.round((s.fin - s.ini) / 100) / 10}s | ${s.texto} |`
    )
    .join('\n')
  fs.writeFileSync(
    path.join(dir, `${nombre}.guion.md`),
    `## ${nombre}\n\nTotal: ${aSrt(reloj())}\n\n| # | Arranca | Duración | Texto |\n|---|---|---|---|\n${tabla}\n`,
    'utf8'
  )

  return { srt: path.join(dir, `${nombre}.srt`), guion: path.join(dir, `${nombre}.guion.md`) }
}
