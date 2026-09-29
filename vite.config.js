/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      // 'autoUpdate' y no el default 'prompt'. En 'prompt' el service worker
      // nuevo queda en estado waiting hasta que el usuario acepta el aviso, y
      // mientras tanto el viejo sigue controlando la pagina y sirviendo de la
      // precache el bundle viejo. Un cartel de instalacion que no aparecia era
      // justo eso: gente corriendo el codigo de la semana pasada, sin saberlo.
      // Con 'autoUpdate' el worker nuevo hace skipWaiting, toma control y
      // registerSW recarga solo.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'IMAE - Control de Mantenimiento',
        short_name: 'IMAE',
        // Este texto lo muestra Chrome en su dialogo de instalacion, asi que
        // va con tildes.
        description:
          'Sistema de Control de Mantenimiento Fabril. Gestión de órdenes de trabajo, compras, equipos y técnicos.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // El login es bg-slate-900 fijo (Login.jsx:51), asi que ese es el
        // primer pixel que ve cualquiera. theme_color va en index.html.
        background_color: '#0f172a',
        theme_color: '#1e293b',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Sin esto un deep link con la red caida no resuelve nada.
        navigateFallback: 'index.html',
        // El plugin pisa estos dos a true cuando registerType es autoUpdate.
        // Se dejan explicitos para que el motivo se lea aca y no haya que ir a
        // buscarlo dentro del node_modules.
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Fotos de entrega. Cloudinary ya versiona sus URLs, asi que
            // CacheFirst con expiracion larga no sirve una foto vieja.
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloudinary',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // El SW solo existe en el build. En dev apareceria cacheando assets con
      // hash y volveria a servir una version vieja.
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: true,
    exclude: ['e2e/**', 'e2e-pwa/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      exclude: ['src/test/**', 'src/main.jsx', '**/*.test.{js,jsx}', '**/__tests__/**'],
    },
  },
})
