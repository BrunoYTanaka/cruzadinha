import { LIBRARY_LIMIT, type LibraryItem } from '@cruzadinha/shared'
import type { Database } from '../../db/client'
import { listLibraryRows, type LibraryRow } from './library.repository'

export type { LibraryRow } from './library.repository'

// Situação do jogador (data-model.md): sem linha, ou em andamento sem nenhuma letra, é "não
// iniciado". O recorde (`bestMs`/`bestAt`) aparece em qualquer situação, porque sobrevive ao reinício.
export function toLibraryItem(row: LibraryRow): LibraryItem {
  const completed = row.status === 'completed'
  const started = row.status === 'in_progress' && row.hasLetters === true
  return {
    puzzleId: row.puzzleId,
    date: row.date,
    level: row.level,
    status: completed ? 'completed' : started ? 'in_progress' : 'not_started',
    elapsedMs: started ? row.elapsedMs : null,
    finishedMs: completed ? row.finishedMs : null,
    completedAt: completed ? (row.completedAt?.toISOString() ?? null) : null,
    bestMs: row.bestMs,
    bestAt: row.bestAt?.toISOString() ?? null,
  }
}

export type LibraryService = ReturnType<typeof createLibraryService>

// Só lê o que já está guardado: não recebe `PuzzleSource` nem o limitador de busca.
export function createLibraryService(deps: { db: Database }) {
  return {
    async list(userId: string): Promise<LibraryItem[]> {
      const rows = await listLibraryRows(deps.db, userId, LIBRARY_LIMIT)
      return rows.map(toLibraryItem)
    },
  }
}
