import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Profile', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('visits profile page', async ({ page }) => {
    await page.goto('/perfil')
    await expect(page.locator('text=Perfil')).toBeVisible()
  })
})
