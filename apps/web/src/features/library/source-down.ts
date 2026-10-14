import { readStorage, removeStorage, writeStorage } from '../../lib/storage'

// A biblioteca só lê o que está guardado e nunca consulta a fonte, então ela não sabe se a fonte
// está fora do ar. O aviso nasce de uma busca de dia que falhou (502) e dura 10 minutos.
export const SOURCE_DOWN_KEY = 'cruzadinha:source-down'
export const SOURCE_DOWN_TTL_MS = 600_000

export function markSourceDown(now: number = Date.now()): void {
  writeStorage(SOURCE_DOWN_KEY, String(now))
}

export function clearSourceDown(): void {
  removeStorage(SOURCE_DOWN_KEY)
}

export function isSourceDown(now: number = Date.now()): boolean {
  const stored = readStorage(SOURCE_DOWN_KEY)
  if (stored === null) return false
  const since = Number(stored)
  if (!Number.isFinite(since)) return false
  return now - since >= 0 && now - since < SOURCE_DOWN_TTL_MS
}

// Dias em que a fonte respondeu que não há cruzada; lembrados enquanto a aba durar.
const NO_PUZZLE_PREFIX = 'cruzadinha:no-puzzle:'

export function markNoPuzzle(date: string): void {
  writeStorage(`${NO_PUZZLE_PREFIX}${date}`, '1', 'session')
}

export function isNoPuzzle(date: string): boolean {
  return readStorage(`${NO_PUZZLE_PREFIX}${date}`, 'session') === '1'
}

export function readNoPuzzleDates(dates: readonly string[]): Set<string> {
  return new Set(dates.filter(isNoPuzzle))
}
