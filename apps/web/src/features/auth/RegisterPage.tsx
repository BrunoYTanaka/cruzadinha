import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import styles from './AuthPage.module.css'
import { ApiRequestError } from '../../api/client'
import { authMessages, invalidFields, registerErrorMessage } from './messages'
import { safeNext } from './redirect'
import { useRegistration } from './useRegistration'
import { useRegisterMutation, useSessionQuery } from './useSession'

const MIN_PASSWORD = 8

export function RegisterPage() {
  useDocumentTitle('Criar conta')
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const session = useSessionQuery()
  const registration = useRegistration()
  const register = useRegisterMutation()
  // Uma aba antiga pode enviar com o cadastro já fechado: a recusa vira o mesmo aviso de fechado.
  const [closedByServer, setClosedByServer] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<string[]>([])

  if (session.data) return <Navigate to={next} replace />
  if (registration.isPending) return null
  if (!registration.isOpen || closedByServer) return <RegistrationClosed />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const missing = [!email.trim() ? 'email' : '', !password ? 'password' : ''].filter(Boolean)
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
      await register.mutateAsync({ email: email.trim(), password })
      void navigate(next, { replace: true })
    } catch (failure) {
      if (failure instanceof ApiRequestError && failure.code === 'registration-closed') {
        setClosedByServer(true)
        return
      }
      setError(registerErrorMessage(failure))
      setFields(invalidFields(failure))
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Criar conta</h1>
        <p className={styles.lead}>Com uma conta, seu progresso fica salvo em qualquer aparelho.</p>
        {error ? (
          <div role="alert" className={styles.alert}>
            {error}
          </div>
        ) : null}
        <form onSubmit={onSubmit} noValidate className={styles.form}>
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

function RegistrationClosed() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Criar conta</h1>
        <p role="status" className={styles.lead}>
          {authMessages.registrationClosed}
        </p>
        <p className={styles.alt}>
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
        <p className={styles.alt}>
          <Link to="/">Jogar sem entrar</Link>
        </p>
      </div>
    </div>
  )
}
