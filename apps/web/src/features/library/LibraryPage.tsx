import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ApiRequestError } from '../../api/client'
import { ErrorState, LoadingState } from '../../app/ErrorState'
import { Notice } from '../../components/Notice'
import { ResizeHandle, type ResizeHandleProps } from '../../components/ResizeHandle'
import { addMonths, todayInBrasilia } from '../../lib/dates'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useViewer } from '../auth/useSession'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { buildMonth, compareMonths, currentMonth, firstNavigableMonth } from './calendar'
import { Calendar } from './Calendar'
import styles from './LibraryPage.module.css'
import { LibraryLegend } from './LibraryLegend'
import { KEYBOARD_STEP, MIN_WIDTH, widthFromDrag } from './library-width'
import { useSourceChoice } from './source-choice'
import { isSourceDown, readNoPuzzleDates } from './source-down'
import { SourceTabs } from './SourceTabs'
import { completedInMonth } from './today-cards'
import { TodayCards } from './TodayCards'
import { useLibraryWidth } from './useLibraryWidth'
import { libraryOf, useSourceLibraries } from './useSourceLibraries'

// Computador: o calendário fica largo e pode ser redimensionado pela alça da borda.
export const LIBRARY_DESKTOP_QUERY = '(min-width: 861px)'

export function LibraryPage() {
  useDocumentTitle('Escolha um dia')
  const today = useMemo(() => todayInBrasilia(), [])
  const viewer = useViewer()
  const [source, setSource] = useSourceChoice()
  const libraries = useSourceLibraries()
  const active = libraryOf(libraries, source)
  const library = active.query
  const [month, setMonth] = useState(() => currentMonth(today))
  const first = firstNavigableMonth(today)
  const last = currentMonth(today)

  // A API anterior ignora a fonte e só lista O Globo: um item de outra fonte nunca entra no mês.
  const items = active.items
  const view = useMemo(() => {
    const monthDates = Array.from(
      { length: 31 },
      (_, index) =>
        `${String(month.year).padStart(4, '0')}-${String(month.month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`,
    )
    return buildMonth(month, today, items, readNoPuzzleDates(source, monthDates))
  }, [month, today, items, source])
  const wide = useMediaQuery(LIBRARY_DESKTOP_QUERY)
  const pageRef = useRef<HTMLDivElement>(null)
  const size = useLibraryWidth(pageRef, { enabled: wide, ready: library.isSuccess })

  // Com a API anterior à feature 013, a biblioteca de visitante responde 401: a página inteira pede
  // para entrar, como antes (compatibilidade, R19 da feature 013).
  if (
    library.isError &&
    viewer?.kind === 'guest' &&
    library.error instanceof ApiRequestError &&
    library.error.status === 401
  ) {
    return (
      <ErrorState title="Entre para ver a biblioteca">
        <Link to="/login">Entrar</Link>
      </ErrorState>
    )
  }

  // O carregamento e o erro da fonte escolhida ficam só na área do calendário: os cartões de hoje
  // aparecem sempre (FR-014).
  let calendarArea: ReactNode
  if (library.isPending) {
    calendarArea = <LoadingState label="Carregando a biblioteca…" />
  } else if (library.isError) {
    const offline = library.error instanceof ApiRequestError && library.error.isOffline
    calendarArea = (
      <ErrorState
        title={offline ? 'Sem conexão' : 'Não foi possível carregar a biblioteca'}
        message={offline ? 'Confira a conexão e tente de novo.' : 'Tente de novo em instantes.'}
        onRetry={() => void library.refetch()}
      />
    )
  } else {
    calendarArea = (
      <>
        {isSourceDown(source) ? (
          <Notice variant="warning">
            Novas cruzadas não podem ser buscadas agora. As que já estão guardadas continuam
            disponíveis.
          </Notice>
        ) : null}
        <Calendar
          view={view}
          source={source}
          canGoPrevious={compareMonths(month, first) > 0}
          canGoNext={compareMonths(month, last) < 0}
          onPrevious={() => setMonth((current) => addMonths(current, -1))}
          onNext={() => setMonth((current) => addMonths(current, 1))}
          resizeHandle={size ? <CalendarHandles size={size} /> : null}
        />
        <LibraryLegend />
      </>
    )
  }

  return (
    <div ref={pageRef} className={styles.page} style={size?.style}>
      <TodayCards libraries={libraries} today={today} />
      <SourceTabs
        value={source}
        tabs={libraries.map((entry) => ({
          source: entry.source,
          name: entry.name,
          count: entry.query.isSuccess ? completedInMonth(entry.items, month) : null,
        }))}
        onChange={setSource}
      />
      {calendarArea}
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
