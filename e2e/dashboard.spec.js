import { test, expect } from '@playwright/test'
import { login, credenciales } from './helpers'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('muestra los 4 tiles de resumen con valor', async ({ page }) => {
    for (const id of ['stat-pendientes', 'stat-en-progreso', 'stat-averiados', 'stat-compras']) {
      const tile = page.getByTestId(id)
      await expect(tile).toBeVisible()
      await expect(tile).toHaveText(/\d/)
    }
  })

  test('cada tile navega a su seccion', async ({ page }) => {
    await page.getByTestId('stat-averiados').click()
    await expect(page).toHaveURL('/equipos')
    await page.goBack()
    await page.getByTestId('stat-compras').click()
    await expect(page).toHaveURL('/compras')
  })

  test('el CTA abre el formulario de nueva orden', async ({ page }) => {
    await page.getByTestId('cta-nueva-orden').click()
    await expect(page).toHaveURL('/ordenes/nueva')
  })

  test('lista las ordenes pendientes y enlaza al detalle', async ({ page }) => {
    // el heading solo aparece cuando useOrdenes dejo de cargar
    await expect(page.getByRole('heading', { name: 'Órdenes pendientes' })).toBeVisible()
    const pendientes = page.getByTestId('orden-pendiente')
    if (await pendientes.count() === 0) {
      await expect(page.getByText('No hay órdenes pendientes')).toBeVisible()
      return
    }
    const titulo = await pendientes.first().locator('p').first().innerText()
    await pendientes.first().click()
    await expect(page).toHaveURL(/\/ordenes\/\d+$/)
    await expect(page.getByText(titulo).first()).toBeVisible()
  })

  test('shows user profile info', async ({ page }) => {
    const { EMAIL } = credenciales()
    await expect(page.getByTestId('tarjeta-perfil')).toBeVisible()
    await expect(page.getByTestId('tarjeta-perfil')).toContainText(EMAIL)
  })
})
