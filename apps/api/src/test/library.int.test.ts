import {
  libraryResponseSchema,
  type LibraryItem,
  type ProgressCells,
  type PuzzleSourceId,
} from '@cruzadinha/shared'
import { sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { puzzles } from '../db/schema'
import { buildTestApp, sessionCookieFrom } from './app'
import { openTestDatabase, testClock, truncateAll, type TestClock } from './database'
import { fakeSource, okResult, type FakeSource } from './fake-source'

const handle = openTestDatabase()
const { db } = handle

const PASSWORD = 'senha-boa-123'

let clock: TestClock
let app: FastifyInstance
let source: FakeSource
let emptyCells: ProgressCells
let openPosition: { row: number; col: number }

async function register(email: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: PASSWORD },
  })
  const sid = sessionCookieFrom(response.headers['set-cookie'])
  if (!sid) throw new Error('cadastro sem cookie')
  return sid
}

const asUser = (sid?: string) => (sid ? { cookie: `sid=${sid}` } : {})

function getLibrary(sid?: string, query = '') {
  return app.inject({ method: 'GET', url: `/api/library${query}`, headers: asUser(sid) })
}

async function libraryOf(sid: string): Promise<LibraryItem[]> {
  const response = await getLibrary(sid)
  expect(response.statusCode).toBe(200)
  return libraryResponseSchema.parse(response.json()).items
}

function putProgress(puzzleId: string, payload: unknown, sid: string) {
  return app.inject({
    method: 'PUT',
    url: `/api/progress/${puzzleId}`,
    headers: asUser(sid),
    payload: payload as object,
  })
}

function resetProgress(puzzleId: string, sid: string) {
  return app.inject({
    method: 'POST',
    url: `/api/progress/${puzzleId}/reset`,
    headers: asUser(sid),
  })
}

const at = (seconds: number) => new Date(clock.now().getTime() + seconds * 1000).toISOString()

function withLetter(letter: string | null): ProgressCells {
  return emptyCells.map((row, r) =>
    row.map((cell, c) => (r === openPosition.row && c === openPosition.col ? letter : cell)),
  )
}

const save = (overrides: Record<string, unknown> = {}) => ({
  cells: withLetter('A'),
  elapsedMs: 83_000,
  status: 'in_progress',
  savedAt: at(-60),
  ...overrides,
})

// Guarda um puzzle (conteúdo inventado da fixture) por data; devolve o id.
async function storePuzzle(date: string, source: PuzzleSourceId = 'oglobo'): Promise<string> {
  const ok = okResult(date, source)
  const [row] = await db
    .insert(puzzles)
    .values({
      source: ok.puzzle.source,
      level: ok.puzzle.level,
      date,
      data: ok.puzzle,
      solution: ok.solution,
    })
    .returning({ puzzleId: puzzles.puzzleId })
  if (!row) throw new Error('puzzle não guardado')
  return row.puzzleId
}

async function count(table: 'puzzles' | 'progress' | 'rate_limit_attempts'): Promise<number> {
  const rows = await db.execute<{ total: number }>(
    sql`SELECT count(*)::int AS total FROM ${sql.identifier(table)}`,
  )
  return rows[0]?.total ?? -1
}

beforeEach(async () => {
  await truncateAll(db)
  clock = testClock()
  source = fakeSource()
  app = buildTestApp({ database: db, clock: clock.now, puzzleSources: [source] })

  const ok = okResult('2026-01-01')
  emptyCells = ok.puzzle.grid.cells.map((row) => row.map(() => null))
  const open = ok.puzzle.grid.cells
    .flatMap((row, r) => row.map((cell, c) => ({ kind: cell.kind, row: r, col: c })))
    .find((p) => p.kind === 'open')
  if (!open) throw new Error('a fixture precisa de célula aberta')
  openPosition = { row: open.row, col: open.col }
})
afterEach(() => app.close())
afterAll(() => handle.close())

