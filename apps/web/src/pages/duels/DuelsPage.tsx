import { Link } from 'react-router'
import { buttonClass } from '../../shared/components/Button/Button'
import { ErrorState } from '../../shared/components/ErrorState/ErrorState'
import { LoadingState } from '../../shared/components/LoadingState/LoadingState'
import { RequiresConnection } from '../../shared/components/RequiresConnection/RequiresConnection'
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle/useDocumentTitle'
import { DuelList, isDuelUnavailable, JoinByCode, useMyDuels } from '../../features/duel'
import styles from './DuelsPage.module.css'

export function DuelsPage() {
  useDocumentTitle('Meus x1')
  const { viewer, query, duels, guestWithoutTokens } = useMyDuels()
  const guest = viewer?.kind === 'guest'
  let list
  if (!viewer || (query.isPending && !guestWithoutTokens && query.fetchStatus !== 'idle')) {
    list = <LoadingState screen="entry" level={2} />
  } else if (query.isError) {
    list = isDuelUnavailable(query.error) ? (
      <ErrorState level={2} title="O x1 não está disponível agora" message="Tente mais tarde." />
    ) : (
      <ErrorState
        level={2}
        message="Não foi possível carregar os seus x1."
        onRetry={() => void query.refetch()}
      />
    )
  } else {
    list = <DuelList duels={duels} guest={guest} />
  }
  return (
    <RequiresConnection>
      <div className={styles.page}>
        <div className={styles.head}>
          <h1 className={styles.title}>Meus x1</h1>
          <Link to="/x1/novo" className={buttonClass({ variant: 'primary' })}>
            Novo x1
          </Link>
        </div>
        <section aria-labelledby="entrar-x1">
          <h2 id="entrar-x1" className={styles.heading}>
            Entrar em um x1
          </h2>
          <JoinByCode />
        </section>
        <section aria-labelledby="ativos-x1">
          <h2 id="ativos-x1" className={styles.heading}>
            Ativos
          </h2>
          {list}
        </section>
      </div>
    </RequiresConnection>
  )
}
