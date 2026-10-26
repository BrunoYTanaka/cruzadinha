import { useState } from 'react'
import { clearExpired, useSessionExpired } from '../../services/session-expired'
import { Notice } from '../../../../shared/components/Notice/Notice'
import { ReloginDialog } from '../ReloginDialog/ReloginDialog'

// Aviso que não bloqueia: aparece com o tabuleiro aberto quando a sessão expira e oferece o login
// numa janela por cima do jogo (FR-032).
export function SessionExpiredNotice({ onSuccess }: { onSuccess?: () => void }) {
  const { expired, lastUser } = useSessionExpired()
  const [open, setOpen] = useState(false)
  if (!expired) return null
  return (
    <>
      <Notice variant="warning" action={{ label: 'Entrar de novo', onClick: () => setOpen(true) }}>
        Sua sessão expirou. Entre de novo para salvar.
      </Notice>
      <ReloginDialog
        open={open}
        onClose={() => setOpen(false)}
        expectedUser={lastUser}
        onSuccess={() => {
          setOpen(false)
          clearExpired()
          onSuccess?.()
        }}
      />
    </>
  )
}
