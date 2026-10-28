import { Link } from 'react-router'
import { buttonClass } from '../shared/components/Button/Button'
import styles from './AppLayout.module.css'

// Marca e link do calendário: o começo do cabeçalho, igual no AppLayout e na casca estática da
// landing (LandingShell), para o conteúdo não se mover quando o React monta (feature 048).
export function HeaderStart() {
  return (
    <>
      <Link to="/" className={styles.brand}>
        Cruzadinha
      </Link>
      <Link to="/calendario" className={`${buttonClass({ variant: 'quiet' })} ${styles.calendar}`}>
        Calendário
      </Link>
      <span className={styles.spacer} />
    </>
  )
}
