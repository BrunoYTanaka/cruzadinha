import { useCallback, useEffect, useRef, useState } from 'react'
import { createClock, type Clock } from './clock'

type UseClock = {
  elapsedMs: number
  // Valor exato na hora de salvar (o estado só atualiza uma vez por segundo).
  readElapsedMs: () => number
  paused: boolean
  pause: () => void
  resume: () => void
  stop: () => void
  restart: () => void
}

// Liga o relógio ao React: acompanha a visibilidade da aba e atualiza a tela uma vez por segundo.
export function useClock(initialMs: number, active: boolean): UseClock {
  const clockRef = useRef<Clock | null>(null)
  if (clockRef.current === null) clockRef.current = createClock({ initialMs })
  const [elapsedMs, setElapsedMs] = useState(initialMs)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const clock = clockRef.current
    if (!clock) return
    clock.setHidden(document.visibilityState === 'hidden')
    if (active) clock.start()
    const onVisibility = () => clock.setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', onVisibility)
    const timer = window.setInterval(() => setElapsedMs(clock.elapsedMs()), 250)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(timer)
    }
  }, [active])

  const pause = useCallback(() => {
    clockRef.current?.pause()
    setPaused(true)
  }, [])
  const resume = useCallback(() => {
    clockRef.current?.resume()
    setPaused(false)
  }, [])
  const stop = useCallback(() => {
    clockRef.current?.stop()
    setElapsedMs(clockRef.current?.elapsedMs() ?? 0)
  }, [])
  const restart = useCallback(() => {
    clockRef.current?.restart()
    setPaused(false)
    setElapsedMs(0)
  }, [])
  const readElapsedMs = useCallback(() => clockRef.current?.elapsedMs() ?? 0, [])

  return { elapsedMs, readElapsedMs, paused, pause, resume, stop, restart }
}
