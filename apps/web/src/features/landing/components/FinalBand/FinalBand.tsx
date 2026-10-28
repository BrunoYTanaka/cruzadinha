import { Link } from 'react-router'
import { buttonClass } from '../../../../shared/components/Button/Button'
import styles from './FinalBand.module.css'

export function FinalBand() {
  return (
    <section className={styles.band}>
      <h2 className={styles.heading}>Pronto para a cruzada de hoje?</h2>
      <p className={styles.text}>Uma cruzada nova por dia, sem cadastro e sem pressa.</p>
      <div className={styles.actions}>
        <Link to="/jogar" className={buttonClass({ variant: 'primary' })}>
          Jogar agora
        </Link>
        <Link to="/calendario">Ver o calendário</Link>
      </div>
    </section>
  )
}
