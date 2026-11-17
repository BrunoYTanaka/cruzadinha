import type { GeneratedSettings } from '@cruzadinha/shared'
import { describe, expect, it } from 'vitest'
import type { EditionListing, FetchPuzzleResult } from '../types'
import { chatCompletion, SAMPLE_WORDS, sampleContent } from './fixtures'
import { createGeneratedSource, type GeneratedSourceOptions } from './generated'

const TODAY = '2026-11-17'
const clock = () => new Date('2026-11-17T15:00:00Z')

type Reply = { status: number; body: unknown }
const ok = (content = sampleContent()): Reply => ({ status: 200, body: chatCompletion(content) })
const bad: Reply = ok(JSON.stringify({ words: [] }))

function setup(replies: Reply[], overrides: Partial<GeneratedSourceOptions> = {}) {
  const prompts: string[] = []
  let reserved = 0
  let settingsReads = 0
  const settings: GeneratedSettings = { gridSize: 11, difficulty: 'medium' }
  const fetch = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as { messages: { content: string }[] }
    prompts.push(body.messages[1]!.content)
    const reply = replies.shift() ?? bad
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
    ...overrides,
  })
  return {
    source,
    prompts,
    settings,
    calls: () => prompts.length,
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

describe('createGeneratedSource (feature 064)', () => {
  it('não busca por data: só a coleta gera', async () => {
    const { source, calls } = setup([ok()])
    expect(source.onDemand).toBe(false)
    expect(await source.fetchPuzzle('daily', TODAY)).toEqual({ ok: false, reason: 'unavailable' })
    expect(calls()).toBe(0)
  })

  it('lista inválida e depois válida: 2 chamadas e a cruzada no tamanho e dificuldade lidos', async () => {
    const env = setup([bad, ok()])
    env.settings.gridSize = 13
    env.settings.difficulty = 'hard'
    const result = await run(env.source)
    expect(env.calls()).toBe(2)
    if (!result.ok) throw new Error(`deveria gerar: ${result.reason}`)
    expect(result.puzzle.grid.width).toBe(13)
    expect(result.puzzle.attribution.title).toBe('Dificuldade: Difícil')
    expect(env.prompts[0]).toContain('Dificuldade: Difícil')
    expect(env.settingsReads()).toBe(1)
  })

  it('3 listas inválidas: 3 chamadas e falha de formato', async () => {
    const env = setup([bad, bad, bad, ok()])
    expect(await run(env.source)).toMatchObject({ ok: false, reason: 'unexpected-format' })
    expect(env.calls()).toBe(3)
    expect(env.settingsReads()).toBe(1)
  })

  it('3 falhas do serviço: falha de fonte fora do ar', async () => {
    const down = { status: 503, body: {} }
    const env = setup([down, down, down])
    expect(await run(env.source)).toMatchObject({ ok: false, reason: 'source-down' })
  })

  it('limite do dia já esgotado: nenhuma chamada e pulo quieto', async () => {
    const env = setup([ok()], { reserveCall: async () => false })
    expect(await run(env.source)).toEqual({
      ok: false,
      reason: 'unavailable',
      detail: 'limite do dia',
    })
    expect(env.calls()).toBe(0)
  })

  it('limite que acaba no meio: devolve a falha da última tentativa', async () => {
    let left = 1
    const env = setup([bad, ok()], { reserveCall: async () => left-- > 0 })
    expect(await run(env.source)).toMatchObject({ ok: false, reason: 'unexpected-format' })
    expect(env.calls()).toBe(1)
  })

  it('manda as respostas recentes no pedido e as descarta mesmo assim', async () => {
    const recent = SAMPLE_WORDS.slice(0, 5).map((word) => word.answer)
    const env = setup([ok()], { recentAnswers: async () => recent })
    const result = await run(env.source)
    expect(env.prompts[0]).toContain(
      'Não use estas respostas: ABACAXI, AMIGO, ARARA, AREIA, ARVORE.',
    )
    if (!result.ok) throw new Error('deveria gerar')
    const clues = result.puzzle.words.map((word) => word.clue)
    for (const word of SAMPLE_WORDS.slice(0, 5)) expect(clues).not.toContain(word.clue)
  })

  it('não salva palavra nem dica com termo bloqueado', async () => {
    const words = [{ answer: 'PORRA', clue: 'Palavrão' }, ...SAMPLE_WORDS]
    const env = setup([ok(sampleContent(words))])
    const result = await run(env.source)
    if (!result.ok) throw new Error('deveria gerar')
    expect(result.puzzle.words.map((word) => word.clue)).not.toContain('Palavrão')
  })
})

describe('createGeneratedSource para sem barulho (US3)', () => {
  it('402 na primeira chamada: 1 chamada e "sem créditos"', async () => {
    const env = setup([{ status: 402, body: {} }, ok()])
    expect(await run(env.source)).toEqual({
      ok: false,
      reason: 'unavailable',
      detail: 'sem créditos',
    })
    expect(env.calls()).toBe(1)
  })

  it('sem chave: nenhuma chamada e "sem chave"', async () => {
    const env = setup([ok()], {
      provider: { baseUrl: 'https://modelo.exemplo', model: 'm', apiKey: undefined },
    })
    expect(await run(env.source)).toEqual({ ok: false, reason: 'unavailable', detail: 'sem chave' })
    expect(env.calls()).toBe(0)
  })

  it('geração desligada: nenhuma chamada e "geração desligada"', async () => {
    const env = setup([ok()], { enabled: false })
    expect(await run(env.source)).toEqual({
      ok: false,
      reason: 'unavailable',
      detail: 'geração desligada',
    })
    expect(env.calls()).toBe(0)
  })

  it('401: falha "refused" sem nova tentativa', async () => {
    const env = setup([{ status: 401, body: {} }, ok()])
    expect(await run(env.source)).toMatchObject({ ok: false, reason: 'refused' })
    expect(env.calls()).toBe(1)
  })
})
