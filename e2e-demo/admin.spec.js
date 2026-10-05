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
//
// El guion va en dos atos. Primero el que ya venian usando los videos: el
// taller, los equipos, las compras, los reportes. Despues el registro: la
// orden que el admin crea en camara, los cambios que le hace y el historial que
// eso deja. El historial va al final a proposito, porque es lo que hay que
// poder contestarle a un area de Calidad.
//
// La orden que se crea comparte el prefijo de e2e-demo/limpiar.mjs, asi que si
// el test se corta a la mitad el script de limpieza lo encuentra igual. El
// prefijo va sin tilde a proposito, es la cadena que el script de limpieza busca.
const TITULO = 'Presentacion IMAE - Orden de demostracion'

// La orden que tiene una foto sembrada en la base real. Es la unica, asi que la
// escena de fotos tiene que salir de aca y no de la orden del video.
const ORDEN_CON_FOTO = 'pintar puerta'

test('video de presentacion: admin', async ({ page }) => {
  reiniciar()
  test.setTimeout(12 * 60 * 1000)

  // 20s por accion: sin esto un selector mal puesto se queda esperando el
  // timeout del test entero (12 min) en vez de fallar al toque.
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
    4000
  )

  // ------------------------------------------------------------------ puente
  // Va sobre la pantalla de login, antes de entrar. Es lo primero que escucha
  // el director, asi que tiene que decir de que se trata antes de mostrar nada.
  await escena(
    page,
    'Hoy vas a ver el mantenimiento. El modelo de registro es el mismo que necesita el control de programas',
    5150
  )

  // ----------------------------------------------------------------- ingreso
  // Sin frase: la pantalla de login ya se entiende sola, y el puente recien
  // dicho loadia decir lo mismo de otra forma.
  await ingresar(page, process.env.E2E_EMAIL, process.env.E2E_PASSWORD)
  await marcaVisible(page, true)

  // -------------------------------------------------------------- dashboard
  await expect(page.getByTestId('stat-pendientes')).toBeVisible()
  await escena(page, 'El estado del taller de un vistazo: pendientes, en progreso, averiados y compras', 4420)

  // ---------------------------------------------------------------- ordenes
  await irA(page, 'Órdenes')
  await expect(page.getByPlaceholder('Buscar por título...')).toBeVisible()
  await escena(page, 'Todas las órdenes, con filtro por estado y por texto', 3090)

  // ------------------------------------------------------- fotos de la ficha
  // Es la unica orden con una foto en la base, y el archivo esta incluido: se
  // muestra sin subir nada a Cloudinary. Va antes del alta a proposito, porque
  // la orden del video se crea en publico y desde ahi en adelante es la que
  // explica.
  await page.getByPlaceholder('Buscar por título...').fill(ORDEN_CON_FOTO)
  const filaFoto = page.locator('tbody tr', { hasText: ORDEN_CON_FOTO }).first()
  await expect(filaFoto).toBeVisible()
  await escena(page, 'El buscador encuentra la orden en el instante', 2510)
  await filaFoto.locator('a:has-text("Ver detalle")').click()
  await expect(page.getByText('Fotos de avance')).toBeVisible({ timeout: 20000 })
  await marcaVisible(page, false)
  await page.getByText('Fotos de avance').scrollIntoViewIfNeeded()
  await escena(page, 'Las fotos de avance, adjuntas a la ficha de la orden', 2930)

  // ------------------------------------------------- alta asignando tecnico
  await irA(page, 'Órdenes')
  await page.getByText('+ Nueva Orden').click()
  await expect(page).toHaveURL('/ordenes/nueva')
  await marcaVisible(page, true)
  await escena(page, 'El admin da de alta la orden y decide a quién se la asigna', 3190)

  await page.getByLabel('Título').fill(TITULO)
  await page.getByLabel('Descripción').fill('Ajuste de la mesa y verificación de paralelismo.')
  // El Técnico es obligatorio para el admin y el admin lo elige. Sin esto el
  // navegador no manda el formulario y no hay ningun error en pantalla.
  await page.getByLabel('Técnico').selectOption({ index: 1 })
  await page.getByLabel('Fecha Programada').fill('2026-10-15')
  await page.waitForTimeout(900)
  await escena(page, 'Con prioridad y fecha programada, no con un papel', 2940)

  await page.click('button:has-text("Crear Orden")')
  await expect(page).toHaveURL('/ordenes')
  await escena(page, 'Queda en el listado al instante, sin sincronizar nada', 3080)

  // ------------------------------------------------------- el cambio anotado
  // Editar la fecha es lo que genera el log "actualizada". Sin este paso la
  // ficha que se muestra abajo tiene una sola linea de historial y la frase
  // del "valor anterior" no tendria nada que decir.
  await page.getByPlaceholder('Buscar por título...').fill('Orden de demostracion')
  const nueva = page.locator('tbody tr', { hasText: 'Orden de demostracion' }).first()
  await expect(nueva).toBeVisible()
  await nueva.locator('a:has-text("Ver detalle")').click()
  await expect(page.getByText('Fotos de avance')).toBeVisible({ timeout: 20000 })

  await page.getByRole('link', { name: 'Editar' }).click()
  await expect(page).toHaveURL(/\/ordenes\/\d+\/editar$/)
  await page.getByLabel('Fecha Programada').fill('2026-10-27')
  await marcaVisible(page, true)
  await escena(page, 'Y después va cambiando: cada cambio queda anotado', 2930)

  await page.getByRole('button', { name: 'Guardar Cambios' }).click()
  await expect(page).toHaveURL(/\/ordenes\/\d+$/)

  // ---------------------------------------------------------------- historial
  // La espera es por la fila del log, no por un tiempo fijo: el POST del log
  // va aparte del guardado y con la red de produccion a veces llega tarde. Si
  // la escena arranca antes de que exista, muestra una ficha con una sola linea
  // y la frase queda mintiendo.
  await page.getByText('Historial de cambios').scrollIntoViewIfNeeded()
  // Se espera la fila del cambio de fecha, no la caja del historial: la escena
  // dice "el valor anterior", y sin esa fila no hay nada que mostrar.
  await expect(
    page.locator('[data-testid="log-historial"]', { hasText: 'Fecha programada' })
  ).toBeVisible({ timeout: 20000 })
  await marcaVisible(page, false)
  await escena(page, 'La ficha con el historial: quién hizo el cambio, cuándo, y cuál era el valor anterior', 4050)

  // --------------------------------------------------------------------- PDF
  // No se puede mostrar en pantalla porque jsPDF descarga el archivo. Lo que se
  // ve es el click y la descarga; el archivo se guarda aparte para mandarlo
  // como muestra.
  let pdf = null
  try {
    const [descarga] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      page.getByRole('button', { name: 'PDF' }).click(),
    ])
    await escena(page, 'Y sale en PDF con el historial: el respaldo que se archiva', 3260)
    pdf = await descarga.path()
  } catch (e) {
    console.log(`  (la escena del PDF no salio: ${e.message})`)
  }

  // -------------------------------------------------------------- el borrado
  // El caso que Calidad va a preguntar. La orden ya tiene historial, asi que el
  // borrado tiene que frenarse: el aviso que queda es el del toast.
  await page.getByRole('button', { name: 'Eliminar' }).click()
  await expect(page.getByText('¿Eliminar esta orden de trabajo?')).toBeVisible()
  await page.getByRole('button', { name: 'Aceptar' }).click()
  await expect(page.getByText(/el registro es el respaldo/i)).toBeVisible({ timeout: 20000 })
  await marcaVisible(page, true)
  await escena(page, 'Una orden que ya tiene historial no se puede borrar', 2680)

  // El toast dura 5s y la frase pide un poco mas que eso. La segunda escena
  // juega a favor: vuelve al historial, que es la razon por la que existe la
  // regla.
  await page.getByText('Historial de cambios').scrollIntoViewIfNeeded()
  await escena(page, 'El registro es el respaldo, no se tira', 2700)

  // ---------------------------------------------------------------- equipos
  await irA(page, 'Equipos')
  await expect(page.getByText('Torno CNC')).toBeVisible({ timeout: 20000 })
  await escena(page, 'El parque de máquinas, con el estado de cada una', 2880)

  // ---------------------------------------------------------------- compras
  await irA(page, 'Compras')
  await expect(page.getByText('+ Nueva Compra')).toBeVisible({ timeout: 20000 })
  await escena(page, 'Compras de repuestos, con su historial de pedidos', 2750)

  // --------------------------------------------------------------- reportes
  await irA(page, 'Reportes')
  await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible({ timeout: 20000 })
  // Recharts necesita medir el contenedor para dibujar: sin esta pausa el video
  // muestra la pagina con los graficos a medio render.
  await page.waitForTimeout(2600)
  await escena(page, 'Reportes con números para decidir, no para mirar', 2810)

  // ----------------------------------------------------------------- cierre
  // El dominio no se narra (suena mal en voz alta) pero queda en pantalla.
  await cartela(page, 'IMAE', 'Control de mantenimiento hoy · Órdenes, equipos, compras y reportes', 3900)

  const { guion, srt } = escribirGuion('admin')
  console.log(`guion: ${guion}`)
  console.log(`srt: ${srt}`)
  if (pdf) {
    fs.copyFileSync(pdf, 'videos/orden-muestra.pdf')
    console.log('pdf de muestra: videos/orden-muestra.pdf')
  }
})