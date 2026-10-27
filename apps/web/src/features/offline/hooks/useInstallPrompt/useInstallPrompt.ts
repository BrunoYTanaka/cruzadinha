import { useSyncExternalStore } from 'react'

// O Chromium dispara `beforeinstallprompt` cedo, antes de a tela existir: o evento é guardado aqui
// desde o início (feature 041, FR-011). Safari e Firefox nunca o disparam, então não há botão.
let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function set(event: BeforeInstallPromptEvent | null) {
  deferred = event
  listeners.forEach((listener) => listener())
}

export function captureInstallPrompt(): () => void {
  const onPrompt = (event: BeforeInstallPromptEvent) => {
    event.preventDefault()
    set(event)
  }
  const onInstalled = () => set(null)
  window.addEventListener('beforeinstallprompt', onPrompt)
  window.addEventListener('appinstalled', onInstalled)
  return () => {
    window.removeEventListener('beforeinstallprompt', onPrompt)
    window.removeEventListener('appinstalled', onInstalled)
    set(null)
  }
}

const install = async () => {
  const event = deferred
  if (!event) return
  set(null)
  await event.prompt()
}

function snapshot() {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches === true
  return deferred && !standalone ? install : null
}

// Abre o convite de instalação, ou `null` quando instalar não é possível agora.
export function useInstallPrompt(): (() => Promise<void>) | null {
  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify)
      return () => listeners.delete(notify)
    },
    snapshot,
    () => null,
  )
}
