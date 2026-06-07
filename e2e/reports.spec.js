import { test, expect } from '@playwright/test'

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@ejemplo.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('renders reports page with charts', async ({ page }) => {
    await page.goto('/reportes')
    await expect(page.locator('text=Reportes')).toBeVisible()
    await expect(page.locator('button:has-text("CSV")').first()).toBeVisible()
  })
})
