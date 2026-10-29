import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.E2E_WEB_PORT ?? 4173)

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npx vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    // Chave pública fictícia: o script do desafio é interceptado nos testes (feature 049).
    env: { VITE_TURNSTILE_SITE_KEY: 'e2e-chave-publica' },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
