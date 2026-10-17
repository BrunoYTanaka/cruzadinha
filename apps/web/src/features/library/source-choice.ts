import { puzzleSourceIdSchema, type PuzzleSourceId } from '@cruzadinha/shared'
import { useCallback, useState } from 'react'
import { readStorage, writeStorage } from '../../lib/storage'

// Fonte escolhida no calendário: preferência do aparelho, como o tema e os tamanhos (feature 014).
export const SOURCE_KEY = 'cruzadinha:source'

export const DEFAULT_SOURCE: PuzzleSourceId = 'oglobo'

export function loadSourceChoice(): PuzzleSourceId {
  const parsed = puzzleSourceIdSchema.safeParse(readStorage(SOURCE_KEY))
  return parsed.success ? parsed.data : DEFAULT_SOURCE
}

export function saveSourceChoice(source: PuzzleSourceId): void {
  writeStorage(SOURCE_KEY, source)
}

export function useSourceChoice(): [PuzzleSourceId, (source: PuzzleSourceId) => void] {
  const [source, setSource] = useState(loadSourceChoice)
  const choose = useCallback((next: PuzzleSourceId) => {
    saveSourceChoice(next)
    setSource(next)
  }, [])
  return [source, choose]
}
