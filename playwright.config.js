import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

// Node >= 20.12 lo trae nativo, asi que no hace falta dotenv. Se carga el
// .env para que los E2E puedan leer E2E_EMAIL / E2E_PASSWORD.
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
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: false,
    timeout: 30000,
  },
})
