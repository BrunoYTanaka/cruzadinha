import {
  difficultyLabels,
  GENERATED_GRID_SIZE_MAX,
  GENERATED_GRID_SIZE_MIN,
  GENERATION_DAILY_CALLS,
  puzzleSourceNames,
  type Difficulty,
  type GeneratedSourceView,
} from '@cruzadinha/shared'
import { useEffect, useId, useRef, useState } from 'react'
import { Button, buttonClass } from '../../../../shared/components/Button/Button'
import { Dialog } from '../../../../shared/components/Dialog/Dialog'
import { Notice } from '../../../../shared/components/Notice/Notice'
import { ApiRequestError } from '../../../../shared/services/api/client/client'
import { useGeneratedSources } from '../../hooks/useGeneratedSources/useGeneratedSources'
import styles from './GeneratedSourcesAdmin.module.css'

const DIFFICULTIES = Object.keys(difficultyLabels) as Difficulty[]
const BLOCKED_TEXT = {
  progress: 'Uma conta já começou esta cruzada.',
  duel: 'Um x1 usa esta cruzada.',
} as const
const COLLECT_COMMAND = 'gh workflow run collect.yml'

type Result = { variant: 'ok' | 'info' | 'error'; text: string; command?: boolean }
type Word = NonNullable<GeneratedSourceView['today']>['words'][number]

