import { useRef } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { formatElapsed, spokenElapsed } from '../../lib/time'
import styles from './CompletionDialog.module.css'

type CompletionDialogProps = {
  open: boolean
  onViewBoard: () => void
  elapsedMs: number
  // `null` enquanto o servidor não confirmou (ou sem conexão).
  bestMs: number | null
  // Só o servidor confirma o melhor tempo; antes disso aparece "—" e o aviso.
  confirmed: boolean
  helpsUsed: number
  isRecord: boolean
}

// Aparece uma vez por conclusão, na hora, mesmo sem conexão.
export function CompletionDialog({
  open,
  onViewBoard,
  elapsedMs,
  bestMs,
  confirmed,
  helpsUsed,
  isRecord,
}: CompletionDialogProps) {
  const navigate = useNavigate()
  const primary = useRef<HTMLButtonElement>(null)
  return (
    <Dialog
      open={open}
      onClose={onViewBoard}
      title="Cruzada concluída"
      description={`Você terminou em ${spokenElapsed(elapsedMs)}.`}
      initialFocusRef={primary}
    >
      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt>Seu tempo</dt>
          <dd>{formatElapsed(elapsedMs)}</dd>
        </div>
        <div className={`${styles.stat} ${isRecord ? styles.record : ''}`}>
          <dt>Melhor tempo</dt>
          <dd>
            {confirmed && bestMs !== null ? formatElapsed(bestMs) : '—'}
            {isRecord ? <span className={styles.badge}>Novo recorde</span> : null}
          </dd>
        </div>
        <div className={styles.stat}>
          <dt>Ajudas usadas</dt>
          <dd>{helpsUsed}</dd>
        </div>
      </dl>
      {confirmed ? null : (
        <p className={styles.pending} role="status">
          Vamos registrar quando a conexão voltar.
        </p>
      )}
      <div className={styles.actions}>
        <Button ref={primary} variant="primary" block onClick={() => void navigate('/')}>
          Voltar à biblioteca
        </Button>
        <Button block onClick={onViewBoard}>
          Ver o tabuleiro
        </Button>
      </div>
    </Dialog>
  )
}
