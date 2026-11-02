import { SLOW_MESSAGE } from '../LoadingState/loading-screens'
import styles from './SlowNotice.module.css'

// Explica a demora (feature 059). O bloco existe sempre, com altura reservada, para a mensagem entrar
// sem empurrar nada; o texto só entra no DOM quando `active`, para o leitor de tela anunciá-lo.
export function SlowNotice({ active }: { active: boolean }) {
  return (
    <div className={styles.slot} role="status">
      {active ? <p className={styles.text}>{SLOW_MESSAGE}</p> : null}
    </div>
  )
}
