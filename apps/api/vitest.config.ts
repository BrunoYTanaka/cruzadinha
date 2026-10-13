import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Testes de integração (Postgres em container) rodam só pelo vitest.int.config.ts.
    exclude: [...configDefaults.exclude, '**/*.int.test.ts'],
  },
})
