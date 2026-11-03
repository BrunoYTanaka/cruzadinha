import { puzzleSourceNames, type AdminSource, type PuzzleSourceId } from '@cruzadinha/shared'
import { useState } from 'react'
import { Button } from '../../../../shared/components/Button/Button'
import { ErrorState } from '../../../../shared/components/ErrorState/ErrorState'
import { LoadingState } from '../../../../shared/components/LoadingState/LoadingState'
import { Notice } from '../../../../shared/components/Notice/Notice'
import { VisuallyHidden } from '../../../../shared/components/VisuallyHidden/VisuallyHidden'
import { ApiRequestError } from '../../../../shared/services/api/client/client'
import { useAdminSources } from '../../hooks/useAdminSources/useAdminSources'
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

  function move(index: number, by: -1 | 1) {
    const target = index + by
    const row = rows[index]
    if (row === undefined || target < 0 || target >= rows.length) return
    const next = [...rows]
    next.splice(index, 1)
    next.splice(target, 0, row)
    change(next, `${puzzleSourceNames[row.id]} agora na posição ${target + 1} de ${rows.length}.`)
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
        A ordem vale para as abas do calendário e para os cartões de "Hoje"; a primeira fonte
        visível abre por padrão. Uma fonte escondida some das listas para todos, mas guarda tudo e
        pode voltar.
      </p>
      <ol className={styles.list}>
        {rows.map((row, index) => {
          const name = puzzleSourceNames[row.id]
          return (
            <li key={row.id} className={styles.row}>
              <span className={styles.position} aria-hidden="true">
                {index + 1}
              </span>
              <label className={styles.visible}>
                <input
                  type="checkbox"
                  checked={row.visible}
                  onChange={(event) => toggle(index, event.target.checked)}
                />
                <span className={styles.name}>{name}</span>
                <VisuallyHidden>{row.visible ? ' (visível)' : ' (escondida)'}</VisuallyHidden>
                <span aria-hidden="true" className={styles.state}>
                  {row.visible ? 'Visível' : 'Escondida'}
                </span>
              </label>
              <span className={styles.moves}>
                <Button
                  variant="icon"
                  aria-label={`Subir ${name}`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </Button>
                <Button
                  variant="icon"
                  aria-label={`Descer ${name}`}
                  disabled={index === rows.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </Button>
              </span>
            </li>
          )
        })}
      </ol>
      <div className={styles.actions}>
        <Button
          variant="primary"
          pending={save.isPending}
          disabled={!dirty}
          onClick={() => void onSave()}
        >
          Salvar
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
