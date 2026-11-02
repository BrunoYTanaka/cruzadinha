import { useMutation, useQueryClient } from '@tanstack/react-query'
import { puzzleSourceNames, type CreateDuelResponse, type HelpMode } from '@cruzadinha/shared'
import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../../../shared/components/Button/Button'
import { Field } from '../../../../shared/components/Field/Field'
import { ApiRequestError } from '../../../../shared/services/api/client/client'
import { formatWait } from '../../../../shared/helpers/time/time'
import { DayPicker, type DayPick } from '../../../library'
import { createDuel, isDuelUnavailable } from '../../services/duel-api'
import { loadNickname, saveNickname } from '../../services/duel-nickname'
import { duelTokens } from '../../services/duel-tokens'
import styles from './CreateForm.module.css'

const PENALTIES = [10, 30, 60]
const MAX_TIMES = [
  { value: 0, label: 'Sem limite' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '60 min' },
]
const DEADLINES = [
  { value: 1, label: '1 hora' },
  { value: 24, label: '24 horas' },
  { value: 168, label: '7 dias' },
]

function errorText(error: unknown): string {
  if (isDuelUnavailable(error)) return 'O x1 não está disponível agora. Tente mais tarde.'
  if (error instanceof ApiRequestError) {
    if (error.code === 'open-limit') {
      return 'Você já tem x1 abertos demais. Termine ou cancele algum antes de criar outro.'
    }
    if (error.status === 429) {
      const wait = error.retryAfterSeconds
        ? ` Tente de novo em ${formatWait(error.retryAfterSeconds)}.`
        : ''
      return `Muitos x1 criados em pouco tempo.${wait}`
    }
    if (error.isOffline) return 'Sem conexão. Confira a rede e tente de novo.'
  }
  return 'Não foi possível criar o x1. Tente de novo.'
}

type Props = { onCreated: (created: CreateDuelResponse) => void }

export function CreateForm({ onCreated }: Props) {
  const queryClient = useQueryClient()
  const baseId = useId()
  const [pick, setPick] = useState<DayPick | null>(null)
  const [nickname, setNickname] = useState(loadNickname)
  const [helpMode, setHelpMode] = useState<HelpMode>('free')
  const [penaltySeconds, setPenaltySeconds] = useState(30)
  const [maxMinutes, setMaxMinutes] = useState(30)
  const [deadlineHours, setDeadlineHours] = useState(24)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: createDuel,
    onSuccess: async (created) => {
      saveNickname(nickname)
      if (created.participantToken) {
        await duelTokens.save(created.linkToken, created.participantToken)
      }
      void queryClient.invalidateQueries({ queryKey: ['duel-tokens'] })
      void queryClient.invalidateQueries({ queryKey: ['my-duels'] })
      onCreated(created)
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!pick) {
      setFieldError('Escolha no calendário uma cruzada já guardada.')
      return
    }
    if (nickname.trim() === '') {
      setFieldError('Informe o seu apelido.')
      return
    }
    setFieldError(null)
    create.mutate({
      puzzleId: pick.puzzleId,
      nickname: nickname.trim(),
      rules: {
        helpMode,
        helpPenaltyMs: helpMode === 'penalty' ? penaltySeconds * 1000 : null,
        maxMs: maxMinutes === 0 ? null : maxMinutes * 60_000,
        startDeadlineHours: deadlineHours as 1 | 24 | 168,
      },
    })
  }

  const message = fieldError ?? (create.isError ? errorText(create.error) : null)

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <section aria-labelledby={`${baseId}-pick`}>
        <h2 id={`${baseId}-pick`} className={styles.legend}>
          1. Escolha a cruzada
        </h2>
        <DayPicker selectedId={pick?.puzzleId ?? null} onSelect={setPick} />
        <p className={styles.picked} role="status">
          {pick
            ? `Escolhida: ${puzzleSourceNames[pick.source]}, ${pick.date.split('-').reverse().join('/')}.`
            : 'Nenhuma cruzada escolhida. Só dias já guardados podem ser escolhidos.'}
        </p>
      </section>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>2. Ajudas</legend>
        <div className={styles.options}>
          {(
            [
              ['free', 'Livres'],
              ['forbidden', 'Proibidas'],
              ['penalty', 'Com penalidade'],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={styles.option}>
              <input
                type="radio"
                name={`${baseId}-help`}
                checked={helpMode === value}
                onChange={() => setHelpMode(value)}
              />
              {label}
            </label>
          ))}
        </div>
        {helpMode === 'penalty' ? (
          <div className={styles.options} role="group" aria-label="Segundos por ajuda">
            {PENALTIES.map((seconds) => (
              <label key={seconds} className={styles.option}>
                <input
                  type="radio"
                  name={`${baseId}-penalty`}
                  checked={penaltySeconds === seconds}
                  onChange={() => setPenaltySeconds(seconds)}
                />
                +{seconds} s por ajuda
              </label>
            ))}
          </div>
        ) : null}
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>3. Tempo máximo da partida</legend>
        <div className={styles.options}>
          {MAX_TIMES.map(({ value, label }) => (
            <label key={value} className={styles.option}>
              <input
                type="radio"
                name={`${baseId}-max`}
                checked={maxMinutes === value}
                onChange={() => setMaxMinutes(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>4. Prazo para o oponente começar</legend>
        <div className={styles.options}>
          {DEADLINES.map(({ value, label }) => (
            <label key={value} className={styles.option}>
              <input
                type="radio"
                name={`${baseId}-deadline`}
                checked={deadlineHours === value}
                onChange={() => setDeadlineHours(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label="5. Seu apelido"
        hint="Aparece para o seu oponente. De 1 a 24 caracteres."
        value={nickname}
        maxLength={24}
        autoComplete="nickname"
        onChange={(event) => setNickname(event.target.value)}
      />

      {message ? (
        <p className={styles.error} role="alert">
          {message}
        </p>
      ) : null}
      <Button type="submit" variant="primary" disabled={create.isPending}>
        {create.isPending ? 'Criando…' : 'Criar x1'}
      </Button>
    </form>
  )
}
