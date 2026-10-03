// Genera el PDF de muestra que se lleva Calidad: videos/orden-muestra.pdf
//
// El papel es el artefacto de la presentacion, asi que tiene que salir de una orden
// REAL y no de un fixture: si el historial se arma a mano, el PDF demuestra lo que
// uno quiere que pase en vez de lo que pasa.
//
// Por eso la orden se recorre entero: se crea, se edita dos veces, se completa y
// recien ahi se exporta. Asi el historial tiene de todo (alta, dos campos
// cambiados y el cambio de estado) en vez de una sola linea.
//
// De paso comprueba que el borrado este frenado: la orden ya tiene historial, y
// ese es justamente el caso que un area de Calidad va a preguntar.
//
//   node e2e-demo/pdf-muestra.mjs                    # contra produccion
//   node e2e-demo/pdf-muestra.mjs http://localhost:5173
//
// La orden que crea se llama con el prefijo de limpiar.mjs, asi que si el script
// se corta a la mitad, "limpiar.mjs" la encuentra y la borra.

import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'videos')
const ORIGEN = process.argv[2] || 'https://imae-nu.vercel.app'
const TITULO = 'Presentacion IMAE - Ajuste de mesa'
const TIMEOUT = 60000

if (fs.existsSync('.env')) process.loadEnvFile('.env')

const correo = process.env.E2E_EMAIL
const clave = process.env.E2E_PASSWORD
if (!correo || !clave) throw new Error('faltan E2E_EMAIL / E2E_PASSWORD en el .env')

const navegador = await chromium.launch()
const contexto = await navegador.newContext({
  viewport: { width: 1280, height: 720 },
  locale: 'es-AR',
  timezoneId: 'America/Argentina/Buenos_Aires',
  // El PDF se genera con jsPDF en el navegador y dispara una descarga: sin esto
  // el archivo sale vacio.
  acceptDownloads: true,
  // El cartel de instalacion de la PWA se abre solo poco despues de cada
  // navegacion y su overlay se come los clicks. playwright.demo.config.js lo
  // desactiva con el mismo timestamp en localStorage, y sin esto el boton de
  // "Crear Orden" no receives el clic: el POST no llega a dispararse.
  storageState: {
    cookies: [],
    origins: [
      {
        origin: ORIGEN,
        localStorage: [{ name: 'installDismissed', value: String(Date.now()) }],
      },
    ],
  },
})
const page = await contexto.newPage()

const paso = (t) => console.log(`  ${t}`)
const fallar = async (que) => {
  await page.screenshot({ path: path.join(DIR, 'orden-muestra-error.png') })
  console.error(`\nFALLO en ${que}. Captura en videos/orden-muestra-error.png\n`)
  throw new Error(que)
}

// Un campo que no pasa constraint validation bloquea el envio entero y el browser
// no lanza ni el submit ni el POST: no hay error en la pantalla, solo un timeout
// de un minuto que no dice nada. Por eso, si la pagina no se movio, se lista lo
// que esta marcando como invalido antes de rendirse.
const camposInvalidos = async () => {
  const malos = await page
    .evaluate(() =>
      [...document.querySelectorAll('form :invalid')].map((e) => e.id || e.getAttribute('name') || e.tagName),
    )
    .catch(() => [])
  if (malos.length) console.error(`\n  el envio esta bloqueado por: ${malos.join(', ')}\n`)
}

// El submit del alta tiene que esperar a la navegacion, pero conviene notar
// antes que la pagina no se movio, para que el error sea el de verdad y no el
// timeout de abajo.
const enviar = async (boton, url) => {
  await boton.click()
  await page.waitForTimeout(1500)
  if (page.url() === url) await camposInvalidos()
  await page.waitForURL(url, { timeout: TIMEOUT })
}

