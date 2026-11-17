import {
  difficultyLabels,
  GENERATED_GRID_SIZE_MAX,
  GENERATED_GRID_SIZE_MIN,
  puzzleSourceNames,
  type Difficulty,
  type GeneratedSourceView,
} from '@cruzadinha/shared'
import { useId, useState } from 'react'
import { Button } from '../../../../shared/components/Button/Button'
import { Dialog } from '../../../../shared/components/Dialog/Dialog'
import { ErrorState } from '../../../../shared/components/ErrorState/ErrorState'
import { LoadingState } from '../../../../shared/components/LoadingState/LoadingState'
import { Notice } from '../../../../shared/components/Notice/Notice'
import { ApiRequestError } from '../../../../shared/services/api/client/client'
import { useGeneratedSources } from '../../hooks/useGeneratedSources/useGeneratedSources'
import styles from './GeneratedSourcesAdmin.module.css'

const DIFFICULTIES = Object.keys(difficultyLabels) as Difficulty[]
const BLOCKED_TEXT = {
  progress: 'Uma conta já começou esta cruzada.',
  duel: 'Um x1 usa esta cruzada.',
} as const

type Result = { variant: 'ok' | 'info' | 'error'; text: string }

function failureText(error: unknown): string {
  if (error instanceof ApiRequestError && error.code === 'in-use') {
    return 'A cruzada passou a ser usada por uma conta ou um x1. Nada foi descartado.'
  }
  if (error instanceof ApiRequestError && error.isOffline) {
    return 'Sem conexão. Nada foi alterado; tente de novo.'
  }
  return 'Não foi possível concluir agora. Nada foi alterado; tente de novo.'
}

