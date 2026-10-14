import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const apiProxy = {
  '/api': {
    target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react()],
  // O .env único fica na raiz; só variáveis com prefixo VITE_ chegam ao navegador.
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
})
