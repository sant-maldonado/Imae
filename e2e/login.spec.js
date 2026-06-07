import { test, expect } from '@playwright/test'

test.describe('Login flow', () => {
  test('login with admin credentials and logout', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@ejemplo.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
    await expect(page.locator('text=Dashboard')).toBeVisible()
    await page.click('text=Cerrar sesión')
    await expect(page).toHaveURL('/login')
  })
})
