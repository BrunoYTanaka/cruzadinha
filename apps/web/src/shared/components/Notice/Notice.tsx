import type { ReactNode } from 'react'
import { Button } from '../Button/Button'
import styles from './Notice.module.css'

type NoticeProps = {
  variant?: 'info' | 'warning' | 'error'
  children: ReactNode
  action?: { label: string; onClick: () => void }
  // Botão "Fechar" opcional, para avisos que a pessoa pode dispensar.
  onDismiss?: () => void
}

// Aviso que não bloqueia: fica fora do tabuleiro, não toma o foco e não cobre o jogo. `status`
// anuncia com educação (`aria-live="polite"`); só o erro usa `alert`.
export function Notice({ variant = 'info', children, action, onDismiss }: NoticeProps) {
  return (
    <div
      className={`${styles.notice} ${styles[variant]}`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <p className={styles.text}>{children}</p>
      {action ? (
        <Button onClick={action.onClick} className={styles.action}>
          {action.label}
        </Button>
      ) : null}
      {onDismiss ? (
        <Button variant="quiet" onClick={onDismiss} className={styles.action}>
          Fechar
        </Button>
      ) : null}
    </div>
  )
}
