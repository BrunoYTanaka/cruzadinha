import type { ProgressCells } from '@cruzadinha/shared'
import { eq, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { Writable } from 'node:stream'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { progress, puzzles, users } from '../db/schema'
import { todayInSaoPaulo } from '../lib/dates'
import { insertPuzzleIfAbsent } from '../modules/puzzles/puzzles.repository'
import { buildTestApp, sessionCookieFrom } from './app'
import { fakeSource, okResult } from './fake-source'
import { openTestDatabase, testClock, truncateAll, type TestClock } from './database'

const handle = openTestDatabase()
const { db } = handle

const PASSWORD = 'senha-boa-123'

let clock: TestClock
let app: FastifyInstance
let logged: string[]
let puzzleId: string
let emptyCells: ProgressCells
let solutionCells: ProgressCells
let blockPosition: { row: number; col: number }
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

async function loginAgain(email: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password: PASSWORD },
  })
  const sid = sessionCookieFrom(response.headers['set-cookie'])
  if (!sid) throw new Error('login sem cookie')
  return sid
}

const asUser = (sid?: string) => (sid ? { cookie: `sid=${sid}` } : {})

function getProgress(id: string, sid?: string) {
  return app.inject({ method: 'GET', url: `/api/progress/${id}`, headers: asUser(sid) })
}

function putProgress(id: string, payload: unknown, sid?: string) {
  return app.inject({
    method: 'PUT',
    url: `/api/progress/${id}`,
    headers: asUser(sid),
    payload: payload as object,
  })
}

function resetProgress(id: string, sid?: string) {
  return app.inject({ method: 'POST', url: `/api/progress/${id}/reset`, headers: asUser(sid) })
}

// Instante relativo ao relógio de teste, em ISO-8601.
const at = (seconds: number) => new Date(clock.now().getTime() + seconds * 1000).toISOString()

function withLetter(letter: string | null, position = openPosition): ProgressCells {
  return emptyCells.map((row, r) =>
    row.map((cell, c) => (r === position.row && c === position.col ? letter : cell)),
  )
}

const save = (overrides: Record<string, unknown> = {}) => ({
  cells: withLetter('A'),
  elapsedMs: 83_000,
  status: 'in_progress',
  savedAt: at(-60),
  ...overrides,
})

async function rowCount(): Promise<number> {
  const rows = await db.execute<{ total: number }>(sql`SELECT count(*)::int AS total FROM progress`)
  return rows[0]?.total ?? -1
}

beforeEach(async () => {
  await truncateAll(db)
  clock = testClock()
  logged = []
  const logStream = new Writable({
    write(chunk, _encoding, done) {
      logged.push(String(chunk))
      done()
    },
  })
  app = buildTestApp({ database: db, clock: clock.now, puzzleSources: [fakeSource()], logStream })

  const ok = okResult(todayInSaoPaulo(clock.now))
  const inserted = await insertPuzzleIfAbsent(db, { puzzle: ok.puzzle, solution: ok.solution })
  puzzleId = inserted.puzzleId
  solutionCells = ok.solution.cells
  emptyCells = ok.puzzle.grid.cells.map((row) => row.map(() => null))
  const positions = ok.puzzle.grid.cells.flatMap((row, r) =>
    row.map((cell, c) => ({ kind: cell.kind, row: r, col: c })),
  )
  const block = positions.find((p) => p.kind === 'block')
  const open = positions.find((p) => p.kind === 'open')
  if (!block || !open) throw new Error('a fixture precisa de bloco e célula aberta')
  blockPosition = { row: block.row, col: block.col }
  openPosition = { row: open.row, col: open.col }
})
afterEach(() => app.close())
afterAll(() => handle.close())

