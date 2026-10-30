import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { PuzzleSourceId } from '@cruzadinha/shared'
import { Link, useNavigate } from 'react-router'
import { Button, buttonClass } from '../../../../../shared/components/Button/Button'
import { Dialog } from '../../../../../shared/components/Dialog/Dialog'
import { formatElapsed, spokenElapsed } from '../../../../../shared/helpers/time/time'
import { renderShareCard } from '../../../helpers/share-card'
import { useShareResult } from '../../../hooks/useShareResult'
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
  // Texto de "Compartilhar texto": só fonte, data e tempo (feature 052).
  shareText: string
  // Dados do cartão de imagem; o tempo é o `elapsedMs` abaixo.
  shareCard: { source: PuzzleSourceId; date: string }
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
  shareText,
  shareCard,
  localOnly = false,
  otherSource = null,
}: CompletionDialogProps) {
  const navigate = useNavigate()
  const primary = useRef<HTMLButtonElement>(null)
  const shortcut = useRef<HTMLAnchorElement>(null)
  const manualText = useRef<HTMLTextAreaElement>(null)
  const { status, share, shareImage, reset } = useShareResult()
  // A mesma janela troca de conteúdo: o resultado ou as opções de compartilhar (feature 052).
  const [view, setView] = useState<'result' | 'share'>('result')
  const shareTrigger = useRef<HTMLButtonElement>(null)
  const firstShare = useRef<HTMLButtonElement>(null)
  const changed = useRef(false)
  function go(next: 'result' | 'share') {
    reset()
    changed.current = true
    setView(next)
  }
  useEffect(() => {
    if (!changed.current) return
    ;(view === 'share' ? firstShare : shareTrigger).current?.focus()
  }, [view])
  useEffect(() => {
    if (status !== 'manual') return
    manualText.current?.focus()
    manualText.current?.select()
  }, [status])
  const feedback = (
    <>
      {status === 'copied' ? (
        <p className={styles.shared} role="status">
          Resultado copiado
        </p>
      ) : null}
      {status === 'imageCopied' || status === 'imageDownloaded' || status === 'imageFailed' ? (
        <p className={status === 'imageFailed' ? styles.failed : styles.shared} role="status">
          {status === 'imageCopied'
            ? 'Imagem copiada'
            : status === 'imageDownloaded'
              ? 'Imagem baixada'
              : 'Não foi possível gerar a imagem.'}
        </p>
      ) : null}
      {status === 'manual' ? (
        <div className={styles.manual}>
          <p role="status">Não foi possível copiar sozinho. Copie o texto abaixo.</p>
          <textarea
            ref={manualText}
            readOnly
            rows={2}
            aria-label="Texto do resultado"
            className={styles.manualText}
            value={shareText}
          />
        </div>
      ) : null}
    </>
  )
  return (
    <Dialog
      open={open}
      onClose={view === 'share' ? () => go('result') : onViewBoard}
      title={view === 'share' ? 'Compartilhar resultado' : 'Cruzada concluída'}
      description={
        view === 'share'
          ? 'Escolha como enviar. Nada revela as respostas.'
          : `Você terminou em ${spokenElapsed(elapsedMs)}.`
      }
      initialFocusRef={otherSource ? shortcut : primary}
    >
      {view === 'share' ? (
        <>
          <div className={styles.actions}>
            <Button
              ref={firstShare}
              variant="secondary"
              block
              onClick={() => void share(shareText)}
            >
              <span className={styles.optionContent}>
                <TextIcon />
                Compartilhar texto
              </span>
            </Button>
            <Button
              variant="secondary"
              block
              onClick={() => void renderShareCard({ ...shareCard, elapsedMs }).then(shareImage)}
            >
              <span className={styles.optionContent}>
                <ImageIcon />
                Compartilhar imagem
              </span>
            </Button>
          </div>
          {feedback}
          <Button variant="quiet" block onClick={() => go('result')}>
            <BackIcon />
            Voltar
          </Button>
        </>
      ) : (
        <>
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
              onClick={() => void navigate('/calendario')}
            >
              Voltar à biblioteca
            </Button>
            <Button block onClick={onViewBoard}>
              Ver o tabuleiro
            </Button>
            <Button ref={shareTrigger} variant="secondary" block onClick={() => go('share')}>
              <ShareIcon />
              Compartilhar
            </Button>
          </div>
        </>
      )}
    </Dialog>
  )
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      {children}
    </svg>
  )
}

function ShareIcon() {
  return (
    <Icon>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </Icon>
  )
}

function TextIcon() {
  return (
    <Icon>
      <path d="M5 6h14M5 12h14M5 18h9" />
    </Icon>
  )
}

function ImageIcon() {
  return (
    <Icon>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M21 16l-5-5-8 9" />
    </Icon>
  )
}

function BackIcon() {
  return (
    <Icon>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </Icon>
  )
}
