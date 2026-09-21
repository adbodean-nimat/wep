import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'WEP - Entregas',
        short_name: 'WEP',
        description: 'WhatsApp Entregas Programadas · Choferes',
        lang: 'es-AR',
        theme_color: '#145c43',
        background_color: '#f5f7f5',
        display: 'standalone',
        start_url: '/chofer/viajes',
        scope: '/',
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallbackDenylist: [/^\/api(?:\/|$)/],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
