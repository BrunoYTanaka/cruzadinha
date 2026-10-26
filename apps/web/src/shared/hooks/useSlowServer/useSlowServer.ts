import { useEffect, useState, useSyncExternalStore } from 'react'
import { getOldestPendingStartedAt, subscribePending } from '../../services/api/client'
import {
  WAKE_NOTICE_DELAY_MS,
  isServerReady,
  subscribeServerReady,
} from '../../services/api/server-wake'

// Há um pedido à API esperando há `thresholdMs` ou mais? Usado pelo `LoadingState` para trocar o
// "Carregando…" pela explicação de que o servidor está acordando (FR-011).
export function useSlowServer(thresholdMs = WAKE_NOTICE_DELAY_MS): {
  slow: boolean
  elapsedSeconds: number
} {
  const oldest = useSyncExternalStore(subscribePending, getOldestPendingStartedAt)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (oldest === undefined) return
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [oldest])

  if (oldest === undefined) return { slow: false, elapsedSeconds: 0 }
  const elapsed = Math.max(0, now - oldest)
  return { slow: elapsed >= thresholdMs, elapsedSeconds: Math.floor(elapsed / 1000) }
}

// O servidor já respondeu nesta carga da página?
export function useServerReady(): boolean {
  return useSyncExternalStore(subscribeServerReady, isServerReady)
}
