import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import styles from './Tabs.module.css'

export type TabItem<T extends string> = {
  id: T
  name: string
  // Segunda linha, mais apagada (contagem do calendário, legenda da administração).
  caption?: ReactNode
}

export type TabsProps<T extends string> = {
  label: string
  tabs: readonly TabItem<T>[]
  value: T
  onChange: (id: T) => void
  tabId: (id: T) => string
  panelId: (id: T) => string
}

// Abas coladas no painel (features 015, 062, 066), no padrão do WAI-ARIA: só a escolhida entra no
// Tab, as setas (com volta), Home e End trocam e focam. Quem usa monta o painel.
export function Tabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
  tabId,
  panelId,
}: TabsProps<T>) {
  const refs = useRef(new Map<T, HTMLButtonElement>())

  // Uma aba aberta pelo endereço pode estar fora da linha visível (muitas fontes, celular).
  useEffect(() => {
    refs.current.get(value)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    // Só na montagem: trocar de aba já põe a nova em foco.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function choose(index: number) {
    const tab = tabs[(index + tabs.length) % tabs.length]
    if (!tab) return
    onChange(tab.id)
    refs.current.get(tab.id)?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const current = tabs.findIndex((tab) => tab.id === value)
    if (event.key === 'ArrowRight') choose(current + 1)
    else if (event.key === 'ArrowLeft') choose(current - 1)
    else if (event.key === 'Home') choose(0)
    else if (event.key === 'End') choose(tabs.length - 1)
    else return
    event.preventDefault()
  }

  return (
    <div role="tablist" aria-label={label} className={styles.tabs}>
      {tabs.map((tab) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            ref={(element) => {
              if (element) refs.current.set(tab.id, element)
              else refs.current.delete(tab.id)
            }}
            type="button"
            role="tab"
            id={tabId(tab.id)}
            aria-controls={panelId(tab.id)}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`${styles.tab} ${selected ? styles.selected : ''}`}
            onClick={() => onChange(tab.id)}
            onKeyDown={onKeyDown}
          >
            <span className={styles.name}>{tab.name}</span>{' '}
            {tab.caption === undefined ? null : (
              <span className={styles.caption}>{tab.caption}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
