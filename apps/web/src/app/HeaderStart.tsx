import { Link, useLocation } from 'react-router'
import { buttonClass } from '../shared/components/Button/Button'
import styles from './AppLayout.module.css'

// Marca e link do calendário: o começo do cabeçalho, igual no AppLayout e na casca estática da
// landing (LandingShell), para o conteúdo não se mover quando o React monta (feature 048). A marca
// leva o quadrado amarelo com o "C" e a página atual fica em amarelo (feature 062). Na landing
// (`landing`) o cabeçalho tem só a marca, sem "Calendário" (feature 063).
export function HeaderStart({ landing = false }: { landing?: boolean }) {
  const { pathname } = useLocation()
  const current = pathname.startsWith('/calendario')
  return (
    <>
      <Link to="/" className={styles.brand}>
        <span className={styles.mark} aria-hidden="true">
          C
        </span>
        Cruzadinha
      </Link>
      {landing ? null : (
        <Link
          to="/calendario"
          className={`${buttonClass({ variant: 'quiet' })} ${styles.calendar} ${current ? styles.current : ''}`}
          aria-current={current ? 'page' : undefined}
        >
          Calendário
        </Link>
      )}
      <span className={styles.spacer} />
    </>
  )
}
