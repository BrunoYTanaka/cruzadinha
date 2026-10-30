import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useMatch, useNavigate } from 'react-router'
import { Button, buttonClass } from '../shared/components/Button/Button'
import { Notice } from '../shared/components/Notice/Notice'
import {
  buildLoginPath,
  useLogoutMutation,
  useSessionQuery,
  clearAccountDeleted,
  clearEnded,
  useAccountDeleted,
  useSessionEnded,
} from '../features/session'
import { clearRememberedSource } from '../features/library'
import {
  clearAccountData,
  discardOtherAccounts,
  hasOutbox,
  InstallButton,
  LogoutConfirm,
  OfflineNotice,
  PendingOwnerNotice,
  useOutboxDrain,
} from '../features/offline'
import { SettingsButton, SettingsDialog, useSettingsSync } from '../features/settings'
import { HeaderStart } from './HeaderStart'
import styles from './AppLayout.module.css'

// Telas de conta das features 035 e 042, além do login e do cadastro.
const ACCOUNT_PATHS = new Set([
  '/verificar-email',
  '/esqueci-a-senha',
  '/redefinir-senha',
  '/confirmar-email',
])

export function AppLayout() {
  // `useSessionQuery` só consulta a sessão depois de o servidor acordar, para não competir com a
  // espera inicial; os loaders já preenchem o cache antes disso nas telas protegidas.
  const session = useSessionQuery()
  const logout = useLogoutMutation()
  const location = useLocation()
  const navigate = useNavigate()
  const onAuthPage = location.pathname === '/login' || location.pathname === '/cadastro'
  // Quem sai do jogo para entrar, cadastrar-se ou recuperar a senha volta ao calendário na cruzada
  // padrão (feature 031).
  const onAccountPage = onAuthPage || ACCOUNT_PATHS.has(location.pathname)
  useEffect(() => {
    if (onAccountPage) clearRememberedSource()
  }, [onAccountPage])
  const sessionEnded = useSessionEnded()
  const accountDeleted = useAccountDeleted()
  const loginPath = buildLoginPath(location.pathname + location.search)
  // Configurações na conta (feature 021): liga para quem entrou, desliga para visitante.
  useSettingsSync()
  // Pendências offline da conta (feature 041): enviadas fora do jogo, e nunca para outra conta.
  const userId = session.data?.user.id ?? null
  useOutboxDrain(userId, useMatch('/jogo/:puzzleId')?.params.puzzleId ?? null)
  useEffect(() => {
    if (userId) void discardOtherAccounts(userId)
  }, [userId])
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  async function leave() {
    setConfirmingLogout(false)
    if (userId) await clearAccountData(userId)
    logout.mutate()
  }
  return (
    <div className={styles.shell}>
      <a href="#conteudo" className={styles.skip}>
        Pular para o conteúdo
      </a>
      <header className={styles.header}>
        <HeaderStart />
        <div className={styles.actions}>
          <Link to="/estatisticas" className={buttonClass({ variant: 'quiet' })}>
            Estatísticas
          </Link>
          <InstallButton />
          <SettingsButton />
          {session.data ? (
            <>
              <Link
                to="/conta"
                className={`${styles.who} ${styles.email}`}
                aria-label={`Sua conta (${session.data.user.email})`}
              >
                {session.data.user.email}
              </Link>
              <Button
                variant="quiet"
                onClick={() =>
                  userId !== null && hasOutbox(userId) ? setConfirmingLogout(true) : logout.mutate()
                }
                disabled={logout.isPending}
              >
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
      <OfflineNotice />
      <PendingOwnerNotice guest={session.data === null} />
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
      {accountDeleted ? (
        <div className={styles.notice}>
          <Notice onDismiss={clearAccountDeleted}>Sua conta foi excluída.</Notice>
        </div>
      ) : null}
      <main id="conteudo" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <SettingsDialog />
      <LogoutConfirm
        open={confirmingLogout}
        onConfirm={() => void leave()}
        onCancel={() => setConfirmingLogout(false)}
      />
    </div>
  )
}
