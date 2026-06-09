import { test, expect } from '@playwright/test'

test.describe('Login flow', () => {
  test('login with admin credentials and logout', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.waitForSelector('input[type="email"]', { timeout: 15000 })
    await page.fill('input[type="email"]', 'admin@ejemplo.com')
    await page.fill('input[type="password"]', 'CHANGE-ME')
    await page.click('button[type="submit"]')
    await expect(page.getByText('Ver Órdenes')).toBeVisible({ timeout: 30000 })
    await page.getByText('Cerrar sesión').click()
    await expect(page).toHaveURL('/login', { timeout: 15000 })
  })
})
