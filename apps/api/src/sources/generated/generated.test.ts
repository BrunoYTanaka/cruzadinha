import type { GeneratedSettings } from '@cruzadinha/shared'
import { describe, expect, it } from 'vitest'
import type { EditionListing, FetchPuzzleResult } from '../types'
import { chatCompletion } from './fixtures'
import { createGeneratedSource, type GeneratedSourceOptions } from './generated'
import { loadWordList, type WordEntry } from './words/word-list'

const TODAY = '2026-11-17'
const clock = () => new Date('2026-11-17T15:00:00Z')

// Respostas pedidas no prompt: linhas `n. forma` depois de "Palavras:".
const answersIn = (prompt: string) =>
  prompt
    .split('\n')
    .map((line) => /^(\d+)\. (.+)$/.exec(line))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ n: Number(m[1]), form: m[2]! }))

type Reply = { status: number; body: unknown } | ((prompt: string) => unknown)
const clues = (prompt: string, drop = 0) =>
  chatCompletion(
    JSON.stringify({
      clues: answersIn(prompt)
        .slice(drop)
        .map(({ n }) => ({ n, clue: `Dica de exemplo ${n}` })),
    }),
  )
const ok: Reply = (prompt) => clues(prompt)
const incomplete: Reply = (prompt) => clues(prompt, 1)
// A dica de número 1 repete a resposta (a primeira palavra do pedido).
const echoFirst: Reply = (prompt) => {
  const [first, ...rest] = answersIn(prompt)
  return chatCompletion(
    JSON.stringify({
      clues: [
        { n: first!.n, clue: `Isso é ${first!.form}` },
        ...rest.map(({ n }) => ({ n, clue: `Dica de exemplo ${n}` })),
      ],
    }),
  )
}

let words: WordEntry[]

function setup(replies: Reply[], overrides: Partial<GeneratedSourceOptions> = {}) {
  const prompts: string[] = []
  let reserved = 0
  let settingsReads = 0
  const settings: GeneratedSettings = { gridSize: 11, difficulty: 'medium' }
  const fetch = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as { messages: { content: string }[] }
    const prompt = body.messages[1]!.content
    prompts.push(prompt)
    const reply = replies.shift() ?? incomplete
    if (typeof reply === 'function')
      return new Response(JSON.stringify(reply(prompt)), { status: 200 })
    return new Response(JSON.stringify(reply.body), { status: reply.status })
  }) as unknown as typeof globalThis.fetch
  const source = createGeneratedSource({
    id: 'casa',
    provider: { baseUrl: 'https://modelo.exemplo', model: 'm', apiKey: 'chave' },
    enabled: true,
    fetch,
    clock,
    readSettings: async () => {
      settingsReads++
      return settings
    },
    reserveCall: async () => ++reserved <= 3,
    recentAnswers: async () => [],
    loadWords: async () => (words ??= await loadWordList()),
    ...overrides,
  })
  return {
    source,
    prompts,
    settings,
    calls: () => prompts.length,
    reserved: () => reserved,
    settingsReads: () => settingsReads,
  }
}

async function run(source: ReturnType<typeof setup>['source']): Promise<FetchPuzzleResult> {
  const listings: EditionListing[] = []
  for await (const listing of source.listRecent!({ oldestDate: '2000-01-01' })) {
    listings.push(listing)
  }
  expect(listings).toHaveLength(1)
  const [listing] = listings
  if (!listing?.ok) throw new Error('listagem deveria ser de hoje')
  expect(listing.date).toBe(TODAY)
  return listing.loadPuzzle()
}

