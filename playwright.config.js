import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'
import { CLAVE_PROMPT } from './e2e/clave-prompt.js'

// Playwright ya carga el .env por su cuenta. Este loadEnvFile explicito solo
// cubre lo que se lea despues de este punto: los imports se evaluan antes que
// este cuerpo, asi que un modulo importado que lea process.env en su scope
// depende del .env que cargo Playwright, no de esta linea.
if (existsSync('.env')) process.loadEnvFile('.env')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // El aviso de instalacion se abre solo, y el overlay va con fixed inset-0
    // z-50: en escritorio Chromium ahora si hay guia manual, asi que se
    // montaria sobre cada pagina de cada spec y capturaria los clicks. Se siembra
    // la preferencia antes de que arranque la app para apagarlo.
    //
    // Va por storageState y no por use.addInitScript porque en Playwright 1.60 ese
    // no se aplica: el callback no llega a ejecutarse. storageState siembra el
    // origen antes de la primera navegacion, y encima se pisa por test, que es lo
    // que necesitan los specs del aviso (ver install-prompt.spec.js).
    storageState: {
      cookies: [],
      origins: [
        { origin: 'http://localhost:5173', localStorage: [{ name: CLAVE_PROMPT, value: '1' }] },
      ],
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: false,
    timeout: 30000,
  },
})
