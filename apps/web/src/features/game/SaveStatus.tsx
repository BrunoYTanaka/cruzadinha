import { useState } from 'react'
import { Link } from 'react-router'
import { VisuallyHidden } from '../../shared/components/VisuallyHidden'
import type { SaveState } from './save-queue'
import styles from './SaveStatus.module.css'

// Só os avisos de problema aparecem. O salvamento normal (`saved`, `saving`) não mostra nada: o texto
// trocando a cada letra fazia a faixa de ferramentas pular (feature 017).
const WARNING: Partial<Record<SaveState, string>> = {
  offline: 'Sem conexão, tentando de novo',
  'session-expired': 'Sessão expirada',
  'completed-elsewhere': 'Concluída em outro aparelho',
  'local-only': 'Não salvo: vale só nesta aba',
}

// Visitante (feature 013): o progresso fica só no navegador, e há um caminho para entrar. O texto é
// fixo, sem acompanhar os salvamentos.
const GUEST_TEXT = 'Progresso só neste aparelho'
const GUEST_ANNOUNCEMENT = 'Seu progresso fica salvo só neste aparelho.'

// O texto visível não é uma região viva: um anúncio por mudança encheria o leitor de tela de ruído.
// Só a queda para "sem conexão" e a volta são anunciadas.
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
      setAnnouncement(state === 'local-only' ? (WARNING['local-only'] ?? '') : '')
    }
  }
  const warning = WARNING[state]
  const text = warning ?? (guest ? GUEST_TEXT : undefined)
  const warn = state === 'offline' || state === 'local-only'
  return (
    <>
      {text ? <span className={`${styles.status} ${warn ? styles.warn : ''}`}>{text}</span> : null}
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
