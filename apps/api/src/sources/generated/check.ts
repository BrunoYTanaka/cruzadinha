// Verificação sob demanda de uma fonte gerada contra o modelo real (feature 064). Faz um pedido real
// e gasta crédito: fora da suíte de testes, da CI e do bundle do servidor. Ignora
// GENERATION_ENABLED (é um pedido explícito) e não grava nada no banco.
import { difficultySchema, type Difficulty } from '@cruzadinha/shared'
import { mkdir, writeFile } from 'node:fs/promises'
import { loadConfig } from '../../config'
import { loadDotEnvIfPresent } from '../../env-file'
import { systemClock } from '../../platform/lib/clock'
import { todayInSaoPaulo } from '../../platform/lib/dates'
import { requestWords } from './client'
import { layout, minWords, seedFrom, toPuzzle } from './layout'
import { buildPrompt } from './prompt'
import { cleanWords } from './schema'

const SAMPLES_DIR = new URL('../../../.source-samples/', import.meta.url)
const USAGE =
  'uso: npm run source:check:generated -w @cruzadinha/api -- [--size=9..15] [--difficulty=easy|medium|hard] [--save]'

async function main(): Promise<number> {
  loadDotEnvIfPresent()
  const args = process.argv.slice(2)
  const save = args.includes('--save')
  const sizeArg = args.find((arg) => arg.startsWith('--size='))
  const difficultyArg = args.find((arg) => arg.startsWith('--difficulty='))
  const size = sizeArg === undefined ? 11 : Number(sizeArg.slice('--size='.length))
  const difficulty = difficultySchema.safeParse(
    difficultyArg === undefined ? 'medium' : difficultyArg.slice('--difficulty='.length),
  )
  if (!Number.isInteger(size) || size < 9 || size > 15 || !difficulty.success) {
    console.error(USAGE)
    return 2
  }

  const { generation } = loadConfig(process.env)
  if (!generation.deepseekApiKey) {
    console.error('DEEPSEEK_API_KEY não definida.')
    return 2
  }

  let raw = ''
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const response = await globalThis.fetch(input, init)
    if (save) raw = await response.clone().text()
    return response
  }
  const date = todayInSaoPaulo(systemClock)
  const level: Difficulty = difficulty.data
  const result = await requestWords({
    provider: {
      baseUrl: 'https://api.deepseek.com',
      model: generation.deepseekModel,
      apiKey: generation.deepseekApiKey,
    },
    messages: buildPrompt({ size, difficulty: level, date, avoid: [] }),
    fetch,
  })
  if (save && raw !== '') {
    await mkdir(SAMPLES_DIR, { recursive: true })
    const file = new URL(`generated-${date}-${size}.json`, SAMPLES_DIR)
    await writeFile(file, raw)
    console.log(`resposta salva em ${file.pathname}`)
  }
  if (!result.ok) {
    console.log(`falhou: ${result.kind} (${result.detail})`)
    return 1
  }
  const words = cleanWords(result.items, { size, avoid: new Set() })
  const placed = layout(words, size, seedFrom(date))
  console.log(
    `${size}x${size} ${level}: ${result.items.length} recebidas, ${words.length} válidas, ` +
      `${placed?.length ?? 0} postas (mínimo ${minWords(size)})`,
  )
  const built = placed && toPuzzle(placed, { source: 'casa', date, size, difficulty: level })
  console.log(built ? 'grade ok' : 'grade não montou')
  return built ? 0 : 1
}

process.exitCode = await main()
