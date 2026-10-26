import { Link } from 'react-router'
import { Button } from '../../../../shared/components/Button'
import { VisuallyHidden } from '../../../../shared/components/VisuallyHidden'
import { formatElapsed, spokenElapsed } from '../../../../shared/helpers/time'
import styles from './ReadModeBanner.module.css'

type ReadModeBannerProps = {
  elapsedMs: number
  onPlayAgain: () => void
  busy?: boolean
}

// Faixa do modo leitura: o texto "Concluída em mm:ss" vale além da cor verde.
export function ReadModeBanner({ elapsedMs, onPlayAgain, busy = false }: ReadModeBannerProps) {
  return (
    <div className={styles.banner}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
      <p className={styles.text}>
        <span aria-hidden="true">Concluída em {formatElapsed(elapsedMs)}</span>
        <VisuallyHidden>Concluída em {spokenElapsed(elapsedMs)}</VisuallyHidden>
      </p>
      <Button onClick={onPlayAgain} disabled={busy}>
        Jogar de novo
      </Button>
      <Link to="/" className={styles.link}>
        Voltar à biblioteca
      </Link>
    </div>
  )
}