describe('salvar e retomar (US1)', () => {
  it('responde progress nulo quando o usuário ainda não jogou', async () => {
    const sid = await register('ana@exemplo.com')
    const response = await getProgress(puzzleId, sid)

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ progress: null })
    expect(await rowCount()).toBe(0)
  })

  it('salva um progresso parcial e o devolve igual', async () => {
    const sid = await register('ana@exemplo.com')
    const response = await putProgress(puzzleId, save(), sid)

    expect(response.statusCode).toBe(200)
    const saved = response.json().progress
    expect(saved).toMatchObject({
      puzzleId,
      cells: withLetter('A'),
      elapsedMs: 83_000,
      status: 'in_progress',
      completedAt: null,
      finishedMs: null,
      bestMs: null,
      bestAt: null,
    })
    const read = await getProgress(puzzleId, sid)
    expect(read.json().progress).toEqual(saved)
  })

  it('um segundo salvamento substitui o primeiro, em uma única linha', async () => {
    const sid = await register('ana@exemplo.com')
    await putProgress(puzzleId, save({ savedAt: at(-120) }), sid)
    const second = await putProgress(
      puzzleId,
      save({ cells: withLetter('B'), elapsedMs: 91_000, savedAt: at(-60) }),
      sid,
    )

    expect(second.json().progress).toMatchObject({ cells: withLetter('B'), elapsedMs: 91_000 })
    expect(await rowCount()).toBe(1)
  })

  it('outra sessão da mesma conta recebe as mesmas letras e o mesmo tempo', async () => {
    const first = await register('ana@exemplo.com')
    await putProgress(puzzleId, save(), first)
    const second = await loginAgain('ana@exemplo.com')

    const read = await getProgress(puzzleId, second)
    expect(read.json().progress).toMatchObject({ cells: withLetter('A'), elapsedMs: 83_000 })
  })

  it('aceita a grade totalmente vazia', async () => {
    const sid = await register('ana@exemplo.com')
    const response = await putProgress(puzzleId, save({ cells: emptyCells }), sid)
    expect(response.statusCode).toBe(200)
    expect(response.json().progress.cells).toEqual(emptyCells)
  })

  it('ignora um salvamento mais antigo e devolve o estado atual', async () => {
    const sid = await register('ana@exemplo.com')
    await putProgress(puzzleId, save({ savedAt: at(-30) }), sid)
    const stale = await putProgress(
      puzzleId,
      save({ cells: withLetter('Z'), elapsedMs: 1_000, savedAt: at(-90) }),
      sid,
    )

    expect(stale.statusCode).toBe(200)
    expect(stale.json().progress).toMatchObject({ cells: withLetter('A'), elapsedMs: 83_000 })
  })

  it.each([
    ['bloco preenchido', () => save({ cells: withLetter('A', blockPosition) })],
    ['duas letras', () => save({ cells: withLetter('AB') })],
    ['minúscula', () => save({ cells: withLetter('a') })],
    ['número', () => save({ cells: withLetter('7') })],
    ['dimensão errada', () => save({ cells: [['A']] })],
    ['tempo negativo', () => save({ elapsedMs: -1 })],
    ['tempo acima de 7 dias', () => save({ elapsedMs: 604_800_001 })],
    ['status desconhecido', () => save({ status: 'done' })],
    ['savedAt inválido', () => save({ savedAt: 'ontem' })],
    ['savedAt no futuro', () => save({ savedAt: at(600) })],
    ['campo extra', () => save({ userId: 'qualquer' })],
  ])('recusa %s e mantém o progresso anterior', async (_name, payload) => {
    const sid = await register('ana@exemplo.com')
    await putProgress(puzzleId, save(), sid)

    const response = await putProgress(puzzleId, payload(), sid)
    expect(response.statusCode).toBe(400)
    expect(response.json().error).toBe('invalid-input')

    const read = await getProgress(puzzleId, sid)
    expect(read.json().progress).toMatchObject({ cells: withLetter('A'), elapsedMs: 83_000 })
  })

  it('não grava nada quando o primeiro salvamento é recusado', async () => {
    const sid = await register('ana@exemplo.com')
    await putProgress(puzzleId, save({ savedAt: at(600) }), sid)
    expect(await rowCount()).toBe(0)
  })

  it('não repete as letras enviadas em erro nem em log', async () => {
    const sid = await register('ana@exemplo.com')
    const response = await putProgress(
      puzzleId,
      save({ cells: withLetter('ZZQXY', blockPosition) }),
      sid,
    )

    expect(response.statusCode).toBe(400)
    expect(response.body).not.toContain('ZZQXY')
    expect(logged.join('')).not.toContain('ZZQXY')
  })

  it('responde 404 para puzzle inexistente ou malformado', async () => {
    const sid = await register('ana@exemplo.com')
    const missing = '3f2a1c9e-1b2d-4c3e-8f4a-5b6c7d8e9f01'
    for (const id of [missing, 'nao-e-uuid']) {
      expect((await getProgress(id, sid)).json().error).toBe('puzzle-unavailable')
      expect((await putProgress(id, save(), sid)).statusCode).toBe(404)
      expect((await resetProgress(id, sid)).statusCode).toBe(404)
    }
    expect(await rowCount()).toBe(0)
  })

  it('dois salvamentos simultâneos deixam uma única linha', async () => {
    const sid = await register('ana@exemplo.com')
    const responses = await Promise.all([
      putProgress(puzzleId, save({ savedAt: at(-50) }), sid),
      putProgress(puzzleId, save({ cells: withLetter('B'), savedAt: at(-40) }), sid),
    ])

    expect(responses.map((r) => r.statusCode)).toEqual([200, 200])
    expect(await rowCount()).toBe(1)
    const read = await getProgress(puzzleId, sid)
    expect(read.json().progress.cells).toEqual(withLetter('B'))
  })
})

