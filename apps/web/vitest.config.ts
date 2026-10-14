import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // O E2E roda no Playwright (`npm run test:e2e`), não no Vitest.
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
