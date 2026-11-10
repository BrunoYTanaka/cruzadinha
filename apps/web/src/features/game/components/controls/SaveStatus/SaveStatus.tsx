import { useState } from 'react'
import { VisuallyHidden } from '../../../../../shared/components/VisuallyHidden/VisuallyHidden'
import type { SaveState } from '../../../services/save-queue'
import styles from './SaveStatus.module.css'

// Só os avisos de problema aparecem. O salvamento normal (`saved`, `saving`) não mostra nada: o texto
// trocando a cada letra fazia a faixa de ferramentas pular (feature 017). A sessão expirada tem a
// faixa de aviso com "Entrar de novo" logo abaixo, então não se repete aqui (feature 062).
const WARNING: Partial<Record<SaveState, string>> = {
  offline: 'Sem conexão, tentando de novo',
  'completed-elsewhere': 'Concluída em outro aparelho',
  'local-only': 'Não salvo: vale só nesta aba',
}

// O texto visível não é uma região viva: um anúncio por mudança encheria o leitor de tela de ruído.
// Só a queda para "sem conexão" e a volta são anunciadas. O visitante não tem aviso próprio: o
// "Entrar" do cabeçalho já é o caminho para a conta (feature 063).
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
      setAnnouncement(state === 'local-only' ? (WARNING['local-only'] ?? '') : '')
    }
  }
  const warning = WARNING[state]
  const warn = state === 'offline' || state === 'local-only'
  return (
    <>
      {warning ? (
        <span className={`${styles.status} ${warn ? styles.warn : ''}`}>{warning}</span>
      ) : null}
      <VisuallyHidden role="status" aria-live="polite">
        {announcement}
      </VisuallyHidden>
    </>
  )
}
