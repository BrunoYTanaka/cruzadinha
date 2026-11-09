import { useState } from 'react'
import {
  Menu,
  MenuCheckItem,
  MenuGroup,
  MenuItem,
} from '../../../../../shared/components/Menu/Menu'
import { VisuallyHidden } from '../../../../../shared/components/VisuallyHidden/VisuallyHidden'
import styles from './HelpsMenu.module.css'

type HelpsMenuProps = {
  placement: 'popover' | 'sheet'
  pencil: boolean
  // A palavra ativa tem rascunho: só então confirmar e descartar agem.
  hasDraft: boolean
  // Relógio pausado: verificar e o rascunho ficam parados; o interruptor automático nunca.
  disabled?: boolean
  verifyOnType: boolean
  // Duelo x1 (feature 058): fora do modo livre, verificar é ajuda e some do menu.
  verifyEnabled?: boolean
  // Outro diálogo aberto: o menu fecha e não abre.
  blocked?: boolean
  onVerify: () => void
  onVerifyOnType: (on: boolean) => void
  onPencil: (on: boolean) => void
  onConfirm: () => void
  onDiscard: () => void
}

// Verificar, a verificação automática e o rascunho num menu só (feature 047). Os itens ficam
// sempre presentes e `aria-disabled` quando não agem, como os botões de antes.
export function HelpsMenu({
  placement,
  pencil,
  hasDraft,
  disabled = false,
  verifyOnType,
  verifyEnabled = true,
  blocked = false,
  onVerify,
  onVerifyOnType,
  onPencil,
  onConfirm,
  onDiscard,
}: HelpsMenuProps) {
  const [announcement, setAnnouncement] = useState('')
  const idle = disabled || !hasDraft
  return (
    <>
      <Menu
        label={verifyOnType ? 'Ajudas, verificação automática ligada' : 'Ajudas'}
        placement={placement}
        blocked={blocked}
        buttonClassName={styles.button}
        buttonContent={
          <>
            <span aria-hidden="true">Ajudas</span>
            <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
            <span className={styles.dot} data-on={verifyOnType} aria-hidden="true" />
          </>
        }
      >
        {verifyEnabled ? (
          <MenuItem disabled={disabled} onSelect={onVerify}>
            Verificar
          </MenuItem>
        ) : null}
        {verifyEnabled ? (
          <MenuGroup label="Automática">
            <MenuCheckItem checked={verifyOnType} onChange={onVerifyOnType}>
              Verificar ao digitar
            </MenuCheckItem>
          </MenuGroup>
        ) : null}
        <MenuGroup label="Rascunho">
          <MenuCheckItem checked={pencil} disabled={disabled} onChange={onPencil}>
            Lápis
          </MenuCheckItem>
          <MenuItem
            disabled={idle}
            onSelect={() => {
              onConfirm()
              setAnnouncement('Rascunho confirmado')
            }}
          >
            Confirmar rascunho
          </MenuItem>
          <MenuItem
            disabled={idle}
            onSelect={() => {
              onDiscard()
              setAnnouncement('Rascunho descartado')
            }}
          >
            Descartar rascunho
          </MenuItem>
        </MenuGroup>
      </Menu>
      <VisuallyHidden role="status" aria-live="polite">
        {announcement}
      </VisuallyHidden>
    </>
  )
}