function SourceBlock({ view }: { view: GeneratedSourceView }) {
  const { save, discard } = useGeneratedSources()
  const [size, setSize] = useState(String(view.gridSize))
  const [difficulty, setDifficulty] = useState<Difficulty>(view.difficulty)
  const [result, setResult] = useState<Result | null>(null)
  const [confirming, setConfirming] = useState(false)
  const baseId = useId()
  const name = puzzleSourceNames[view.source]
  const sizeNumber = Number(size)
  const validSize =
    Number.isInteger(sizeNumber) &&
    sizeNumber >= GENERATED_GRID_SIZE_MIN &&
    sizeNumber <= GENERATED_GRID_SIZE_MAX
  const dirty = sizeNumber !== view.gridSize || difficulty !== view.difficulty

  async function onSave() {
    setResult(null)
    try {
      await save.mutateAsync({ source: view.source, gridSize: sizeNumber, difficulty })
      setResult({ variant: 'ok', text: 'Salvo. Vale a partir da próxima cruzada gerada.' })
    } catch (error) {
      setResult({ variant: 'error', text: failureText(error) })
    }
  }

  async function onDiscard() {
    setConfirming(false)
    if (!view.today) return
    setResult(null)
    try {
      await discard.mutateAsync({ source: view.source, puzzleId: view.today.puzzleId })
      setResult({
        variant: 'info',
        text:
          view.callsLeft > 0
            ? 'Cruzada descartada. A próxima coleta gera outra; para gerar agora, rode ' +
              '`gh workflow run collect.yml`.'
            : 'Cruzada descartada. As chamadas de hoje acabaram: o dia ficará sem cruzada.',
      })
    } catch (error) {
      setResult({ variant: 'error', text: failureText(error) })
    }
  }

  const across = view.today?.words.filter((word) => word.direction === 'across') ?? []
  const down = view.today?.words.filter((word) => word.direction === 'down') ?? []

  return (
    <section className={styles.block} aria-labelledby={`${baseId}-name`}>
      <h3 id={`${baseId}-name`} className={styles.name}>
        {name}
      </h3>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          void onSave()
        }}
      >
        <label className={styles.field} htmlFor={`${baseId}-size`}>
          Tamanho da grade
          <span className={styles.hint}>
            {GENERATED_GRID_SIZE_MIN} a {GENERATED_GRID_SIZE_MAX}, quadrada (N x N)
          </span>
        </label>
        <input
          id={`${baseId}-size`}
          className={styles.size}
          type="number"
          inputMode="numeric"
          min={GENERATED_GRID_SIZE_MIN}
          max={GENERATED_GRID_SIZE_MAX}
          step={1}
          value={size}
          onChange={(event) => {
            setSize(event.target.value)
            setResult(null)
          }}
          aria-invalid={!validSize}
        />
        <fieldset className={styles.options}>
          <legend className={styles.legend}>Dificuldade</legend>
          {DIFFICULTIES.map((value) => (
            <label key={value} className={styles.option}>
              <input
                type="radio"
                name={`${baseId}-difficulty`}
                checked={difficulty === value}
                onChange={() => {
                  setDifficulty(value)
                  setResult(null)
                }}
              />
              {difficultyLabels[value]}
            </label>
          ))}
        </fieldset>
        <div>
          <Button
            type="submit"
            variant="primary"
            pending={save.isPending}
            disabled={!dirty || !validSize}
          >
            Salvar
          </Button>
        </div>
      </form>

      <h4 className={styles.today}>Cruzada de hoje</h4>
      <p className={styles.hint}>Chamadas restantes hoje: {view.callsLeft}</p>
      {view.today ? (
        <>
          <div className={styles.words}>
            {(
              [
                ['Horizontais', across],
                ['Verticais', down],
              ] as const
            ).map(([title, words]) => (
              <div key={title}>
                <h5 className={styles.direction}>{title}</h5>
                <ol className={styles.list}>
                  {words.map((word) => (
                    <li key={`${word.direction}-${word.number}`}>
                      <strong>
                        {word.number}. {word.answer}
                      </strong>{' '}
                      — {word.clue}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          <div className={styles.discard}>
            <Button
              variant="secondary"
              disabled={!view.today.discardable}
              pending={discard.isPending}
              onClick={() => setConfirming(true)}
            >
              Descartar cruzada de hoje
            </Button>
            {view.today.blockedBy ? (
              <p className={styles.hint}>{BLOCKED_TEXT[view.today.blockedBy]}</p>
            ) : null}
          </div>
        </>
      ) : (
        <p className={styles.hint}>Sem cruzada hoje.</p>
      )}
      <div className={styles.status}>
        {result ? <Notice variant={result.variant}>{result.text}</Notice> : null}
      </div>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Descartar a cruzada de hoje?"
        description={
          view.callsLeft > 0
            ? 'Ela sai do site. A próxima coleta gera outra.'
            : 'Ela sai do site e as chamadas de hoje acabaram: o dia ficará sem cruzada.'
        }
      >
        <div className={styles.dialogActions}>
          <Button
            size="small"
            variant="secondary"
            onClick={() => setConfirming(false)}
            data-autofocus
          >
            Cancelar
          </Button>
          <Button size="small" variant="primary" onClick={() => void onDiscard()}>
            Descartar
          </Button>
        </div>
      </Dialog>
    </section>
  )
}

// Fontes geradas (feature 064): tamanho e dificuldade, revisão e descarte da cruzada de hoje. Só a
// página `/admin` monta, e só para admin. O jogador nunca vê nada daqui (FR-012).
export function GeneratedSourcesAdmin() {
  const { query } = useGeneratedSources()
  if (query.isPending) return <LoadingState screen="library" level={2} />
  if (query.isError) {
    return (
      <ErrorState
        level={2}
        message="Não foi possível carregar as fontes geradas agora."
        onRetry={() => void query.refetch()}
      />
    )
  }
  return (
    <div className={styles.admin}>
      {query.data.map((view) => (
        <SourceBlock key={view.source} view={view} />
      ))}
    </div>
  )
}