describe('isolamento entre usuários (US3)', () => {
  it('cada usuário lê e altera só o próprio progresso', async () => {
    const ana = await register('ana@exemplo.com')
    const beto = await register('beto@exemplo.com')
    await putProgress(puzzleId, save({ cells: withLetter('A'), elapsedMs: 10_000 }), ana)
    await putProgress(puzzleId, save({ cells: withLetter('B'), elapsedMs: 20_000 }), beto)

    const anaRead = (await getProgress(puzzleId, ana)).json().progress
    const betoRead = (await getProgress(puzzleId, beto)).json().progress
    expect(anaRead).toMatchObject({ cells: withLetter('A'), elapsedMs: 10_000 })
    expect(betoRead).toMatchObject({ cells: withLetter('B'), elapsedMs: 20_000 })
    expect(await rowCount()).toBe(2)

    const [anaRow] = await db
      .select()
      .from(progress)
      .innerJoin(users, eq(users.userId, progress.userId))
      .where(eq(users.email, 'ana@exemplo.com'))
    expect(anaRow?.progress.elapsedMs).toBe(10_000)
  })

  it('o progresso de um usuário não traz dados de outro', async () => {
    const ana = await register('ana@exemplo.com')
    const beto = await register('beto@exemplo.com')
    await putProgress(puzzleId, save(), ana)
    const body = (await getProgress(puzzleId, beto)).body

    expect(body).toBe(JSON.stringify({ progress: null }))
    const anaBody = (await getProgress(puzzleId, ana)).body
    expect(anaBody).not.toContain('beto')
    expect(anaBody).not.toContain('userId')
  })

  it('recusa quem não tem sessão e não grava nada', async () => {
    for (const response of [
      await getProgress(puzzleId),
      await putProgress(puzzleId, save()),
      await resetProgress(puzzleId),
    ]) {
      expect(response.statusCode).toBe(401)
      expect(response.json().error).toBe('unauthenticated')
    }
    expect(await rowCount()).toBe(0)
  })

  it('remover o usuário apaga o progresso dele e preserva o dos outros', async () => {
    const ana = await register('ana@exemplo.com')
    const beto = await register('beto@exemplo.com')
    await putProgress(puzzleId, save(), ana)
    await putProgress(puzzleId, save(), beto)

    const [anaUser] = await db.select().from(users).where(eq(users.email, 'ana@exemplo.com'))
    if (!anaUser) throw new Error('usuário de teste ausente')
    await db.delete(users).where(eq(users.userId, anaUser.userId))
    expect(await rowCount()).toBe(1)
    expect((await getProgress(puzzleId, beto)).json().progress).not.toBeNull()
  })

  it('não remove um puzzle que tem progresso', async () => {
    const ana = await register('ana@exemplo.com')
    await putProgress(puzzleId, save(), ana)

    await expect(db.delete(puzzles).where(eq(puzzles.puzzleId, puzzleId))).rejects.toThrow()
    expect(await rowCount()).toBe(1)
  })
})

