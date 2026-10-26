import { defaultSettings, parseSettings, type Settings } from '@cruzadinha/shared'
import { useSyncExternalStore } from 'react'
import { getServerClockOffsetMs } from '../api/client/client'
import { config } from '../config/config'
import { readStorage, writeStorage } from '../storage/storage'

// Configurações da pessoa (feature 021): um registro só no aparelho, para visitante e conta. A
// conta guarda uma cópia (settings-sync); aqui fica a versão em uso.

export const SETTINGS_KEY = 'cruzadinha:settings'

// Chaves de antes da feature 021: lidas uma vez para migrar, nunca apagadas nem reescritas, para
// que uma aba aberta com o site anterior continue funcionando.
const LEGACY_KEYS = {
  theme: 'cruzadinha:theme',
  source: 'cruzadinha:source',
  boardSize: 'cruzadinha:board-size',
  libraryWidth: 'cruzadinha:library-width',
} as const

// Registro sem mudança feita pela pessoa: qualquer versão da conta é mais nova que ele.
const NEVER = new Date(0).toISOString()

export type SettingsRecord = { settings: Settings; savedAt: string }

// Quem mudou: a pessoa neste aparelho, outra aba ou a conta. Só `user` é enviado à conta.
export type SettingsOrigin = 'user' | 'external' | 'account'

type Listener = (record: SettingsRecord, origin: SettingsOrigin) => void

const defaults = defaultSettings(config.helpLimits)
const listeners = new Set<Listener>()
let current: SettingsRecord | null = null
let storageListenerInstalled = false

function parseJson(raw: string | null): unknown {
  if (raw === null) return undefined
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
}

function fieldOf(value: unknown, field: string): unknown {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)[field]
    : undefined
}

function fromStored(raw: string | null): SettingsRecord | null {
  const value = parseJson(raw)
  const savedAt = fieldOf(value, 'savedAt')
  if (
    fieldOf(value, 'v') !== 1 ||
    typeof savedAt !== 'string' ||
    Number.isNaN(Date.parse(savedAt))
  ) {
    return null
  }
  return { settings: parseSettings(fieldOf(value, 'settings'), defaults), savedAt }
}

function fromLegacy(): SettingsRecord {
  const settings = parseSettings(
    {
      theme: readStorage(LEGACY_KEYS.theme) ?? undefined,
      defaultSource: readStorage(LEGACY_KEYS.source) ?? undefined,
      boardCellSize: fieldOf(parseJson(readStorage(LEGACY_KEYS.boardSize)), 'cellSize'),
      libraryWidth: fieldOf(parseJson(readStorage(LEGACY_KEYS.libraryWidth)), 'width'),
    },
    defaults,
  )
  return { settings, savedAt: NEVER }
}

function persist(record: SettingsRecord): void {
  // Sem armazenamento (modo privado, dados bloqueados) o registro fica só em memória.
  writeStorage(SETTINGS_KEY, JSON.stringify({ v: 1, ...record }))
}

function load(): SettingsRecord {
  const stored = fromStored(readStorage(SETTINGS_KEY))
  if (stored) return stored
  const migrated = fromLegacy()
  persist(migrated)
  return migrated
}

function installStorageListener(): void {
  if (storageListenerInstalled || typeof window === 'undefined') return
  storageListenerInstalled = true
  // Outra aba gravou: vale o registro dela se for mais novo (FR-019).
  window.addEventListener('storage', (event) => {
    if (event.key !== SETTINGS_KEY) return
    const record = fromStored(readStorage(SETTINGS_KEY))
    if (record) replaceSettings(record, 'external')
  })
}

export function getSettingsRecord(): SettingsRecord {
  installStorageListener()
  current ??= load()
  return current
}

export function getSettings(): Settings {
  return getSettingsRecord().settings
}

function set(record: SettingsRecord, origin: SettingsOrigin): void {
  current = record
  persist(record)
  for (const listener of listeners) listener(record, origin)
}

// Momento da mudança no relógio do servidor, sempre depois do registro atual, para que a mudança
// mais recente vença nos outros aparelhos (FR-022).
function nextSavedAt(): string {
  const now = Date.now() + getServerClockOffsetMs()
  const previous = Date.parse(getSettingsRecord().savedAt)
  return new Date(Math.max(now, previous + 1)).toISOString()
}

export function updateSettings(patch: Partial<Settings>): void {
  const settings = { ...getSettings(), ...patch }
  set({ settings, savedAt: nextSavedAt() }, 'user')
}

export function restoreDefaults(): void {
  set({ settings: { ...defaults }, savedAt: nextSavedAt() }, 'user')
}

// Registro vindo de outra aba ou da conta. Só vale se for mais novo, salvo com `force` (a conta
// vence logo após o login, FR-020a). Devolve se aplicou.
export function replaceSettings(
  record: SettingsRecord,
  origin: SettingsOrigin,
  { force = false }: { force?: boolean } = {},
): boolean {
  const mine = getSettingsRecord()
  if (!force && Date.parse(record.savedAt) <= Date.parse(mine.savedAt)) return false
  set(record, origin)
  return true
}

export function subscribeSettings(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function settingsDefaults(): Settings {
  return defaults
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (onChange) => subscribeSettings(() => onChange()),
    getSettings,
    getSettings,
  )
}

// Testes: esquece o registro em memória para reler o armazenamento.
export function resetSettingsStore(): void {
  current = null
  listeners.clear()
}
