import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { buttonClass } from '../Button/Button'
import { clampShift } from '../Tooltip/tooltip-position'
import styles from './Menu.module.css'

type MenuContextValue = { close: () => void }
const MenuContext = createContext<MenuContextValue>({ close: () => {} })

type MenuProps = {
  // Nome acessível do botão.
  label: string
  buttonContent: ReactNode
  // `sheet`: painel preso à borda de baixo, por cima do teclado da tela (feature 047).
  placement: 'popover' | 'sheet'
  // Verdadeiro enquanto outro diálogo está aberto: o menu fecha e o botão não o abre.
  blocked?: boolean
  // Classe do botão (medidas, nunca cores).
  buttonClassName?: string
  children: ReactNode
}

const ITEM = '[role="menuitem"], [role="menuitemcheckbox"]'

// Botão de menu (WAI-ARIA): `aria-haspopup="menu"`, setas, Home, End, Esc devolve o foco ao
// botão, clique fora e Tab fecham. Teclas tratadas dentro do menu não sobem: nada chega ao
// tabuleiro nem ao atalho `?` da tela.
export function Menu({
  label,
  buttonContent,
  placement,
  blocked = false,
  buttonClassName,
  children,
}: MenuProps) {
  const [openState, setOpen] = useState(false)
  const open = openState && !blocked
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) buttonRef.current?.focus()
  }, [])

  const items = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>(ITEM) ?? [])

  useEffect(() => {
    if (open) items()[0]?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !wrapRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Popover: mede e grava o que falta para caber na janela, direto no DOM (como o Tooltip).
  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!open || !panel || placement !== 'popover') return
    const place = () => {
      panel.style.setProperty('--menu-shift', '0px')
      const { left, width } = panel.getBoundingClientRect()
      const shift = clampShift(left, width, document.documentElement.clientWidth)
      panel.style.setProperty('--menu-shift', `${shift}px`)
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open, placement])

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    event.stopPropagation()
    const list = items()
    const at = list.indexOf(document.activeElement as HTMLElement)
    const go = (index: number) => {
      event.preventDefault()
      list[(index + list.length) % list.length]?.focus()
    }
    switch (event.key) {
      case 'ArrowDown':
        return go(at + 1)
      case 'ArrowUp':
        return go(at <= 0 ? list.length - 1 : at - 1)
      case 'Home':
        return go(0)
      case 'End':
        return go(list.length - 1)
      case 'Escape':
        event.preventDefault()
        return close(true)
      case 'Tab':
        return close(false)
    }
  }

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
    }
    if (event.key === 'Escape' && open) {
      event.stopPropagation()
      close(true)
    }
  }

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        ref={buttonRef}
        type="button"
        className={`${buttonClass()} ${styles.button} ${buttonClassName ?? ''}`.trim()}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={label}
        aria-disabled={blocked || undefined}
        onClick={() => (blocked ? undefined : setOpen(!open))}
        onKeyDown={onButtonKeyDown}
      >
        {buttonContent}
      </button>
      {open ? (
        <MenuContext.Provider value={{ close: () => close(true) }}>
          <div
            ref={panelRef}
            id={panelId}
            role="menu"
            tabIndex={-1}
            aria-label={label}
            className={`${styles.panel} ${placement === 'sheet' ? styles.sheet : styles.popover}`}
            onKeyDown={onPanelKeyDown}
          >
            {children}
          </div>
        </MenuContext.Provider>
      ) : null}
    </div>
  )
}

export function MenuGroup({ label, children }: { label: string; children: ReactNode }) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className={styles.group}>
      <span id={id} className={styles.groupLabel}>
        {label}
      </span>
      {children}
    </div>
  )
}

// Desabilitado fica `aria-disabled` (continua focável, o leitor de tela explica) e não age.
export function MenuItem({
  disabled = false,
  onSelect,
  children,
}: {
  disabled?: boolean
  onSelect: () => void
  children: ReactNode
}) {
  const { close } = useContext(MenuContext)
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      aria-disabled={disabled || undefined}
      className={styles.item}
      onClick={() => {
        if (disabled) return
        onSelect()
        close()
      }}
    >
      {children}
    </button>
  )
}

// Interruptor: o menu fica aberto ao alternar.
export function MenuCheckItem({
  checked,
  disabled = false,
  onChange,
  children,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      tabIndex={-1}
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      className={styles.item}
      onClick={disabled ? undefined : () => onChange(!checked)}
    >
      <span>{children}</span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.knob} />
      </span>
    </button>
  )
}
