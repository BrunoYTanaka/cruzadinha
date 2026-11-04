import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from '../../../../shared/components/Link/Link'
import { forgotPassword } from '../../../../shared/services/api/auth/auth'
import { ApiRequestError } from '../../../../shared/services/api/client/client'
import { Button } from '../../../../shared/components/Button/Button'
import { Field } from '../../../../shared/components/Field/Field'
import { useDocumentTitle } from '../../../../shared/hooks/useDocumentTitle/useDocumentTitle'
import { SlowSubmitNotice } from '../SlowSubmitNotice/SlowSubmitNotice'
import { AuthLayout } from '../../../../shared/components/AuthLayout/AuthLayout'
import styles from '../../../../shared/components/AuthPage.module.css'
import { authMessages, emailRequestErrorMessage, invalidFields } from '../../../session'
import { CaptchaField } from '../CaptchaField/CaptchaField'
import { ResendLink } from '../ResendLink/ResendLink'
import { useCaptcha } from '../../hooks/useCaptcha'
import { useCountdown } from '../../hooks/useCountdown'

export function ForgotPasswordForm() {
  useDocumentTitle('Esqueci a senha')
  const mutation = useMutation({ mutationFn: forgotPassword })
  const countdown = useCountdown()
  const captcha = useCaptcha()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<string[]>([])
  const [sent, setSent] = useState(false)

  async function request() {
    if (!captcha.ready) return
    if (!email.trim()) {
      setError(authMessages.fillAll)
      setFields(['email'])
      return
    }
    setError(null)
    setFields([])
    try {
      const captchaToken = captcha.consume()
      if (captcha.required && !captchaToken) return
      const accepted = await mutation.mutateAsync({ email: email.trim(), captchaToken })
      countdown.start(accepted.retryAfter)
      setSent(true)
    } catch (failure) {
      if (
        failure instanceof ApiRequestError &&
        failure.status === 429 &&
        failure.retryAfterSeconds
      ) {
        countdown.start(failure.retryAfterSeconds)
      }
      setError(emailRequestErrorMessage(failure))
      setFields(invalidFields(failure))
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void request()
  }

  return (
    <AuthLayout
      headline="Sem pânico. A gente resolve."
      lead="Informe o e-mail da conta e enviaremos um link para escolher uma senha nova."
      rows={['ESQUECI', 'A', 'senha']}
    >
      <div className={styles.card}>
        <h1 className={styles.title}>Esqueci a senha</h1>
        {sent ? (
          <p role="status" className={styles.lead}>
            Se <span className={styles.email}>{email.trim().toLowerCase()}</span> tem conta,
            enviamos um link para redefinir a senha. Ele vale por 1 hora.
          </p>
        ) : (
          <p className={styles.lead}>
            Informe o e-mail da conta e enviaremos um link para escolher uma senha nova.
          </p>
        )}
        {error ? (
          <div role="alert" className={styles.alert}>
            {error}
          </div>
        ) : null}
        {sent ? (
          <>
            <ResendLink
              label="Reenviar link"
              countdown={countdown}
              onResend={() => void request()}
              pending={mutation.isPending}
              blocked={!captcha.ready}
            />
            <CaptchaField captcha={captcha} action="forgot" />
          </>
        ) : (
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
            <CaptchaField captcha={captcha} action="forgot" />
            <Button
              type="submit"
              variant="primary"
              block
              pending={mutation.isPending}
              disabled={!captcha.ready}
            >
              {mutation.isPending ? 'Enviando…' : 'Enviar link'}
            </Button>
            <SlowSubmitNotice pending={mutation.isPending} />
          </form>
        )}
        <p className={styles.alt}>
          <Link to="/login">Voltar para entrar</Link>
        </p>
      </div>
    </AuthLayout>
  )
}