describe('createGeneratedSource (features 064 e 065)', () => {
  it('não busca por data: só a coleta gera', async () => {
    const { source, calls } = setup([ok])
    expect(source.onDemand).toBe(false)
    expect(await source.fetchPuzzle('daily', TODAY)).toEqual({ ok: false, reason: 'unavailable' })
    expect(calls()).toBe(0)
  })

  it('dicas incompletas e depois completas: 2 chamadas, grade densa no tamanho e dificuldade lidos', async () => {
    const env = setup([incomplete, ok])
    env.settings.gridSize = 13
    env.settings.difficulty = 'hard'
    const result = await run(env.source)
    expect(env.calls()).toBe(2)
    if (!result.ok) throw new Error(`deveria gerar: ${result.reason}`)
    expect(result.puzzle.grid.width).toBe(13)
    expect(result.puzzle.attribution.title).toBe('Dificuldade: Difícil')
    expect(env.prompts[0]).toContain('Dificuldade: Difícil')
    expect(env.settingsReads()).toBe(1)
    // Densa: toda casa aberta fica em uma palavra horizontal e uma vertical (≥ 40 palavras).
    expect(result.puzzle.words.length).toBeGreaterThan(40)
    const blocks = result.puzzle.grid.cells.flat().filter((c) => c.kind === 'block').length
    expect(blocks / (13 * 13)).toBeLessThanOrEqual(0.25)
  })

  it('3 respostas incompletas: 3 chamadas e falha de formato', async () => {
    const env = setup([incomplete, incomplete, incomplete, ok])
    expect(await run(env.source)).toEqual({
      ok: false,
      reason: 'unexpected-format',
      detail: 'dicas incompletas',
    })
    expect(env.calls()).toBe(3)
    expect(env.settingsReads()).toBe(1)
  })

  it('3 falhas do serviço: falha de fonte fora do ar', async () => {
    const down = { status: 503, body: {} }
    const env = setup([down, down, down])
    expect(await run(env.source)).toMatchObject({ ok: false, reason: 'source-down' })
  })

  it('grade que não fecha não reserva chamada nem chama o modelo', async () => {
    let now = clock().getTime()
    const env = setup([ok], {
      // Lista pequena demais para uma grade 11 x 11; o relógio anda para o prazo vencer.
      loadWords: async () => (words ??= await loadWordList()).slice(0, 30),
      clock: () => new Date((now += 60_000)),
    })
    expect(await run(env.source)).toEqual({
      ok: false,
      reason: 'unexpected-format',
      detail: 'grade não preenchida',
    })
    expect(env.calls()).toBe(0)
    expect(env.reserved()).toBe(0)
  })

  it('limite do dia já esgotado: nenhuma chamada e pulo quieto', async () => {
    const env = setup([ok], { reserveCall: async () => false })
    expect(await run(env.source)).toEqual({
      ok: false,
      reason: 'unavailable',
      detail: 'limite do dia',
    })
    expect(env.calls()).toBe(0)
  })

  it('limite que acaba no meio: devolve a falha da última tentativa', async () => {
    let left = 1
    const env = setup([incomplete, ok], { reserveCall: async () => left-- > 0 })
    expect(await run(env.source)).toMatchObject({
      ok: false,
      reason: 'unexpected-format',
      detail: 'dicas incompletas',
    })
    expect(env.calls()).toBe(1)
  })
})

describe('reparo das dicas', () => {
  it('troca a palavra sem dica boa e as vizinhas, e pede dica só das novas', async () => {
    const env = setup([echoFirst, ok])
    const result = await run(env.source)
    expect(env.calls()).toBe(2)
    expect(env.reserved()).toBe(2)
    const first = answersIn(env.prompts[0]!)
    const repair = answersIn(env.prompts[1]!)
    // Só a região trocada vai no reparo, sem a palavra recusada e sem o aviso de repetição.
    expect(repair.length).toBeGreaterThan(0)
    expect(repair.length).toBeLessThan(first.length / 2)
    expect(repair.map((a) => a.form)).not.toContain(first[0]!.form)
    expect(env.prompts[1]).not.toContain('recusada')
    if (!result.ok) throw new Error('deveria gerar')
    const clues = result.puzzle.words.map((w) => w.clue)
    expect(clues).not.toContain(`Isso é ${first[0]!.form}`)
    expect(clues).toHaveLength(first.length)
  })

  it('registra os passos de cada tentativa, sem palavras nem dicas', async () => {
    const lines: string[] = []
    const env = setup([echoFirst, ok], { log: (line) => lines.push(line) })
    await run(env.source)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(
      /^tentativa 1: dica inválida \(1 de \d+\) → troca local \(\d+ palavras\) → dicas ok → gravada$/,
    )
    const forms = answersIn(env.prompts.join('\n')).map((a) => a.form)
    for (const form of forms) expect(lines[0]).not.toContain(` ${form}`)
  })

  it('reparo que também falha derruba a tentativa; a próxima usa outra grade', async () => {
    const env = setup([echoFirst, echoFirst, ok])
    const result = await run(env.source)
    expect(env.calls()).toBe(3)
    if (!result.ok) throw new Error('deveria gerar na terceira chamada')
    expect(env.prompts[2]).not.toEqual(env.prompts[0])
  })

  it('sem chamada sobrando para o reparo, a tentativa falha sem outro pedido', async () => {
    let left = 1
    const env = setup([echoFirst, ok], { reserveCall: async () => left-- > 0 })
    expect(await run(env.source)).toMatchObject({ ok: false, detail: 'dica inválida' })
    expect(env.calls()).toBe(1)
  })
})

