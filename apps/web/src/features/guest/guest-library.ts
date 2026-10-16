import type { LibraryItem } from '@cruzadinha/shared'
import type { GuestProgress } from '../../game-logic/guest-progress'

// Biblioteca do visitante: os dias vêm do servidor (sempre "não iniciado" sem sessão) e a situação
// vem do navegador. Mesma derivação de `toLibraryItem` da API (feature 009), para o calendário não
// mudar: em andamento sem nenhuma letra conta como não iniciado, e o recorde aparece sempre.
export function mergeGuestLibrary(items: LibraryItem[], records: GuestProgress[]): LibraryItem[] {
  const byPuzzle = new Map(records.map((record) => [record.puzzleId, record]))
  return items.map((item) => {
    const record = byPuzzle.get(item.puzzleId)
    if (!record) return item
    const completed = record.status === 'completed'
    const started = !completed && record.cells.some((row) => row.some((cell) => cell !== null))
    return {
      ...item,
      status: completed ? 'completed' : started ? 'in_progress' : 'not_started',
      elapsedMs: started ? record.elapsedMs : null,
      finishedMs: completed ? record.finishedMs : null,
      completedAt: completed ? record.completedAt : null,
      bestMs: record.bestMs,
      bestAt: record.bestAt,
    }
  })
}
