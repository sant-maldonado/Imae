import { test, expect } from '@playwright/test'
import { login, borrarOrdenPorTitulo } from './helpers'

// Los tests de creación dejan datos en la BD real. Cada test usa un
// marcador propio y borra lo que creó al final, para que la suite sea
// repetible y no contamine el seed.
const SELLO = Date.now()
const MARCA_CREAR = `Test Order E2E crear ${SELLO}`
const MARCA_BORRAR = `Test Order E2E borrar ${SELLO}`

// El borrado por UI ya no se usa para limpiar: la app frena las ordenes que
// tienen historial y desde que cada alta escribe su log "creada" eso es todas.
// Este helper queda para el test que verifica QUE el borrado se frena, que es
// el comportamiento que Calidad va a preguntar.
async function intentarBorrarPorUi(page, titulo) {
  await page.goto('/ordenes')
  await page.getByPlaceholder('Buscar por título...').fill(titulo)
  await page.locator('tbody tr', { hasText: titulo }).locator('a:has-text("Ver detalle")').click()
  await page.click('button:has-text("Eliminar")')
  await expect(page.getByText('¿Eliminar esta orden de trabajo?')).toBeVisible()
  await page.click('button:has-text("Aceptar")')
}

async function crearOrden(page, titulo) {
  await page.goto('/ordenes/nueva')
  await page.getByLabel('Título').fill(titulo)
  await page.getByLabel('Descripción').fill('E2E test description')
  await page.getByLabel('Técnico').selectOption({ index: 1 })
  await page.getByLabel('Fecha Programada').fill('2026-12-01')
  await page.click('button:has-text("Crear Orden")')
  await expect(page).toHaveURL('/ordenes')
}

// Red de seguridad: si un assert falla, el delete de abajo nunca corre y la
// orden queda en la BD real. Este helper no falla si ya no esta.
async function limpiar(page, titulo) {
  await borrarOrdenPorTitulo(titulo)
}

test.describe('Work Orders CRUD', () => {
  // Titulo de la orden que creo el test en curso, para el afterEach.
  let pendiente = null

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test.afterEach(async ({ page }) => {
    if (!pendiente) return
    try {
      await limpiar(page, pendiente)
    } catch {
      // Si ni la limpieza puede, no queremos tapar el fallo original.
    }
    pendiente = null
  })

  test('list shows orders and can filter', async ({ page }) => {
    await page.goto('/ordenes')
    await expect(page.locator('table')).toBeVisible()
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible()
  })

  test('create new order and view detail', async ({ page }) => {
    await crearOrden(page, MARCA_CREAR)
    pendiente = MARCA_CREAR

    // Antes el test clickeaba y no COMPROBABA nada, asi que pasaba
    // aunque la orden no se hubiera creado.
    await page.getByPlaceholder('Buscar por título...').fill(MARCA_CREAR)
    const fila = page.locator('tbody tr', { hasText: MARCA_CREAR })
    await expect(fila).toHaveCount(1)
    await expect(fila).toContainText('Pendiente')

    await fila.locator('a:has-text("Ver detalle")').click()
    await expect(page).toHaveURL(/\/ordenes\/\d+$/)
    await expect(page.getByRole('heading', { name: MARCA_CREAR })).toBeVisible()
    await expect(page.getByText('E2E test description')).toBeVisible()

    // La limpieza va por REST porque por la UI ya no se puede: ver helpers.js.
    await borrarOrdenPorTitulo(MARCA_CREAR)
    await page.goto('/ordenes')
    await page.getByPlaceholder('Buscar por título...').fill(MARCA_CREAR)
    await expect(page.locator('tbody tr', { hasText: MARCA_CREAR })).toHaveCount(0)
  })

  test('an order with history cannot be deleted', async ({ page }) => {
    // El caso que Calidad va a preguntar: si se puede borrar una orden que ya
    // tiene registro, la evidencia se pierde. Se frena en la app.
    await crearOrden(page, MARCA_BORRAR)
    pendiente = MARCA_BORRAR

    await intentarBorrarPorUi(page, MARCA_BORRAR)

    await expect(page.getByText(/el registro es el respaldo/i)).toBeVisible()
    // Sigue en la ficha: no se fue al listado, o sea que no se borró.
    await expect(page).toHaveURL(/\/ordenes\/\d+$/)
    await expect(page.getByRole('heading', { name: MARCA_BORRAR })).toBeVisible()
  })

  test('can navigate to order detail', async ({ page }) => {
    await page.goto('/ordenes')
    // Antes estaba envuelto en `if (await link.isVisible())`, asi que
    // pasaba en silencio cuando el link no existia.
    const detailLink = page.locator('a:has-text("Ver detalle")').first()
    await expect(detailLink).toBeVisible()
    await detailLink.click()
    await expect(page).toHaveURL(/\/ordenes\/\d+$/)
    await expect(page.locator('text=Órdenes').first()).toBeVisible()

    // la flecha de volver reemplaza al breadcrumb, pero conserva el id de la orden
    const volver = page.getByTestId('volver-ordenes')
    await expect(volver).toBeVisible()
    await expect(volver).toHaveAttribute('href', '/ordenes')
    await expect(page.locator('[data-testid="volver-ordenes"] ~ span').last()).toHaveText(/^#\d+$/)
    await volver.click()
    await expect(page).toHaveURL('/ordenes')
  })
})
