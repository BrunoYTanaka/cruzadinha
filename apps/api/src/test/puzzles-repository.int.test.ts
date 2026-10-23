import { puzzleSchema } from '@cruzadinha/shared'
import { sql } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { puzzles } from '../db/schema'
import {
  existingDates,
  findPuzzle,
  findPuzzleById,
  insertPuzzleIfAbsent,
} from '../modules/puzzles/puzzles.repository'
import { okResult } from './fake-source'
import { openTestDatabase, truncateAll } from './database'

const handle = openTestDatabase()
const { db } = handle

beforeEach(() => truncateAll(db))
afterAll(() => handle.close())

const key = (date: string) => ({ source: 'oglobo', level: 'daily', date }) as const

describe('repositório de puzzles', () => {
  it('grava e relê um puzzle com a solução', async () => {
    const { puzzle, solution } = okResult('2026-10-12')
    const saved = await insertPuzzleIfAbsent(db, { puzzle, solution })
    expect(saved.inserted).toBe(true)

    const byDate = await findPuzzle(db, key('2026-10-12'))
    expect(byDate?.puzzleId).toBe(saved.puzzleId)
    expect(puzzleSchema.safeParse(byDate?.puzzle).success).toBe(true)
    expect(byDate?.solution).toEqual(solution)
    expect((await findPuzzleById(db, saved.puzzleId))?.puzzle.date).toBe('2026-10-12')
  })

  it('devolve undefined para data ou id ausentes', async () => {
    expect(await findPuzzle(db, key('2026-10-12'))).toBeUndefined()
    expect(await findPuzzleById(db, '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a')).toBeUndefined()
  })

  it('não reescreve a mesma data: a segunda gravação devolve o id existente', async () => {
    const { puzzle, solution } = okResult('2026-10-12')
    const first = await insertPuzzleIfAbsent(db, { puzzle, solution })
    const second = await insertPuzzleIfAbsent(db, {
      puzzle: { ...puzzle, attribution: { ...puzzle.attribution, title: 'Outro título' } },
      solution,
    })

    expect(second).toEqual({ puzzleId: first.puzzleId, inserted: false })
    expect((await db.select().from(puzzles)).length).toBe(1)
    expect((await findPuzzle(db, key('2026-10-12')))?.puzzle.attribution.title).toBe(
      puzzle.attribution.title,
    )
  })

  it('duas gravações concorrentes deixam uma linha e o mesmo id', async () => {
    const { puzzle, solution } = okResult('2026-10-12')
    const [a, b] = await Promise.all([
      insertPuzzleIfAbsent(db, { puzzle, solution }),
      insertPuzzleIfAbsent(db, { puzzle, solution }),
    ])

    expect(a.puzzleId).toBe(b.puzzleId)
    expect([a.inserted, b.inserted].sort()).toEqual([false, true])
    expect((await db.select().from(puzzles)).length).toBe(1)
  })

  it('existingDates devolve só as datas presentes', async () => {
    for (const date of ['2026-10-10', '2026-10-12']) {
      const { puzzle, solution } = okResult(date)
      await insertPuzzleIfAbsent(db, { puzzle, solution })
    }
    const found = await existingDates(db, {
      source: 'oglobo',
      level: 'daily',
      dates: ['2026-10-10', '2026-10-11', '2026-10-12'],
    })
    expect([...found].sort()).toEqual(['2026-10-10', '2026-10-12'])
    expect((await existingDates(db, { source: 'oglobo', level: 'daily', dates: [] })).size).toBe(0)
  })

  it('guarda as duas fontes na mesma data em linhas diferentes', async () => {
    const globo = okResult('2026-10-12')
    const cruzada = okResult('2026-10-12', 'cruzadaonline')
    const a = await insertPuzzleIfAbsent(db, globo)
    const b = await insertPuzzleIfAbsent(db, cruzada)

    expect(a.inserted && b.inserted).toBe(true)
    expect(a.puzzleId).not.toBe(b.puzzleId)
    const stored = await findPuzzle(db, { ...key('2026-10-12'), source: 'cruzadaonline' })
    expect(stored?.puzzle.attribution.sourceName).toBe('Cruzada Online')
    expect((await findPuzzle(db, key('2026-10-12')))?.puzzleId).toBe(a.puzzleId)
  })

  it('a regra do banco aceita a fonte clube (migração 0007)', async () => {
    const clube = okResult('2026-10-12', 'clube')
    const saved = await insertPuzzleIfAbsent(db, clube)
    expect(saved.inserted).toBe(true)
    const stored = await findPuzzle(db, { ...key('2026-10-12'), source: 'clube' })
    expect(stored?.puzzle.attribution.sourceName).toBe('Cruzadas Clube')
  })

  it('guarda a terceira fonte (Cruzadas Brasil) na mesma data (feature 029)', async () => {
    const brasil = await insertPuzzleIfAbsent(db, okResult('2026-10-12', 'cruzadasbrasil'))
    const globo = await insertPuzzleIfAbsent(db, okResult('2026-10-12'))

    expect(brasil.inserted && globo.inserted).toBe(true)
    const stored = await findPuzzle(db, { ...key('2026-10-12'), source: 'cruzadasbrasil' })
    expect(stored?.puzzle.attribution.sourceName).toBe('Cruzadas Brasil')
  })

  it('a regra do banco recusa uma fonte desconhecida', async () => {
    const { puzzle, solution } = okResult('2026-10-12')
    await expect(
      db.execute(
        sql`INSERT INTO puzzles (source, level, date, data, solution)
            VALUES ('xyz', 'daily', '2026-10-12', ${JSON.stringify(puzzle)}::jsonb,
                    ${JSON.stringify(solution)}::jsonb)`,
      ),
    ).rejects.toMatchObject({ cause: { constraint_name: 'puzzles_source_check' } })
  })

  it('lança, sem vazar o conteúdo, quando a linha guardada é inválida', async () => {
    await db.execute(
      sql`INSERT INTO puzzles (source, level, date, data, solution)
          VALUES ('oglobo', 'daily', '2026-10-12', '{"segredo":"ABCDE"}'::jsonb, '{}'::jsonb)`,
    )
    await expect(findPuzzle(db, key('2026-10-12'))).rejects.toThrow('puzzle guardado inválido')
    await expect(findPuzzle(db, key('2026-10-12'))).rejects.not.toThrow(/ABCDE/)
  })
})
