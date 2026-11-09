import { useEffect } from 'react'
import { Link, Outlet, useLocation, useMatch, useNavigate } from 'react-router'
import { buttonClass } from '../shared/components/Button/Button'
import { Menu, MenuItem } from '../shared/components/Menu/Menu'
import { initials } from '../shared/helpers/initials/initials'
import { Notice } from '../shared/components/Notice/Notice'
import {
  buildLoginPath,
  useSessionQuery,
  clearAccountDeleted,
  clearEnded,
  useAccountDeleted,
  useSessionEnded,
} from '../features/session'
import { clearRememberedSource } from '../features/library'
import {
  discardOtherAccounts,
  InstallButton,
  OfflineNotice,
  PendingOwnerNotice,
  useOutboxDrain,
} from '../features/offline'
import { useMyDuels } from '../features/duel'
import { ImportOffer } from '../features/import'
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
  const location = useLocation()
  const navigate = useNavigate()
  const onAuthPage = location.pathname === '/login' || location.pathname === '/cadastro'
  // Quem sai do jogo para entrar, cadastrar-se ou recuperar a senha volta ao calendário na cruzada
  // padrão (feature 031).
  const onAccountPage = onAuthPage || ACCOUNT_PATHS.has(location.pathname)
  useEffect(() => {
    if (onAccountPage) clearRememberedSource()
  }, [onAccountPage])
  // Contador do menu (feature 058): x1 que pedem atenção. O número ocupa sempre o mesmo espaço.
  const { attention } = useMyDuels()
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
  return (
    <div className={styles.shell}>
      <a href="#conteudo" className={styles.skip}>
        Pular para o conteúdo
      </a>
      <header className={styles.header}>
        <HeaderStart />
        <div className={styles.actions}>
          <Link
            to="/estatisticas"
            className={`${buttonClass({ variant: 'quiet' })} ${styles.statsLink} ${location.pathname.startsWith('/estatisticas') ? styles.current : ''}`}
            aria-current={location.pathname.startsWith('/estatisticas') ? 'page' : undefined}
          >
            Estatísticas
          </Link>
          <Link
            to="/x1"
            className={`${buttonClass({ variant: 'quiet' })} ${styles.duelLink} ${location.pathname.startsWith('/x1') ? styles.current : ''}`}
            aria-current={location.pathname.startsWith('/x1') ? 'page' : undefined}
            aria-label={attention > 0 ? `x1, ${attention} aguardando` : 'x1'}
          >
            x1
            <span className={styles.count} data-empty={attention === 0} aria-hidden="true">
              {attention > 0 ? attention : ''}
            </span>
          </Link>
          <div className={styles.menu}>
            <Menu
              label="Menu"
              buttonContent={
                <>
                  <svg className={styles.menuIcon} viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                </>
              }
              placement="sheet"
              buttonClassName={styles.menuButton}
            >
              <MenuItem
                current={location.pathname.startsWith('/calendario')}
                onSelect={() => void navigate('/calendario')}
              >
                Calendário
              </MenuItem>
              <MenuItem
                current={location.pathname.startsWith('/estatisticas')}
                onSelect={() => void navigate('/estatisticas')}
              >
                Estatísticas
              </MenuItem>
              <MenuItem
                current={location.pathname.startsWith('/x1')}
                onSelect={() => void navigate('/x1')}
              >
                {attention > 0 ? `x1 (${attention} aguardando)` : 'x1'}
              </MenuItem>
            </Menu>
          </div>
          <div className={styles.tail}>
            <InstallButton />
            <SettingsButton />
            {session.data ? (
              <>
                <Link
                  to="/conta"
                  className={styles.avatar}
                  aria-label={`Sua conta (${session.data.user.email})`}
                >
                  {initials(session.data.user.email)}
                </Link>
              </>
            ) : session.data === null ? (
              // Visitante (feature 013): dito ao leitor de tela, com um caminho para entrar.
              <>
                <span className={styles.who}>Visitante</span>
                {onAuthPage ? null : (
                  <Link
                    to={loginPath}
                    className={`${buttonClass({ variant: 'primary' })} ${styles.login}`}
                  >
                    Entrar
                  </Link>
                )}
              </>
            ) : null}
          </div>
        </div>
      </header>
      <OfflineNotice />
      <PendingOwnerNotice guest={session.data === null} />
      <ImportOffer
        key={session.data?.user.id ?? 'guest'}
        userId={session.data?.user.id ?? null}
        suspended={onAuthPage || location.pathname.startsWith('/jogo/')}
      />
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
    </div>
  )
}
