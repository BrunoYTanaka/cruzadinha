import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import { buildLoginPath } from '../features/auth/redirect'
import { sessionQueryOptions, useLogoutMutation } from '../features/auth/useSession'
import { useServerReady } from '../features/status/useSlowServer'
import { ThemeToggle } from '../themes/ThemeToggle'
import styles from './AppLayout.module.css'
import { clearEnded, useSessionEnded } from './session-ended'

export function AppLayout() {
  // Só consulta a sessão depois de o servidor acordar, para não competir com a espera inicial; os
  // loaders já preenchem o cache antes disso nas telas protegidas.
  const serverReady = useServerReady()
  const session = useQuery({ ...sessionQueryOptions(), enabled: serverReady })
  const logout = useLogoutMutation()
  const location = useLocation()
  const navigate = useNavigate()
  const onAuthPage = location.pathname === '/login' || location.pathname === '/cadastro'
  const sessionEnded = useSessionEnded()
  const loginPath = buildLoginPath(location.pathname + location.search)
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
            <>
              <span className={`${styles.who} ${styles.email}`}>{session.data.user.email}</span>
              <Button variant="ghost" onClick={() => logout.mutate()} disabled={logout.isPending}>
                Sair
              </Button>
            </>
          ) : session.data === null ? (
            // Visitante (feature 013): sempre dito por texto, com um caminho para entrar.
            <>
              <span className={styles.who}>Visitante</span>
              {onAuthPage ? null : (
                <Link to={loginPath} className={styles.login}>
                  Entrar
                </Link>
              )}
            </>
          ) : null}
        </div>
      </header>
      {sessionEnded && session.data === null && !onAuthPage ? (
        // Sessão terminada fora do tabuleiro (FR-013): segue como visitante, sem tirar o foco.
        <div className={styles.notice}>
          <Notice
            variant="warning"
            action={{ label: 'Entrar', onClick: () => void navigate(loginPath) }}
            onDismiss={clearEnded}
          >
            Sua sessão terminou. Você está como visitante.
          </Notice>
        </div>
      ) : null}
      <main id="conteudo" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
