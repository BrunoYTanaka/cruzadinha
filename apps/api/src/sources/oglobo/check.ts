// Verificação sob demanda contra a fonte real (specs/003-adaptador-oglobo/contracts/source-check.md).
// Faz pedidos reais: fora da suíte de testes e do bundle do servidor.
import { isoDateSchema, levelSchema, type Level } from '@cruzadinha/shared'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'
import { createOgloboSource } from './oglobo'

const PAUSE_MS = 2_000
const SAMPLES_DIR = new URL('../../../.source-samples/', import.meta.url)
const USAGE = 'uso: npm run source:check -w @cruzadinha/api -- [AAAA-MM-DD] [--save]'

function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

function hasMarkup(body: string): boolean {
  try {
    const clues: unknown = JSON.parse(body)?.ipuzData?.clues
    if (typeof clues !== 'object' || clues === null) return false
    return Object.values(clues)
      .flat()
      .some((entry) => Array.isArray(entry) && /[<&]/.test(String(entry[1])))
  } catch {
    return false
  }
}

async function main(): Promise<number> {
  const args = process.argv.slice(2)
  const save = args.includes('--save')
  const positional = args.filter((arg) => arg !== '--save')
  const date = positional[0] ?? today()
  if (positional.length > 1 || !isoDateSchema.safeParse(date).success) {
    console.error(USAGE)
    return 2
  }

  let lastBody: string | undefined
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const response = await globalThis.fetch(input, init)
    if (save) lastBody = await response.clone().text()
    return response
  }
  const source = createOgloboSource({ fetch })
  if (save) await mkdir(SAMPLES_DIR, { recursive: true })

  const levels: readonly Level[] = levelSchema.options
  let allGood = true
  console.log(`O Globo, ${date}${save ? ` (respostas em ${SAMPLES_DIR.pathname})` : ''}`)

  for (const [i, level] of levels.entries()) {
    if (i > 0) await sleep(PAUSE_MS)
    lastBody = undefined
    const result = await source.fetchPuzzle(level, date)

    const columns = [level.padEnd(9)]
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
      await writeFile(new URL(`${level}-${date}.json`, SAMPLES_DIR), lastBody)
      columns.push(hasMarkup(lastBody) ? '  [dicas com < ou &]' : '')
    }
    console.log(columns.join(' ').trimEnd())

    if (!result.ok && result.reason === 'rate-limited') {
      for (const skipped of levels.slice(i + 1)) {
        console.log(`${skipped.padEnd(9)} não consultado (limite de uso)`)
      }
      return 1
    }
  }
  return allGood ? 0 : 1
}

process.exitCode = await main()
