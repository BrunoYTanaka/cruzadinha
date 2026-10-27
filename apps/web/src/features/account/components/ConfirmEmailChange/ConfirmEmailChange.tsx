import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { buttonClass } from '../../../../shared/components/Button/Button'
import { confirmEmailChange } from '../../../../shared/services/api/account/account'
import { queryKeys } from '../../../../shared/services/api/query-keys/query-keys'
import { useDocumentTitle } from '../../../../shared/hooks/useDocumentTitle/useDocumentTitle'
import styles from '../../../../shared/components/AuthPage.module.css'
import { emailRequestErrorMessage, useSessionQuery } from '../../../session'
import { ApiRequestError } from '../../../../shared/services/api/client/client'
import { useFragmentToken } from '../../helpers/token-fragment'

type State = 'sending' | 'done' | 'invalid' | 'failed'

// O link do e-mail abre esta tela e a troca é pedida na hora, sem clique (o link já é a prova de
// posse). Funciona sem sessão neste navegador (feature 042).
export function ConfirmEmailChange() {
  const token = useFragmentToken('/confirmar-email')
  const queryClient = useQueryClient()
  const session = useSessionQuery()
  const mutation = useMutation({ mutationFn: confirmEmailChange })
  const [state, setState] = useState<State>(token ? 'sending' : 'invalid')
  const [message, setMessage] = useState('')
  const sent = useRef(false)
  const { mutateAsync } = mutation

  useEffect(() => {
    // O StrictMode monta duas vezes; o link é de uso único, então só uma chamada sai.
    if (!token || sent.current) return
    sent.current = true
    mutateAsync({ token }).then(
      () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.session })
        setState('done')
      },
      (failure: unknown) => {
        if (failure instanceof ApiRequestError && failure.code === 'invalid-token') {
          setState('invalid')
          return
        }
        setMessage(emailRequestErrorMessage(failure))
        setState('failed')
      },
    )
  }, [token, mutateAsync, queryClient])

  const title =
    state === 'done'
      ? 'E-mail trocado'
      : state === 'sending'
        ? 'Confirmando…'
        : 'Este link não vale mais'
  useDocumentTitle(title)
  const signedIn = Boolean(session.data)

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        {state === 'sending' ? (
          <p role="status" className={styles.lead}>
            Confirmando seu novo e-mail…
          </p>
        ) : state === 'done' ? (
          <>
            <p role="status" className={styles.lead}>
              E-mail trocado. A partir de agora, entre com o novo e-mail.
            </p>
            <Link
              to={signedIn ? '/conta' : '/login'}
              className={buttonClass({ variant: 'primary', block: true })}
            >
              {signedIn ? 'Ir para sua conta' : 'Entrar'}
            </Link>
          </>
        ) : (
          <>
            <p role="status" className={styles.lead}>
              {state === 'failed'
                ? message
                : 'Link inválido ou vencido. Ele vale por 60 minutos, só uma vez, e um pedido mais novo o substitui.'}
            </p>
            <Link
              to={signedIn ? '/conta' : '/login'}
              className={buttonClass({ variant: 'primary', block: true })}
            >
              {signedIn ? 'Pedir outro' : 'Entrar'}
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
