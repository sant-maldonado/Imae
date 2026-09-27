import { test, expect } from '@playwright/test'
import { login } from './helpers'

// Debe coincidir con el array `meses` de Calendar.jsx. El test hardcodeaba
// "Junio", asi que empezo a fallar solo al cambiar de mes (llevaba fallando
// desde julio). Ahora se calcula el mes actual.
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

test.describe('Calendar', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('renders calendar without scroll', async ({ page }) => {
    await page.goto('/calendario')
    const hoy = new Date()
    await expect(page.getByRole('heading', { name: `${MESES[hoy.getMonth()]} ${hoy.getFullYear()}` })).toBeVisible()
    await expect(page.getByText('Dom', { exact: true })).toBeVisible()

    const bodyHeight = await page.evaluate(() => document.body.scrollHeight)
    const windowHeight = await page.evaluate(() => window.innerHeight)
    expect(bodyHeight - windowHeight).toBeLessThan(50)
  })
})
