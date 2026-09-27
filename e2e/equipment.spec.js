import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Equipment', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
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
