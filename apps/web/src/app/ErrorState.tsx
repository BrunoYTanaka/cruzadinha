import type { ReactNode } from 'react'
import { Button } from '../components/Button'
import { formatWait } from '../lib/time'
import styles from './ErrorState.module.css'

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <p role="status" className={styles.loading}>
      {label}
    </p>
  )
}

type ErrorStateProps = {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  // Quando o servidor pede espera (limite de tentativas), mostra quanto falta.
  waitSeconds?: number
  children?: ReactNode
}

export function ErrorState({
  title = 'Algo deu errado',
  message,
  onRetry,
  retryLabel = 'Tentar de novo',
  waitSeconds,
  children,
}: ErrorStateProps) {
  return (
    <section role="alert" className={styles.error}>
      <h2 className={styles.title}>{title}</h2>
      {message ? <p className={styles.message}>{message}</p> : null}
      {waitSeconds !== undefined ? (
        <p className={styles.message}>Tente de novo em {formatWait(waitSeconds)}.</p>
      ) : null}
      {onRetry ? <Button onClick={onRetry}>{retryLabel}</Button> : null}
      {children}
    </section>
  )
}
