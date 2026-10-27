import { useEffect, useState } from 'react'
import {
  listStoredPuzzles,
  subscribeOfflineStore,
} from '../../services/offline-store/offline-store'

// Ids das cruzadas guardadas neste aparelho, atualizado a cada gravação (feature 041, FR-015).
export function useOfflinePuzzleIds(): ReadonlySet<string> {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set())
  useEffect(() => {
    let alive = true
    const load = () =>
      void listStoredPuzzles().then((list) => {
        if (alive) setIds(new Set(list.map((puzzle) => puzzle.puzzleId)))
      })
    load()
    const unsubscribe = subscribeOfflineStore(load)
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])
  return ids
}