function failureText(error: unknown): string {
  if (error instanceof ApiRequestError && error.code === 'in-use') {
    return 'A cruzada passou a ser usada por uma conta ou um x1. Nada foi descartado.'
  }
  if (error instanceof ApiRequestError && error.isOffline) {
    return 'Sem conexão. Nada foi alterado; tente de novo.'
  }
  return 'Não foi possível concluir agora. Nada foi alterado; tente de novo.'
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function WordsTable({ title, words }: { title: string; words: readonly Word[] }) {
  return (
    <table className={styles.table}>
      <caption className={styles.caption}>{title}</caption>
      <thead>
        <tr>
          <th scope="col">Nº</th>
          <th scope="col">Resposta</th>
          <th scope="col">Dica</th>
        </tr>
      </thead>
      <tbody>
        {words.map((word) => (
          <tr key={`${word.direction}-${word.number}`}>
            <td>{word.number}</td>
            <td>{word.answer}</td>
            <td>{word.clue}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// O comando para gerar agora, num campo só de leitura com Copiar (padrão "Código e link").
function CommandCopy() {
  const [copied, setCopied] = useState('')
  return (
    <>
      <div className={styles.copyRow}>
        <input
          className={styles.command}
          readOnly
          value={COLLECT_COMMAND}
          aria-label="Comando para gerar agora"
          onFocus={(event) => event.currentTarget.select()}
        />
        <Button
          variant="secondary"
          onClick={() =>
            void copy(COLLECT_COMMAND).then((ok) =>
              setCopied(ok ? 'Comando copiado.' : 'Não foi possível copiar. Selecione o comando.'),
            )
          }
        >
          Copiar
        </Button>
      </div>
      <p role="status" className={styles.hint}>
        {copied}
      </p>
    </>
  )
}

// Aba de uma fonte gerada (features 064 e 066): configuração, cruzada de hoje e descarte. Só a
// página `/admin` monta, e só para admin. O jogador nunca vê nada daqui (064, FR-012).
export function GeneratedSourcePanel({ view }: { view: GeneratedSourceView }) {
  const { save, discard } = useGeneratedSources()
  const [size, setSize] = useState(view.gridSize)
  const [difficulty, setDifficulty] = useState<Difficulty>(view.difficulty)
  const [saveResult, setSaveResult] = useState<Result | null>(null)
  const [discardResult, setDiscardResult] = useState<Result | null>(null)
  const [confirming, setConfirming] = useState(false)
  const discardRef = useRef<HTMLDivElement>(null)
  const baseId = useId()
  const name = puzzleSourceNames[view.source]
  const dirty = size !== view.gridSize || difficulty !== view.difficulty
  const today = view.today

  // O botão "Descartar" some com a cruzada: o foco vai para o resultado, não para o início da página.
  useEffect(() => {
    if (discardResult) discardRef.current?.focus()
  }, [discardResult])

  function changeSize(next: number) {
    setSize(next)
    setSaveResult(null)
  }

  async function onSave() {
    setSaveResult(null)
    try {
      await save.mutateAsync({ source: view.source, gridSize: size, difficulty })
      setSaveResult({ variant: 'ok', text: 'Salvo. Vale a partir da próxima cruzada gerada.' })
    } catch (error) {
      setSaveResult({ variant: 'error', text: failureText(error) })
    }
  }

  async function onDiscard() {
    setConfirming(false)
    if (!today) return
    setDiscardResult(null)
    try {
      await discard.mutateAsync({ source: view.source, puzzleId: today.puzzleId })
      setDiscardResult(
        view.callsLeft > 0
          ? {
              variant: 'info',
              text: 'Cruzada descartada. A próxima coleta gera outra. Para gerar agora:',
              command: true,
            }
          : {
              variant: 'info',
              text: 'Cruzada descartada. As chamadas de hoje acabaram: o dia ficará sem cruzada.',
            },
      )
    } catch (error) {
      setDiscardResult({ variant: 'error', text: failureText(error) })
    }
  }

  const calls = (
    <div className={styles.card}>
      <dt>Chamadas restantes</dt>
      <dd>
        {view.callsLeft} de {GENERATION_DAILY_CALLS}
      </dd>
    </div>
  )

  return (
    <>
      <h2 className={styles.title}>{name}</h2>
      <p className={styles.lead}>Fonte gerada. O jogador vê só o nome da fonte e a dificuldade.</p>

      <section className={styles.section} aria-labelledby={`${baseId}-config`}>
        <h3 id={`${baseId}-config`} className={styles.heading}>
          Configuração
        </h3>
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault()
            void onSave()
          }}
        >
          <div className={styles.sizeRow} role="group" aria-labelledby={`${baseId}-size`}>
            <span>
              <span id={`${baseId}-size`} className={styles.label}>
                Tamanho da grade
              </span>
              <span className={styles.hint}>
                {GENERATED_GRID_SIZE_MIN} a {GENERATED_GRID_SIZE_MAX}, quadrada (N × N)
              </span>
            </span>
            <span className={styles.stepper}>
              <button
                type="button"
                className={`${buttonClass()} ${styles.step}`}
                aria-label="Diminuir a grade"
                disabled={size <= GENERATED_GRID_SIZE_MIN}
                onClick={() => changeSize(size - 1)}
              >
                −
              </button>
              <output className={styles.value} aria-live="polite">
                {size} × {size}
              </output>
              <button
                type="button"
                className={`${buttonClass()} ${styles.step}`}
                aria-label="Aumentar a grade"
                disabled={size >= GENERATED_GRID_SIZE_MAX}
                onClick={() => changeSize(size + 1)}
              >
                +
              </button>
            </span>
          </div>
          <fieldset className={styles.options}>
            <legend className={styles.label}>Dificuldade</legend>
            {DIFFICULTIES.map((value) => (
              <label key={value} className={styles.option}>
                <input
                  type="radio"
                  name={`${baseId}-difficulty`}
                  checked={difficulty === value}
                  onChange={() => {
                    setDifficulty(value)
                    setSaveResult(null)
                  }}
                />
                {difficultyLabels[value]}
              </label>
            ))}
          </fieldset>
          {/* O aviso entra ao lado dos botões, na mesma linha: não reserva espaço vazio. */}
          <div className={styles.actions}>
            <Button type="submit" variant="primary" pending={save.isPending} disabled={!dirty}>
              Salvar configuração
            </Button>
            {dirty ? (
              <Button
                variant="secondary"
                disabled={save.isPending}
                onClick={() => {
                  setSize(view.gridSize)
                  setDifficulty(view.difficulty)
                  setSaveResult(null)
                }}
              >
                Descartar alterações
              </Button>
            ) : null}
            {saveResult ? (
              <div className={styles.result}>
                <Notice variant={saveResult.variant}>{saveResult.text}</Notice>
              </div>
            ) : null}
          </div>
        </form>
      </section>

      <section className={styles.section} aria-labelledby={`${baseId}-today`}>
        <h3 id={`${baseId}-today`} className={styles.heading}>
          Cruzada de hoje
        </h3>
        {today ? (
          <>
            <dl className={styles.cards}>
              <div className={styles.card}>
                <dt>Grade</dt>
                <dd>
                  {today.size} × {today.size}
                </dd>
              </div>
              <div className={styles.card}>
                <dt>Dificuldade</dt>
                {/* Ausente numa API anterior à 066, ou nula quando o título não diz. */}
                <dd>{today.difficulty ? difficultyLabels[today.difficulty] : '—'}</dd>
              </div>
              <div className={styles.card}>
                <dt>Palavras</dt>
                <dd>{today.words.length}</dd>
              </div>
              {calls}
            </dl>
            <div className={styles.words}>
              <WordsTable
                title="Horizontais"
                words={today.words.filter((word) => word.direction === 'across')}
              />
              <WordsTable
                title="Verticais"
                words={today.words.filter((word) => word.direction === 'down')}
              />
            </div>
            <div className={styles.danger}>
              <h3 className={styles.dangerTitle}>Descartar a cruzada de hoje</h3>
              <p className={styles.hint}>
                Ela sai do site para todos.{' '}
                {view.callsLeft > 0
                  ? 'A próxima coleta gera outra.'
                  : 'As chamadas de hoje acabaram: o dia ficará sem cruzada.'}
              </p>
              {today.blockedBy ? (
                <span className={styles.chip}>
                  <span aria-hidden="true">!</span>
                  {BLOCKED_TEXT[today.blockedBy]}
                </span>
              ) : null}
              <div>
                <Button
                  variant="secondary"
                  disabled={!today.discardable}
                  pending={discard.isPending}
                  onClick={() => setConfirming(true)}
                >
                  Descartar
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <dl className={styles.cards}>{calls}</dl>
            <p className={styles.hint}>Sem cruzada hoje.</p>
          </>
        )}
        {discardResult ? (
          <div ref={discardRef} tabIndex={-1} className={styles.discardResult}>
            <Notice variant={discardResult.variant}>{discardResult.text}</Notice>
            {discardResult.command ? <CommandCopy /> : null}
          </div>
        ) : null}
      </section>

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
    </>
  )
}
