import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../../../shared/components/Button/Button'
import { Field } from '../../../../shared/components/Field/Field'
import { ApiRequestError } from '../../../../shared/services/api/client/client'
import { formatWait } from '../../../../shared/helpers/time/time'
import { parseJoinInput } from '../../helpers/parse-join-input'
import { isDuelUnavailable, lookupDuel } from '../../services/duel-api'
import styles from './JoinByCode.module.css'

const NOT_FOUND = 'Não encontramos um x1 aberto com esse código.'

// Entrar por código ou por link colado (feature 058). Só olha o duelo: nada muda até a pessoa clicar
// em "Começar". O mesmo texto vale para código inexistente e para duelo que não está aberto.
export function JoinByCode() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const input = parseJoinInput(text)
    if (!input) {
      setError(NOT_FOUND)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const found = await lookupDuel(input)
      void navigate(`/x1/${found.linkToken}`)
    } catch (caught) {
      if (isDuelUnavailable(caught)) setError('O x1 não está disponível agora. Tente mais tarde.')
      else if (caught instanceof ApiRequestError && caught.status === 429) {
        const wait = caught.retryAfterSeconds
          ? ` Tente de novo em ${formatWait(caught.retryAfterSeconds)}.`
          : ''
        setError(`Muitas tentativas.${wait}`)
      } else if (caught instanceof ApiRequestError && caught.isOffline) {
        setError('Sem conexão. Confira a rede e tente de novo.')
      } else setError(NOT_FOUND)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.field}>
        <Field
          label="Código ou link do x1"
          value={text}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          onChange={(event) => setText(event.target.value)}
        />
      </div>
      <Button type="submit" variant="primary" disabled={busy || text.trim() === ''}>
        {busy ? 'Procurando…' : 'Entrar'}
      </Button>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  )
}
