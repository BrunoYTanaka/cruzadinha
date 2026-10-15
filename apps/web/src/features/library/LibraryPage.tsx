import { useQuery } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ApiRequestError } from '../../api/client'
import { getLibrary } from '../../api/library'
import { queryKeys } from '../../api/query-keys'
import { ErrorState, LoadingState } from '../../app/ErrorState'
import { Notice } from '../../components/Notice'
import { ResizeHandle, type ResizeHandleProps } from '../../components/ResizeHandle'
import { addMonths, todayInBrasilia } from '../../lib/dates'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { buildMonth, compareMonths, currentMonth, firstNavigableMonth } from './calendar'
import { Calendar } from './Calendar'
import styles from './LibraryPage.module.css'
import { LibraryLegend } from './LibraryLegend'
import { KEYBOARD_STEP, MIN_WIDTH, widthFromDrag } from './library-width'
import { isSourceDown, readNoPuzzleDates } from './source-down'
import { useLibraryWidth } from './useLibraryWidth'

// Computador: o calendário fica largo e pode ser redimensionado pela alça da borda.
export const LIBRARY_DESKTOP_QUERY = '(min-width: 861px)'

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
  const wide = useMediaQuery(LIBRARY_DESKTOP_QUERY)
  const pageRef = useRef<HTMLDivElement>(null)
  const size = useLibraryWidth(pageRef, { enabled: wide, ready: library.isSuccess })

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
    <div ref={pageRef} className={styles.page} style={size?.style}>
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
        resizeHandle={size ? <CalendarHandles size={size} /> : null}
      />
      <LibraryLegend />
    </div>
  )
}

// Alça da borda direita (a acessível) e a pegada do canto inferior direito, só visual.
function CalendarHandles({ size }: { size: NonNullable<ReturnType<typeof useLibraryWidth>> }) {
  const common: Omit<ResizeHandleProps, 'variant'> = {
    label: 'Largura do calendário',
    value: size.width,
    min: Math.min(MIN_WIDTH, size.max),
    max: size.max,
    step: KEYBOARD_STEP,
    valueText: (value) =>
      `Largura do calendário ${value} de ${size.max}${size.isAuto ? ', automático' : ''}`,
    fromDrag: ({ startValue, dx }) => widthFromDrag({ startWidth: startValue, dx }),
    onChange: size.preview,
    onCommit: size.commit,
    onReset: size.reset,
  }
  return (
    <>
      <ResizeHandle {...common} variant="edge" className={styles.edgeHandle} />
      <ResizeHandle {...common} variant="corner" decorative className={styles.cornerHandle} />
    </>
  )
}
