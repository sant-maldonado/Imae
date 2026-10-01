import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import {
  reiniciar,
  montarOverlay,
  escena,
  cartela,
  irA,
  marcaVisible,
  escribirGuion,
  ingresar,
  TIMEOUT_NAVEGACION,
} from './ayuda.js'

// Los milisegundos de cada escena NO son una estimacion: son el largo real del
// audio de esa frase mas 350ms de aire, dividido por el RITMO de ayuda.js. La
// voz manda sobre el texto, no al revés. Si se cambia una frase hay que volver
// a medirla (ver la seccion de videos de AGENTS.md) antes de regrabar, o la
// voz se corta o la escena queda mirando al vacio.

// El titulo de la orden que se crea y se borra en camara. Comparte el prefijo
// de e2e-demo/limpiar.mjs, asi que si el test se corta a la mitad el script de
// limpieza lo encuentra igual. El prefijo va sin tilde a proposito, es la
// cadena que el script de limpieza busca.
const TITULO = 'Presentacion IMAE - Orden de demostracion'

test('video de presentacion: admin', async ({ page }) => {
  reiniciar()
  test.setTimeout(9 * 60 * 1000)

  // 20s por accion: sin esto un selector mal puesto se queda esperando el
  // timeout del test entero (9 min) en vez de fallar al toque.
  page.setDefaultTimeout(20000)

  // El PDF lo genera jsPDF en el navegador y dispara una descarga, no una
  // navegacion. Sin esto la descarga se cancela y el archivo sale vacio.
  page.on('download', () => {})

  await page.goto('/login', { timeout: TIMEOUT_NAVEGACION })
  await montarOverlay(page)

  // ---------------------------------------------------------------- portada
  await cartela(
    page,
    'IMAE',
    'Control de mantenimiento: órdenes, equipos, compras y reportes del taller',
    5080
  )

  // ----------------------------------------------------------------- ingreso
  // escena() y no leyenda(): la segunda solo pinta el texto y no lo anota en el
  // guion, asi que el audio de esa frase no tendria donde apoyarse.
  await escena(page, 'Un solo lugar para todo el taller', 2160)
  await ingresar(page, process.env.E2E_EMAIL, process.env.E2E_PASSWORD)
  await marcaVisible(page, true)

  // -------------------------------------------------------------- dashboard
  await expect(page.getByTestId('stat-pendientes')).toBeVisible()
  await escena(page, 'El estado del taller de un vistazo: pendientes, en progreso, averiados y compras', 4420)

  // ---------------------------------------------------------------- ordenes
  await irA(page, 'Órdenes')
  await expect(page.getByPlaceholder('Buscar por título...')).toBeVisible()
  await escena(page, 'Todas las órdenes, con filtro por estado y por texto', 3070)

  // ------------------------------------------------- detalle + fotos + PDF
  // La orden #17 es la unica que tiene una foto sembrada, y el archivo esta
  // incluido en la base real: se muestra sin subir nada a Cloudinary.
  await irA(page, 'Órdenes')
  await page.getByPlaceholder('Buscar por título...').fill('pintar puerta')
  const fila = page.locator('tbody tr', { hasText: 'pintar puerta' }).first()
  await expect(fila).toBeVisible()
  await escena(page, 'El buscador encuentra la orden en el instante', 2510)
  await fila.locator('a:has-text("Ver detalle")').click()
  await expect(page.getByText('Fotos de avance')).toBeVisible({ timeout: 20000 })
  await marcaVisible(page, false)
  await escena(page, 'La ficha completa de la orden: estado, historial y evidencia', 3300)

  await page.getByText('Fotos de avance').scrollIntoViewIfNeeded()
  await escena(page, 'Fotos de avance adjuntas a la misma orden', 2490)

  // El PDF no se puede mostrar en pantalla porque jsPDF descarga el archivo. Lo
  // que se ve es el click y la descarga; el archivo se guarda aparte para
  // mandarlo como muestra.
  let pdf = null
  try {
    const [descarga] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      page.getByRole('button', { name: 'PDF' }).click(),
    ])
    await escena(page, 'Y se descarga en PDF, con las fotos, para el respaldo o para adjuntar', 3850)
    pdf = await descarga.path()
  } catch (e) {
    console.log(`  (la escena del PDF no salio: ${e.message})`)
  }

  // ------------------------------------------------- alta asignando tecnico
  await irA(page, 'Órdenes')
  await page.getByText('+ Nueva Orden').click()
  await expect(page).toHaveURL('/ordenes/nueva')
  await marcaVisible(page, true)
  await escena(page, 'El admin da de alta la orden y decide a quién se la asigna', 3190)

  await page.getByLabel('Título').fill(TITULO)
  await page.getByLabel('Descripción').fill('Ajuste de la mesa y verificación de paralelismo.')
  await page.getByLabel('Técnico').selectOption({ index: 1 })
  await page.getByLabel('Fecha Programada').fill('2026-10-15')
  await page.waitForTimeout(900)
  await escena(page, 'Con prioridad y fecha programada, no con un papel', 2940)

  await page.click('button:has-text("Crear Orden")')
  await expect(page).toHaveURL('/ordenes')
  await escena(page, 'Queda en el listado al instante, sin sincronizar nada', 3070)

  // --------------------------------------------------------------- eliminar
  await page.getByPlaceholder('Buscar por título...').fill('Orden de demostracion')
  const nueva = page.locator('tbody tr', { hasText: 'Orden de demostracion' }).first()
  await expect(nueva).toBeVisible()
  await nueva.locator('a:has-text("Ver detalle")').click()
  await expect(page.getByText('Fotos de avance')).toBeVisible({ timeout: 20000 })
  await escena(page, 'Y si hay que dar de baja una orden, se borra desde acá', 3040)

  await page.click('button:has-text("Eliminar")')
  await expect(page.getByText('¿Eliminar esta orden de trabajo?')).toBeVisible()
  await escena(page, 'Pide confirmación, no borra de un clic', 2570)
  await page.click('button:has-text("Aceptar")')
  await expect(page).toHaveURL('/ordenes')
  await escena(page, 'Solo el admin puede dar de baja una orden', 2570)

  // ---------------------------------------------------------------- equipos
  await irA(page, 'Equipos')
  await expect(page.getByText('Torno CNC')).toBeVisible({ timeout: 20000 })
  await escena(page, 'El parque de máquinas, con el estado de cada una', 2940)

  // ---------------------------------------------------------------- compras
  await irA(page, 'Compras')
  await expect(page.getByText('+ Nueva Compra')).toBeVisible({ timeout: 20000 })
  await escena(page, 'Compras de repuestos, con su historial de pedidos', 2740)

  // --------------------------------------------------------------- reportes
  await irA(page, 'Reportes')
  await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible({ timeout: 20000 })
  // Recharts necesita medir el contenedor para dibujar: sin esta pausa el video
  // muestra la pagina con los graficos a medio render.
  await page.waitForTimeout(2600)
  await escena(page, 'Reportes con números para decidir, no para mirar', 2810)

  // ----------------------------------------------------------------- cierre
  // El dominio no se narra (suena mal en voz alta) pero queda en pantalla.
  await cartela(page, 'IMAE', 'imae-nu.vercel.app · Control de mantenimiento', 2890)

  const { guion, srt } = escribirGuion('admin')
  console.log(`guion: ${guion}`)
  console.log(`srt: ${srt}`)
  if (pdf) {
    fs.copyFileSync(pdf, 'videos/orden-muestra.pdf')
    console.log('pdf de muestra: videos/orden-muestra.pdf')
  }
})
