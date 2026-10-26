import { useEffect, useRef, useState } from 'react'
import { WAKE_NOTICE_DELAY_MS } from '../../shared/services/api/server-wake'
import { LoadingState } from '../../shared/components/ErrorState'
import { useMediaQuery } from '../../shared/hooks/useMediaQuery'
import styles from './ServerWake.module.css'

type ServerWakeProps = {
  // Mostra a explicação na hora, sem os 2 s de "Carregando…" (ao tentar de novo).
  immediate?: boolean
  // Leva o foco ao título quando ele aparece (ao tentar de novo).
  focusOnMount?: boolean
}

// Tela "Acordando o servidor" (feature 012, contracts/ui-server-wake.md). Nos primeiros 2 s mostra
// só o carregamento, para não piscar quando a API já está acordada.
export function ServerWake({ immediate = false, focusOnMount = false }: ServerWakeProps) {
  const [startedAt] = useState(() => Date.now())
  const [now, setNow] = useState(startedAt)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const elapsed = now - startedAt
  const showMessage = immediate || elapsed >= WAKE_NOTICE_DELAY_MS

  useEffect(() => {
    if (showMessage && focusOnMount) titleRef.current?.focus()
  }, [showMessage, focusOnMount])

  if (!showMessage) return <LoadingState />

  return (
    <section className={styles.wake} aria-labelledby="server-wake-title">
      <span
        className={styles.indicator}
        data-testid="wake-indicator"
        data-animated={reducedMotion ? 'false' : 'true'}
        aria-hidden="true"
      />
      <h1 id="server-wake-title" className={styles.title} ref={titleRef} tabIndex={-1}>
        Acordando o servidor
      </h1>
      <p role="status" className={styles.message}>
        O servidor dorme quando ninguém está jogando. A primeira visita pode levar até um minuto.
      </p>
      <p className={styles.counter}>Esperando há {Math.floor(elapsed / 1000)} s</p>
    </section>
  )
}
