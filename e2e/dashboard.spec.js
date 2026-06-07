import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@ejemplo.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('shows 4 quick-access cards', async ({ page }) => {
    await expect(page.locator('text=Ver Órdenes')).toBeVisible()
    await expect(page.locator('text=Calendario')).toBeVisible()
    await expect(page.locator('text=Equipos')).toBeVisible()
    await expect(page.locator('text=Compras')).toBeVisible()
  })

  test('each card navigates to correct section', async ({ page }) => {
    await page.click('text=Ver Órdenes')
    await expect(page).toHaveURL('/ordenes')
    await page.goBack()
    await page.click('text=Equipos')
    await expect(page).toHaveURL('/equipos')
  })

  test('shows user profile info', async ({ page }) => {
    await expect(page.locator('text=admin@ejemplo.com')).toBeVisible()
  })
})
