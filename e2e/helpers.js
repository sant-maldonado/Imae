import { expect } from '@playwright/test'

// Las credenciales vienen del .env (ver .env.example), no hardcodeadas: el
// repo es publico y antes la contrasena de admin estaba escrita en los 10
// specs. No llevan prefijo VITE_ justamente para que Vite NO las meta en el
// bundle del cliente: los E2E corren en Node, no en el navegador.
const EMAIL = process.env.E2E_EMAIL
const PASSWORD = process.env.E2E_PASSWORD

export function credenciales() {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      'Faltan E2E_EMAIL y E2E_PASSWORD en el .env. Copiá las claves de .env.example.'
    )
  }
  return { EMAIL, PASSWORD }
}

export async function login(page) {
  const { EMAIL, PASSWORD } = credenciales()
  await page.goto('/login')
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/')
}
