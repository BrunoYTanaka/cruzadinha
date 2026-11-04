import { Link } from '../Link/Link'
import { CrosswordCells } from '../LoadingState/CrosswordCells'
import styles from '../ErrorState/ErrorState.module.css'

export function NotFoundPage() {
  return (
    <section className={styles.error}>
      <CrosswordCells word="404" still />
      <h1 className={styles.title}>Página não encontrada</h1>
      <p className={styles.message}>O endereço não existe ou foi removido.</p>
      <Link to="/calendario">Voltar à biblioteca</Link>
    </section>
  )
}
