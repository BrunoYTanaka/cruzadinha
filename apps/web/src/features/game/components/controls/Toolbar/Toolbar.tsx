import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { buttonClass } from '../../../../../shared/components/Button/Button'
import { formatElapsed, spokenElapsed } from '../../../../../shared/helpers/time/time'
import styles from './Toolbar.module.css'

type ToolbarProps = {
  elapsedMs: number
  paused: boolean
  // Em modo leitura o tempo está parado e não há o que pausar.
  canPause: boolean
  onPause: () => void
  onResume: () => void
  saveStatus?: ReactNode
  helps?: ReactNode
  // Computador: "Tamanho padrão" do tabuleiro.
  sizeReset?: ReactNode
  // Teclado físico: botão que abre a lista de atalhos (feature 046).
  shortcuts?: ReactNode
  // Imprimir a cruzada em branco (feature 054).
  print?: ReactNode
  // Título da cruzada (fonte e data), no começo da faixa (feature 015).
  title?: ReactNode
}

// Faixa entre o cabeçalho e o jogo: título, tempo, pausa, escolher outro dia, avisos do salvamento
// e as ajudas.
// Pausa e o link de voltar são botões de ícone (feature 023).
const iconButton = `${buttonClass({ variant: 'icon' })} ${styles.iconButton}`

export function Toolbar({
  elapsedMs,
  paused,
  canPause,
  onPause,
  onResume,
  saveStatus,
  helps,
  sizeReset,
  shortcuts,
  print,
  title,
}: ToolbarProps) {
  return (
    <div className={styles.strip} role="toolbar" aria-label="Ferramentas do jogo">
      {title}
      <div className={styles.group}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span
          className={styles.timer}
          role="timer"
          aria-label={`Tempo de jogo: ${spokenElapsed(elapsedMs)}`}
        >
          {formatElapsed(elapsedMs)}
        </span>
        {canPause ? (
          <button
            type="button"
            className={iconButton}
            aria-label={paused ? 'Continuar' : 'Pausar'}
            aria-pressed={paused}
            onClick={paused ? onResume : onPause}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
              {paused ? <path d="M8 5v14l11-7z" /> : <path d="M9 6v12M15 6v12" />}
            </svg>
          </button>
        ) : null}
        <span className={styles.separator} aria-hidden="true" />
        <Link to="/calendario" className={iconButton} aria-label="Escolher outro dia">
          <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
            <rect x="4" y="5" width="16" height="15" rx="2" />
            <path d="M4 10h16M9 3v4M15 3v4" />
          </svg>
        </Link>
        {sizeReset ? (
          <>
            <span className={styles.separator} aria-hidden="true" />
            {sizeReset}
          </>
        ) : null}
        {shortcuts ? (
          <>
            <span className={styles.separator} aria-hidden="true" />
            {shortcuts}
          </>
        ) : null}
        {print ? (
          <>
            <span className={styles.separator} aria-hidden="true" />
            {print}
          </>
        ) : null}
        {saveStatus}
      </div>
      {helps ? (
        <div className={styles.group}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className={`${styles.icon} ${styles.eye}`}>
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {helps}
        </div>
      ) : null}
    </div>
  )
}
