/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HELP_LETTER_LIMIT?: string
  readonly VITE_HELP_WORD_LIMIT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