describe('lista com a situação do jogador (US1)', () => {
  it('responde lista vazia quando não há puzzles guardados', async () => {
    const sid = await register('ana@exemplo.com')
    const response = await getLibrary(sid)

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ items: [] })
  })

  it('ordena do puzzle mais recente ao mais antigo', async () => {
    const sid = await register('ana@exemplo.com')
    await storePuzzle('2026-10-11')
    await storePuzzle('2026-10-13')
    await storePuzzle('2026-10-12')

    const items = await libraryOf(sid)
    expect(items.map((item) => item.date)).toEqual(['2026-10-13', '2026-10-12', '2026-10-11'])
    expect(items.every((item) => item.level === 'daily')).toBe(true)
  })

  it('mostra "não iniciado" e sem tempos quando o jogador nunca jogou', async () => {
    const sid = await register('ana@exemplo.com')
    const puzzleId = await storePuzzle('2026-10-13')

    expect(await libraryOf(sid)).toEqual([
      {
        puzzleId,
        source: 'oglobo',
        date: '2026-10-13',
        level: 'daily',
        status: 'not_started',
        elapsedMs: null,
        finishedMs: null,
        completedAt: null,
        bestMs: null,
        bestAt: null,
      },
    ])
  })

  it('mostra "em andamento" com o tempo acumulado', async () => {
    const sid = await register('ana@exemplo.com')
    const puzzleId = await storePuzzle('2026-10-13')
    await putProgress(puzzleId, save(), sid)

    const [item] = await libraryOf(sid)
    expect(item).toMatchObject({
      puzzleId,
      status: 'in_progress',
      elapsedMs: 83_000,
      finishedMs: null,
      completedAt: null,
      bestMs: null,
      bestAt: null,
    })
  })

  it('mostra "concluído" com tempo final, hora da conclusão e melhor tempo', async () => {
    const sid = await register('ana@exemplo.com')
    const puzzleId = await storePuzzle('2026-10-13')
    await putProgress(puzzleId, save({ status: 'completed', elapsedMs: 412_000 }), sid)

    const [item] = await libraryOf(sid)
    expect(item).toMatchObject({
      status: 'completed',
      elapsedMs: null,
      finishedMs: 412_000,
      bestMs: 412_000,
    })
    expect(item?.completedAt).toBe(clock.now().toISOString())
    expect(item?.bestAt).toBe(clock.now().toISOString())
  })

  it('reiniciado depois de concluir: volta a "não iniciado" e mantém o melhor tempo', async () => {
    const sid = await register('ana@exemplo.com')
    const puzzleId = await storePuzzle('2026-10-13')
    await putProgress(puzzleId, save({ status: 'completed', elapsedMs: 412_000 }), sid)
    await resetProgress(puzzleId, sid)

    const [item] = await libraryOf(sid)
    expect(item).toMatchObject({
      status: 'not_started',
      elapsedMs: null,
      finishedMs: null,
      completedAt: null,
      bestMs: 412_000,
    })
    expect(item?.bestAt).toBe(clock.now().toISOString())
  })

  it('reiniciado e jogado de novo: volta a "em andamento" com o melhor tempo', async () => {
    const sid = await register('ana@exemplo.com')
    const puzzleId = await storePuzzle('2026-10-13')
    await putProgress(puzzleId, save({ status: 'completed', elapsedMs: 412_000 }), sid)
    await resetProgress(puzzleId, sid)
    await putProgress(puzzleId, save({ elapsedMs: 5_000, savedAt: at(30) }), sid)

    const [item] = await libraryOf(sid)
    expect(item).toMatchObject({ status: 'in_progress', elapsedMs: 5_000, bestMs: 412_000 })
  })

  it('linha de progresso vazia (reinício sem recorde) conta como "não iniciado"', async () => {
    const sid = await register('ana@exemplo.com')
    const puzzleId = await storePuzzle('2026-10-13')
    await resetProgress(puzzleId, sid)
    expect(await count('progress')).toBe(1)

    const [item] = await libraryOf(sid)
    expect(item).toMatchObject({ status: 'not_started', elapsedMs: null, bestMs: null })
  })

  it('devolve no máximo 366 puzzles, os mais recentes, em menos de 1 s', async () => {
    const sid = await register('ana@exemplo.com')
    const ok = okResult('2025-01-01')
    const start = Date.UTC(2025, 0, 1)
    const rows = Array.from({ length: 367 }, (_, index) => ({
      source: ok.puzzle.source,
      level: ok.puzzle.level,
      date: new Date(start + index * 86_400_000).toISOString().slice(0, 10),
      data: ok.puzzle,
      solution: ok.solution,
    }))
    await db.insert(puzzles).values(rows)
    const newest = rows[366]?.date
    const oldest = rows[0]?.date

    const startedAt = performance.now()
    const items = await libraryOf(sid)
    const elapsed = performance.now() - startedAt

    expect(items).toHaveLength(366)
    expect(items[0]?.date).toBe(newest)
    expect(items.map((item) => item.date)).not.toContain(oldest)
    expect(elapsed).toBeLessThan(1000)
  })
})

