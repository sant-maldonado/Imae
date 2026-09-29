import { defineConfig } from '@playwright/test'
import { CLAVE_PROMPT } from './e2e/clave-prompt.js'

// Suite aparte de la de e2e a proposito. La principal corre contra `npm run dev`,
// donde el service worker no existe (devOptions.enabled = false), asi que nunca
// tocaria la PWA. Esta corre contra el build real servido por `vite preview`.
//
// No comparte la base de datos con la otra: no hace login ni escribe nada, asi
// que no choca con el `workers: 1` que necesitan los E2E que si pegan a la real.
export default defineConfig({
  testDir: './e2e-pwa',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Mismo motivo que en playwright.config.js: esta suite corre contra el build
    // real, con manifest y service worker, asi que el aviso se abriria solo y el
    // overlay capturaria los clicks. Aca no hay specs que necesiten el cartel.
    storageState: {
      cookies: [],
      origins: [
        { origin: 'http://localhost:4173', localStorage: [{ name: CLAVE_PROMPT, value: '1' }] },
      ],
    },
  },
  webServer: {
    command: 'npm run build && npm run preview:pwa',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 180000,
  },
})
