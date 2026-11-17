import { readFileSync } from 'node:fs'
import { sql } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { readGeneratedSettings } from '../modules/sources'
import { generatedSourceSettings, sourceSettings } from '../platform/db/schema'
import { okResult } from './fake-source'
import { openTestDatabase, truncateAll } from './database'
import { insertPuzzleIfAbsent } from '../modules/puzzles/puzzles.repository'

const handle = openTestDatabase()
const { db } = handle

beforeEach(() => truncateAll(db))
afterAll(() => handle.close())

// As linhas iniciais da migração 0014; o truncate de cada teste as apaga, então o teste as reaplica.
const initialRows = readFileSync(
  new URL('../../drizzle/0014_fonte_casa.sql', import.meta.url),
  'utf8',
)
  .split('--> statement-breakpoint')
  .filter((statement) => statement.includes('INSERT INTO'))

async function applyInitialRows() {
  for (const statement of initialRows) await db.execute(sql.raw(statement))
}

describe('fonte casa no banco (feature 064)', () => {
  it('cria casa com 11/medium e escondida no fim da ordem', async () => {
    await db.insert(sourceSettings).values([
      { sourceId: 'oglobo', visible: true, position: 0 },
      { sourceId: 'clube', visible: true, position: 1 },
    ])
    await applyInitialRows()
    await applyInitialRows() // idempotente
    const generated = await db.select().from(generatedSourceSettings)
    expect(generated).toMatchObject([{ sourceId: 'casa', gridSize: 11, difficulty: 'medium' }])
    const rows = await db.select().from(sourceSettings)
    expect(rows.find((row) => row.sourceId === 'casa')).toMatchObject({
      visible: false,
      position: 2,
    })
  })

  it('aceita casa em puzzles', async () => {
    const { puzzle, solution } = okResult('2026-11-17')
    const saved = await insertPuzzleIfAbsent(db, {
      puzzle: { ...puzzle, source: 'casa' },
      solution,
    })
    expect(saved.inserted).toBe(true)
  })

  it.each([
    [
      'grid_size 8',
      sql`INSERT INTO generated_source_settings (source_id, grid_size) VALUES ('casa', 8)`,
    ],
    [
      'grid_size 16',
      sql`INSERT INTO generated_source_settings (source_id, grid_size) VALUES ('casa', 16)`,
    ],
    [
      'difficulty desconhecida',
      sql`INSERT INTO generated_source_settings (source_id, difficulty) VALUES ('casa', 'extreme')`,
    ],
    [
      'fonte que não é gerada',
      sql`INSERT INTO generated_source_settings (source_id) VALUES ('oglobo')`,
    ],
  ])('recusa %s', async (_, statement) => {
    await expect(db.execute(statement)).rejects.toThrow()
  })

  it('aceita a ação PUZZLE_GENERATE', async () => {
    await db.execute(
      sql`INSERT INTO rate_limit_attempts (action, key_type, key_value) VALUES ('PUZZLE_GENERATE', 'GLOBAL', 'casa:2026-11-17')`,
    )
  })

  it('lê a configuração salva, ou o padrão sem linha', async () => {
    expect(await readGeneratedSettings(db, 'casa')).toEqual({ gridSize: 11, difficulty: 'medium' })
    await db
      .insert(generatedSourceSettings)
      .values({ sourceId: 'casa', gridSize: 13, difficulty: 'hard' })
    expect(await readGeneratedSettings(db, 'casa')).toEqual({ gridSize: 13, difficulty: 'hard' })
  })
})
