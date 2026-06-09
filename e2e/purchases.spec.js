import { test, expect } from '@playwright/test'

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
    await expect(page.locator('text=+ Nueva Compra')).toBeVisible()
  })

  test('navigate to new purchase form', async ({ page }) => {
    await page.goto('/compras')
    await page.click('text=+ Nueva Compra')
    await expect(page).toHaveURL('/compras/nueva')
    await expect(page.locator('text=Nueva Orden de Compra')).toBeVisible()
  })

  test('create new purchase order', async ({ page }) => {
    await page.goto('/compras/nueva')
    await page.fill('input[placeholder="Nombre del proveedor"]', 'Test Provider')
    await page.fill('input[placeholder="Descripción del artículo"]', 'Test Article')
    await page.fill('input[type="number"]', '10')
    await page.click('button:has-text("Crear Compra")')
  })

  test('view purchase detail', async ({ page }) => {
    await page.goto('/compras')
    const detailLink = page.locator('a:has-text("Ver detalle")').first()
    if (await detailLink.isVisible()) {
      await detailLink.click()
      await expect(page.locator('text=Compras').first()).toBeVisible()
    }
  })
})
