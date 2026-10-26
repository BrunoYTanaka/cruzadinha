import { parseSettings, type SaveSettingsRequest, type SettingsEnvelope } from '@cruzadinha/shared'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { ApiRequestError } from '../../shared/services/api/client'
import {
  getSettings as fetchSettings,
  saveSettings as sendSettings,
} from '../../shared/services/api/settings'
import { useViewer } from '../session/useSession'
import {
  getSettingsRecord,
  replaceSettings,
  settingsDefaults,
  subscribeSettings,
  type SettingsRecord,
} from '../../shared/services/settings-store'

// Cópia das configurações na conta (feature 021). O aparelho é a versão em uso; a conta recebe as
// mudanças da pessoa (agrupadas) e as entrega a outros aparelhos. Nada aqui bloqueia o site: uma
// falha vira só o aviso da modal (FR-023).

export type SyncStatus = 'ok' | 'failing'

// `login`: logo após entrar, a conta vence (FR-020a). `open`: o site abriu já logado, vence o mais
// recente (FR-020c).
export type SyncMode = 'login' | 'open'

export type SettingsSync = {
  start: (mode: SyncMode) => Promise<void>
  stop: () => void
  getStatus: () => SyncStatus
  subscribe: (listener: () => void) => () => void
}

type SyncDeps = {
  getSettings: () => Promise<SettingsEnvelope>
  saveSettings: (body: SaveSettingsRequest) => Promise<SettingsEnvelope>
  debounceMs?: number
}

const BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000]

function fromAccount(envelope: SettingsEnvelope): SettingsRecord | null {
  if (envelope.settings === null || envelope.savedAt === null) return null
  // A conta pode devolver só parte dos campos: o resto vem dos padrões deste site.
  return {
    settings: parseSettings(envelope.settings, settingsDefaults()),
    savedAt: envelope.savedAt,
  }
}

export function createSettingsSync({
  getSettings,
  saveSettings,
  debounceMs = 800,
}: SyncDeps): SettingsSync {
  const listeners = new Set<() => void>()
  let status: SyncStatus = 'ok'
  let active = false
  let session = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let attempt = 0
  let unsubscribe: (() => void) | null = null

  function setStatus(next: SyncStatus) {
    if (next === status) return
    status = next
    for (const listener of listeners) listener()
  }

  function clearTimer() {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  function schedule(delay: number) {
    clearTimer()
    timer = setTimeout(() => {
      timer = null
      void push()
    }, delay)
  }

  // Envia só a versão atual; uma resposta mais nova da conta (outro aparelho) passa a valer.
  async function push() {
    if (!active) return
    const current = session
    try {
      const envelope = await saveSettings(getSettingsRecord())
      if (current !== session) return
      attempt = 0
      setStatus('ok')
      const account = fromAccount(envelope)
      if (account) replaceSettings(account, 'account')
    } catch (error) {
      if (current !== session) return
      if (!(error instanceof ApiRequestError)) throw error
      // 404: API anterior sem a rota. 401: sessão acabou; as telas tratam. 400: nada a repetir.
      if (error.status === 404 || error.status === 401 || error.status === 400) {
        stop()
        return
      }
      setStatus('failing')
      const wait =
        error.status === 429 && error.retryAfterSeconds
          ? error.retryAfterSeconds * 1000
          : (BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)] ?? 30_000)
      attempt += 1
      schedule(wait)
    }
  }

  async function reconcile(mode: SyncMode) {
    const current = session
    let envelope: SettingsEnvelope
    try {
      envelope = await getSettings()
    } catch (error) {
      if (current !== session) return
      if (error instanceof ApiRequestError && (error.status === 404 || error.status === 401)) {
        stop()
        return
      }
      // Sem a conta agora: o aparelho segue valendo e a próxima mudança tenta enviar.
      return
    }
    if (current !== session) return
    const account = fromAccount(envelope)
    if (!account) {
      await push()
      return
    }
    if (mode === 'login') {
      replaceSettings(account, 'account', { force: true })
      return
    }
    const local = getSettingsRecord()
    if (Date.parse(account.savedAt) >= Date.parse(local.savedAt)) {
      replaceSettings(account, 'account')
    } else {
      await push()
    }
  }

  function stop() {
    active = false
    session += 1
    clearTimer()
    attempt = 0
    unsubscribe?.()
    unsubscribe = null
    setStatus('ok')
  }

  return {
    async start(mode) {
      stop()
      active = true
      unsubscribe = subscribeSettings((_record, origin) => {
        if (origin === 'user' && active) schedule(debounceMs)
      })
      await reconcile(mode)
    },
    stop,
    getStatus: () => status,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

const sync = createSettingsSync({ getSettings: fetchSettings, saveSettings: sendSettings })

export function useSettingsSyncStatus(): SyncStatus {
  return useSyncExternalStore(sync.subscribe, sync.getStatus, sync.getStatus)
}

// Montado no layout: liga a sincronização para quem tem conta e desliga para visitante. Passar de
// visitante a conta nesta página é um login (a conta vence); abrir já logado compara as versões.
export function useSettingsSync(): void {
  const viewer = useViewer()
  const known = viewer !== undefined
  const userId = viewer?.kind === 'user' ? viewer.user.id : null
  const wasGuest = useRef(false)
  // Só a identidade importa: o objeto `viewer` muda a cada leitura da sessão.
  useEffect(() => {
    if (!known) return
    if (userId === null) {
      wasGuest.current = true
      sync.stop()
      return
    }
    void sync.start(wasGuest.current ? 'login' : 'open')
    return () => sync.stop()
  }, [known, userId])
}
