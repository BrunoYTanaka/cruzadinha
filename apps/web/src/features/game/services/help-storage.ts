import { helpSchema } from '../../../domain/game/help-schema'
import type { HelpSnapshot } from '../../../domain/game/reducer'
import { readStorage, removeStorage, writeStorage } from '../../../shared/services/storage'

export function helpKey(userId: string, puzzleId: string): string {
  return `cruzadinha:help:${userId}:${puzzleId}`
}

// Só contadores, marcas e células travadas: nunca a solução, senha nem token.
export function loadHelp(userId: string, puzzleId: string): HelpSnapshot | null {
  const raw = readStorage(helpKey(userId, puzzleId))
  if (raw === null) return null
  try {
    const parsed = helpSchema.safeParse(JSON.parse(raw) as unknown)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function saveHelp(userId: string, puzzleId: string, help: HelpSnapshot): void {
  writeStorage(helpKey(userId, puzzleId), JSON.stringify(help))
}

export function clearHelp(userId: string, puzzleId: string): void {
  removeStorage(helpKey(userId, puzzleId))
}
