import { puzzleSourceNames, type AdminSource, type PuzzleSourceId } from '@cruzadinha/shared'
import { DragDropProvider } from '@dnd-kit/react'
import { Accessibility, PointerActivationConstraints, PointerSensor } from '@dnd-kit/dom'
import { move } from '@dnd-kit/helpers'
import { useId, useState, type KeyboardEvent } from 'react'
import { Button } from '../../../../shared/components/Button/Button'
import { ErrorState } from '../../../../shared/components/ErrorState/ErrorState'
import { LoadingState } from '../../../../shared/components/LoadingState/LoadingState'
import { Notice } from '../../../../shared/components/Notice/Notice'
import { VisuallyHidden } from '../../../../shared/components/VisuallyHidden/VisuallyHidden'
import { ApiRequestError } from '../../../../shared/services/api/client/client'
import { useAdminSources } from '../../hooks/useAdminSources/useAdminSources'
import {
  announceCanceled,
  announceDropped,
  announceGrabbed,
  announceMoved,
  moveBy,
  SORT_INSTRUCTIONS,
} from '../../helpers/sortable-announcements/sortable-announcements'
import { SortableRow } from '../SortableRow/SortableRow'
import styles from './SourcesAdmin.module.css'

type Row = { id: PuzzleSourceId; visible: boolean }

function rowsOf(sources: readonly AdminSource[]): Row[] {
  return sources.map(({ id, visible }) => ({ id, visible }))
}

function sameRows(a: readonly Row[], b: readonly Row[]): boolean {
  return (
    a.length === b.length &&
    a.every((row, i) => row.id === b[i]?.id && row.visible === b[i].visible)
  )
}

// Ponteiro: mouse e caneta começam pela alça; no toque, ao mexer 5 px (sem espera). Sem a
// Accessibility do dnd-kit: o teclado e os anúncios são os daqui (WCAG 2.5.7).
const SENSORS = [
  PointerSensor.configure({
    activationConstraints: (event) =>
      event.pointerType === 'touch'
        ? [new PointerActivationConstraints.Distance({ value: 5 })]
        : undefined,
  }),
]

function failureText(error: unknown): string {
  if (error instanceof ApiRequestError && error.code === 'no-visible-source') {
    return 'Pelo menos uma fonte precisa ficar visível. Nada foi alterado.'
  }
  if (error instanceof ApiRequestError && error.isOffline) {
    return 'Sem conexão. Nada foi alterado; tente de novo.'
  }
  return 'Não foi possível salvar agora. Nada foi alterado; tente de novo.'
}

