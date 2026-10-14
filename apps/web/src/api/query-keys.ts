export const queryKeys = {
  session: ['session'] as const,
  library: ['library'] as const,
  puzzle: (id: string) => ['puzzle', id] as const,
  puzzleByDate: (date: string) => ['puzzle-by-date', date] as const,
  progress: (id: string) => ['progress', id] as const,
  invites: ['invites'] as const,
}
