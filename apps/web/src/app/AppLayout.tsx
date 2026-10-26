import { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { Button, buttonClass } from '../components/Button'
import { Notice } from '../components/Notice'
import { buildLoginPath } from '../features/auth/redirect'
import { clearRememberedSource } from '../features/library/source-choice'
import { useLogoutMutation, useSessionQuery } from '../features/auth/useSession'
import { SettingsButton } from '../features/settings/SettingsButton'
import { SettingsDialog } from '../features/settings/SettingsDialog'
import { useSettingsSync } from '../features/settings/settings-sync'
import styles from './AppLayout.module.css'
import { clearEnded, useSessionEnded } from './session-ended'

export function AppLayout() {
  // `useSessionQuery` só consulta a sessão depois de o servidor acordar, para não competir com a
  // espera inicial; os loaders já preenchem o cache antes disso nas telas protegidas.
  const session = useSessionQuery()
  const logout = useLogoutMutation()
  const location = useLocation()
  const navigate = useNavigate()
  const onAuthPage = location.pathname === '/login' || location.pathname === '/cadastro'
  // Quem sai do jogo para entrar ou cadastrar-se volta ao calendário na cruzada padrão (feature 031).
  useEffect(() => {
    if (onAuthPage) clearRememberedSource()
  }, [onAuthPage])
  const sessionEnded = useSessionEnded()
  const loginPath = buildLoginPath(location.pathname + location.search)
  // Configurações na conta (feature 021): liga para quem entrou, desliga para visitante.
  useSettingsSync()
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
          <SettingsButton />
          {session.data ? (
            <>
              <span className={`${styles.who} ${styles.email}`}>{session.data.user.email}</span>
              <Button variant="quiet" onClick={() => logout.mutate()} disabled={logout.isPending}>
                Sair
              </Button>
            </>
          ) : session.data === null ? (
            // Visitante (feature 013): sempre dito por texto, com um caminho para entrar.
            <>
              <span className={styles.who}>Visitante</span>
              {onAuthPage ? null : (
                <Link
                  to={loginPath}
                  className={`${buttonClass({ variant: 'quiet' })} ${styles.login}`}
                >
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
      <SettingsDialog />
    </div>
  )
}
