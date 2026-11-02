import { PlayLink } from '../PlayLink/PlayLink'
import styles from './FinalBand.module.css'

// Faixa final (feature 050, mockup): escura e de largura total, o único bloco da landing que sai do
// miolo centralizado.
export function FinalBand() {
  return (
    <section className={styles.band} aria-labelledby="faixa-final-titulo">
      <div className={styles.inner}>
        <h2 id="faixa-final-titulo" className={styles.heading}>
          A cruzada de hoje já está esperando.
        </h2>
        <div className={styles.actions}>
          <PlayLink to="/jogar" variant="primary" className={styles.play}>
            Jogar agora
          </PlayLink>
          <PlayLink to="/calendario" className={styles.calendar}>
            Ver o calendário
          </PlayLink>
        </div>
      </div>
    </section>
  )
}
