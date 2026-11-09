import { useState } from 'react'
import { clearAccountData, hasOutbox, LogoutConfirm } from '../../../features/offline'
import { useLogoutMutation } from '../../../features/session'
import { Button } from '../../../shared/components/Button/Button'
import styles from './LogoutButton.module.css'

// "Sair" da conta (feature 062: saiu do cabeçalho). Com progresso esperando para ser enviado,
// pergunta antes; ao sair, apaga os dados locais da conta (feature 041).
export function LogoutButton({ userId }: { userId: string }) {
  const logout = useLogoutMutation()
  const [confirming, setConfirming] = useState(false)

  async function leave() {
    setConfirming(false)
    await clearAccountData(userId)
    logout.mutate()
  }

  return (
    <>
      <Button
        variant="secondary"
        block
        onClick={() => (hasOutbox(userId) ? setConfirming(true) : logout.mutate())}
        disabled={logout.isPending}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
        Sair
      </Button>
      <LogoutConfirm
        open={confirming}
        onConfirm={() => void leave()}
        onCancel={() => setConfirming(false)}
      />
    </>
  )
}
