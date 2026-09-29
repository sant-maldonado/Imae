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

// El id de la fila en la tabla tecnicos del usuario E2E_TECNICO_EMAIL. Va en el
// .env y no hardcodeado en el spec porque es un int que existe en la DB real y
// puede cambiar: el select de asignacion se elige por value, no por nombre (dos
// tecnicos pueden llamarse igual).
export function idDeTecnicoE2E() {
  const id = Number(process.env.E2E_TECNICO_ID)
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(
      'Falta E2E_TECNICO_ID en el .env: es el id de la fila de E2E_TECNICO_EMAIL en la tabla tecnicos.'
    )
  }
  return id
}

// Editar y completar ordenes pasan por funciones SECURITY DEFINER que viven en
// la base desde la migracion de permisos. Los tests que las exercised de punta a
// punta se saltan solas mientras E2E_PERMISOS valga 0, para que el repo siga
// siendo clonable contra una base sin los permisos.
export function migracionDePermisosAplicada() {
  return process.env.E2E_PERMISOS === '1'
}

export async function login(page) {
  const { EMAIL, PASSWORD } = credenciales()
  return loginCon(page, EMAIL, PASSWORD)
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
  const campo = page.locator('input[type="email"]')
  // Si quedo la sesion de otro rol, /login redirige al dashboard y este input
  // nunca aparece. Sin este assert el fill se queda esperando hasta el timeout
  // y el error dice "test timeout" en vez de "sesion colada".
  await expect(campo).toBeVisible()
  await campo.fill(email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  // Timeout propio porque la redireccion depende de un round trip a Supabase
  // Auth: con el default de 5s fallo una vez con el boton en "Procesando...".
  await expect(page).toHaveURL('/', { timeout: 20_000 })
}

// El prompt de instalacion tiene camino manual tambien en escritorio Chromium
// (el menu de Chrome), asi que en el UA de escritorio se abriria solo sobre cada
// pagina y el overlay z-50 capturaria los clicks. Por eso los dos configs de
// Playwright lo siembran en el storageState, y los specs que si necesitan el
// cartel (install-prompt.spec.js) pisan el storageState por uno vacio.
export { CLAVE_PROMPT } from './clave-prompt.js'
