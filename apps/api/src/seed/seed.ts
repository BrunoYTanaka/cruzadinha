import { loadDotEnvIfPresent } from '../env-file'
import { createDatabase } from '../platform/db/client'
import { describeError } from '../platform/db/errors'
import { runSeed } from './seed-user'

// Entrada de npm run db:seed. Fica fora do bundle: não existe na imagem de produção.
loadDotEnvIfPresent()

let code: number
try {
  code = await runSeed(process.env, {
    openDatabase: createDatabase,
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
  })
} catch (error) {
  const summary = describeError(error)
    .map((item) => (item.code ? `${item.name} (${item.code})` : item.name))
    .join(' <- ')
  process.stderr.write(`Falha ao rodar o seed: ${summary}\n`)
  code = 1
}
process.exit(code)
