import { useRef } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, buttonClass } from '../../../../shared/components/Button'
import { Dialog } from '../../../../shared/components/Dialog'
import { formatElapsed, spokenElapsed } from '../../../../shared/helpers/time'
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
  // Visitante (feature 013): tudo fica no aparelho, então nunca há "vamos registrar".
  localOnly?: boolean
  // Cruzada de outra fonte do mesmo dia, ainda não concluída (feature 015). Se chegar depois de a
  // janela abrir, aparece sem tirar o foco de onde está.
  otherSource?: { name: string; href: string } | null
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
  localOnly = false,
  otherSource = null,
}: CompletionDialogProps) {
  const navigate = useNavigate()
  const primary = useRef<HTMLButtonElement>(null)
  const shortcut = useRef<HTMLAnchorElement>(null)
  return (
    <Dialog
      open={open}
      onClose={onViewBoard}
      title="Cruzada concluída"
      description={`Você terminou em ${spokenElapsed(elapsedMs)}.`}
      initialFocusRef={otherSource ? shortcut : primary}
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
      {confirmed || localOnly ? null : (
        <p className={styles.pending} role="status">
          Vamos registrar quando a conexão voltar.
        </p>
      )}
      {otherSource ? (
        <p className={styles.other}>Também há cruzada deste dia em {otherSource.name}.</p>
      ) : null}
      <div className={styles.actions}>
        {otherSource ? (
          <Link
            ref={shortcut}
            to={otherSource.href}
            className={buttonClass({ variant: 'primary', block: true })}
          >
            Jogar {otherSource.name} deste dia
          </Link>
        ) : null}
        <Button
          ref={primary}
          variant={otherSource ? 'secondary' : 'primary'}
          block
          onClick={() => void navigate('/')}
        >
          Voltar à biblioteca
        </Button>
        <Button block onClick={onViewBoard}>
          Ver o tabuleiro
        </Button>
      </div>
    </Dialog>
  )
}
