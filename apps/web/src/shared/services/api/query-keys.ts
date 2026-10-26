import type { PuzzleSourceId } from '@cruzadinha/shared'

export const queryKeys = {
  session: ['session'] as const,
  registration: ['registration'] as const,
  // Por quem está usando: visitante (`'guest'`) ou o id da conta, para não misturar os dois.
  library: (viewer: string, source: PuzzleSourceId) => ['library', viewer, source] as const,
  libraryAll: ['library'] as const,
  puzzle: (id: string) => ['puzzle', id] as const,
  puzzleByDate: (source: PuzzleSourceId, date: string) => ['puzzle-by-date', source, date] as const,
  progress: (id: string) => ['progress', id] as const,
}
