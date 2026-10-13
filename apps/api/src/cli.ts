import { runCli } from './cli/run-cli'
import { loadConfig } from './config'
import { createDatabase } from './db/client'
import { describeError } from './db/errors'
import { loadDotEnvIfPresent } from './env-file'
import { systemClock } from './lib/clock'
import { createOgloboSource } from './sources/oglobo/oglobo'

// Entrada de npm run cli (tsx) e de dist/cli.mjs (imagem).
loadDotEnvIfPresent()

let databaseUrl: string
let historyDays: number
try {
  const config = loadConfig(process.env)
  databaseUrl = config.databaseUrl
  historyDays = config.collectHistoryDays
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
    source: createOgloboSource(),
    historyDays,
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
