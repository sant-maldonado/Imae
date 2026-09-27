import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('renders reports page with charts', async ({ page }) => {
    await page.goto('/reportes')
    await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible()
    await expect(page.locator('button:has-text("CSV")').first()).toBeVisible()
  })
})
