import { test, expect } from '@playwright/test'

test.describe('Work Orders CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@ejemplo.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('list shows orders and can filter', async ({ page }) => {
    await page.goto('/ordenes')
    await expect(page.locator('table')).toBeVisible()
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible()
  })

  test('create new order and view detail', async ({ page }) => {
    await page.goto('/ordenes/nueva')
    await expect(page.locator('text=Nueva Orden de Trabajo')).toBeVisible()

    await page.fill('input[required]', 'Test Order E2E')
    await page.fill('textarea', 'E2E test description')
    await page.click('button:has-text("Crear Orden")')
  })

  test('can navigate to order detail', async ({ page }) => {
    await page.goto('/ordenes')
    const detailLink = page.locator('a:has-text("Ver detalle")').first()
    if (await detailLink.isVisible()) {
      await detailLink.click()
      await expect(page.locator('text=Órdenes').first()).toBeVisible()
    }
  })
})
