import { test, expect } from '@playwright/test'
import { login } from './helpers'

// Safari nunca dispara beforeinstallprompt, asi que en iOS la unica forma de
// instalar es a mano. Probar solo el evento de Chromium no cubriria justo el
// caso de los tecnicos, que es el que importa.
const UA_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

test.describe('prompt de instalacion en iOS', () => {
  // Solo se emula el userAgent. El viewport queda de escritorio para que el
  // sidebar este siempre visible y el test no dependa de abrir el drawer.
  test.use({ userAgent: UA_IPHONE })

  test('aparece solo, se cierra con Escape y se reabre desde el sidebar', async ({ page }) => {
    await login(page)

    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible({ timeout: 10_000 })
    await expect(sheet.getByText('Tocá Compartir')).toBeVisible()
    await expect(sheet.getByText('Elegí Agregar a pantalla de inicio')).toBeVisible()
    // En iOS no hay instalar programatico: solo instrucciones.
    await expect(sheet.getByRole('button', { name: 'Instalar' })).toHaveCount(0)

    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)

    // Segunda chance para el que cerro el sheet sin leerlo.
    await page.getByText('Agregar a la pantalla').click()
    await expect(sheet).toBeVisible()
  })

  test('no vuelve a salir solo despues de cerrarlo', async ({ page }) => {
    await login(page)
    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible({ timeout: 10_000 })
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)

    await page.reload()
    // El item del sidebar sigue disponible como la via manual.
    await expect(page.getByText('Agregar a la pantalla')).toBeVisible()
    await page.waitForTimeout(1500)
    await expect(sheet).toHaveCount(0)
  })
})
