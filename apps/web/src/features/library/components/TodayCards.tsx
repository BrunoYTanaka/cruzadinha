import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { Button } from '../../../shared/components/Button'
import { isNoPuzzle, isSourceDown, isSourceUnsupported } from '../helpers/source-down'
import { todayCard, type TodayCard } from '../helpers/today-cards'
import styles from './TodayCards.module.css'
import type { SourceLibrary } from '../hooks/useSourceLibraries'

// Só o que os cartões leem da biblioteca de cada fonte.
export type TodayCardsSource = Pick<SourceLibrary, 'source' | 'name' | 'items'> & {
  query: { isPending: boolean; isError: boolean; error?: unknown; refetch: () => unknown }
}

type TodayCardsProps = {
  libraries: readonly TodayCardsSource[]
  today: string
}

// "segunda-feira, 19 de outubro": a data é a de Brasília, guardada como dia sem fuso.
function longDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)))
}

// Seção "Hoje": um cartão por fonte, na ordem da lista, cada um carregando e falhando sozinho
// (feature 015, FR-002 a FR-004 e FR-014).
export function TodayCards({ libraries, today }: TodayCardsProps) {
  return (
    <section aria-labelledby="today-title" className={styles.today}>
      <div className={styles.head}>
        <h1 id="today-title" className={styles.title}>
          Hoje
        </h1>
        <p className={styles.date}>{longDate(today)}</p>
      </div>
      <ul className={styles.cards} style={{ '--source-count': libraries.length } as CSSProperties}>
        {libraries.map((library) => (
          <li key={library.source}>
            <SourceCard library={library} today={today} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function SourceCard({ library, today }: { library: TodayCardsSource; today: string }) {
  const { query, name } = library
  if (query.isPending) {
    return (
      <div className={styles.card} aria-busy="true">
        <span className={styles.name}>{name}</span>
        <span className={styles.muted}>Carregando…</span>
      </div>
    )
  }
  if (query.isError && isSourceUnsupported(query.error)) {
    return (
      <div className={styles.card}>
        <span className={styles.name}>{name}</span>
        <span className={styles.muted}>Não disponível agora.</span>
      </div>
    )
  }
  if (query.isError) {
    return (
      <div className={styles.card}>
        <div className={styles.body}>
          <span className={styles.name}>{name}</span>
          <span className={styles.muted}>Não foi possível carregar.</span>
        </div>
        <Button onClick={() => void query.refetch()}>Tentar de novo</Button>
      </div>
    )
  }
  const card = todayCard(library.source, library.items, today, {
    down: isSourceDown(library.source),
    noPuzzle: isNoPuzzle(library.source, today),
  })
  const content = (
    <>
      <span className={styles.body}>
        <span className={styles.name}>{card.name}</span>
        <span className={`${styles.status} ${statusClass(card)}`}>{card.status}</span>
      </span>
      {card.action ? <span className={styles.action}>{card.action}</span> : null}
    </>
  )
  if (card.href === null) return <div className={styles.card}>{content}</div>
  return (
    <Link
      to={card.href}
      className={`${styles.card} ${styles.link}`}
      aria-label={`${card.name}: ${card.spoken}. ${card.action ?? ''}`}
    >
      {content}
    </Link>
  )
}

function statusClass({ kind }: TodayCard): string {
  if (kind === 'completed') return styles.done ?? ''
  if (kind === 'in_progress') return styles.playing ?? ''
  return ''
}