// Edição da visibilidade e da ordem das fontes (feature 060). Só a página `/admin` a monta, e só
// para admin. Os avisos ficam num espaço de altura fixa: salvar não desloca o layout (FR-017).
export function SourcesAdmin() {
  const { query, save } = useAdminSources()
  // `null`: sem edição em curso, vale o que o servidor tem.
  const [draft, setDraft] = useState<Row[] | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  // Linha pega (por teclado ou ponteiro) e a ordem de antes, para o Esc e o arraste cancelado.
  const [grabbed, setGrabbed] = useState<PuzzleSourceId | null>(null)
  const [origin, setOrigin] = useState<Row[] | null>(null)
  const hintId = useId()

  if (query.isPending) return <LoadingState screen="library" level={2} />
  if (query.isError) {
    return (
      <ErrorState
        level={2}
        message="Não foi possível carregar a configuração agora."
        onRetry={() => void query.refetch()}
      />
    )
  }

  const saved = rowsOf(query.data)
  const rows = draft ?? saved
  const dirty = !sameRows(rows, saved)

  function change(next: Row[], message?: string) {
    setDraft(next)
    setResult(null)
    if (message) setAnnouncement(message)
  }

  function nameOf(id: PuzzleSourceId) {
    return puzzleSourceNames[id]
  }

  function release() {
    setGrabbed(null)
    setOrigin(null)
  }

  function cancelMove() {
    if (grabbed === null || origin === null) return
    change(
      origin,
      announceCanceled(
        nameOf(grabbed),
        origin.findIndex((r) => r.id === grabbed) + 1,
        origin.length,
      ),
    )
    release()
  }

  function onHandleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    id: PuzzleSourceId,
    index: number,
  ) {
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault()
      if (grabbed === id) {
        setAnnouncement(announceDropped(nameOf(id), index + 1, rows.length))
        release()
      } else {
        setGrabbed(id)
        setOrigin(rows)
        setAnnouncement(announceGrabbed(nameOf(id), index + 1, rows.length))
      }
      return
    }
    if (grabbed !== id) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      cancelMove()
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      const by = event.key === 'ArrowUp' ? -1 : 1
      const target = index + by
      if (target < 0 || target >= rows.length) return
      change(moveBy(rows, index, by), announceMoved(nameOf(id), target + 1, rows.length))
    }
  }

  function toggle(index: number, visible: boolean) {
    change(rows.map((row, i) => (i === index ? { ...row, visible } : row)))
  }

  async function onSave() {
    setResult(null)
    try {
      const sources = await save.mutateAsync({ sources: rows })
      setDraft(null)
      setResult({
        ok: true,
        text: `Salvo. ${sources.filter((s) => s.visible).length} de ${sources.length} fontes visíveis para todos.`,
      })
    } catch (failure) {
      setResult({ ok: false, text: failureText(failure) })
    }
  }

  return (
    <div className={styles.admin}>
      <p className={styles.lead}>
        A ordem vale para as abas do calendário; a primeira fonte visível abre por padrão. Uma fonte
        escondida some das listas para todos, mas guarda tudo e pode voltar. Arraste pela alça para
        reordenar.
      </p>
      <VisuallyHidden>
        <span id={hintId}>{SORT_INSTRUCTIONS}</span>
      </VisuallyHidden>
      <DragDropProvider
        sensors={SENSORS}
        plugins={(defaults) => defaults.filter((plugin) => plugin !== Accessibility)}
        onDragStart={() => setOrigin(rows)}
        onDragOver={(event) => setDraft((current) => move(current ?? saved, event))}
        onDragEnd={(event) => {
          if (event.canceled && origin) {
            change(origin)
          } else {
            const id = event.operation.source?.id
            const position = rows.findIndex((row) => row.id === id) + 1
            if (typeof id === 'string' && position > 0) {
              setAnnouncement(announceDropped(nameOf(id as PuzzleSourceId), position, rows.length))
            }
          }
          setOrigin(null)
        }}
      >
        <ol className={styles.list}>
          {rows.map((row, index) => (
            <SortableRow
              key={row.id}
              id={row.id}
              index={index}
              name={nameOf(row.id)}
              describedBy={hintId}
              grabbed={grabbed === row.id}
              onKeyDown={(event) => onHandleKeyDown(event, row.id, index)}
              onBlur={() => {
                if (grabbed === row.id) cancelMove()
              }}
            >
              <label className={styles.visible}>
                <input
                  type="checkbox"
                  checked={row.visible}
                  onChange={(event) => toggle(index, event.target.checked)}
                />
                <span className={styles.name}>{nameOf(row.id)}</span>
                <VisuallyHidden>{row.visible ? ' (visível)' : ' (escondida)'}</VisuallyHidden>
                <span aria-hidden="true" className={styles.state}>
                  {row.visible ? 'Visível' : 'Escondida'}
                </span>
              </label>
            </SortableRow>
          ))}
        </ol>
      </DragDropProvider>
      <div className={styles.actions}>
        <Button
          variant="primary"
          pending={save.isPending}
          disabled={!dirty}
          onClick={() => void onSave()}
          aria-label="Salvar"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
        {dirty ? (
          <Button variant="quiet" disabled={save.isPending} onClick={() => change(saved)}>
            Descartar alterações
          </Button>
        ) : null}
      </div>
      <div className={styles.status}>
        {result ? <Notice variant={result.ok ? 'info' : 'error'}>{result.text}</Notice> : null}
      </div>
      <p className={styles.live} role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  )
}
