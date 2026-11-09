import { Button } from '../../../../shared/components/Button/Button'
import { Dialog } from '../../../../shared/components/Dialog/Dialog'
import styles from './ForfeitConfirm.module.css'

type Props = {
  kind: 'forfeit' | 'cancel'
  busy: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

const TEXT = {
  forfeit: {
    title: 'Desistir deste x1?',
    description: 'Você perde na hora e o oponente vence. Isso não pode ser desfeito.',
    confirm: 'Desistir',
    back: 'Continuar jogando',
  },
  cancel: {
    title: 'Cancelar este x1?',
    description: 'O link e o código deixam de valer. Isso não pode ser desfeito.',
    confirm: 'Cancelar o x1',
    back: 'Voltar',
  },
} as const

// Desistir e cancelar valem na hora, sem desfazer (feature 058): a confirmação deixa isso claro.
export function ForfeitConfirm({ kind, busy, error, onConfirm, onCancel }: Props) {
  const text = TEXT[kind]
  return (
    <Dialog open onClose={onCancel} title={text.title} description={text.description}>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.actions}>
        <Button size="small" variant="secondary" onClick={onCancel} data-autofocus>
          {text.back}
        </Button>
        <Button size="small" variant="primary" onClick={onConfirm} disabled={busy}>
          {busy ? 'Aguarde…' : text.confirm}
        </Button>
      </div>
    </Dialog>
  )
}