describe('respostas da lista (US2)', () => {
  it('em Fácil toda resposta é da faixa 1', async () => {
    const env = setup([ok])
    env.settings.difficulty = 'easy'
    const result = await run(env.source)
    if (!result.ok) throw new Error('deveria gerar')
    const band1 = new Map((await loadWordList()).map((w) => [w.plain, w.band]))
    for (const { form } of answersIn(env.prompts[0]!)) {
      const entry = (await loadWordList()).find((w) => w.form === form)
      expect(band1.get(entry!.plain)).toBe(1)
    }
  })

  it('tira só as respostas recentes de 5 letras ou mais', async () => {
    const list = await loadWordList()
    const six = list.filter((w) => w.plain.length === 6).slice(0, 15)
    const three = list.filter((w) => w.plain.length === 3).slice(0, 15)
    const env = setup([ok], {
      recentAnswers: async () => [...six, ...three].map((w) => w.plain),
    })
    const result = await run(env.source)
    if (!result.ok) throw new Error('deveria gerar')
    const forms = new Set(answersIn(env.prompts[0]!).map((a) => a.form))
    for (const w of six) expect(forms.has(w.form)).toBe(false)
    expect(three.some((w) => forms.has(w.form))).toBe(true)
  })

  it('nunca usa resposta bloqueada, mesmo que esteja na lista', async () => {
    const list = await loadWordList()
    const bloqueada: WordEntry = { plain: 'PORRA', form: 'porra', band: 1 }
    const env = setup([ok], { loadWords: async () => [bloqueada, ...list] })
    const result = await run(env.source)
    if (!result.ok) throw new Error('deveria gerar')
    expect(answersIn(env.prompts[0]!).map((a) => a.form)).not.toContain('porra')
  })
})

describe('createGeneratedSource para sem barulho', () => {
  it('402 na primeira chamada: 1 chamada e "sem créditos"', async () => {
    const env = setup([{ status: 402, body: {} }, ok])
    expect(await run(env.source)).toEqual({
      ok: false,
      reason: 'unavailable',
      detail: 'sem créditos',
    })
    expect(env.calls()).toBe(1)
  })

  it('sem chave: nenhuma chamada e "sem chave"', async () => {
    const env = setup([ok], {
      provider: { baseUrl: 'https://modelo.exemplo', model: 'm', apiKey: undefined },
    })
    expect(await run(env.source)).toEqual({ ok: false, reason: 'unavailable', detail: 'sem chave' })
    expect(env.calls()).toBe(0)
  })

  it('geração desligada: nenhuma chamada e "geração desligada"', async () => {
    const env = setup([ok], { enabled: false })
    expect(await run(env.source)).toEqual({
      ok: false,
      reason: 'unavailable',
      detail: 'geração desligada',
    })
    expect(env.calls()).toBe(0)
  })

  it('401: falha "refused" sem nova tentativa', async () => {
    const env = setup([{ status: 401, body: {} }, ok])
    expect(await run(env.source)).toMatchObject({ ok: false, reason: 'refused' })
    expect(env.calls()).toBe(1)
  })
})