describe('concluir e melhor tempo (US2)', () => {
  const complete = (elapsedMs: number, savedAtSeconds: number) =>
    save({ cells: solutionCells, status: 'completed', elapsedMs, savedAt: at(savedAtSeconds) })

  it('registra o momento do servidor, o tempo de término e o primeiro recorde', async () => {
    const sid = await register('ana@exemplo.com')
    const response = await putProgress(puzzleId, complete(83_000, -300), sid)

    expect(response.statusCode).toBe(200)
    const done = response.json().progress
    expect(done).toMatchObject({
      status: 'completed',
      finishedMs: 83_000,
      bestMs: 83_000,
      completedAt: clock.now().toISOString(),
      bestAt: clock.now().toISOString(),
    })
    expect((await getProgress(puzzleId, sid)).json().progress).toEqual(done)
  })

  it('reiniciar zera a partida atual e mantém o recorde e a data dele', async () => {
    const sid = await register('ana@exemplo.com')
    const first = (await putProgress(puzzleId, complete(83_000, -300), sid)).json().progress
    clock.advance(60_000)

    const reset = await resetProgress(puzzleId, sid)
    expect(reset.statusCode).toBe(200)
    expect(reset.json().progress).toMatchObject({
      cells: emptyCells,
      elapsedMs: 0,
      status: 'in_progress',
      completedAt: null,
      finishedMs: null,
      bestMs: 83_000,
      bestAt: first.bestAt,
    })
  })

  it('o recorde só melhora com tempo estritamente menor', async () => {
    const sid = await register('ana@exemplo.com')
    const first = (await putProgress(puzzleId, complete(83_000, -300), sid)).json().progress

    for (const [elapsedMs, expectedBest] of [
      [90_000, 83_000],
      [83_000, 83_000],
      [79_000, 79_000],
    ] as const) {
      clock.advance(60_000)
      await resetProgress(puzzleId, sid)
      clock.advance(1_000)
      const done = await putProgress(puzzleId, complete(elapsedMs, 0), sid)
      expect(done.json().progress.bestMs).toBe(expectedBest)
      expect(done.json().progress.finishedMs).toBe(elapsedMs)
      if (expectedBest === 83_000) expect(done.json().progress.bestAt).toBe(first.bestAt)
      else expect(done.json().progress.bestAt).toBe(clock.now().toISOString())
    }
  })

  it('recusa voltar a em andamento ou alterar letras de um concluído', async () => {
    const sid = await register('ana@exemplo.com')
    await putProgress(puzzleId, complete(83_000, -300), sid)
    const before = (await getProgress(puzzleId, sid)).json().progress

    const back = await putProgress(puzzleId, save({ savedAt: at(-200) }), sid)
    expect(back.statusCode).toBe(409)
    expect(back.json().error).toBe('progress-completed')

    const other = await putProgress(
      puzzleId,
      save({ cells: withLetter('Q'), status: 'completed', savedAt: at(-100) }),
      sid,
    )
    expect(other.statusCode).toBe(409)
    expect((await getProgress(puzzleId, sid)).json().progress).toEqual(before)
  })

  it('repetir a mesma conclusão é idempotente', async () => {
    const sid = await register('ana@exemplo.com')
    const first = (await putProgress(puzzleId, complete(83_000, -300), sid)).json().progress
    clock.advance(30_000)

    const again = await putProgress(puzzleId, complete(83_000, -200), sid)
    expect(again.statusCode).toBe(200)
    expect(again.json().progress).toEqual(first)
  })

  it('um salvamento atrasado, anterior ao reinício, não ressuscita as letras', async () => {
    const sid = await register('ana@exemplo.com')
    await putProgress(puzzleId, save({ savedAt: at(-120) }), sid)
    clock.advance(10_000)
    await resetProgress(puzzleId, sid)

    const late = await putProgress(puzzleId, save({ savedAt: at(-60) }), sid)
    expect(late.statusCode).toBe(200)
    expect(late.json().progress).toMatchObject({ cells: emptyCells, elapsedMs: 0 })
  })

  it('reiniciar sem progresso prévio cria uma linha vazia', async () => {
    const sid = await register('ana@exemplo.com')
    const reset = await resetProgress(puzzleId, sid)

    expect(reset.statusCode).toBe(200)
    expect(reset.json().progress).toMatchObject({
      cells: emptyCells,
      elapsedMs: 0,
      status: 'in_progress',
      bestMs: null,
    })
    expect(await rowCount()).toBe(1)
  })

  it('conclusão e salvamento comum simultâneos nunca desfazem a conclusão', async () => {
    const sid = await register('ana@exemplo.com')
    await putProgress(puzzleId, save({ savedAt: at(-400) }), sid)

    await Promise.all([
      putProgress(puzzleId, complete(83_000, -300), sid),
      putProgress(puzzleId, save({ savedAt: at(-200) }), sid),
    ])
    const final = (await getProgress(puzzleId, sid)).json().progress
    // Se o comum rodou depois, foi recusado; se rodou antes, a conclusão (savedAt menor) foi ignorada
    // ou aplicada sobre ele. Em qualquer ordem o registro fica coerente.
    if (final.status === 'completed') {
      expect(final.completedAt).not.toBeNull()
      expect(final.finishedMs).toBe(83_000)
    } else {
      expect(final).toMatchObject({ completedAt: null, finishedMs: null })
    }
    expect(await rowCount()).toBe(1)
  })
})
