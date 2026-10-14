import type { User } from '@cruzadinha/shared'
import { useSyncExternalStore } from 'react'

// Sessão expirada com o tabuleiro aberto: o jogo continua e o login abre numa janela por cima
// (FR-032). O estado fica fora do React porque quem o marca é o cliente de API, não um componente.
export type SessionExpiredState = { expired: boolean; lastUser: User | null }

let state: SessionExpiredState = { expired: false, lastUser: null }
const listeners = new Set<() => void>()

function emit(next: SessionExpiredState) {
  state = next
  listeners.forEach((listener) => listener())
}

export function getSessionExpired(): SessionExpiredState {
  return state
}

export function markExpired(lastUser: User | null): void {
  if (state.expired) return
  emit({ expired: true, lastUser })
}

export function clearExpired(): void {
  if (!state.expired) return
  emit({ expired: false, lastUser: null })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useSessionExpired(): SessionExpiredState {
  return useSyncExternalStore(subscribe, getSessionExpired, getSessionExpired)
}
