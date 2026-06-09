import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@ejemplo.com')
    await page.fill('input[type="password"]', 'CHANGE-ME')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('shows 4 quick-access cards', async ({ page }) => {
    const cards = page.locator('a[href^="/"] span.text-sm')
    await expect(cards.filter({ hasText: 'Ver Órdenes' })).toBeVisible()
    await expect(cards.filter({ hasText: 'Calendario' })).toBeVisible()
    await expect(cards.filter({ hasText: 'Equipos' })).toBeVisible()
    await expect(cards.filter({ hasText: 'Compras' })).toBeVisible()
  })

  test('each card navigates to correct section', async ({ page }) => {
    await page.getByRole('link', { name: 'Ver Órdenes', exact: true }).click()
    await expect(page).toHaveURL('/ordenes')
    await page.goBack()
    await page.getByRole('link', { name: 'Equipos', exact: true }).click()
    await expect(page).toHaveURL('/equipos')
  })

  test('shows user profile info', async ({ page }) => {
    await expect(page.locator('text=admin@ejemplo.com')).toBeVisible()
  })
})
