import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../../shared/components/Button/Button'
import { Dialog } from '../../../../shared/components/Dialog/Dialog'
import { Field } from '../../../../shared/components/Field/Field'
import { deleteAccount } from '../../../../shared/services/api/account/account'
import { authMessages, markAccountDeleted, useEndLocalSession } from '../../../session'
import { accountErrorMessage, accountMessages, isWrongPassword } from '../../helpers/messages'
import styles from './DeleteAccountDialog.module.css'

type Props = {
  open: boolean
  onClose: () => void
  // Roda depois de a API apagar a conta e antes de a sessão local terminar: quem usa limpa o que a
  // conta deixou neste aparelho (a feature `account` não conhece `offline`).
  onDeleted: () => Promise<void> | void
}

export function DeleteAccountDialog({ open, onClose, onDeleted }: Props) {
  const mutation = useMutation({ mutationFn: deleteAccount })
  const endLocalSession = useEndLocalSession()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  function close() {
    setPassword('')
    setError(null)
    onClose()
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (mutation.isPending || mutation.isSuccess) return
    if (!password) {
      setError(authMessages.fillAll)
      return
    }
    setError(null)
    try {
      await mutation.mutateAsync({ currentPassword: password })
    } catch (failure) {
      setError(
        isWrongPassword(failure) ? accountMessages.wrongPassword : accountErrorMessage(failure),
      )
      return
    }
    // A sessão do cache já não existe: um 401 tardio não vira "sessão terminou".
    await onDeleted()
    markAccountDeleted()
    endLocalSession()
  }

  return (
    <Dialog open={open} onClose={close} title="Excluir a conta?">
      <form onSubmit={onSubmit} noValidate className={styles.form}>
        <p>Isto apaga para sempre:</p>
        <ul className={styles.list}>
          <li>a conta e o e-mail dela;</li>
          <li>as sessões em todos os aparelhos;</li>
          <li>o progresso salvo na conta;</li>
          <li>os ajustes da conta;</li>
          <li>as cruzadas guardadas para jogar sem rede neste aparelho.</li>
        </ul>
        <p className={styles.warn}>
          Não há como desfazer. O progresso de visitante deste aparelho fica.
        </p>
        <Field
          data-autofocus
          label="Senha atual"
          type="password"
          name="deletePassword"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={error ?? undefined}
        />
        <div className={styles.actions}>
          <Button type="button" variant="quiet" onClick={close}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={mutation.isPending || mutation.isSuccess}
          >
            Excluir para sempre
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
