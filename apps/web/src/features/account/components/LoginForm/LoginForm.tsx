import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import {
  clearExpired,
  authMessages,
  invalidFields,
  loginErrorMessage,
  safeNext,
  useLoginMutation,
  useSessionQuery,
} from '../../../session'
import { Button } from '../../../../shared/components/Button/Button'
import { Field } from '../../../../shared/components/Field/Field'
import { useDocumentTitle } from '../../../../shared/hooks/useDocumentTitle/useDocumentTitle'
import styles from '../../../../shared/components/AuthPage.module.css'
import { useRegistration } from '../../hooks/useRegistration'

export function LoginForm() {
  useDocumentTitle('Entrar')
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const session = useSessionQuery()
  const login = useLoginMutation()
  const registration = useRegistration()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<string[]>([])

  // Com sessão válida não há o que preencher.
  if (session.data) return <Navigate to={next} replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError(authMessages.fillAll)
      setFields([!email.trim() ? 'email' : '', !password ? 'password' : ''].filter(Boolean))
      return
    }
    setError(null)
    setFields([])
    try {
      await login.mutateAsync({ email: email.trim(), password })
      clearExpired()
      void navigate(next, { replace: true })
    } catch (failure) {
      setError(loginErrorMessage(failure))
      setFields(invalidFields(failure))
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Entrar</h1>
        <p className={styles.lead}>Continue de onde parou, em qualquer aparelho.</p>
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
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fields.includes('password') ? 'Confira este campo.' : undefined}
          />
          <Button type="submit" variant="primary" block disabled={login.isPending}>
            {login.isPending ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
        <p className={styles.alt}>
          <Link to="/esqueci-a-senha">Esqueci a senha</Link>
        </p>
        {registration.isOpen ? (
          <p className={styles.alt}>
            Ainda não tem conta?{' '}
            <Link to={next === '/' ? '/cadastro' : `/cadastro?next=${encodeURIComponent(next)}`}>
              Criar conta
            </Link>
          </p>
        ) : null}
        <p className={styles.alt}>
          <Link to="/">Jogar sem entrar</Link>
        </p>
      </div>
    </div>
  )
}
