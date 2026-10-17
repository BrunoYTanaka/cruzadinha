// Verificação sob demanda contra a Cruzada Online real (specs/014-adaptador-publico/contracts/cli.md).
// Faz pedidos reais: fora da suíte de testes e do bundle do servidor.
import { isoDateSchema, puzzleSourceNames } from '@cruzadinha/shared'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'
import { systemClock } from '../../lib/clock'
import { todayInSaoPaulo } from '../../lib/dates'
import { createCruzadaOnlineSource } from './cruzadaonline'

const PAUSE_MS = 2_000
const MAX_DATES = 10
const SAMPLES_DIR = new URL('../../../.source-samples/', import.meta.url)
const USAGE =
  'uso: npm run source:check:cruzadaonline -w @cruzadinha/api -- [AAAA-MM-DD ...] [--save]'

async function main(): Promise<number> {
  const args = process.argv.slice(2)
  const save = args.includes('--save')
  const positional = args.filter((arg) => arg !== '--save')
  const dates = positional.length > 0 ? positional : [todayInSaoPaulo(systemClock)]
  if (dates.length > MAX_DATES || dates.some((date) => !isoDateSchema.safeParse(date).success)) {
    console.error(USAGE)
    return 2
  }

  let lastBody: string | undefined
  // Marca se a última consulta chegou à fonte: uma data futura é recusada sem pedido.
  let fetched = false
  const fetch: typeof globalThis.fetch = async (input, init) => {
    fetched = true
    const response = await globalThis.fetch(input, init)
    if (save) lastBody = await response.clone().text()
    return response
  }
  const source = createCruzadaOnlineSource({ fetch })
  if (save) await mkdir(SAMPLES_DIR, { recursive: true })

  let allGood = true
  console.log(
    `${puzzleSourceNames.cruzadaonline}${save ? ` (respostas em ${SAMPLES_DIR.pathname})` : ''}`,
  )

  for (const [i, date] of dates.entries()) {
    // Só pausa entre pedidos de verdade.
    if (fetched) await sleep(PAUSE_MS)
    fetched = false
    lastBody = undefined
    const result = await source.fetchPuzzle('daily', date)

    const columns = [date.padEnd(11)]
    if (result.ok) {
      const { width, height } = result.puzzle.grid
      columns.push(
        'ok'.padEnd(18),
        `${width}x${height}`.padEnd(6),
        `${result.puzzle.words.length} palavras`,
      )
    } else {
      columns.push(result.reason.padEnd(18), result.detail ?? '')
      if (result.reason !== 'unavailable') allGood = false
    }
    if (save && lastBody !== undefined) {
      await writeFile(new URL(`cruzadaonline-${date}.xml`, SAMPLES_DIR), lastBody)
    }
    console.log(columns.join(' ').trimEnd())

    if (!result.ok && result.reason === 'rate-limited') {
      for (const skipped of dates.slice(i + 1)) {
        console.log(`${skipped.padEnd(11)} não consultado (limite de uso)`)
      }
      return 1
    }
  }
  return allGood ? 0 : 1
}

process.exitCode = await main()
