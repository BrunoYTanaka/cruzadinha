import { runCli } from './cli/run-cli'
import { loadConfig } from './config'
import { createDatabase } from './db/client'
import { describeError } from './db/errors'
import { loadDotEnvIfPresent } from './env-file'
import { systemClock } from './lib/clock'

// Entrada de npm run cli (tsx) e de dist/cli.mjs (imagem).
loadDotEnvIfPresent()

let databaseUrl: string
try {
  databaseUrl = loadConfig(process.env).databaseUrl
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
}

const database = createDatabase(databaseUrl)
let code: number
try {
  code = await runCli(process.argv.slice(2), {
    db: database.db,
    clock: systemClock,
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
  })
} catch (error) {
  // Só nome e código: a mensagem do Drizzle traz os parâmetros da consulta.
  const summary = describeError(error)
    .map((item) => (item.code ? `${item.name} (${item.code})` : item.name))
    .join(' <- ')
  process.stderr.write(`Falha ao executar o comando: ${summary}\n`)
  code = 1
}
await database.close()
process.exit(code)
