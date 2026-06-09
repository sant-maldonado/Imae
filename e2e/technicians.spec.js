import { test, expect } from '@playwright/test'

test.describe('Technicians', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@ejemplo.com')
    await page.fill('input[type="password"]', 'CHANGE-ME')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('shows technician cards', async ({ page }) => {
    await page.goto('/tecnicos')
    await expect(page.locator('text=Carlos López')).toBeVisible()
    await expect(page.locator('text=María García')).toBeVisible()
  })
})
