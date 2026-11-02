import { useCallback, useEffect, useRef, useState } from 'react'

// Relógio do duelo (feature 058): conta do instante de início gravado no servidor, sem pausa — nem
// ao ocultar a aba, nem com o diálogo de configurações — e sem reiniciar ao recarregar. `startMs` é
// o início já convertido para o relógio deste aparelho.
export function useWallClock(startMs: number, active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  const [stoppedAt, setStoppedAt] = useState<number | null>(null)
  const stoppedRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active || stoppedAt !== null) return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [active, stoppedAt])

  // Valor exato na hora de salvar; o estado só atualiza a cada 250 ms.
  const readElapsedMs = useCallback(
    () => Math.max(0, Math.floor((stoppedRef.current ?? Date.now()) - startMs)),
    [startMs],
  )
  const stop = useCallback(() => {
    stoppedRef.current ??= Date.now()
    setStoppedAt(stoppedRef.current)
  }, [])
  const noop = useCallback(() => {}, [])

  return {
    elapsedMs: Math.max(0, Math.floor((stoppedAt ?? now) - startMs)),
    readElapsedMs,
    paused: false,
    pause: noop,
    resume: noop,
    stop,
    restart: noop,
  }
}
