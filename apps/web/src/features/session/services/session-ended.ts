import { useSyncExternalStore } from 'react'

// Sessão que terminou fora do tabuleiro (feature 013, FR-013): a pessoa segue como visitante e vê um
// aviso com "Entrar". Fora do React porque quem marca é o tratador de 401 do cliente de API.
let ended = false
const listeners = new Set<() => void>()

function emit(next: boolean) {
  if (ended === next) return
  ended = next
  listeners.forEach((listener) => listener())
}

export function markEnded(): void {
  emit(true)
}

export function clearEnded(): void {
  emit(false)
}

export function getSessionEnded(): boolean {
  return ended
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useSessionEnded(): boolean {
  return useSyncExternalStore(subscribe, getSessionEnded, getSessionEnded)
}
