import type { PuzzleSourceId } from '@cruzadinha/shared'
import { useRef, type KeyboardEvent } from 'react'
import { completedLabel } from '../helpers/today-cards'
import styles from './SourceTabs.module.css'

export type SourceTab = {
  source: PuzzleSourceId
  name: string
  // Concluídas no mês exibido; `null` enquanto a biblioteca da fonte carrega ou se falhou.
  count: number | null
}

type SourceTabsProps = {
  value: PuzzleSourceId
  tabs: readonly SourceTab[]
  onChange: (source: PuzzleSourceId) => void
}

// Abas no padrão do WAI-ARIA: só a escolhida entra no Tab, as setas trocam e já mostram o
// calendário da fonte, que está em cache (feature 015, research R4).
export function SourceTabs({ value, tabs, onChange }: SourceTabsProps) {
  const refs = useRef(new Map<PuzzleSourceId, HTMLButtonElement>())

  function choose(index: number) {
    const tab = tabs[(index + tabs.length) % tabs.length]
    if (!tab) return
    onChange(tab.source)
    refs.current.get(tab.source)?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const current = tabs.findIndex((tab) => tab.source === value)
    if (event.key === 'ArrowRight') choose(current + 1)
    else if (event.key === 'ArrowLeft') choose(current - 1)
    else if (event.key === 'Home') choose(0)
    else if (event.key === 'End') choose(tabs.length - 1)
    else return
    event.preventDefault()
  }

  return (
    <div role="tablist" aria-label="Fonte do calendário" className={styles.tabs}>
      {tabs.map((tab) => {
        const selected = tab.source === value
        return (
          <button
            key={tab.source}
            ref={(element) => {
              if (element) refs.current.set(tab.source, element)
              else refs.current.delete(tab.source)
            }}
            type="button"
            role="tab"
            id={`source-tab-${tab.source}`}
            aria-controls="source-panel"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`${styles.tab} ${selected ? styles.selected : ''}`}
            onClick={() => onChange(tab.source)}
            onKeyDown={onKeyDown}
          >
            <span className={styles.name}>{tab.name}</span>{' '}
            {tab.count === null ? null : (
              <span className={styles.count}>{completedLabel(tab.count)}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
