import { test, expect } from '@playwright/test'

test.describe('Equipment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@ejemplo.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('shows equipment grid', async ({ page }) => {
    await page.goto('/equipos')
    await expect(page.locator('text=Torno CNC')).toBeVisible()
    await expect(page.locator('text=Fresadora Universal')).toBeVisible()
  })

  test('navigates to equipment detail', async ({ page }) => {
    await page.goto('/equipos')
    await page.click('text=Torno CNC')
    await expect(page).toHaveURL(/\/equipos\/\d+/)
  })
})
