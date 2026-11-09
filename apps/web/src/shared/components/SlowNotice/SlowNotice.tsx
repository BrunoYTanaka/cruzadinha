import { SLOW_MESSAGE } from '../LoadingState/loading-screens'
import styles from './SlowNotice.module.css'

// Explica a demora (feature 059). O bloco existe sempre e o texto só entra no DOM quando `active`, para
// o leitor de tela anunciá-lo. Com `reserve` a altura fica guardada (tela de espera); sem ele o bloco
// vazio não ocupa espaço (formulários, feature 062).
export function SlowNotice({ active, reserve = false }: { active: boolean; reserve?: boolean }) {
  return (
    <div className={reserve ? styles.reserve : styles.slot} role="status">
      {active ? <p className={styles.text}>{SLOW_MESSAGE}</p> : null}
    </div>
  )
}
