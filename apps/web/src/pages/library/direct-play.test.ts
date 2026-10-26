import type { LibraryItem } from '@cruzadinha/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '../../shared/services/api/query-keys/query-keys'
import { resetServerWake, waitForServer } from '../../shared/services/api/server-wake/server-wake'
import { updateSettings } from '../../shared/services/settings-store/settings-store'
import {
  clearRememberedSource,
  rememberGameSource,
} from '../../features/library/services/source-choice'
import { markSourceDown } from '../../features/library/helpers/source-down'
import type { TodayCard } from '../../features/library/helpers/today-cards'
import { makeLibraryItem } from '../../test/fixtures'
import { jsonResponse, mockApi } from '../../test/http'
import { aUser, makeQueryClient, serverIsReady } from '../../test/render'
import { decideDirectPlay, directPlayLoader, directPlayMessage } from './direct-play'

const card = (patch: Partial<TodayCard>): TodayCard => ({
  source: 'cruzadaonline',
  name: 'Cruzada Online',
  kind: 'not_started',
  status: '',
  spoken: '',
  action: 'Jogar',
  href: '/jogo/abc',
  ...patch,
})

describe('decideDirectPlay', () => {
  it('não iniciada ou em andamento vai ao jogo', () => {
    expect(decideDirectPlay(card({}))).toEqual({ kind: 'go', href: '/jogo/abc' })
    expect(decideDirectPlay(card({ kind: 'in_progress' }))).toEqual({
      kind: 'go',
      href: '/jogo/abc',
    })
  })

  it('ainda não guardada, com a fonte no ar, vai buscar', () => {
    expect(decideDirectPlay(card({ kind: 'fetchable', href: '/dia/2026-10-21?fonte=x' }))).toEqual({
      kind: 'go',
      href: '/dia/2026-10-21?fonte=x',
    })
  })

  it('concluída, sem cruzada ou fonte fora do ar ficam no calendário com o motivo', () => {
    expect(decideDirectPlay(card({ kind: 'completed' }))).toEqual({
      kind: 'stay',
      reason: 'completed',
      name: 'Cruzada Online',
    })
    expect(decideDirectPlay(card({ kind: 'none', href: null }))).toEqual({
      kind: 'stay',
      reason: 'no-puzzle',
      name: 'Cruzada Online',
    })
    expect(decideDirectPlay(card({ kind: 'future', href: null }))).toMatchObject({
      reason: 'no-puzzle',
    })
    expect(decideDirectPlay(card({ kind: 'fetchable', href: null }))).toEqual({
      kind: 'stay',
      reason: 'source-down',
      name: 'Cruzada Online',
    })
  })

  it('o aviso cita o nome da cruzada', () => {
    expect(directPlayMessage({ kind: 'stay', reason: 'completed', name: 'Cruzada Online' })).toBe(
      'Cruzada Online: a cruzada de hoje já foi concluída.',
    )
    expect(directPlayMessage({ kind: 'stay', reason: 'no-puzzle', name: 'O Globo' })).toBe(
      'O Globo não publicou cruzada hoje.',
    )
    expect(directPlayMessage({ kind: 'stay', reason: 'source-down', name: 'O Globo' })).toBe(
      'O Globo está fora do ar agora.',
    )
  })
})

