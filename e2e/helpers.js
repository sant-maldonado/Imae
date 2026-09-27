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

export function hayCredencialesDeTecnico() {
  return Boolean(process.env.E2E_TECNICO_EMAIL && process.env.E2E_TECNICO_PASSWORD)
}

export function hayCredencialesDeOperador() {
  return Boolean(process.env.E2E_OPERADOR_EMAIL && process.env.E2E_OPERADOR_PASSWORD)
}

// Editar y completar ordenes pasan por funciones SECURITY DEFINER que todavia
// no estan en la base: sin correr interno/aplicar_rls_ordenes.sql no hay forma
// de probarlas de punta a punta. Los guards de UI, en cambio, ya se pueden.
export function migracionDePermisosAplicada() {
  return process.env.E2E_PERMISOS === '1'
}

export async function login(page) {
  const { EMAIL, PASSWORD } = credenciales()
  await page.goto('/login')
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/')
}

export async function loginComoTecnico(page) {
  return loginCon(page, process.env.E2E_TECNICO_EMAIL, process.env.E2E_TECNICO_PASSWORD)
}

export async function loginComoOperador(page) {
  return loginCon(page, process.env.E2E_OPERADOR_EMAIL, process.env.E2E_OPERADOR_PASSWORD)
}

async function loginCon(page, email, password) {
  if (!email || !password) {
    throw new Error('Faltan las credenciales del rol en el .env.')
  }
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/')
}
