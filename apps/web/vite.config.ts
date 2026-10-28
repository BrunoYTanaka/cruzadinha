import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { landingPrerenderPlugin } from './prerender-plugin.ts'
import { siteVersionPlugin } from './version-plugin.ts'

const apiProxy = {
  '/api': {
    target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [
    react(),
    siteVersionPlugin(),
    // Antes do VitePWA: o index.html precisa estar completo quando o PWA calcula o hash dele.
    landingPrerenderPlugin(),
    // Service worker só da casca (feature 041): nunca guarda /api, sem skipWaiting nem clientsClaim,
    // então a versão nova vale na próxima abertura, nunca no meio de uma partida.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Cruzadinha',
        short_name: 'Cruzadinha',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#1d4ed8',
        background_color: '#f6f7f9',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  // O .env único fica na raiz; só variáveis com prefixo VITE_ chegam ao navegador.
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  build: {
    rolldownOptions: {
      output: {
        // Sem isto, todas as bibliotecas ficavam no chunk de entrada (519 kB, acima do limite do
        // aviso). O React em chunk próprio e o resto do vendor em outro mantêm cada arquivo abaixo
        // de 500 kB e mudam de nome só quando as dependências mudam, não a cada release do app.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 20,
            },
            { name: 'vendor', test: /node_modules/, priority: 10 },
          ],
        },
      },
    },
  },
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
})
