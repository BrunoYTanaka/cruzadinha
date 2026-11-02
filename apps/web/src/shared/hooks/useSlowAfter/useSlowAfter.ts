import { useEffect, useState } from 'react'
import { WAKE_NOTICE_DELAY_MS } from '../../services/api/server-wake/server-wake'

// Está esperando há `delayMs` ou mais? Conta desde que `active` virou `true` e zera quando volta a
// `false`. Serve a quem espera sem pedido da API no cliente (loader do portão, clique num botão).
export function useSlowAfter(
  active: boolean,
  delayMs = WAKE_NOTICE_DELAY_MS,
): { slow: boolean; elapsedSeconds: number } {
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    if (!active) return
    const startedAt = Date.now()
    const timer = setInterval(() => setElapsedMs(Date.now() - startedAt), 250)
    return () => {
      clearInterval(timer)
      setElapsedMs(0)
    }
  }, [active])

  const elapsed = active ? elapsedMs : 0
  return { slow: active && elapsed >= delayMs, elapsedSeconds: Math.floor(elapsed / 1000) }
}
