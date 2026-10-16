import { useQuery } from '@tanstack/react-query'
import { Link, Outlet } from 'react-router'
import { Button } from '../components/Button'
import { KonamiListener } from '../features/invites/KonamiListener'
import { sessionQueryOptions, useLogoutMutation } from '../features/auth/useSession'
import { useServerReady } from '../features/status/useSlowServer'
import { ThemeToggle } from '../themes/ThemeToggle'
import styles from './AppLayout.module.css'

export function AppLayout() {
  // Só consulta a sessão depois de o servidor acordar, para não competir com a espera inicial; os
  // loaders já preenchem o cache antes disso nas telas protegidas.
  const serverReady = useServerReady()
  const session = useQuery({ ...sessionQueryOptions(), enabled: serverReady })
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