describe('sem fonte e sem expor a resposta (US2)', () => {
  it('não chama a fonte nem consome o limite de busca, mesmo com datas ausentes', async () => {
    const sid = await register('ana@exemplo.com')
    await storePuzzle('2026-10-13')
    const attemptsBefore = await count('rate_limit_attempts')

    for (let index = 0; index < 5; index += 1) {
      const response = await getLibrary(sid)
      expect(response.statusCode).toBe(200)
    }

    expect(source.calls).toEqual([])
    const fetchAttempts = await db.execute<{ total: number }>(
      sql`SELECT count(*)::int AS total FROM rate_limit_attempts WHERE action = 'PUZZLE_FETCH'`,
    )
    expect(fetchAttempts[0]?.total).toBe(0)
    expect(await count('rate_limit_attempts')).toBe(attemptsBefore)
  })

  it('não traz grade, dicas, solução nem as letras do jogador', async () => {
    const sid = await register('ana@exemplo.com')
    const puzzleId = await storePuzzle('2026-10-13')
    await putProgress(puzzleId, save({ cells: withLetter('Q') }), sid)

    const response = await getLibrary(sid)
    const body = response.body
    for (const key of ['grid', 'words', 'attribution', 'solution', 'cells']) {
      expect(body).not.toContain(`"${key}"`)
    }
    expect(body).not.toContain('"Q"')
    expect(Object.keys(response.json().items[0]).sort()).toEqual(
      [
        'bestAt',
        'bestMs',
        'completedAt',
        'date',
        'elapsedMs',
        'finishedMs',
        'level',
        'puzzleId',
        'source',
        'status',
      ].sort(),
    )
  })

  it('só lê: não escreve em puzzles nem em progress', async () => {
    const sid = await register('ana@exemplo.com')
    const puzzleId = await storePuzzle('2026-10-13')
    await putProgress(puzzleId, save(), sid)
    const before = { puzzles: await count('puzzles'), progress: await count('progress') }

    await getLibrary(sid)

    expect({ puzzles: await count('puzzles'), progress: await count('progress') }).toEqual(before)
  })
})

describe('visitante sem sessão (feature 013)', () => {
  it('vê os mesmos puzzles, na mesma ordem, sem situação nem tempos de ninguém', async () => {
    const sid = await register('ana@exemplo.com')
    const first = await storePuzzle('2026-10-12')
    await storePuzzle('2026-10-13')
    await storePuzzle('2026-10-11')
    await putProgress(first, save({ status: 'completed', elapsedMs: 300_000 }), sid)

    const response = await getLibrary()
    expect(response.statusCode).toBe(200)
    expect(response.headers['set-cookie']).toBeUndefined()
    const items: LibraryItem[] = response.json().items
    const ofAna = await libraryOf(sid)

    expect(items.map((item) => item.puzzleId)).toEqual(ofAna.map((item) => item.puzzleId))
    for (const item of items) {
      expect(item).toMatchObject({
        status: 'not_started',
        elapsedMs: null,
        finishedMs: null,
        completedAt: null,
        bestMs: null,
        bestAt: null,
      })
    }
    expect(libraryResponseSchema.safeParse(response.json()).success).toBe(true)
  })

  it('com cookie inválido responde 401 e apaga o cookie', async () => {
    await storePuzzle('2026-10-13')
    const response = await getLibrary('A'.repeat(43))

    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({ error: 'unauthenticated' })
    expect(response.body).not.toContain('puzzleId')
    expect(String(response.headers['set-cookie'])).toMatch(/^sid=;.*Expires=Thu, 01 Jan 1970/)
  })
})

describe('isolado por usuário (US3)', () => {
  it('recusa sessão expirada', async () => {
    const sid = await register('ana@exemplo.com')
    await storePuzzle('2026-10-13')
    const expired = new Date(clock.now().getTime() - 1000).toISOString()
    await db.execute(sql`UPDATE sessions SET expires_at = ${expired}::timestamptz`)

    expect((await getLibrary(sid)).statusCode).toBe(401)
  })

  it('cada jogador vê só a própria situação e os próprios tempos', async () => {
    const ana = await register('ana@exemplo.com')
    const bia = await register('bia@exemplo.com')
    const first = await storePuzzle('2026-10-12')
    const second = await storePuzzle('2026-10-13')
    await putProgress(first, save({ status: 'completed', elapsedMs: 300_000 }), ana)
    await putProgress(second, save({ elapsedMs: 9_000 }), bia)

    const ofAna = await libraryOf(ana)
    const ofBia = await libraryOf(bia)
    expect(ofAna.map((item) => [item.date, item.status, item.bestMs])).toEqual([
      ['2026-10-13', 'not_started', null],
      ['2026-10-12', 'completed', 300_000],
    ])
    expect(ofBia.map((item) => [item.date, item.status, item.elapsedMs])).toEqual([
      ['2026-10-13', 'in_progress', 9_000],
      ['2026-10-12', 'not_started', null],
    ])
  })

  it('ignora um userId passado na query string', async () => {
    const ana = await register('ana@exemplo.com')
    const bia = await register('bia@exemplo.com')
    const puzzleId = await storePuzzle('2026-10-13')
    await putProgress(puzzleId, save({ status: 'completed', elapsedMs: 300_000 }), bia)
    const [{ userId } = { userId: '' }] = await db.execute<{ userId: string }>(
      sql`SELECT user_id AS "userId" FROM users WHERE email = 'bia@exemplo.com'`,
    )

    const response = await getLibrary(ana, `?userId=${userId}`)
    expect(response.statusCode).toBe(200)
    expect(response.json().items[0]).toMatchObject({ status: 'not_started', bestMs: null })
  })
})

