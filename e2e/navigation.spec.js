import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('sidebar navigates to all sections', async ({ page }) => {
    const links = [
      { name: 'Órdenes', url: '/ordenes' },
      { name: 'Equipos', url: '/equipos' },
      { name: 'Técnicos', url: '/tecnicos' },
      { name: 'Calendario', url: '/calendario' },
      { name: 'Compras', url: '/compras' },
      { name: 'Reportes', url: '/reportes' },
    ]

    for (const link of links) {
      await page.click(`text=${link.name}`)
      await expect(page).toHaveURL(link.url)
    }
  })
})
