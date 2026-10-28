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
        buttonContent={
          <>
            <span aria-hidden="true">Ajudas ▾</span>
            <span className={styles.dot} data-on={verifyOnType} aria-hidden="true" />
          </>
        }
      >
        <MenuItem disabled={disabled} onSelect={onVerify}>
          Verificar
        </MenuItem>
        <MenuGroup label="Automática">
          <MenuCheckItem checked={verifyOnType} onChange={onVerifyOnType}>
            Verificar ao digitar
          </MenuCheckItem>
        </MenuGroup>
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
