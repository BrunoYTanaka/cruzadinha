import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import { text } from 'node:stream/consumers'
import { runCli } from './cli/run-cli'
import { loadConfig } from './config'
import { createDatabase } from './db/client'
import { describeError } from './db/errors'
import { loadDotEnvIfPresent } from './env-file'
import { systemClock } from './lib/clock'
import { createClubeSource } from './sources/clube/clube'
import { createCruzadaOnlineSource } from './sources/cruzadaonline/cruzadaonline'
import { createOgloboSource } from './sources/oglobo/oglobo'

// Entrada de npm run cli (tsx) e de dist/cli.mjs (imagem).
loadDotEnvIfPresent()

// Senha do `users create` (feature 013, FR-019). No terminal, o que se digita não aparece: a saída do
// readline é silenciada enquanto a pergunta está aberta. Com a entrada redirecionada (um script), vale
// a primeira linha, para a senha e a confirmação. O valor nunca é escrito nem registrado.
function createSecretReader(): (prompt: string) => Promise<string> {
  if (process.stdin.isTTY) {
    return async (prompt) => {
      let muted = false
      const output = new Writable({
        write(chunk, _encoding, callback) {
          if (!muted) process.stdout.write(chunk)
          callback()
        },
      })
      const rl = createInterface({ input: process.stdin, output, terminal: true, historySize: 0 })
      process.stdout.write(prompt)
      muted = true
      try {
        return await rl.question('')
      } finally {
        muted = false
        rl.close()
        process.stdout.write('\n')
      }
    }
  }
  let firstLine: Promise<string> | undefined
  return () => (firstLine ??= text(process.stdin).then((all) => all.split(/\r?\n/)[0] ?? ''))
}

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
    sources: [createOgloboSource(), createCruzadaOnlineSource(), createClubeSource()],
    historyDays,
    readSecret: createSecretReader(),
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
