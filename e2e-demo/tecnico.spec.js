import { test, expect } from '@playwright/test'
import { reiniciar, montarOverlay, escena, cartela, irA, marcaVisible, leyenda, escribirGuion, ingresar } from './ayuda.js'

test('video de presentacion: tecnico', async ({ page }) => {
  reiniciar()
  test.setTimeout(9 * 60 * 1000)

  // 20s por accion: sin esto un selector mal puesto se queda esperando el
  // timeout del test entero (9 min) en vez de fallar al toque.
  page.setDefaultTimeout(20000)

  await page.goto('/login')
  await montarOverlay(page)

  // ---------------------------------------------------------------- portada
  await cartela(
    page,
    'IMAE',
    'Para el tecnico, en el taller, desde el celular',
    3400
  )

  // ----------------------------------------------------------------- ingreso
  await leyenda(page, 'Cada uno entra con su usuario')
  await ingresar(page, process.env.E2E_TECNICO_EMAIL, process.env.E2E_TECNICO_PASSWORD)
  await marcaVisible(page, true)

  // -------------------------------------------------------------- dashboard
  // El tecnico ve los mismos cuatro tiles que el admin, pero con los numeros
  // que le tocan a el: el RLS le filtra las ordenes ajenas. Y abajo, en la
  // tarjeta de perfil, cuantas tiene asignadas.
  await expect(page.getByTestId('stat-pendientes')).toBeVisible()
  await expect(page.getByText('Órdenes asignadas a vos')).toBeVisible({ timeout: 20000 })
  await escena(page, 'El tecnico ve el estado de SU trabajo, no el de todo el taller', 3600)

  // ---------------------------------------------------------------- ordenes
  await irA(page, 'Órdenes')
  await expect(page.getByPlaceholder('Buscar por título...')).toBeVisible()
  await escena(page, 'Solo las ordenes que tiene asignadas', 3200)

  // ------------------------------------------- detalle y avance del trabajo
  await page.getByPlaceholder('Buscar por título...').fill('Mantenimiento preventivo')
  const fila = page.locator('tbody tr', { hasText: 'Mantenimiento preventivo' }).first()
  await expect(fila).toBeVisible()
  await escena(page, 'Busca la suya y abre la ficha', 2200)
  await fila.locator('a:has-text("Ver detalle")').click()
  await expect(page.getByText('Fotos de avance')).toBeVisible({ timeout: 20000 })
  await marcaVisible(page, false)
  await escena(page, 'Ve el detalle completo, con su historial', 3200)

  await marcaVisible(page, true)
  // El boton de una orden de trabajo es "Completar". El "Marcar En Curso" que
  // usa el E2E de compras es de PurchaseDetail, no de WorkOrderDetail.
  try {
    await page.click('button:has-text("Completar")')
    await expect(page.getByRole('button', { name: 'Completar' })).toHaveCount(0, { timeout: 15000 })
    await escena(page, 'Cuando termina, la marca como completada y el taller lo sabe al toque', 3400)
  } catch (e) {
    console.log(`  (no se pudo completar la orden: ${e.message})`)
  }

  // -------------------------------------------- permisos, a la vista misma
  // El label del select dice "(vos)". Ese par de parentesis ES la prueba: el
  // admin ve "Tecnico" con la lista completa, el tecnico ve "Tecnico (vos)" y
  // no puede asignarle la orden a otro.
  await irA(page, 'Órdenes')
  await page.getByText('+ Nueva Orden').click()
  await expect(page).toHaveURL('/ordenes/nueva')
  const selectTecnico = page.getByLabel('Técnico (vos)')
  await expect(selectTecnico).toBeVisible({ timeout: 20000 })
  await expect(selectTecnico.locator('option')).toHaveCount(2)
  await escena(page, 'Puede dar de alta una orden, pero solo puede asignarsela a si mismo', 3600)

  await page.getByLabel('Título').fill('Presentacion IMAE - Ajuste de mesa')
  await page.getByLabel('Descripción').fill('Ajuste de la mesa y verificacion de paralelismo.')
  await selectTecnico.selectOption({ index: 1 })
  await page.getByLabel('Fecha Programada').fill('2026-10-20')
  await page.waitForTimeout(900)
  await escena(page, 'La carga en el momento, en el taller, sin volver a la oficina', 3200)

  await page.click('button:has-text("Crear Orden")')
  await expect(page).toHaveURL('/ordenes')
  await escena(page, 'Y ya esta en el sistema', 2800)

  // ------------------------------------------------- se instala como una app
  // Se abre desde el item del sidebar y no esperando que aparezca solo: el
  // overlay z-50 del sheet se come los clicks y abrirlo a mano es lo que hace
  // un usuario la segunda vez que lo cerro.
  try {
    await page.locator('aside').getByRole('button', { name: 'Agregar a la pantalla' }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15000 })
    await marcaVisible(page, false)
    await escena(page, 'Y se instala en el celular como una app, con icono propio', 3800)
    await page.keyboard.press('Escape')
  } catch (e) {
    console.log(`  (no se pudo abrir el cartel de instalacion: ${e.message})`)
  }

  // ----------------------------------------------------------------- cierre
  await marcaVisible(page, true)
  await cartela(page, 'IMAE', 'imae-nu.vercel.app · Control de mantenimiento', 3600)

  const { guion, srt } = escribirGuion('tecnico')
  console.log(`guion: ${guion}`)
  console.log(`srt: ${srt}`)
})
