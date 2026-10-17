import type { PuzzleSourceId } from '@cruzadinha/shared'
import { readStorage, removeStorage, writeStorage } from '../../lib/storage'

// A biblioteca só lê o que está guardado e nunca consulta a fonte, então ela não sabe se a fonte
// está fora do ar. O aviso nasce de uma busca de dia que falhou (502) e dura 10 minutos. Cada fonte
// tem o próprio aviso: a queda de uma não esconde os dias buscáveis da outra (feature 014).
export const SOURCE_DOWN_TTL_MS = 600_000

export function sourceDownKey(source: PuzzleSourceId): string {
  return `cruzadinha:source-down:${source}`
}

export function markSourceDown(source: PuzzleSourceId, now: number = Date.now()): void {
  writeStorage(sourceDownKey(source), String(now))
}

export function clearSourceDown(source: PuzzleSourceId): void {
  removeStorage(sourceDownKey(source))
}

export function isSourceDown(source: PuzzleSourceId, now: number = Date.now()): boolean {
  const stored = readStorage(sourceDownKey(source))
  if (stored === null) return false
  const since = Number(stored)
  if (!Number.isFinite(since)) return false
  return now - since >= 0 && now - since < SOURCE_DOWN_TTL_MS
}

// Dias em que a fonte respondeu que não há cruzada; lembrados enquanto a aba durar.
export function noPuzzleKey(source: PuzzleSourceId, date: string): string {
  return `cruzadinha:no-puzzle:${source}:${date}`
}

export function markNoPuzzle(source: PuzzleSourceId, date: string): void {
  writeStorage(noPuzzleKey(source, date), '1', 'session')
}

export function isNoPuzzle(source: PuzzleSourceId, date: string): boolean {
  return readStorage(noPuzzleKey(source, date), 'session') === '1'
}

export function readNoPuzzleDates(source: PuzzleSourceId, dates: readonly string[]): Set<string> {
  return new Set(dates.filter((date) => isNoPuzzle(source, date)))
}
