import { Link } from 'react-router'
import styles from '../ErrorState/ErrorState.module.css'

export function NotFoundPage() {
  return (
    <section className={styles.error}>
      <h1 className={styles.title}>Página não encontrada</h1>
      <p className={styles.message}>O endereço não existe ou foi removido.</p>
      <Link to="/">Voltar à biblioteca</Link>
    </section>
  )
}
