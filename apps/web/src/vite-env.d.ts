/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HELP_LETTER_LIMIT?: string
  readonly VITE_HELP_WORD_LIMIT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean
  }
  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>
}

// Ainda fora do lib.dom: evento do Chromium que permite abrir o convite de instalação.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent
}
