import { loadConfig } from '../config'
import { loadDotEnvIfPresent } from '../env-file'
import { describeMigrationError, runMigrations } from './migrations'

// Entrada de npm run db:migrate (tsx) e de dist/migrate.mjs (imagem).
loadDotEnvIfPresent()

let databaseUrl: string
try {
  databaseUrl = loadConfig(process.env).databaseUrl
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
}

try {
  await runMigrations(databaseUrl)
  process.stdout.write('Migrações aplicadas.\n')
} catch (error) {
  process.stderr.write(`Falha ao aplicar as migrações. ${describeMigrationError(error)}\n`)
  process.exit(1)
}
