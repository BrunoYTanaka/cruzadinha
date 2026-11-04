import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { buttonClass } from '../../../../shared/components/Button/Button'
import { clampShift } from '../../../../shared/components/Tooltip/tooltip-position'
import { monthKey, toIsoDate, type YearMonth } from '../../../../shared/helpers/dates/dates'
import { firstNavigableMonth } from '../../helpers/calendar'
import { monthOptions, periodText, resolveJump } from '../../helpers/jump'
import styles from './JumpToDate.module.css'

type JumpToDateProps = {
  today: string
  // Mês exibido na grade.
  month: YearMonth
  onJumpMonth: (month: YearMonth) => void
  onJumpDate: (date: string, month: YearMonth) => void
}

// Ir direto a um mês ou a um dia, sem navegar mês a mês (feature 054). Desde a feature 061 fica atrás
// de um botão com ícone de calendário e abre num painel que flutua sobre a página.
export function JumpToDate({ today, month, onJumpMonth, onJumpDate }: JumpToDateProps) {
  const monthId = useId()
  const dateId = useId()
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const monthRef = useRef<HTMLSelectElement>(null)
  const options = monthOptions(today)
  const first = firstNavigableMonth(today)

  // Fechar apaga o aviso: ao reabrir não sobra erro antigo (FR-016).
  const close = useCallback((returnFocus: boolean) => {
    setOpen(false)
    setError('')
    if (returnFocus) buttonRef.current?.focus()
  }, [])

  useEffect(() => {
    if (open) monthRef.current?.focus()
  }, [open])

  // Só o início do toque conta: arrastar de dentro para fora (selecionar texto) não fecha.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !wrapRef.current?.contains(event.target)) close(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, close])

  // Mede e grava o que falta para o painel caber na janela, direto no DOM (como o Menu).
  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!open || !panel) return
    const place = () => {
      panel.style.setProperty('--jump-shift', '0px')
      const { left, width } = panel.getBoundingClientRect()
      const shift = clampShift(left, width, document.documentElement.clientWidth)
      panel.style.setProperty('--jump-shift', `${shift}px`)
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open])

  // Esc fecha só o painel: o evento não sobe para um diálogo nem para a página. Ouvinte nativo no
  // envoltório (o componente não é um controle) que para o evento antes da raiz do React.
  useEffect(() => {
    const wrap = wrapRef.current
    if (!open || !wrap) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      close(true)
    }
    wrap.addEventListener('keydown', onKeyDown)
    return () => wrap.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  function changeDate(value: string) {
    if (value === '') return setError('')
    const result = resolveJump(value, today)
    if (result.ok) {
      setError('')
      return onJumpDate(result.date, result.month)
    }
    const period = periodText(today)
    setError(
      {
        invalid: `Data inválida. Use uma data ${period}.`,
        future: `Esta data ainda não chegou. Use uma data ${period}.`,
        'too-old': `Só há datas ${period}.`,
      }[result.reason],
    )
  }

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        ref={buttonRef}
        type="button"
        className={`${buttonClass({ variant: 'icon' })} ${styles.button}`}
        aria-label="Ir para uma data"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      </button>
      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="group"
          aria-label="Ir para uma data"
          className={styles.panel}
        >
          <div className={styles.fields}>
            <label htmlFor={monthId} className={styles.field}>
              Mês
              <select
                ref={monthRef}
                id={monthId}
                className={styles.control}
                value={monthKey(month)}
                onChange={(event) => {
                  const option = options.find((item) => item.value === event.target.value)
                  if (!option) return
                  setError('')
                  onJumpMonth({ year: option.year, month: option.month })
                }}
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor={dateId} className={styles.field}>
              Data
              <input
                id={dateId}
                type="date"
                className={styles.control}
                min={toIsoDate(first.year, first.month, 1)}
                max={today}
                aria-invalid={error !== ''}
                onChange={(event) => changeDate(event.target.value)}
              />
            </label>
          </div>
          <p role="alert" className={styles.error}>
            {error}
          </p>
        </div>
      ) : null}
    </div>
  )
}
