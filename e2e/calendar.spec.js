import { test, expect } from '@playwright/test'

test.describe('Calendar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@ejemplo.com')
    await page.fill('input[type="password"]', 'CHANGE-ME')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('renders calendar without scroll', async ({ page }) => {
    await page.goto('/calendario')
    await expect(page.locator('text=Junio')).toBeVisible()
    await expect(page.locator('text=Dom')).toBeVisible()

    const bodyHeight = await page.evaluate(() => document.body.scrollHeight)
    const windowHeight = await page.evaluate(() => window.innerHeight)
    expect(bodyHeight - windowHeight).toBeLessThan(50)
  })
})
