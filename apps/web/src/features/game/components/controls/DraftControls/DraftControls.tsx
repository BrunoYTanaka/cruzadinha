import { useState } from 'react'
import { Pill } from '../../../../../shared/components/Pill/Pill'
import { VisuallyHidden } from '../../../../../shared/components/VisuallyHidden/VisuallyHidden'
import styles from './DraftControls.module.css'

type DraftControlsProps = {
  pencil: boolean
  // A palavra ativa tem rascunho: só então confirmar e descartar agem.
  hasDraft: boolean
  // Relógio pausado ou configurações abertas, como nas ajudas.
  disabled?: boolean
  onPencil: (on: boolean) => void
  onConfirm: () => void
  onDiscard: () => void
}

// Lápis e as duas ações sobre o rascunho da palavra ativa. Sempre presentes para a faixa não
// mudar de tamanho; sem rascunho ficam `aria-disabled` (continuam focáveis, como as ajudas).
export function DraftControls({
  pencil,
  hasDraft,
  disabled = false,
  onPencil,
  onConfirm,
  onDiscard,
}: DraftControlsProps) {
  const [announcement, setAnnouncement] = useState('')
  const idle = disabled || !hasDraft
  return (
    <>
      <Pill
        className={styles.pencil}
        aria-pressed={pencil}
        aria-disabled={disabled || undefined}
        aria-label="Lápis (rascunho)"
        onClick={disabled ? undefined : () => onPencil(!pencil)}
      >
        <span aria-hidden="true">✎ Lápis</span>
      </Pill>
      <Pill
        className={styles.action}
        aria-disabled={idle || undefined}
        aria-label="Confirmar rascunho"
        onClick={
          idle
            ? undefined
            : () => {
                onConfirm()
                setAnnouncement('Rascunho confirmado')
              }
        }
      >
        <span aria-hidden="true">Confirmar</span>
      </Pill>
      <Pill
        className={styles.action}
        aria-disabled={idle || undefined}
        aria-label="Descartar rascunho"
        onClick={
          idle
            ? undefined
            : () => {
                onDiscard()
                setAnnouncement('Rascunho descartado')
              }
        }
      >
        <span aria-hidden="true">Descartar</span>
      </Pill>
      <VisuallyHidden role="status" aria-live="polite">
        {announcement}
      </VisuallyHidden>
    </>
  )
}