try {
  console.log(`\nOrden de muestra contra ${ORIGEN}`)

  // ------------------------------------------------------------------- ingreso
  await page.goto(`${ORIGEN}/login`, { timeout: TIMEOUT })
  await page.locator('input[type="email"]').fill(correo)
  await page.locator('input[type="password"]').fill(clave)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await page.getByTestId('stat-pendientes').waitFor({ timeout: TIMEOUT })
  paso('sesion iniciada')

  // ------------------------------------------------------------------ el alta
  // El Técnico es obligatorio para el admin, y el admin lo elige: si el select
  // queda en "Seleccionar técnico", el browser no manda el formulario.
  await page.locator('aside nav').getByRole('link', { name: 'Órdenes' }).first().click()
  await page.getByText('+ Nueva Orden').click()
  await page.waitForURL('**/ordenes/nueva', { timeout: TIMEOUT })
  await page.getByLabel('Título').fill(TITULO)
  await page.getByLabel('Descripción').fill('Ajuste de la mesa y verificación de paralelismo.')
  await page.getByLabel('Equipo').selectOption({ index: 1 })
  await page.getByLabel('Técnico').selectOption({ index: 1 })
  await page.getByLabel('Prioridad').selectOption({ index: 0 })
  await page.getByLabel('Fecha Programada').fill('2026-10-20')
  await enviar(page.getByRole('button', { name: 'Crear Orden' }), '**/ordenes')
  paso('orden creada')

  const ficha = () => page.goto(`${ORIGEN}/ordenes`, { timeout: TIMEOUT })
    .then(() => page.getByPlaceholder('Buscar por título...').fill(TITULO))
    .then(() => page.locator('tbody tr', { hasText: TITULO }).first().locator('a:has-text("Ver detalle")').click())
    .then(() => page.getByText('Fotos de avance').waitFor({ timeout: TIMEOUT }))

  // ------------------------------------------------- primera edicion: 2 campos
  await ficha()
  await page.getByRole('link', { name: 'Editar' }).click()
  await page.getByLabel('Prioridad').selectOption({ index: 0 })
  await page.getByLabel('Fecha Programada').fill('2026-10-27')
  await enviar(page.getByRole('button', { name: 'Guardar Cambios' }), /\/ordenes\/\d+$/)
  paso('editada: prioridad y fecha reprogramada')

  // ------------------------------- segunda edicion: equipo y titulo, dos mas
  await ficha()
  await page.getByRole('link', { name: 'Editar' }).click()
  await page.getByLabel('Equipo').selectOption({ index: 2 })
  await page.getByLabel('Descripción').fill('Ajuste de la mesa, verificación de paralelismo y nivelación.')
  await enviar(page.getByRole('button', { name: 'Guardar Cambios' }), /\/ordenes\/\d+$/)
  paso('editada: equipo y descripción')

  // ---------------------------------------------------------------- completar
  await ficha()
  await page.getByRole('button', { name: 'Completar' }).click()
  await page.getByRole('button', { name: 'Completar' }).waitFor({ state: 'detached', timeout: TIMEOUT })
  paso('completada')

  // ------------------------------------------------ el borrado tiene que frenarse
  const url = page.url()
  await page.getByRole('button', { name: 'Eliminar' }).click()
  await page.getByText('¿Eliminar esta orden de trabajo?').waitFor({ timeout: 15000 })
  await page.getByRole('button', { name: 'Aceptar' }).click()

  const freno = page.getByText(/el registro es el respaldo/i)
  await freno.waitFor({ timeout: 20000 }).catch(() => fallar('el borrado NO se frenó'))
  paso(`borrado frenado, sigue en ${url === page.url() ? 'la ficha' : 'otra pagina'}`)

  // --------------------------------------------------------------------- el PDF
  const [descarga] = await Promise.all([
    page.waitForEvent('download', { timeout: 40000 }),
    page.getByRole('button', { name: 'PDF' }).click(),
  ])

  const destino = path.join(DIR, 'orden-muestra.pdf')
  await descarga.saveAs(destino)
  const kb = (fs.statSync(destino).size / 1024).toFixed(0)

  console.log(`\n  historial impreso en el PDF`)
  console.log(`  ${destino}  (${kb} KB)`)
  console.log(`\n  la orden ${TITULO} queda en la base; "node e2e-demo/limpiar.mjs" la borra\n`)
} catch (e) {
  // La captura va en cualquier fallo, no solo en el del borrado: sin ver la
  // pantalla, un timeout en un formulario no dice nada de por que no se crea.
  await page.screenshot({ path: path.join(DIR, 'orden-muestra-error.png') }).catch(() => {})
  console.error(`\n${e.message}`)
  console.error('Captura en videos/orden-muestra-error.png\n')
  process.exitCode = 1
} finally {
  await navegador.close()
}