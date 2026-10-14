import { useState } from 'react'
import { VisuallyHidden } from '../../components/VisuallyHidden'
import type { SaveState } from './save-queue'
import styles from './SaveStatus.module.css'

const TEXT: Record<SaveState, string> = {
  saved: 'Salvo',
  saving: 'Salvando…',
  offline: 'Sem conexão, tentando de novo',
  'session-expired': 'Sessão expirada',
  'completed-elsewhere': 'Concluída em outro aparelho',
}

// O texto visível muda a cada salvamento, mas não é uma região viva: um anúncio por salvamento
// encheria o leitor de tela de ruído. Só a queda para "sem conexão" e a volta são anunciadas.
export function SaveStatus({ state }: { state: SaveState }) {
  const [previous, setPrevious] = useState<SaveState>(state)
  const [wasOffline, setWasOffline] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  if (state !== previous) {
    setPrevious(state)
    if (state === 'offline') {
      setWasOffline(true)
      setAnnouncement('Sem conexão, tentando de novo')
    } else if (state === 'saved' && wasOffline) {
      setWasOffline(false)
      setAnnouncement('Conexão restabelecida')
    } else if (state !== 'saving') {
      setWasOffline(false)
      setAnnouncement('')
    }
  }
  return (
    <>
      <span className={`${styles.status} ${state === 'offline' ? styles.warn : ''}`}>
        {TEXT[state]}
      </span>
      <VisuallyHidden role="status" aria-live="polite">
        {announcement}
      </VisuallyHidden>
    </>
  )
}
