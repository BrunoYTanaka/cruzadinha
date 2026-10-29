import { useEffect, useState } from 'react'
import { Notice } from '../../../../shared/components/Notice/Notice'
import {
  DISCARDED_EVENT,
  dismissDiscardedNotice,
  hasDiscardedNotice,
} from '../../services/outbox-owner/outbox-owner'
import styles from './PendingOwnerNotice.module.css'

type PendingOwnerNoticeProps = {
  // Conta: avisa uma vez do que foi descartado. Visitante nunca vê aviso.
  guest: boolean
}

export function PendingOwnerNotice({ guest }: PendingOwnerNoticeProps) {
  // Lido na montagem: o aviso não deve sumir sozinho quando outra aba muda o armazenamento.
  const [discarded, setDiscarded] = useState(hasDiscardedNotice)
  useEffect(() => {
    const onDiscarded = () => setDiscarded(hasDiscardedNotice())
    window.addEventListener(DISCARDED_EVENT, onDiscarded)
    return () => window.removeEventListener(DISCARDED_EVENT, onDiscarded)
  }, [])
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
