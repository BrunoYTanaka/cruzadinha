import type { User } from '@cruzadinha/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { login, logout } from '../../../shared/services/api/auth'
import { queryKeys } from '../../../shared/services/api/query-keys'
import { Button } from '../../../shared/components/Button'
import { Dialog } from '../../../shared/components/Dialog'
import { Field } from '../../../shared/components/Field'
import styles from '../../../shared/components/AuthPage.module.css'
import { authMessages, loginErrorMessage } from '../helpers/messages'

type ReloginDialogProps = {
  open: boolean
  onClose: () => void
  // Conta da partida: o e-mail fica fixo para as letras guardadas nunca irem ao progresso de
  // outra pessoa. Sem ela (caso raro), o e-mail é editável.
  expectedUser: User | null
  // O diálogo não conhece a fila de salvamento: quem o usa decide o que fazer ao entrar.
  onSuccess: () => void
}

export function ReloginDialog({ open, onClose, expectedUser, onSuccess }: ReloginDialogProps) {
  const queryClient = useQueryClient()
  const [typedEmail, setTypedEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const email = expectedUser?.email ?? typedEmail

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError(authMessages.fillAll)
      return
    }
    setPending(true)
    setError(null)
    try {
      const response = await login({ email: email.trim(), password })
      if (expectedUser && response.user.id !== expectedUser.id) {
        // Outra conta: encerra essa sessão e mantém o jogo como estava.
        await logout().catch(() => undefined)
        setError(authMessages.wrongAccount)
        return
      }
      queryClient.setQueryData(queryKeys.session, response)
      setPassword('')
      onSuccess()
    } catch (failure) {
      setError(loginErrorMessage(failure))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Entrar de novo"
      description="Sua partida continua aqui. Entre para salvar o que você já fez."
    >
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
          readOnly={expectedUser !== null}
          value={email}
          onChange={(event) => setTypedEmail(event.target.value)}
        />
        <Field
          label="Senha"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          data-autofocus
        />
        <Button type="submit" variant="primary" block disabled={pending}>
          {pending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </Dialog>
  )
}
