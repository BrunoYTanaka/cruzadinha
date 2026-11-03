import { SourcesAdmin } from '../../features/admin'
import { useSessionQuery } from '../../features/session'
import { LoadingState } from '../../shared/components/LoadingState/LoadingState'
import { NotFoundPage } from '../../shared/components/NotFoundPage/NotFoundPage'
import { RequiresConnection } from '../../shared/components/RequiresConnection/RequiresConnection'
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle/useDocumentTitle'
import styles from './AdminPage.module.css'

function AdminContent() {
  useDocumentTitle('Administração')
  const session = useSessionQuery()
  if (session.data === undefined) return <LoadingState screen="entry" level={1} />
  // Visitante e conta comum veem a mesma página de um endereço inexistente (feature 060, FR-009).
  if (session.data?.user.isAdmin !== true) return <NotFoundPage />
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Administração</h1>
      <h2 className={styles.subtitle}>Fontes de cruzadas</h2>
      <SourcesAdmin />
    </div>
  )
}

// Sem rede, a página diz que precisa de conexão antes de decidir o papel: sem rede ninguém conta
// como admin, e um admin não pode ver "página não encontrada" por isso.
export function AdminPage() {
  return (
    <RequiresConnection>
      <AdminContent />
    </RequiresConnection>
  )
}
