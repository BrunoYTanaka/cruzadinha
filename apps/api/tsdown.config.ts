import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { server: 'src/server.ts', migrate: 'src/db/migrate.ts', cli: 'src/cli.ts' },
  platform: 'node',
  format: 'esm',
  outDir: 'dist',
  fixedExtension: true,
  deps: {
    alwaysBundle: ['@cruzadinha/shared'],
  },
})
