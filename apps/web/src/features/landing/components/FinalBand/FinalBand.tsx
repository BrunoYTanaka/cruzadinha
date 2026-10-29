import { Link } from 'react-router'
import { landingButtonClass } from '../LandingButton/LandingButton'
import styles from './FinalBand.module.css'

// Faixa final (feature 049, mockup): escura e de largura total, o único bloco da landing que sai do
// miolo centralizado.
export function FinalBand() {
  return (
    <section className={styles.band} aria-labelledby="faixa-final-titulo">
      <div className={styles.inner}>
        <h2 id="faixa-final-titulo" className={styles.heading}>
          A cruzada de hoje já está esperando.
        </h2>
        <div className={styles.actions}>
          <Link
            to="/jogar"
            className={`${landingButtonClass({ variant: 'primary' })} ${styles.play}`}
          >
            Jogar agora
          </Link>
          <Link to="/calendario" className={styles.calendar}>
            Ver o calendário
          </Link>
        </div>
      </div>
    </section>
  )
}
