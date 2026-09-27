import { test, expect } from '@playwright/test'
import { login, credenciales } from './helpers'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('shows 4 quick-access cards', async ({ page }) => {
    const cards = page.locator('a[href^="/"] span.text-sm')
    await expect(cards.filter({ hasText: 'Ver Órdenes' })).toBeVisible()
    await expect(cards.filter({ hasText: 'Calendario' })).toBeVisible()
    await expect(cards.filter({ hasText: 'Equipos' })).toBeVisible()
    await expect(cards.filter({ hasText: 'Compras' })).toBeVisible()
  })

  test('each card navigates to correct section', async ({ page }) => {
    await page.getByRole('link', { name: 'Ver Órdenes', exact: true }).click()
    await expect(page).toHaveURL('/ordenes')
    await page.goBack()
    await page.getByRole('link', { name: 'Equipos', exact: true }).click()
    await expect(page).toHaveURL('/equipos')
  })

  test('shows user profile info', async ({ page }) => {
    const { EMAIL } = credenciales()
    await expect(page.locator(`text=${EMAIL}`)).toBeVisible()
  })
})