describe('directPlayLoader', () => {
  const today = '2026-10-21'
  const run = (
    items: LibraryItem[],
    { initialPath = '/', source = 'cruzadaonline' }: { initialPath?: string; source?: string } = {},
  ) => {
    mockApi({ 'GET /api/library': () => jsonResponse(200, { items }) })
    const queryClient = makeQueryClient()
    queryClient.setQueryData(queryKeys.session, { user: aUser })
    updateSettings({ directToGame: true, defaultSource: source })
    const loader = directPlayLoader(queryClient, { initialPath, today: () => today })
    return loader
  }

  beforeEach(async () => {
    resetServerWake()
    await serverIsReady()
  })

  afterEach(() => {
    resetServerWake()
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  it('com a API dormindo espera acordar antes de consultar a sessão e ainda leva ao jogo (feature 032)', async () => {
    resetServerWake()
    const item = makeLibraryItem(today, { source: 'cruzadaonline' })
    let awake = false
    const { calls } = mockApi({
      'GET /api/health': () => jsonResponse(200, { status: 'ok', database: 'up' }),
      'GET /api/auth/me': () =>
        awake ? jsonResponse(200, { user: aUser }) : jsonResponse(503, { error: 'x' }),
      'GET /api/library': () => jsonResponse(200, { items: [item] }),
    })
    const queryClient = makeQueryClient()
    updateSettings({ directToGame: true, defaultSource: 'cruzadaonline' })
    const loader = directPlayLoader(queryClient, { initialPath: '/', today: () => today })
    const request = new Request('http://localhost/')
    const running = loader({ request })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(calls).toEqual([])
    awake = true
    await waitForServer()
    const result = (await running) as Response
    expect(result.headers.get('Location')).toBe(`/jogo/${item.puzzleId}`)
    expect(calls.map((call) => call.key)[0]).toBe('GET /api/health')
  })

  it('a fonte do último jogo (feature 031) não muda a cruzada do atalho', async () => {
    rememberGameSource('oglobo')
    const item = makeLibraryItem(today, { source: 'cruzadaonline' })
    const result = (await run([item])()) as Response
    clearRememberedSource()
    expect(result.headers.get('Location')).toBe(`/jogo/${item.puzzleId}`)
  })

  it('desligado não faz nada', async () => {
    const loader = run([])
    updateSettings({ directToGame: false })
    expect(await loader()).toBeNull()
  })

  it('na primeira entrada em /, redireciona ao jogo de hoje da cruzada padrão', async () => {
    const item = makeLibraryItem(today, { source: 'cruzadaonline' })
    const loader = run([item])
    const result = await loader()
    expect(result).toBeInstanceOf(Response)
    expect((result as Response).headers.get('Location')).toBe(`/jogo/${item.puzzleId}`)
  })

  it('só age uma vez por carregamento da página (FR-014)', async () => {
    const loader = run([makeLibraryItem(today, { source: 'cruzadaonline' })])
    await loader()
    expect(await loader()).toBeNull()
  })

  it('a página não abriu em / (link direto): não faz nada', async () => {
    const loader = run([makeLibraryItem(today, { source: 'cruzadaonline' })], {
      initialPath: '/jogo/abc',
    })
    expect(await loader()).toBeNull()
  })

  it('ainda não guardada vai buscar o dia na fonte', async () => {
    const loader = run([])
    const result = (await loader()) as Response
    expect(result.headers.get('Location')).toBe(`/dia/${today}?fonte=cruzadaonline`)
  })

  it('concluída fica no calendário com o motivo', async () => {
    const loader = run([
      makeLibraryItem(today, {
        source: 'cruzadaonline',
        status: 'completed',
        elapsedMs: 60_000,
        finishedMs: 60_000,
        completedAt: `${today}T12:00:00.000Z`,
        bestMs: 60_000,
        bestAt: `${today}T12:00:00.000Z`,
      }),
    ])
    expect(await loader()).toEqual({
      directPlay: { kind: 'stay', reason: 'completed', name: 'Cruzada Online' },
    })
  })

  it('fonte fora do ar fica no calendário com o motivo', async () => {
    markSourceDown('cruzadaonline')
    const loader = run([])
    expect(await loader()).toEqual({
      directPlay: { kind: 'stay', reason: 'source-down', name: 'Cruzada Online' },
    })
  })

  it('a cruzada padrão clube só vai ao jogo se hoje já está salvo; sem edição, fica com o motivo', async () => {
    const item = makeLibraryItem(today, { source: 'clube' })
    const saved = (await run([item], { source: 'clube' })()) as Response
    expect(saved.headers.get('Location')).toBe(`/jogo/${item.puzzleId}`)
    expect(await run([], { source: 'clube' })()).toEqual({
      directPlay: { kind: 'stay', reason: 'no-puzzle', name: 'Cruzadas Clube' },
    })
  })

  it('cruzada padrão desconhecida usa a primeira fonte', async () => {
    const item = makeLibraryItem(today, { source: 'oglobo' })
    const loader = run([item], { source: 'nova-fonte' })
    const result = (await loader()) as Response
    expect(result.headers.get('Location')).toBe(`/jogo/${item.puzzleId}`)
  })

  it('erro ao ler a biblioteca fica no calendário sem aviso', async () => {
    const loader = run([])
    mockApi({ 'GET /api/library': () => jsonResponse(500, { error: 'internal-error' }) })
    expect(await loader()).toBeNull()
  })
})
