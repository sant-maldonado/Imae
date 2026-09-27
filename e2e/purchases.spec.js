import { test, expect } from '@playwright/test'

// Igual que en ordenes: antes el test de creacion no comprobaba nada y
// dejaba la compra en la BD. Ahora afirma, verifica el vinculo con la
// orden y borra lo que creo.
const SELLO = Date.now()
const MARCA_CREAR = `Test Article E2E crear ${SELLO}`
const MARCA_BORRAR = `Test Article E2E borrar ${SELLO}`

async function eliminarCompra(page, articulo) {
  await page.goto('/compras')
  await page.getByPlaceholder('Buscar por artículo...').fill(articulo)
  await page.locator('tbody tr', { hasText: articulo }).locator('a:has-text("Ver detalle")').click()
  await page.click('button:has-text("Eliminar")')
  await expect(page.getByText('¿Eliminar esta orden de compra?')).toBeVisible()
  await page.click('button:has-text("Aceptar")')
  await expect(page).toHaveURL('/compras')
}

async function crearCompra(page, articulo) {
  await page.goto('/compras/nueva')
  await page.getByLabel('Proveedor').fill('Test Provider E2E')
  await page.getByLabel('Artículo').fill(articulo)
  await page.getByLabel('Cantidad').fill('10')
  await page.getByLabel('Unidad').selectOption('unidades')
  await page.getByLabel('Fecha Estimada de Entrega').fill('2026-12-01')
  await page.click('button:has-text("Crear Compra")')
  await expect(page).toHaveURL('/compras')
}

test.describe('Purchases CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@ejemplo.com')
    await page.fill('input[type="password"]', 'CHANGE-ME')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('list shows purchases', async ({ page }) => {
    await page.goto('/compras')
    await expect(page.locator('table')).toBeVisible()
    await expect(page.getByText('+ Nueva Compra')).toBeVisible()
  })

  test('navigate to new purchase form', async ({ page }) => {
    await page.goto('/compras')
    await page.click('text=+ Nueva Compra')
    await expect(page).toHaveURL('/compras/nueva')
    await expect(page.getByText('Nueva Orden de Compra')).toBeVisible()
  })

  test('create a purchase linked to a work order, then view and delete it', async ({ page }) => {
    // El select de orden es opcional; se toma la primera real del seed.
    await page.goto('/compras/nueva')
    const selectOrden = page.getByLabel('Orden de trabajo vinculada')
    await expect(selectOrden.locator('option')).not.toHaveCount(1)
    await selectOrden.selectOption({ index: 1 })
    const ordenId = await selectOrden.inputValue()

    await page.getByLabel('Proveedor').fill('Test Provider E2E')
    await page.getByLabel('Artículo').fill(MARCA_CREAR)
    await page.getByLabel('Cantidad').fill('10')
    await page.getByLabel('Unidad').selectOption('unidades')
    await page.getByLabel('Fecha Estimada de Entrega').fill('2026-12-01')
    await page.click('button:has-text("Crear Compra")')

    await expect(page).toHaveURL('/compras')

    // La lista filtra por artículo, así que se busca por ahí.
    await page.getByPlaceholder('Buscar por artículo...').fill(MARCA_CREAR)
    const fila = page.locator('tbody tr', { hasText: MARCA_CREAR })
    await expect(fila).toHaveCount(1)
    await expect(fila).toContainText('Test Provider E2E')
    await expect(fila).toContainText('Pendiente')
    // Columna Orden del listado: tiene que mostrar el vinculo.
    await expect(fila.locator(`a[href="/ordenes/${ordenId}"]`)).toBeVisible()

    await fila.locator('a:has-text("Ver detalle")').click()
    await expect(page).toHaveURL(/\/compras\/\d+$/)
    await expect(page.getByRole('heading', { name: MARCA_CREAR })).toBeVisible()
    await expect(page.getByText('Test Provider E2E')).toBeVisible()

    // El detail enlaza a la orden, y esa orden existe de verdad.
    const linkOrden = page.locator('a[href^="/ordenes/"]')
    await expect(linkOrden).toHaveAttribute('href', `/ordenes/${ordenId}`)
    await linkOrden.click()
    await expect(page).toHaveURL(new RegExp(`/ordenes/${ordenId}$`))
    await expect(page.getByText('Nueva Orden de Trabajo')).toBeVisible()

    await eliminarCompra(page, MARCA_CREAR)
    await page.getByPlaceholder('Buscar por artículo...').fill(MARCA_CREAR)
    await expect(page.locator('tbody tr', { hasText: MARCA_CREAR })).toHaveCount(0)
  })

  test('a purchase can be created without linking an order', async ({ page }) => {
    await crearCompra(page, MARCA_BORRAR)

    await page.getByPlaceholder('Buscar por artículo...').fill(MARCA_BORRAR)
    const fila = page.locator('tbody tr', { hasText: MARCA_BORRAR })
    await expect(fila).toHaveCount(1)
    // Sin vinculo: la celda muestra "-", no un link.
    await expect(fila.locator('td a[href^="/ordenes/"]')).toHaveCount(0)

    await fila.locator('a:has-text("Ver detalle")').click()
    await expect(page.getByText('Sin vincular')).toBeVisible()

    await eliminarCompra(page, MARCA_BORRAR)
  })

  test('view purchase detail', async ({ page }) => {
    await page.goto('/compras')
    // El `if (await link.isVisible())` original hacia pasar el test en
    // silencio cuando no habia ningun link.
    const detailLink = page.locator('a:has-text("Ver detalle")').first()
    await expect(detailLink).toBeVisible()
    await detailLink.click()
    await expect(page).toHaveURL(/\/compras\/\d+$/)
    await expect(page.getByText('Compras').first()).toBeVisible()
  })
})
