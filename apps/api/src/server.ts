import { buildApp } from './app'
import { loadConfig, type ServerConfig } from './config'
import { createDatabase } from './db/client'
import { describeMigrationError, runMigrations } from './db/migrations'
import { createPostgresProbe } from './db/probe'
import { loadDotEnvIfPresent } from './env-file'
import { describeListenError } from './listen-error'

loadDotEnvIfPresent()

let config: ServerConfig
try {
  config = loadConfig(process.env)
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
}

try {
  await runMigrations(config.databaseUrl)
} catch (error) {
  process.stderr.write(`Falha ao aplicar as migrações. ${describeMigrationError(error)}\n`)
  process.exit(1)
}

const probe = createPostgresProbe(config.databaseUrl)
const database = createDatabase(config.databaseUrl)
const app = buildApp({ config, probe, database: database.db })

try {
  await app.listen({ host: config.host, port: config.port })
} catch (error) {
  process.stderr.write(`${describeListenError(error, config.port)}\n`)
  await Promise.all([probe.close(), database.close()])
  process.exit(1)
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app
      .close()
      .then(() => Promise.all([probe.close(), database.close()]))
      .then(() => process.exit(0))
  })
}
