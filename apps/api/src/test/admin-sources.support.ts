import type { PuzzleSourceId } from '@cruzadinha/shared'
import type { FastifyInstance } from 'fastify'
import type { Database } from '../platform/db/client'
import { puzzles } from '../platform/db/schema'
import { okResult } from './fake-source'

export const ALL: PuzzleSourceId[] = ['oglobo', 'cruzadaonline', 'cruzadasbrasil', 'clube']

export const body = (visible: Partial<Record<PuzzleSourceId, boolean>> = {}, order = ALL) => ({
  sources: order.map((id) => ({ id, visible: visible[id] ?? true })),
})

export function putSources(app: FastifyInstance, payload: unknown, sid?: string) {
  return app.inject({
    method: 'PUT',
    url: '/api/admin/sources',
    headers: sid ? { cookie: `sid=${sid}` } : {},
    payload: payload as object,
  })
}

export function getSources(app: FastifyInstance, url = '/api/sources', sid?: string) {
  return app.inject({ method: 'GET', url, headers: sid ? { cookie: `sid=${sid}` } : {} })
}

export async function storePuzzle(
  db: Database,
  date: string,
  source: PuzzleSourceId = 'oglobo',
): Promise<string> {
  const ok = okResult(date, source)
  const [row] = await db
    .insert(puzzles)
    .values({
      source,
      level: ok.puzzle.level,
      date,
      data: ok.puzzle,
      solution: ok.solution,
    })
    .returning({ puzzleId: puzzles.puzzleId })
  if (!row) throw new Error('puzzle não guardado')
  return row.puzzleId
}
