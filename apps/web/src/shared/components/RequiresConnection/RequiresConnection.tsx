import type { ReactNode } from 'react'
import { Link } from '../Link/Link'
import { useOnline } from '../../hooks/useOnline/useOnline'
import styles from './RequiresConnection.module.css'

// Telas que só funcionam com a API (entrar, cadastro, recuperação, status) dizem isso sem rede em vez
// de mostrar um formulário que falharia (feature 041, FR-005).
export function RequiresConnection({ children }: { children: ReactNode }) {
  return useOnline() ? (
    children
  ) : (
    <div className={styles.page}>
      <h1 className={styles.title}>Esta tela precisa de conexão.</h1>
      <p className={styles.link}>
        <Link to="/calendario">Voltar à biblioteca</Link>
      </p>
    </div>
  )
}
