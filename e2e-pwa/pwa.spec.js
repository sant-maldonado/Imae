import { test, expect } from '@playwright/test'

// Ojo con el alcance de esto: los headers de vercel.json (el Content-Type del
// manifest, el must-revalidate del sw.js) solo los aplica Vercel, no
// `vite preview`. Asi que esta suite no los puede verificar. Si alguno se rompe
// en produccion, hay que mirarlo desde la red real.

test('el build produce un service worker de workbox', async ({ request }) => {
  const res = await request.get('/sw.js')
  expect(res.status()).toBe(200)
  const cuerpo = await res.text()
  expect(cuerpo).toContain('workbox')
  // El nombre de la funcion de precache puede cambiar entre versiones de
  // workbox, asi que se busca la palabra y no la llamada exacta.
  expect(cuerpo.toLowerCase()).toContain('precache')
})

test('el manifest esta completo y sus iconos se sirven', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest')
  expect(res.status()).toBe(200)
  const manifest = await res.json()

  expect(manifest.name).toBe('IMAE - Control de Mantenimiento')
  expect(manifest.short_name).toBe('IMAE')
  expect(manifest.display).toBe('standalone')
  expect(manifest.start_url).toBe('/')
  expect(manifest.icons.map((i) => i.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  )
  expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true)

  for (const icono of manifest.icons) {
    const r = await request.get(icono.src)
    expect(r.status(), `no se sirve ${icono.src}`).toBe(200)
  }
})

test('el shell abre en un deep link con la red caida', async ({ page, context }) => {
  await page.goto('/')

  // clientsClaim hace que el SW tome control de esta pagina ya mismo, sin
  // pedirle un segundo reload.
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, {
    timeout: 30000,
  })

  await context.setOffline(true)
  const respuesta = await page.goto('/ordenes/1')

  // Si el SW no sirviera el precache, la navegacion fallaria con
  // ERR_INTERNET_DISCONNECTED en vez de devolver un 200.
  expect(respuesta?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Control de Mantenimiento' })).toBeVisible()
})
