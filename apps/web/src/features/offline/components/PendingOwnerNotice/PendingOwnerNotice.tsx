import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Notice } from '../../../../shared/components/Notice/Notice'
import {
  DISCARDED_EVENT,
  dismissDiscardedNotice,
  hasAnyOutbox,
  hasDiscardedNotice,
} from '../../services/outbox-owner/outbox-owner'
import styles from './PendingOwnerNotice.module.css'

type PendingOwnerNoticeProps = {
  // Visitante: pendências de uma conta esperam por ela. Conta: avisa uma vez do que foi descartado.
  guest: boolean
  loginPath: string
}

export function PendingOwnerNotice({ guest, loginPath }: PendingOwnerNoticeProps) {
  const navigate = useNavigate()
  // Lido na montagem: o aviso não deve sumir sozinho quando outra aba muda o armazenamento.
  const [discarded, setDiscarded] = useState(hasDiscardedNotice)
  useEffect(() => {
    const onDiscarded = () => setDiscarded(hasDiscardedNotice())
    window.addEventListener(DISCARDED_EVENT, onDiscarded)
    return () => window.removeEventListener(DISCARDED_EVENT, onDiscarded)
  }, [])
  const waiting = guest && hasAnyOutbox()
  if (waiting) {
    return (
      <div className={styles.wrap}>
        <Notice action={{ label: 'Entrar', onClick: () => void navigate(loginPath) }}>
          Há progresso esperando você entrar.
        </Notice>
      </div>
    )
  }
  if (discarded && !guest) {
    return (
      <div className={styles.wrap}>
        <Notice
          variant="warning"
          onDismiss={() => {
            dismissDiscardedNotice()
            setDiscarded(false)
          }}
        >
          O progresso não enviado da conta anterior foi descartado.
        </Notice>
      </div>
    )
  }
  return null
}
