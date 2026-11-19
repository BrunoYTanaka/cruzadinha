import { useSyncExternalStore } from 'react'
import type { registerSW } from 'virtual:pwa-register'

export type AppUpdateStatus = 'none' | 'waiting' | 'dismissed' | 'updating'

export type AppUpdateWindow = {
  location: { reload(): void }
  setTimeout(handler: () => void, ms: number): number
  clearTimeout(id: number): void
  document: EventTarget & { readonly visibilityState: DocumentVisibilityState }
  navigator: { readonly onLine: boolean }
}

const SAFETY_RELOAD_MS = 10_000

// Estado em memória da página (feature 067): a versão nova só é oferecida no calendário.
let status: AppUpdateStatus = 'none'
let requested = false
let updateSW: (() => Promise<void>) | null = null
let current: AppUpdateWindow | null = null
let timer: number | null = null
const listeners = new Set<() => void>()

function setStatus(next: AppUpdateStatus) {
  status = next
  listeners.forEach((listener) => listener())
}

export function installAppUpdate(
  register: typeof registerSW,
  win: AppUpdateWindow = window,
): () => void {
  current = win
  let onVisible: (() => void) | null = null
  updateSW = register({
    immediate: true,
    onNeedRefresh: () => {
      if (status === 'none') setStatus('waiting')
    },
    // O plugin recarregaria todas as abas controladas (research R2); só a que pediu recarrega.
    onNeedReload: () => {
      if (requested) win.location.reload()
    },
    onRegisteredSW: (_url, registration) => {
      onVisible = () => {
        if (
          win.document.visibilityState === 'visible' &&
          registration &&
          !registration.installing &&
          win.navigator.onLine
        ) {
          void registration.update()
        }
      }
      win.document.addEventListener('visibilitychange', onVisible)
    },
  })
  return () => {
    if (onVisible) win.document.removeEventListener('visibilitychange', onVisible)
    if (timer !== null) win.clearTimeout(timer)
    timer = null
    requested = false
    updateSW = null
    current = null
    setStatus('none')
  }
}

function update() {
  if (status !== 'waiting' || !current) return
  const win = current
  requested = true
  setStatus('updating')
  void updateSW?.()
  timer = win.setTimeout(() => win.location.reload(), SAFETY_RELOAD_MS)
}

function dismiss() {
  if (status === 'waiting') setStatus('dismissed')
}

export function useAppUpdate(): {
  status: AppUpdateStatus
  update: () => void
  dismiss: () => void
} {
  const value = useSyncExternalStore(
    (notify) => {
      listeners.add(notify)
      return () => listeners.delete(notify)
    },
    () => status,
    () => 'none' as const,
  )
  return { status: value, update, dismiss }
}
