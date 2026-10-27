import { useState } from 'react'
import { Link } from 'react-router'
import {
  ChangeEmailForm,
  ChangePasswordForm,
  DeleteAccountDialog,
  LogoutOthersButton,
} from '../../features/account'
import { clearAccountData } from '../../features/offline'
import { useSessionQuery } from '../../features/session'
import { Button } from '../../shared/components/Button/Button'
import { RequiresConnection } from '../../shared/components/RequiresConnection/RequiresConnection'
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle/useDocumentTitle'
import styles from './AccountPage.module.css'

function AccountContent() {
  useDocumentTitle('Sua conta')
  const session = useSessionQuery()
  const [deleting, setDeleting] = useState(false)
  const user = session.data?.user

  if (session.data === undefined) return null
  if (!user) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Sua conta</h1>
        <p className={styles.lead}>Entre para gerenciar sua conta.</p>
        <Link to="/login?next=/conta">Entrar</Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Sua conta</h1>
      <p className={styles.email}>{user.email}</p>
      <ChangePasswordForm />
      <LogoutOthersButton />
      <ChangeEmailForm currentEmail={user.email} />
      <section className={styles.danger}>
        <h2 className={styles.dangerTitle}>Excluir a conta</h2>
        <p className={styles.lead}>Apaga a conta e tudo o que é dela. Não há como desfazer.</p>
        <div>
          <Button variant="secondary" onClick={() => setDeleting(true)}>
            Excluir conta
          </Button>
        </div>
      </section>
      <DeleteAccountDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onDeleted={() => clearAccountData(user.id)}
      />
    </div>
  )
}

export function AccountPage() {
  return (
    <RequiresConnection>
      <AccountContent />
    </RequiresConnection>
  )
}
