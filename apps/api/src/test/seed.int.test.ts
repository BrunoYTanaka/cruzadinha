import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, inject, it } from 'vitest'
import { invites, puzzles, users } from '../db/schema'
import { createDatabase } from '../db/client'
import { runSeed } from '../db/seed-user'
import {
  validatePuzzleWithSolution,
  puzzleResponseSchema,
  puzzleSchema,
  solutionSchema,
} from '@cruzadinha/shared'
import { todayInSaoPaulo } from '../lib/dates'
import { buildTestApp } from './app'
import { fakeSource, okResult } from './fake-source'
import { openTestDatabase, testClock, truncateAll } from './database'

const handle = openTestDatabase()
const { db } = handle

let out: string
let err: string

beforeEach(async () => {
  await truncateAll(db)
  clock = testClock()
  out = ''
  err = ''
})
afterAll(() => handle.close())

let clock = testClock()

function seed(env: Record<string, string | undefined>): Promise<number> {
  return runSeed(
    { DATABASE_URL: inject('databaseUrl'), NODE_ENV: 'development', ...env },
    {
      openDatabase: createDatabase,
      clock: clock.now,
      stdout: (text) => {
        out += text
      },
      stderr: (text) => {
        err += text
      },
    },
  )
}

const DEV = { SEED_USER_EMAIL: ' Dev@Cruzadinha.local ', SEED_USER_PASSWORD: 'senha-de-teste-123' }

async function login(password: string) {
  const app: FastifyInstance = buildTestApp({ database: db, clock: testClock().now })
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'dev@cruzadinha.local', password },
  })
  await app.close()
  return response.statusCode
}

describe('db:seed', () => {
  it('creates the test account without an invite', async () => {
    expect(await seed(DEV)).toBe(0)
    expect(out).toContain('Usuário de teste criado: dev@cruzadinha.local\n')

    const [user] = await db.select().from(users)
    expect(user?.email).toBe('dev@cruzadinha.local')
    expect(user?.passwordHash.startsWith('$argon2id$')).toBe(true)
    expect(await db.select().from(invites)).toHaveLength(0)
    expect(await login('senha-de-teste-123')).toBe(200)
  })

  it('changes nothing when the account already exists', async () => {
    await seed(DEV)
    const [before] = await db.select().from(users)

    out = ''
    expect(await seed({ ...DEV, SEED_USER_PASSWORD: 'outra-senha-456' })).toBe(0)
    expect(out).toContain('Usuário de teste já existe: dev@cruzadinha.local\n')

    const [after] = await db.select().from(users)
    expect(after?.passwordHash).toBe(before?.passwordHash)
    expect(after?.updatedAt.getTime()).toBe(before?.updatedAt.getTime())
    expect(await login('senha-de-teste-123')).toBe(200)
  })

  it('refuses to run in production, before touching the database', async () => {
    expect(await seed({ ...DEV, NODE_ENV: 'production', DATABASE_URL: undefined })).toBe(1)
    expect(err).toBe('O seed só roda em desenvolvimento.\n')
    expect(await db.select().from(users)).toHaveLength(0)
  })

  it.each([
    [{ SEED_USER_EMAIL: undefined }, 'SEED_USER_EMAIL'],
    [{ SEED_USER_EMAIL: 'dev' }, 'SEED_USER_EMAIL'],
    [{ SEED_USER_PASSWORD: '1234567' }, 'SEED_USER_PASSWORD'],
  ])('fails without writing for %o', async (override, variable) => {
    expect(await seed({ ...DEV, ...override })).toBe(1)
    expect(err).toContain(variable)
    expect(await db.select().from(users)).toHaveLength(0)
  })

  it('never prints the password', async () => {
    await seed(DEV)
    await seed({ ...DEV, SEED_USER_PASSWORD: '1234567' })
    expect(out + err).not.toContain('senha-de-teste-123')
    expect(out + err).not.toContain('1234567')
  })
})

