import { useState } from 'react'
import { Link } from 'react-router'
import { VisuallyHidden } from '../../components/VisuallyHidden'
import type { SaveState } from './save-queue'
import styles from './SaveStatus.module.css'

const TEXT: Record<SaveState, string> = {
  saved: 'Salvo',
  saving: 'Salvando…',
  offline: 'Sem conexão, tentando de novo',
  'session-expired': 'Sessão expirada',
  'completed-elsewhere': 'Concluída em outro aparelho',
  'local-only': 'Não salvo: vale só nesta aba',
}

// Visitante (feature 013): o progresso fica só no navegador, e há um caminho para entrar.
const GUEST_TEXT: Partial<Record<SaveState, string>> = { saved: 'Salvo neste aparelho' }
const GUEST_ANNOUNCEMENT = 'Seu progresso fica salvo só neste aparelho.'

// O texto visível muda a cada salvamento, mas não é uma região viva: um anúncio por salvamento
// encheria o leitor de tela de ruído. Só a queda para "sem conexão" e a volta são anunciadas.
export function SaveStatus({
  state,
  guest,
}: {
  state: SaveState
  // Com `guest`, o texto diz que é só neste aparelho e há o link para entrar.
  guest?: { loginTo: string }
}) {
  const [previous, setPrevious] = useState<SaveState>(state)
  const [wasOffline, setWasOffline] = useState(false)
  // O visitante ouve uma vez, ao abrir, que o progresso fica só neste aparelho.
  const [announcement, setAnnouncement] = useState(guest ? GUEST_ANNOUNCEMENT : '')
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
      setAnnouncement(state === 'local-only' ? TEXT['local-only'] : '')
    }
  }
  const warn = state === 'offline' || state === 'local-only'
  return (
    <>
      <span className={`${styles.status} ${warn ? styles.warn : ''}`}>
        {(guest ? GUEST_TEXT[state] : undefined) ?? TEXT[state]}
      </span>
      {guest ? (
        <Link to={guest.loginTo} className={styles.login}>
          Entrar para salvar na sua conta
        </Link>
      ) : null}
      <VisuallyHidden role="status" aria-live="polite">
        {announcement}
      </VisuallyHidden>
    </>
  )
}
