import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

// Igual que en playwright.config.js: los specs leen process.env.E2E_* y este
// archivo se evalua despues de los imports, asi que sin esto el .env todavia no
// esta cargado cuando los leen.
if (existsSync('.env')) process.loadEnvFile('.env')

// Config separada de los E2E de verdad: estos graban video, tardan minutos y
// tocan datos reales. Un solo test por archivo, asi cada .webm es un video
// entero y no hay que concatenar despues.
const ORIGEN = 'https://imae-nu.vercel.app'

export default defineConfig({
  testDir: './e2e-demo',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  // Es un guion largo con pausas deliberadas. El default de 30s lo revienta.
  timeout: 10 * 60 * 1000,
  reporter: [['list']],
  outputDir: 'test-results-demo',
  // Despierta produccion antes de la camara. Sin esto el video arranca
  // grabando contra una instancia de Vercel dormida y se pierden los primeros
  // segundos en blanco. Ver e2e-demo/calentar.mjs.
  globalSetup: './e2e-demo/calentar.mjs',
  // Copia y convierte el .webm antes de que Playwright borre outputDir en la
  // proxima corrida. Sin esto, grabar el segundo video borra el primero.
  globalTeardown: './e2e-demo/teardown.mjs',
  use: {
    baseURL: ORIGEN,

    // Grabar contra produccion a proposito: el video tiene que mostrar
    // exactamente la URL que va a usar el cliente, no un build local.
    viewport: { width: 1280, height: 720 },
    video: { mode: 'on', size: { width: 1280, height: 720 } },

    // Sin esto el cursor se teletransporta de un elemento a otro y el video se ve
    // como una grabacion de test y no como una demo. Con 220 las acciones tardan
    // lo suficiente para que el ojo las siga.
    slowMo: 220,

    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',

    // El cartel de instalacion se abre solo 1000ms despues de cada navegacion en
    // una plataforma con guia, y su overlay z-50 se come los clicks a media demo.
    // La app guarda la hora del descarte y lo da por vigente mientras no pasan
    // los dias de reaparicion, asi que va un timestamp y no un "1": un "1" ya
    // esta vencido y el cartel vuelve a aparecer.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: ORIGEN,
          localStorage: [{ name: 'installDismissed', value: String(Date.now()) }],
        },
      ],
    },
  },
})
