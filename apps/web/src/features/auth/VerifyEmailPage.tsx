import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { verifyEmail } from '../../api/auth'
import { ApiRequestError } from '../../api/client'
import { Button, buttonClass } from '../../components/Button'
import { Field } from '../../components/Field'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import styles from './AuthPage.module.css'
import { authMessages, emailRequestErrorMessage, invalidFields } from './messages'
import { useFragmentToken } from './token-fragment'

const MIN_PASSWORD = 8

// O link do e-mail abre esta tela; a senha é escolhida aqui, por quem tem o link, e só então a
// conta é criada (feature 035). Ninguém consegue escolher a senha de um e-mail que não é seu.
export function VerifyEmailPage() {
  const token = useFragmentToken('/verificar-email')
  const mutation = useMutation({ mutationFn: verifyEmail })
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [expired, setExpired] = useState(false)

  const invalid = token === undefined || expired
  const title = done ? 'Conta criada' : invalid ? 'Este link não vale mais' : 'Escolha sua senha'
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
              Pronto, seu e-mail foi confirmado e a conta foi criada. Agora é só entrar.
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
            <Link to="/cadastro" className={buttonClass({ variant: 'primary', block: true })}>
              Criar conta de novo
            </Link>
          </>
        ) : (
          <>
            <p className={styles.lead}>
              Seu e-mail foi reconhecido. Escolha a senha para ativar a conta.
            </p>
            {error ? (
              <div role="alert" className={styles.alert}>
                {error}
              </div>
            ) : null}
            <form onSubmit={onSubmit} noValidate className={styles.form}>
              <Field
                label="Senha"
                type="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                hint={authMessages.passwordHint}
                error={fields.includes('password') ? 'Confira este campo.' : undefined}
              />
              <Field
                label="Repita a senha"
                type="password"
                name="confirmation"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                error={fields.includes('confirmation') ? 'Confira este campo.' : undefined}
              />
              <Button type="submit" variant="primary" block disabled={mutation.isPending}>
                {mutation.isPending ? 'Criando…' : 'Criar conta'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
