import { Notice } from '../../../../shared/components/Notice/Notice'
import { useAppUpdate } from '../../hooks/useAppUpdate/useAppUpdate'

// Avisa no calendário que saiu uma versão nova (feature 067); no jogo nunca aparece.
export function UpdateNotice() {
  const { status, update, dismiss } = useAppUpdate()
  if (status === 'none' || status === 'dismissed') return null
  const updating = status === 'updating'
  return (
    <Notice
      variant="info"
      action={{
        label: updating ? 'Atualizando…' : 'Atualizar',
        onClick: update,
        pending: updating,
      }}
      onDismiss={updating ? undefined : dismiss}
    >
      Saiu uma versão nova do Cruzadinha.
    </Notice>
  )
}
