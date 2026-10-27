import { Button } from '../../../../shared/components/Button/Button'
import { Dialog } from '../../../../shared/components/Dialog/Dialog'
import styles from './LogoutConfirm.module.css'

type LogoutConfirmProps = { open: boolean; onConfirm: () => void; onCancel: () => void }

// Sair com progresso ainda não enviado o descarta: a pessoa precisa saber (feature 041, FR-012).
export function LogoutConfirm({ open, onConfirm, onCancel }: LogoutConfirmProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title="Sair agora?"
      description="Há progresso ainda não enviado. Sair agora descarta esse progresso."
    >
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} data-autofocus>
          Cancelar
        </Button>
        <Button onClick={onConfirm}>Sair mesmo assim</Button>
      </div>
    </Dialog>
  )
}
