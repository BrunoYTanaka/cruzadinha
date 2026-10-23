// Verificação sob demanda contra o Cruzadas Clube real (specs/030-clube-terceira-fonte/contracts).
// Faz pedidos reais: fora da suíte de testes e do bundle do servidor.
import { isoDateSchema, puzzleSourceNames } from '@cruzadinha/shared'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'
import { createClubeSource } from './clube'
import { readPuzzleData } from './sandbox'

const PAUSE_MS = 2_000
const MAX_EDITIONS = 10
const SAMPLES_DIR = new URL('../../../.source-samples/', import.meta.url)
const USAGE =
  'uso: npm run source:check:clube -w @cruzadinha/api -- [AAAA-MM-DD ... | --count=N] [--save]'

async function main(): Promise<number> {
  const args = process.argv.slice(2)
  const save = args.includes('--save')
  const countArg = args.find((arg) => arg.startsWith('--count='))
  const count = countArg === undefined ? 1 : Number(countArg.slice('--count='.length))
  const dates = args.filter((arg) => arg !== '--save' && arg !== countArg)
  if (!Number.isInteger(count) || count < 1 || count > MAX_EDITIONS) {
    console.error(USAGE)
    return 2
  }
  if (dates.length > MAX_EDITIONS || dates.some((date) => !isoDateSchema.safeParse(date).success)) {
    console.error(USAGE)
    return 2
  }

  // Com --save guarda a página e o script de cada edição; o XML sai do script na sandbox.
  const bodies = new Map<string, string>()
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const response = await globalThis.fetch(input, init)
    if (save) bodies.set(new URL(String(input)).pathname, await response.clone().text())
    return response
  }
  const source = createClubeSource({ fetch })
  if (save) await mkdir(SAMPLES_DIR, { recursive: true })
  console.log(`${puzzleSourceNames.clube}${save ? ` (respostas em ${SAMPLES_DIR.pathname})` : ''}`)

  // Sem datas, as `--count` edições mais recentes (uma, por padrão); com datas, a janela vai até a
  // mais antiga pedida.
  const wanted = new Set(dates)
  const oldest = dates.length > 0 ? [...dates].sort()[0]! : '0000-01-01'
  let requested = false
  const beforeRequest = async () => {
    if (requested) await sleep(PAUSE_MS)
    requested = true
  }

  let allGood = true
  let shown = 0
  for await (const listing of source.listRecent!({ oldestDate: oldest, beforeRequest })) {
    if (!listing.ok) {
      console.log(
        `${'-'.padEnd(11)} ${listing.reason.padEnd(18)} ${listing.detail ?? ''}`.trimEnd(),
      )
      return listing.reason === 'unavailable' ? 0 : 1
    }
    if (dates.length > 0 && !wanted.has(listing.date)) continue

    const result = await listing.loadPuzzle()
    const columns = [listing.date.padEnd(11)]
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
    console.log(columns.join(' ').trimEnd())

    if (save) {
      for (const [path, body] of bodies) {
        if (path.endsWith('.js')) {
          const data = await readPuzzleData(body)
          if (data.ok) {
            await writeFile(new URL(`clube-${listing.date}.xml`, SAMPLES_DIR), data.value)
          }
        }
        await writeFile(
          new URL(
            `clube-${listing.date}-${path.split('/').filter(Boolean).join('_')}`,
            SAMPLES_DIR,
          ),
          body,
        )
      }
      bodies.clear()
    }
    if (!result.ok && result.reason === 'rate-limited') return 1
    shown += 1
    if (shown >= (dates.length === 0 ? count : wanted.size)) break
  }
  if (shown === 0 && dates.length > 0) {
    console.log('nenhuma das datas pedidas tem edição')
    return 1
  }
  return allGood ? 0 : 1
}

process.exitCode = await main()
