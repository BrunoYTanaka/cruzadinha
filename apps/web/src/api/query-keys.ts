export const queryKeys = {
  session: ['session'] as const,
  registration: ['registration'] as const,
  // Por quem está usando: visitante (`'guest'`) ou o id da conta, para não misturar os dois.
  library: (viewer: string) => ['library', viewer] as const,
  libraryAll: ['library'] as const,
  puzzle: (id: string) => ['puzzle', id] as const,
  puzzleByDate: (date: string) => ['puzzle-by-date', date] as const,
  progress: (id: string) => ['progress', id] as const,
}
