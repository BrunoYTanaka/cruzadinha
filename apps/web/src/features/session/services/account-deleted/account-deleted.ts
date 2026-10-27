import { useSyncExternalStore } from 'react'

// Depois de excluir a conta a pessoa cai na biblioteca como visitante e vê "Sua conta foi
// excluída." (feature 042). Fora do React porque quem marca é a tela de gestão, e quem mostra é o
// layout.
let deleted = false
const listeners = new Set<() => void>()

function emit(next: boolean) {
  if (deleted === next) return
  deleted = next
  listeners.forEach((listener) => listener())
}

export const markAccountDeleted = () => emit(true)
export const clearAccountDeleted = () => emit(false)

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useAccountDeleted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => deleted,
    () => deleted,
  )
}