describe('db:seed (puzzle de exemplo)', () => {
  const today = () => todayInSaoPaulo(clock.now)

  it('grava um exemplo de cada fonte na data de hoje, com atribuição própria e sem rede', async () => {
    expect(await seed(DEV)).toBe(0)
    expect(out).toContain(`Puzzle de exemplo gravado: ${today()} (O Globo)`)
    expect(out).toContain(`Puzzle de exemplo gravado: ${today()} (Cruzada Online)`)
    expect(out).toContain(`Puzzle de exemplo gravado: ${today()} (Cruzadas Brasil)`)

    const rows = await db.select().from(puzzles).orderBy(puzzles.source)
    expect(rows.map((row) => [row.source, row.date])).toEqual([
      ['cruzadaonline', today()],
      ['cruzadasbrasil', today()],
      ['oglobo', today()],
    ])
    const [cruzada, brasil, globo] = rows.map((row) => puzzleSchema.parse(row.data))
    expect(globo?.attribution).toEqual({
      sourceName: 'Exemplo de desenvolvimento (seed)',
      title: 'Exemplo de desenvolvimento (seed)',
      author: null,
      copyright: null,
    })
    expect(cruzada?.attribution).toEqual({
      sourceName: 'Exemplo de desenvolvimento (seed)',
      title: 'Exemplo de desenvolvimento (seed): Cruzada Online',
      author: null,
      copyright: null,
    })
    expect(brasil?.attribution.title).toBe('Exemplo de desenvolvimento (seed): Cruzadas Brasil')
    for (const row of rows) {
      const puzzle = puzzleSchema.parse(row.data)
      expect(validatePuzzleWithSolution(puzzle, solutionSchema.parse(row.solution)).success).toBe(
        true,
      )
    }
  })

  it('é entregue pela API como qualquer puzzle, sem consultar a fonte', async () => {
    await seed(DEV)
    const source = fakeSource()
    const app: FastifyInstance = buildTestApp({
      database: db,
      clock: clock.now,
      puzzleSources: [source],
    })
    const logged = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'dev@cruzadinha.local', password: 'senha-de-teste-123' },
    })
    const sid = /sid=([^;]*)/.exec(String(logged.headers['set-cookie']))?.[1]
    const response = await app.inject({
      method: 'GET',
      url: `/api/puzzles?date=${today()}`,
      headers: { cookie: `sid=${sid}` },
    })
    await app.close()

    expect(response.statusCode).toBe(200)
    const body = puzzleResponseSchema.parse(response.json())
    const [stored] = await db.select().from(puzzles).where(eq(puzzles.source, 'oglobo'))
    expect(body.solution).toEqual(solutionSchema.parse(stored?.solution))
    expect(source.calls).toEqual([])
  })

  it('não altera o exemplo ao rodar de novo', async () => {
    await seed(DEV)
    const before = await db.select().from(puzzles).orderBy(puzzles.source)

    out = ''
    expect(await seed(DEV)).toBe(0)
    expect(out).toContain(`Já existe puzzle em ${today()} (O Globo); exemplo não gravado.`)
    expect(out).toContain(`Já existe puzzle em ${today()} (Cruzada Online); exemplo não gravado.`)
    expect(out).toContain(`Já existe puzzle em ${today()} (Cruzadas Brasil); exemplo não gravado.`)
    const rows = await db.select().from(puzzles).orderBy(puzzles.source)
    expect(rows).toHaveLength(3)
    expect(rows.map((row) => row.puzzleId)).toEqual(before.map((row) => row.puzzleId))
    expect(rows.map((row) => row.updatedAt.getTime())).toEqual(
      before.map((row) => row.updatedAt.getTime()),
    )
  })

  it('não substitui o puzzle real já guardado para hoje', async () => {
    const real = okResult(today())
    await db.insert(puzzles).values({
      source: 'oglobo',
      level: 'daily',
      date: today(),
      data: { ...real.puzzle, attribution: { ...real.puzzle.attribution, title: 'Real' } },
      solution: real.solution,
    })

    expect(await seed(DEV)).toBe(0)
    expect(out).toContain(`Já existe puzzle em ${today()} (O Globo); exemplo não gravado.`)
    const [row] = await db.select().from(puzzles).where(eq(puzzles.source, 'oglobo'))
    expect(puzzleSchema.parse(row?.data).attribution.title).toBe('Real')
  })

  it('em produção recusa antes de abrir o banco e não grava nada', async () => {
    expect(await seed({ ...DEV, NODE_ENV: 'production', DATABASE_URL: undefined })).toBe(1)
    expect(await db.select().from(puzzles)).toHaveLength(0)
  })
})
