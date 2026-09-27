import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Technicians', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('shows technician cards', async ({ page }) => {
    await page.goto('/tecnicos')
    await expect(page.locator('text=Carlos López')).toBeVisible()
    await expect(page.locator('text=María García')).toBeVisible()
  })
})
