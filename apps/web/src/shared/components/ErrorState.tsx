import type { ReactNode } from 'react'
import { Button } from '../../components/Button'
import { useSlowServer } from '../hooks/useSlowServer'
import { formatWait } from '../../lib/time'
import styles from './ErrorState.module.css'

// Com um pedido esperando há 2 s ou mais, explica que o servidor gratuito pode estar acordando
// (feature 012, FR-011). A tela de jogo só usa isto antes de a cruzada carregar.
export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  const { slow } = useSlowServer()
  return (
    <p role="status" className={styles.loading}>
      {slow ? (
        <>
          Acordando o servidor… <span className={styles.hint}>Pode levar até um minuto.</span>
        </>
      ) : (
        label
      )}
    </p>
  )
}

type ErrorStateProps = {
  // 1 quando o erro é a página inteira (o título é o h1); 2 dentro de uma página que já tem h1.
  level: 1 | 2
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  // Quando o servidor pede espera (limite de tentativas), mostra quanto falta.
  waitSeconds?: number
  children?: ReactNode
}

export function ErrorState({
  level,
  title = 'Algo deu errado',
  message,
  onRetry,
  retryLabel = 'Tentar de novo',
  waitSeconds,
  children,
}: ErrorStateProps) {
  const Heading = level === 1 ? 'h1' : 'h2'
  return (
    <section role="alert" className={styles.error}>
      <Heading className={styles.title}>{title}</Heading>
      {message ? <p className={styles.message}>{message}</p> : null}
      {waitSeconds !== undefined ? (
        <p className={styles.message}>Tente de novo em {formatWait(waitSeconds)}.</p>
      ) : null}
      {onRetry ? <Button onClick={onRetry}>{retryLabel}</Button> : null}
      {children}
    </section>
  )
}
