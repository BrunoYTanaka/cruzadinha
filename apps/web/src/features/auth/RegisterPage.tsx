import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import styles from './AuthPage.module.css'
import { authMessages, invalidFields, registerErrorMessage } from './messages'
import { useRegisterMutation, useSessionQuery } from './useSession'

const MIN_PASSWORD = 8

export function RegisterPage() {
  useDocumentTitle('Criar conta')
  const navigate = useNavigate()
  const session = useSessionQuery()
  const register = useRegisterMutation()
  const [inviteCode, setInviteCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<string[]>([])

  if (session.data) return <Navigate to="/" replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const missing = [
      !inviteCode.trim() ? 'inviteCode' : '',
      !email.trim() ? 'email' : '',
      !password ? 'password' : '',
    ].filter(Boolean)
    if (missing.length > 0) {
      setError(authMessages.fillAll)
      setFields(missing)
      return
    }
    if (password.length < MIN_PASSWORD) {
      setError(authMessages.checkFields)
      setFields(['password'])
      return
    }
    setError(null)
    setFields([])
    try {
      await register.mutateAsync({ inviteCode: inviteCode.trim(), email: email.trim(), password })
      void navigate('/', { replace: true })
    } catch (failure) {
      setError(registerErrorMessage(failure))
      setFields(invalidFields(failure))
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Criar conta</h1>
        <p className={styles.lead}>O cadastro funciona só com um convite.</p>
        {error ? (
          <div role="alert" className={styles.alert}>
            {error}
          </div>
        ) : null}
        <form onSubmit={onSubmit} noValidate className={styles.form}>
          <Field
            label="Código do convite"
            name="inviteCode"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            hint="Peça a um amigo que já joga."
            error={fields.includes('inviteCode') ? 'Confira este campo.' : undefined}
          />
          <Field
            label="E-mail"
            type="email"
            name="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fields.includes('email') ? 'Confira este campo.' : undefined}
          />
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
          <Button type="submit" variant="primary" block disabled={register.isPending}>
            {register.isPending ? 'Criando…' : 'Criar conta'}
          </Button>
        </form>
        <p className={styles.alt}>
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
