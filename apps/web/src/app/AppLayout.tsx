import { Link, Outlet } from 'react-router'
import { Button } from '../components/Button'
import { KonamiListener } from '../features/invites/KonamiListener'
import { useLogoutMutation, useSessionQuery } from '../features/auth/useSession'
import { ThemeToggle } from '../themes/ThemeToggle'
import styles from './AppLayout.module.css'

export function AppLayout() {
  const session = useSessionQuery()
  const logout = useLogoutMutation()
  return (
    <div className={styles.shell}>
      <a href="#conteudo" className={styles.skip}>
        Pular para o conteúdo
      </a>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          Cruzadinha
        </Link>
        <div className={styles.actions}>
          <ThemeToggle />
          {session.data ? (
            <Button variant="ghost" onClick={() => logout.mutate()} disabled={logout.isPending}>
              Sair
            </Button>
          ) : null}
        </div>
      </header>
      <KonamiListener />
      <main id="conteudo" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
