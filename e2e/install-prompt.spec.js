import { test, expect } from '@playwright/test'
import { login } from './helpers'

// Safari nunca dispara beforeinstallprompt, asi que en iOS la unica forma de
// instalar es a mano. Probar solo el evento de Chromium no cubriria justo el
// caso de los tecnicos, que es el que importa.
const UA_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const UA_CHROME_DESKTOP =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
// WebView de app en Android. Lo delata el token ;wv), que es lo que manda
// WhatsApp cuando abre un link adentro.
const UA_ANDROID_WEBVIEW =
  'Mozilla/5.0 (Linux; Android 14; SM-S911B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.0.0 Mobile Safari/537.36'

const nota = (page) => page.getByRole('region', { name: 'Instalar IMAE' })

// playwright.config.js siembra installDismissed en el storageState para que el
// overlay no capture los clicks del resto de los specs. Este archivo es el
// unico que necesita el cartel, asi que pisa el storageState por uno vacio.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('prompt de instalacion en iOS', () => {
  // Solo se emula el userAgent. El viewport queda de escritorio para que el
  // sidebar este siempre visible y el test no dependa de abrir el drawer.
  test.use({ userAgent: UA_IPHONE })

  test('aparece sin iniciar sesion, en el login', async ({ page }) => {
    await page.goto('/login')

    // Este era el hueco: el aviso vivia bajo ProtectedRoute, asi que el que
    // abria el link desde el celu sin sesion no veia nada.
    await expect(nota(page)).toBeVisible()
    await expect(nota(page).getByText('Tocá Compartir')).toBeVisible()

    // Y no tapa el formulario: el login sigue siendo usable.
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('la nota va debajo del boton de ingresar', async ({ page }) => {
    await page.goto('/login')
    await expect(nota(page)).toBeVisible()

    const enviar = page.locator('button[type="submit"]')
    const caja = await nota(page).boundingBox()
    const boton = await enviar.boundingBox()
    expect(caja.y).toBeGreaterThan(boton.y + boton.height)
  })

  test('descartar la nota la saca, y sigue sacada mientras dure el plazo', async ({ page }) => {
    await page.goto('/login')
    await expect(nota(page)).toBeVisible()
    await nota(page).getByRole('button', { name: 'No mostrar de nuevo' }).click()
    await expect(nota(page)).toHaveCount(0)

    await page.reload()
    await expect(nota(page)).toHaveCount(0)
  })

  // En el celu no hay DevSettings, asi que un descarte sin vencimiento dejaba al
  // usuario sin prompt para siempre. Este caso es el que evita esa trampita.
  test('el descarte vencido deja que el cartel vuelva solo', async ({ page }) => {
    await page.addInitScript(() => {
      const DIA = 86_400_000
      localStorage.setItem('installDismissed', String(Date.now() - 8 * DIA))
    })
    await page.goto('/login')

    await expect(nota(page)).toBeVisible()
  })

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

  // Escape cierra pero no decide: si quemara la preferencia, un toque perdido en
  // el overlay (que en un celular es toda la pantalla) dejaria al tecnico sin
  // aviso y sin recuperacion.
  test('cerrar con Escape no consume el descarte', async ({ page }) => {
    await login(page)
    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible({ timeout: 10_000 })
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)

    await page.reload()
    // El item del sidebar sigue disponible como via manual. Timeout propio
    // porque el reload vuelve a pegarle a Supabase Auth para revalidar la sesion.
    await expect(page.getByText('Agregar a la pantalla')).toBeVisible({ timeout: 20_000 })
    await expect(sheet).toBeVisible({ timeout: 10_000 })
  })

  test('descartar con el boton lo saca mientras dure el plazo', async ({ page }) => {
    await login(page)
    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible({ timeout: 10_000 })
    await sheet.getByRole('button', { name: 'Entendido' }).click()
    await expect(sheet).toHaveCount(0)

    await page.reload()
    await expect(page.getByText('Agregar a la pantalla')).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(1500)
    await expect(sheet).toHaveCount(0)
  })
})

// El caso de escritorio es el que mas se rompio: sin el evento de Chromium el
// hook se quedaba esperando y no mostraba ni el sheet ni el item del sidebar.
test.describe('prompt de instalacion en escritorio', () => {
  test.use({ userAgent: UA_CHROME_DESKTOP })

  test('ofrece la guia del menu de Chrome, sin esperar al evento', async ({ page }) => {
    await login(page)

    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible({ timeout: 10_000 })
    await expect(sheet.getByText('Tocá el menú ⋮, arriba a la derecha')).toBeVisible()
    await expect(sheet.getByText('Elegí Instalar página como app')).toBeVisible()
    // El titulo es el mismo que en el celu y no lleva descripcion.
    await expect(sheet.getByText('Instala IMAE como app')).toBeVisible()
    await expect(sheet.getByText(/barra de navegador/)).toHaveCount(0)
  })

  test('aparece sin iniciar sesion, en el login', async ({ page }) => {
    await page.goto('/login')
    const nota = page.getByRole('region', { name: 'Instalar IMAE' })
    await expect(nota).toBeVisible()
    await expect(nota.getByText('Instala IMAE como app')).toBeVisible()
    await expect(nota.getByText('Elegí Instalar página como app')).toBeVisible()
  })
})

// El link suele llegar por WhatsApp, que lo abre en su WebView. Ahi no hay
// instalar: el cartel tiene que empujar a Chrome en vez de listar un menu que no
// existe, y no puede prometer el item del sidebar, que tampoco puede cumplir.
test.describe('prompt de instalacion en una WebView de app', () => {
  test.use({ userAgent: UA_ANDROID_WEBVIEW })

  test('en el login ofrece salir a Chrome, no instalar', async ({ page }) => {
    await page.goto('/login')

    const nota = page.getByRole('region', { name: 'Instalar IMAE' })
    await expect(nota).toBeVisible()
    await expect(nota.getByText('Abrí IMAE en Chrome para instalarla')).toBeVisible()
    await expect(nota.getByText('Elegí Abrir en Chrome')).toBeVisible()
    await expect(nota.getByRole('link', { name: 'Abrir en Chrome' })).toBeVisible()
  })

  test('logueado muestra el cartel pero no el item de agregar del sidebar', async ({ page }) => {
    await login(page)

    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible({ timeout: 10_000 })
    await expect(sheet.getByText('Abrí IMAE en Chrome para instalarla')).toBeVisible()
    await expect(sheet.getByRole('link', { name: 'Abrir en Chrome' })).toBeVisible()

    await expect(page.getByText('Agregar a la pantalla')).toHaveCount(0)
  })
})
