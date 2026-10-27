import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../../shared/components/Button/Button'
import { Field } from '../../../../shared/components/Field/Field'
import { Notice } from '../../../../shared/components/Notice/Notice'
import { changePassword } from '../../../../shared/services/api/account/account'
import { authMessages, invalidFields } from '../../../session'
import { accountErrorMessage, accountMessages, isWrongPassword } from '../../helpers/messages'
import { AccountSection, sectionStyles } from '../AccountSection/AccountSection'

export function ChangePasswordForm() {
  const mutation = useMutation({ mutationFn: changePassword })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [fields, setFields] = useState<string[]>([])
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!currentPassword || !newPassword) {
      setResult({ ok: false, text: authMessages.fillAll })
      setFields(
        [!currentPassword ? 'currentPassword' : '', !newPassword ? 'newPassword' : ''].filter(
          Boolean,
        ),
      )
      return
    }
    setResult(null)
    setFields([])
    try {
      await mutation.mutateAsync({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setResult({ ok: true, text: 'Senha trocada. Os outros aparelhos saíram da conta.' })
    } catch (failure) {
      if (isWrongPassword(failure)) {
        setFields(['currentPassword'])
        return
      }
      setFields(invalidFields(failure))
      setResult({ ok: false, text: accountErrorMessage(failure) })
    }
  }

  return (
    <AccountSection
      title="Trocar a senha"
      status={result ? <Notice variant={result.ok ? 'info' : 'error'}>{result.text}</Notice> : null}
    >
      <form onSubmit={onSubmit} noValidate className={sectionStyles.form}>
        <Field
          label="Senha atual"
          type="password"
          name="currentPassword"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          error={fields.includes('currentPassword') ? accountMessages.wrongPassword : undefined}
        />
        <Field
          label="Nova senha"
          type="password"
          name="newPassword"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          hint={authMessages.passwordHint}
          error={fields.includes('newPassword') ? 'Confira este campo.' : undefined}
        />
        <Button type="submit" variant="primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando…' : 'Trocar senha'}
        </Button>
      </form>
    </AccountSection>
  )
}
