import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ApiRequestError } from '../../api/client'
import { getLibrary } from '../../api/library'
import { queryKeys } from '../../api/query-keys'
import { ErrorState, LoadingState } from '../../app/ErrorState'
import { Notice } from '../../components/Notice'
import { addMonths, todayInBrasilia } from '../../lib/dates'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { buildMonth, compareMonths, currentMonth, firstNavigableMonth } from './calendar'
import { Calendar } from './Calendar'
import styles from './LibraryPage.module.css'
import { LibraryLegend } from './LibraryLegend'
import { isSourceDown, readNoPuzzleDates } from './source-down'

export function LibraryPage() {
  useDocumentTitle('Escolha um dia')
  const today = useMemo(() => todayInBrasilia(), [])
  const library = useQuery({ queryKey: queryKeys.library, queryFn: getLibrary })
  const [month, setMonth] = useState(() => currentMonth(today))
  const first = firstNavigableMonth(today)
  const last = currentMonth(today)

  const items = useMemo(() => library.data?.items ?? [], [library.data])
  const view = useMemo(() => {
    const monthDates = Array.from(
      { length: 31 },
      (_, index) =>
        `${String(month.year).padStart(4, '0')}-${String(month.month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`,
    )
    return buildMonth(month, today, items, readNoPuzzleDates(monthDates))
  }, [month, today, items])

  if (library.isPending) return <LoadingState label="Carregando a biblioteca…" />
  if (library.isError) {
    const offline = library.error instanceof ApiRequestError && library.error.isOffline
    return (
      <ErrorState
        title={offline ? 'Sem conexão' : 'Não foi possível carregar a biblioteca'}
        message={offline ? 'Confira a conexão e tente de novo.' : 'Tente de novo em instantes.'}
        onRetry={() => void library.refetch()}
      />
    )
  }

  const todayItem = items.find((item) => item.date === today)
  const todayPath = todayItem ? `/jogo/${todayItem.puzzleId}` : `/dia/${today}`

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Escolha um dia</h1>
          <p className={styles.lead}>Uma cruzada por dia.</p>
        </div>
        <Link to={todayPath} className={styles.today}>
          Jogar a de hoje
        </Link>
      </div>
      {isSourceDown() ? (
        <Notice variant="warning">
          Novas cruzadas não podem ser buscadas agora. As que já estão guardadas continuam
          disponíveis.
        </Notice>
      ) : null}
      <Calendar
        view={view}
        canGoPrevious={compareMonths(month, first) > 0}
        canGoNext={compareMonths(month, last) < 0}
        onPrevious={() => setMonth((current) => addMonths(current, -1))}
        onNext={() => setMonth((current) => addMonths(current, 1))}
      />
      <LibraryLegend />
    </div>
  )
}