describe('biblioteca por fonte (feature 014)', () => {
  async function bothSources() {
    const globo = await storePuzzle('2026-10-13')
    const cruzada = await storePuzzle('2026-10-13', 'cruzadaonline')
    return { globo, cruzada }
  }

  it('sem fonte lista só o O Globo, com a fonte em cada item (SC-007)', async () => {
    const { globo } = await bothSources()
    const response = await getLibrary()

    expect(response.statusCode).toBe(200)
    const items = libraryResponseSchema.parse(response.json()).items
    expect(items.map((item) => [item.puzzleId, item.source])).toEqual([[globo, 'oglobo']])
    expect(response.json().items[0].source).toBe('oglobo')
  })

  it('source=cruzadaonline lista só a nova fonte, para visitante e para conta', async () => {
    const { cruzada } = await bothSources()
    const sid = await register('ana@exemplo.com')

    for (const who of [undefined, sid]) {
      const response = await getLibrary(who, '?source=cruzadaonline')
      expect(response.statusCode).toBe(200)
      expect(response.json().items).toMatchObject([
        { puzzleId: cruzada, source: 'cruzadaonline', status: 'not_started' },
      ])
    }
  })

  it('o progresso de um puzzle da nova fonte só aparece na lista dela', async () => {
    const { cruzada } = await bothSources()
    const sid = await register('ana@exemplo.com')
    expect((await putProgress(cruzada, save(), sid)).statusCode).toBe(200)

    const ofCruzada = (await getLibrary(sid, '?source=cruzadaonline')).json().items
    const ofGlobo = (await getLibrary(sid, '?source=oglobo')).json().items
    expect(ofCruzada[0]).toMatchObject({ status: 'in_progress', elapsedMs: 83_000 })
    expect(ofGlobo[0]).toMatchObject({ status: 'not_started', elapsedMs: null })
  })

  it('três fontes no mesmo dia: cada pedido lista só a sua (feature 029)', async () => {
    const { globo, cruzada } = await bothSources()
    const brasil = await storePuzzle('2026-10-13', 'cruzadasbrasil')
    const sid = await register('ana@exemplo.com')

    for (const who of [undefined, sid]) {
      const ofBrasil = await getLibrary(who, '?source=cruzadasbrasil')
      expect(ofBrasil.json().items).toMatchObject([
        { puzzleId: brasil, source: 'cruzadasbrasil', status: 'not_started' },
      ])
    }
    // Pedido sem fonte e o da 014 continuam como antes (SC-007).
    expect(
      (await getLibrary()).json().items.map((item: { puzzleId: string }) => item.puzzleId),
    ).toEqual([globo])
    expect(
      (await getLibrary(undefined, '?source=cruzadaonline'))
        .json()
        .items.map((item: { puzzleId: string }) => item.puzzleId),
    ).toEqual([cruzada])
  })

  it('fonte desconhecida é pedido inválido', async () => {
    const response = await getLibrary(undefined, '?source=xyz')
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: 'invalid-input', fields: ['source'] })
  })

  it('o limite de 366 vale por fonte', async () => {
    const ok = okResult('2025-01-01')
    const start = Date.UTC(2025, 0, 1)
    const rows = Array.from({ length: 366 }, (_, index) => ({
      source: ok.puzzle.source,
      level: ok.puzzle.level,
      date: new Date(start + index * 86_400_000).toISOString().slice(0, 10),
      data: ok.puzzle,
      solution: ok.solution,
    }))
    await db.insert(puzzles).values(rows)
    await storePuzzle('2024-06-01', 'cruzadaonline')

    expect((await getLibrary()).json().items).toHaveLength(366)
    expect((await getLibrary(undefined, '?source=cruzadaonline')).json().items).toHaveLength(1)
  })
})
