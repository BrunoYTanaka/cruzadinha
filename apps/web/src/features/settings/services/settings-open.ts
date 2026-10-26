import { useSyncExternalStore } from 'react'

// Se a modal de configurações está aberta. O cabeçalho a abre; o jogo usa para suspender o relógio
// sem mostrar a capa de pausa (FR-006).

const listeners = new Set<() => void>()
let open = false

export function isSettingsOpen(): boolean {
  return open
}

export function setSettingsOpen(next: boolean): void {
  if (next === open) return
  open = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSettingsOpen(): boolean {
  return useSyncExternalStore(subscribe, isSettingsOpen, isSettingsOpen)
}
