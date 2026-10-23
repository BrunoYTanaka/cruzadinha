import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { siteVersionPlugin } from './version-plugin.ts'

const apiProxy = {
  '/api': {
    target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react(), siteVersionPlugin()],
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
