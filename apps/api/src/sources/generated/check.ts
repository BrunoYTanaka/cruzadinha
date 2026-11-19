// Verificação sob demanda de uma fonte gerada contra o modelo real (features 064 e 065). Faz um
// pedido real e gasta crédito: fora da suíte de testes, da CI e do bundle do servidor. Ignora
// GENERATION_ENABLED (é um pedido explícito) e não grava nada no banco. Não depende do
// preenchimento: sorteia respostas da lista de palavras e pede só as dicas.
import { difficultySchema, type Difficulty } from '@cruzadinha/shared'
import { mkdir, writeFile } from 'node:fs/promises'
import { loadDotEnvIfPresent } from '../../env-file'
import { systemClock } from '../../platform/lib/clock'
import { todayInSaoPaulo } from '../../platform/lib/dates'
import { requestClues } from './client'
import { seededRandom, seedFrom } from './layout'
import { buildCluePrompt } from './prompt'
import { cleanClues } from './schema'
import { loadWordList, wordsFor } from './words/word-list'

const SAMPLES_DIR = new URL('../../../.source-samples/', import.meta.url)
const USAGE =
  'uso: npm run source:check:generated -w @cruzadinha/api -- [--count=20] [--difficulty=easy|medium|hard] [--save]'
const MAX_BAND = { easy: 1, medium: 2, hard: 3 } as const

async function main(): Promise<number> {
  loadDotEnvIfPresent()
  const args = process.argv.slice(2)
  const save = args.includes('--save')
  const countArg = args.find((arg) => arg.startsWith('--count='))
  const difficultyArg = args.find((arg) => arg.startsWith('--difficulty='))
  const count = countArg === undefined ? 20 : Number(countArg.slice('--count='.length))
  const difficulty = difficultySchema.safeParse(
    difficultyArg === undefined ? 'medium' : difficultyArg.slice('--difficulty='.length),
  )
  if (!Number.isInteger(count) || count < 1 || count > 100 || !difficulty.success) {
    console.error(USAGE)
    return 2
  }

  // Só a chave e o modelo: o script não usa o banco, então não exige DATABASE_URL.
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim()
  const model = process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-chat'
  if (!apiKey) {
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
  const random = seededRandom(seedFrom(date))
  const pool = wordsFor(await loadWordList(), { maxBand: MAX_BAND[level] })
  const picked = Array.from({ length: count }, () => pool[Math.floor(random() * pool.length)]!)
  const answers = picked.map((word, i) => ({ n: i + 1, form: word.form }))
  const messages = buildCluePrompt({ answers, difficulty: level })

  const result = await requestClues({
    provider: {
      baseUrl: 'https://api.deepseek.com',
      model,
      apiKey,
    },
    messages,
    fetch,
  })
  if (save && raw !== '') {
    await mkdir(SAMPLES_DIR, { recursive: true })
    const file = new URL(`generated-${date}-${level}.json`, SAMPLES_DIR)
    await writeFile(file, raw)
    await writeFile(
      new URL(`generated-${date}-${level}-answers.json`, SAMPLES_DIR),
      JSON.stringify(answers, null, 2),
    )
    console.log(`resposta salva em ${file.pathname}`)
  }
  if (!result.ok) {
    console.log(`falhou: ${result.kind} (${result.detail})`)
    return 1
  }
  const answersFull = picked.map((word, i) => ({ n: i + 1, form: word.form, plain: word.plain }))
  let cleaned = cleanClues(result.items, answersFull)
  console.log(`${count} respostas ${level}: ${cleaned.ok ? 'dicas ok' : cleaned.detail}`)
  if (!cleaned.ok && cleaned.retry.length > 0) {
    // Mesmo reparo da coleta: pede de novo só as dicas que falharam.
    const { retry, valid } = cleaned
    const subset = answersFull.filter((a) => retry.includes(a.n))
    console.log(`reparo: ${subset.map((a) => `${a.n}.${a.form}`).join(', ')}`)
    raw = ''
    const again = await requestClues({
      provider: { baseUrl: 'https://api.deepseek.com', model, apiKey },
      messages: buildCluePrompt({ answers: subset, difficulty: level, repair: true }),
      fetch,
    })
    if (save && raw !== '') {
      await writeFile(new URL(`generated-${date}-${level}-repair.json`, SAMPLES_DIR), raw)
    }
    if (!again.ok) {
      console.log(`reparo falhou: ${again.kind} (${again.detail})`)
      return 1
    }
    const fixed = cleanClues(again.items, subset)
    console.log(`reparo: ${fixed.ok ? 'dicas ok' : fixed.detail}`)
    if (!fixed.ok) {
      subset.forEach((a) => {
        const clue = again.items.find((i) => i.n === a.n)?.clue
        console.log(`  ${a.n}. ${a.form}: ${String(clue)}`)
      })
      return 1
    }
    const merged = new Map(valid)
    subset.forEach((a, i) => merged.set(a.n, fixed.clues[i]!))
    cleaned = { ok: true, clues: answersFull.map((a) => merged.get(a.n)!) }
  }
  if (cleaned.ok) {
    cleaned.clues.forEach((clue, i) => console.log(`${i + 1}. ${picked[i]!.form}: ${clue}`))
  }
  return cleaned.ok ? 0 : 1
}

process.exitCode = await main()
