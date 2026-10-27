import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../../shared/components/Button/Button'
import { Field } from '../../../../shared/components/Field/Field'
import { Notice } from '../../../../shared/components/Notice/Notice'
import { changeEmail } from '../../../../shared/services/api/account/account'
import { ApiRequestError } from '../../../../shared/services/api/client/client'
import { formatWait } from '../../../../shared/helpers/time/time'
import { authMessages, invalidFields } from '../../../session'
import { useCountdown } from '../../hooks/useCountdown'
import { accountErrorMessage, accountMessages, isWrongPassword } from '../../helpers/messages'
import { AccountSection, sectionStyles } from '../AccountSection/AccountSection'

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const mutation = useMutation({ mutationFn: changeEmail })
  const countdown = useCountdown()
  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [fields, setFields] = useState<string[]>([])
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  const waiting = countdown.secondsLeft > 0

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (waiting || mutation.isPending) return
    const address = newEmail.trim().toLowerCase()
    if (!address || !currentPassword) {
      setResult({ ok: false, text: authMessages.fillAll })
      setFields(
        [!address ? 'newEmail' : '', !currentPassword ? 'currentPassword' : ''].filter(Boolean),
      )
      return
    }
    if (address === currentEmail.toLowerCase()) {
      setResult({ ok: false, text: accountMessages.sameEmail })
      setFields(['newEmail'])
      return
    }
    setResult(null)
    setFields([])
    try {
      const accepted = await mutation.mutateAsync({ currentPassword, newEmail: address })
      countdown.start(accepted.retryAfter)
      setCurrentPassword('')
      setResult({
        ok: true,
        text: `Enviamos um link para ${address}. Ele vale por 60 minutos. Até lá, continue entrando com o e-mail atual.`,
      })
    } catch (failure) {
      if (isWrongPassword(failure)) {
        setFields(['currentPassword'])
        return
      }
      if (
        failure instanceof ApiRequestError &&
        failure.status === 429 &&
        failure.retryAfterSeconds
      ) {
        countdown.start(failure.retryAfterSeconds)
      }
      setFields(invalidFields(failure))
      setResult({ ok: false, text: accountErrorMessage(failure) })
    }
  }

  return (
    <AccountSection
      title="Trocar o e-mail"
      lead="Enviamos um link ao novo endereço. O e-mail da conta só muda quando você abre o link."
      status={result ? <Notice variant={result.ok ? 'info' : 'error'}>{result.text}</Notice> : null}
    >
      <form onSubmit={onSubmit} noValidate className={sectionStyles.form}>
        <Field
          label="Novo e-mail"
          type="email"
          name="newEmail"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={newEmail}
          onChange={(event) => setNewEmail(event.target.value)}
          error={fields.includes('newEmail') ? 'Confira este campo.' : undefined}
        />
        <Field
          label="Senha atual"
          type="password"
          name="emailCurrentPassword"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          error={fields.includes('currentPassword') ? accountMessages.wrongPassword : undefined}
        />
        <Button type="submit" variant="secondary" disabled={mutation.isPending || waiting}>
          {waiting ? `Enviar link em ${formatWait(countdown.secondsLeft)}` : 'Enviar link'}
        </Button>
      </form>
    </AccountSection>
  )
}
