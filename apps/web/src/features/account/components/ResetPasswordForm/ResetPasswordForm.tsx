import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { resetPassword } from '../../../../shared/services/api/auth'
import { queryKeys } from '../../../../shared/services/api/query-keys'
import { ApiRequestError } from '../../../../shared/services/api/client'
import { Button, buttonClass } from '../../../../shared/components/Button'
import { Field } from '../../../../shared/components/Field'
import { useDocumentTitle } from '../../../../shared/hooks/useDocumentTitle'
import styles from '../../../../shared/components/AuthPage.module.css'
import { authMessages, emailRequestErrorMessage, invalidFields } from '../../../session'
import { useFragmentToken } from '../../helpers/token-fragment'

const MIN_PASSWORD = 8

export function ResetPasswordForm() {
  const token = useFragmentToken('/redefinir-senha')
  const queryClient = useQueryClient()
  const mutation = useMutation({ mutationFn: resetPassword })
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [expired, setExpired] = useState(false)

  const invalid = token === undefined || expired
  const title = done ? 'Senha alterada' : invalid ? 'Este link não vale mais' : 'Nova senha'
  useDocumentTitle(title)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!token) return
    if (!password || !confirmation) {
      setError(authMessages.fillAll)
      setFields([!password ? 'password' : '', !confirmation ? 'confirmation' : ''].filter(Boolean))
      return
    }
    if (password.length < MIN_PASSWORD) {
      setError(authMessages.checkFields)
      setFields(['password'])
      return
    }
    if (password !== confirmation) {
      setError(authMessages.passwordsDiffer)
      setFields(['confirmation'])
      return
    }
    setError(null)
    setFields([])
    try {
      await mutation.mutateAsync({ token, password })
      // A API encerrou todas as sessões, inclusive a deste navegador: a pessoa passa a visitante.
      queryClient.setQueryData(queryKeys.session, null)
      setDone(true)
    } catch (failure) {
      if (failure instanceof ApiRequestError && failure.code === 'invalid-token') {
        setExpired(true)
        return
      }
      setError(emailRequestErrorMessage(failure))
      setFields(invalidFields(failure))
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        {done ? (
          <>
            <p role="status" className={styles.lead}>
              Senha alterada. Entre com a nova senha.
            </p>
            <Link to="/login" className={buttonClass({ variant: 'primary', block: true })}>
              Entrar
            </Link>
          </>
        ) : invalid ? (
          <>
            <p role="status" className={styles.lead}>
              O link venceu, já foi usado ou foi trocado por outro mais novo. Peça um novo link.
            </p>
            <Link
              to="/esqueci-a-senha"
              className={buttonClass({ variant: 'primary', block: true })}
            >
              Pedir novo link
            </Link>
          </>
        ) : (
          <>
            <p className={styles.lead}>Escolha uma senha nova para a sua conta.</p>
            {error ? (
              <div role="alert" className={styles.alert}>
                {error}
              </div>
            ) : null}
            <form onSubmit={onSubmit} noValidate className={styles.form}>
              <Field
                label="Nova senha"
                type="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                hint={authMessages.passwordHint}
                error={fields.includes('password') ? 'Confira este campo.' : undefined}
              />
              <Field
                label="Repita a nova senha"
                type="password"
                name="confirmation"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                error={fields.includes('confirmation') ? 'Confira este campo.' : undefined}
              />
              <Button type="submit" variant="primary" block disabled={mutation.isPending}>
                {mutation.isPending ? 'Salvando…' : 'Salvar senha'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
