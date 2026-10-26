import { useMutation } from '@tanstack/react-query'
import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { register, resendVerification } from '../../../../shared/services/api/auth/auth'
import { ApiRequestError } from '../../../../shared/services/api/client/client'
import { Button } from '../../../../shared/components/Button/Button'
import { Field } from '../../../../shared/components/Field/Field'
import { useDocumentTitle } from '../../../../shared/hooks/useDocumentTitle/useDocumentTitle'
import styles from '../../../../shared/components/AuthPage.module.css'
import {
  authMessages,
  emailRequestErrorMessage,
  invalidFields,
  safeNext,
  useSessionQuery,
} from '../../../session'
import { ResendLink } from '../ResendLink/ResendLink'
import { useCountdown } from '../../hooks/useCountdown'
import { useRegistration } from '../../hooks/useRegistration'

export function RegisterForm() {
  useDocumentTitle('Criar conta')
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const session = useSessionQuery()
  const registration = useRegistration()
  const registerMutation = useMutation({ mutationFn: register })
  const resendMutation = useMutation({ mutationFn: resendVerification })
  const countdown = useCountdown()
  // Uma aba antiga pode enviar com o cadastro já fechado: a recusa vira o mesmo aviso de fechado.
  const [closedByServer, setClosedByServer] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<string[]>([])
  // E-mail para onde o link foi pedido; com ele a tela troca para "enviamos um link".
  const [sentTo, setSentTo] = useState<string | null>(null)
  const sentHeading = useRef<HTMLHeadingElement>(null)

  if (session.data) return <Navigate to={next} replace />
  if (registration.isPending) return null
  if (!registration.isOpen || closedByServer) return <RegistrationClosed />

  function failed(failure: unknown) {
    if (failure instanceof ApiRequestError && failure.code === 'registration-closed') {
      setClosedByServer(true)
      return
    }
    if (failure instanceof ApiRequestError && failure.retryAfterSeconds) {
      // 429 mostra a espera; 503 (e-mail indisponível) segura o botão sem dizer por quanto tempo.
      if (failure.status === 429) countdown.start(failure.retryAfterSeconds)
      if (failure.status === 503) countdown.start(failure.retryAfterSeconds, { hidden: true })
    }
    setError(emailRequestErrorMessage(failure))
    setFields(invalidFields(failure))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim()) {
      setError(authMessages.fillAll)
      setFields(['email'])
      return
    }
    setError(null)
    setFields([])
    try {
      const accepted = await registerMutation.mutateAsync({ email: email.trim() })
      countdown.start(accepted.retryAfter)
      setSentTo(email.trim().toLowerCase())
      // O foco vai ao título novo para o leitor de tela anunciar a troca de tela.
      setTimeout(() => sentHeading.current?.focus(), 0)
    } catch (failure) {
      failed(failure)
    }
  }

  async function onResend() {
    setError(null)
    try {
      const accepted = await resendMutation.mutateAsync({ email: sentTo ?? email.trim() })
      countdown.start(accepted.retryAfter)
    } catch (failure) {
      failed(failure)
    }
  }

  if (sentTo) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title} ref={sentHeading} tabIndex={-1}>
            Confira seu e-mail
          </h1>
          <div className={styles.sent}>
            <p className={styles.lead}>
              Enviamos um link para <span className={styles.email}>{sentTo}</span>. Abra-o para
              escolher a senha e ativar a conta.
            </p>
            <p className={styles.lead}>Não chegou? Veja a caixa de spam ou peça outro link.</p>
          </div>
          {error ? (
            <div role="alert" className={styles.alert}>
              {error}
            </div>
          ) : null}
          <ResendLink
            label="Reenviar link"
            countdown={countdown}
            onResend={() => void onResend()}
            pending={resendMutation.isPending}
          />
          <p className={styles.alt}>
            Já confirmou? <Link to="/login">Entrar</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Criar conta</h1>
        <p className={styles.lead}>
          Com uma conta, seu progresso fica salvo em qualquer aparelho. Informe seu e-mail e
          enviaremos um link para escolher a senha e ativar a conta.
        </p>
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
          <Button type="submit" variant="primary" block disabled={registerMutation.isPending}>
            {registerMutation.isPending ? 'Enviando…' : 'Criar conta'}
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
